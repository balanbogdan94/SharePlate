import { ManagedIdentityCredential } from '@azure/identity';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { Pool, type PoolConfig } from 'pg';
import { InvalidImage } from './conversion.js';
import {
	WorkerError,
	type ImageBlobs,
	type ImageKind,
	type ImageDatabase,
	type ImageTarget,
	type References,
} from './worker.js';

type CommonSettings = { recipeContainer: string; profileContainer: string; host: string; port: number; database: string; user: string };
export type WorkerSettings = CommonSettings & (
	| { mode: 'local'; storageConnectionString: string; password: string }
	| { mode: 'azure'; storageAccountUrl: string; clientId: string | undefined; password: string }
);

function required(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name];
	if (!value?.trim()) throw new WorkerError(`missing_setting_${name}`);
	return value;
}

// Parses the Npgsql-style secret shared with the API (Key Vault: PostgresConnectionString).
export function parseNpgsql(value: string) {
	const parts = new Map<string, string>();
	for (const part of value.split(';')) {
		const index = part.indexOf('=');
		if (index > 0) parts.set(part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim());
	}
	const get = (key: string) => {
		const found = parts.get(key);
		if (!found) throw new WorkerError('invalid_database_connection_string');
		return found;
	};
	return { host: get('host'), port: parts.get('port') ?? '5432', database: get('database'), user: get('username'), password: get('password') };
}

export function readSettings(env: NodeJS.ProcessEnv): WorkerSettings {
	if (env.IMAGE_WORKER_LOCAL && env.IMAGE_WORKER_LOCAL !== 'true')
		throw new WorkerError('invalid_local_mode');
	const local = env.IMAGE_WORKER_LOCAL === 'true';
	if (local && (env.WEBSITE_INSTANCE_ID || env.WEBSITE_HOSTNAME))
		throw new WorkerError('local_mode_not_allowed_in_azure');
	const containerName = (name: string, fallback: string) => {
		const container = env[name] ?? fallback;
		if (!/^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/.test(container) || container.includes('--'))
			throw new WorkerError('invalid_image_container');
		return container;
	};
	const recipeContainer = containerName('IMAGE_RECIPE_CONTAINER_NAME', 'recipe-images');
	const profileContainer = containerName('IMAGE_PROFILE_CONTAINER_NAME', 'user-images');
	if (recipeContainer === profileContainer) throw new WorkerError('image_containers_must_differ');
	const azureDb = local ? undefined : parseNpgsql(required(env, 'DATABASE_CONNECTION_STRING'));
	const host = azureDb?.host ?? required(env, 'PGHOST');
	const portText = azureDb?.port ?? env.PGPORT ?? '5432';
	const port = Number(portText);
	if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535)
		throw new WorkerError('invalid_database_port');
	const common = { recipeContainer, profileContainer, host, port, database: azureDb?.database ?? required(env, 'PGDATABASE'), user: azureDb?.user ?? required(env, 'PGUSER') };
	if (local) {
		if (!['localhost', '127.0.0.1', '::1'].includes(host))
			throw new WorkerError('local_database_must_be_loopback');
		const storageConnectionString = required(env, 'IMAGE_STORAGE_CONNECTION_STRING');
		const endpoint = storageConnectionString.split(';').find((part) => part.startsWith('BlobEndpoint='))?.slice(13);
		if (!endpoint) throw new WorkerError('local_blob_endpoint_required');
		let url: URL;
		try { url = new URL(endpoint); } catch { throw new WorkerError('invalid_blob_endpoint'); }
		if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
			throw new WorkerError('local_storage_must_be_loopback');
		return { ...common, mode: 'local', storageConnectionString, password: required(env, 'PGPASSWORD') };
	}
	const storageAccountUrl = required(env, 'IMAGE_STORAGE_ACCOUNT_URL');
	let url: URL;
	try { url = new URL(storageAccountUrl); } catch { throw new WorkerError('invalid_storage_account_url'); }
	if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
		throw new WorkerError('invalid_storage_account_url');
	return { ...common, mode: 'azure', storageAccountUrl: url.origin, clientId: env.AZURE_CLIENT_ID, password: azureDb!.password };
}

export function databaseConfig(settings: WorkerSettings): PoolConfig {
	return {
		host: settings.host,
		port: settings.port,
		database: settings.database,
		user: settings.user,
		password: settings.password,
		ssl: settings.mode === 'local' ? false : { rejectUnauthorized: true },
		max: 2,
		connectionTimeoutMillis: 10_000,
		idleTimeoutMillis: 30_000,
		query_timeout: 15_000,
		statement_timeout: 15_000,
	};
}

export class PostgresImages implements ImageDatabase {
	constructor(private readonly pool: Pool) {}

	async find(kind: ImageKind, sourceUrl: string, outputUrl: string): Promise<References> {
		const sql = kind === 'recipe'
			? 'SELECT "Id" AS id, "ImageUrl" AS url FROM "Recipes" WHERE "ImageUrl" IN ($1, $2)'
			: 'SELECT "Id" AS id, "ProfilePictureUrl" AS url FROM "Users" WHERE "ProfilePictureUrl" IN ($1, $2)';
		const result = await this.pool.query<{ id: string; url: string }>(sql, [sourceUrl, outputUrl]);
		return {
			targets: result.rows.filter((row) => row.url === sourceUrl).map(({ id }) => ({ kind, id })),
			completed: result.rows.some((row) => row.url !== sourceUrl),
		};
	}

	async replace(target: ImageTarget, sourceUrl: string, outputUrl: string): Promise<boolean> {
		const sql = target.kind === 'recipe'
			? 'UPDATE "Recipes" SET "ImageUrl"=$1, "UpdatedAt"=now() WHERE "Id"=$2 AND "ImageUrl"=$3'
			: 'UPDATE "Users" SET "ProfilePictureUrl"=$1, "UpdatedAt"=now() WHERE "Id"=$2 AND "ProfilePictureUrl"=$3';
		const result = await this.pool.query(sql, [outputUrl, target.id, sourceUrl]);
		return result.rowCount === 1;
	}
}

export class AzureImages implements ImageBlobs {
	readonly containerUrl: string;
	constructor(private readonly container: ContainerClient) {
		this.containerUrl = container.url;
	}

	url(name: string): string { return this.container.getBlobClient(name).url; }

	async download(name: string): Promise<Buffer> {
		const response = await this.container.getBlobClient(name).download();
		const limit = 100 * 1024 * 1024;
		if ((response.contentLength ?? 0) > limit) {
			response.readableStreamBody?.destroy();
			throw new InvalidImage('invalid_size');
		}
		if (!response.readableStreamBody) throw new WorkerError('missing_blob_body');
		const chunks: Buffer[] = [];
		let length = 0;
		for await (const chunk of response.readableStreamBody) {
			const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			length += bytes.length;
			if (length > limit) {
				response.readableStreamBody.destroy();
				throw new InvalidImage('invalid_size');
			}
			chunks.push(bytes);
		}
		return Buffer.concat(chunks);
	}

	async upload(name: string, content: Buffer): Promise<void> {
		await this.container.getBlockBlobClient(name).uploadData(content, {
			blobHTTPHeaders: { blobContentType: 'image/webp' },
		});
	}
}

export function createDependencies(settings: WorkerSettings) {
	const pool = new Pool(databaseConfig(settings));
	pool.on('error', () => console.error('image_worker_database_connection_failed'));
	const service = settings.mode === 'local'
		? BlobServiceClient.fromConnectionString(settings.storageConnectionString)
		: new BlobServiceClient(settings.storageAccountUrl, new ManagedIdentityCredential({ clientId: settings.clientId }));
	return {
		database: new PostgresImages(pool),
		blobs: {
			recipe: new AzureImages(service.getContainerClient(settings.recipeContainer)),
			avatar: new AzureImages(service.getContainerClient(settings.profileContainer)),
		},
	};
}
