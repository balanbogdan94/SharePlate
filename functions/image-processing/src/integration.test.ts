import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { BlobServiceClient } from '@azure/storage-blob';
import { Pool } from 'pg';
import sharp from 'sharp';
import { AzureImages, databaseConfig, PostgresImages, readSettings } from './adapters.js';
import { outputName, processImageEvent, type ImageKind, type WorkerDependencies } from './worker.js';

const repository = fileURLToPath(new URL('../../..', import.meta.url));

function docker(...args: string[]): string {
	return execFileSync('docker', args, { encoding: 'utf8', timeout: 180_000 }).trim();
}

async function ready(operation: () => Promise<unknown>): Promise<void> {
	let lastError: unknown;
	for (let attempt = 0; attempt < 40; attempt++) {
		try { await operation(); return; } catch (error) { lastError = error; }
		await setTimeout(250);
	}
	throw new Error('Isolated test service did not become ready', { cause: lastError });
}

test('isolated PostgreSQL + Azurite, using all existing EF migrations', { timeout: 240_000 }, async (t) => {
	const runId = randomUUID();
	const postgresName = `shareplate-pr2-pg-${runId}`;
	const azuriteName = `shareplate-pr2-blob-${runId}`;
	const containers: string[] = [];
	const volumes: string[] = [];
	const directory = await mkdtemp(join(tmpdir(), 'shareplate-pr2-'));
	let admin: Pool | undefined;
	let workerPool: Pool | undefined;
	t.after(async () => {
		try {
			await workerPool?.end();
			await admin?.end();
		} finally {
			try {
				if (containers.length) docker('rm', '--force', '--volumes', ...containers);
				const remainingVolumes = new Set(docker('volume', 'ls', '--format', '{{.Name}}').split('\n'));
				for (const volume of volumes)
					assert.equal(remainingVolumes.has(volume), false, `Test volume was not removed: ${volume}`);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		}
	});
	const password = randomBytes(24).toString('hex');
	const workerPassword = randomBytes(24).toString('hex');
	const blobKey = randomBytes(64).toString('base64');
	containers.push(postgresName);
	docker('run', '--detach', '--name', postgresName, '--label', `shareplate.pr2-test=${runId}`,
		'--publish', '127.0.0.1::5432', '--env', 'POSTGRES_USER=pr2test',
		'--env', `POSTGRES_PASSWORD=${password}`, '--env', 'POSTGRES_DB=pr2test', 'postgres:17-alpine');
	containers.push(azuriteName);
	docker('run', '--detach', '--name', azuriteName, '--label', `shareplate.pr2-test=${runId}`,
		'--publish', '127.0.0.1::10000', '--env', `AZURITE_ACCOUNTS=pr2test:${blobKey}`,
		'mcr.microsoft.com/azure-storage/azurite:3.35.0', 'azurite-blob',
		'--blobHost', '0.0.0.0', '--skipApiVersionCheck', '--silent');
	volumes.push(...docker('inspect', '--format',
		'{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}',
		postgresName, azuriteName).split(/\s+/).filter(Boolean));
	assert.equal(volumes.length, 2);
	const pgPort = docker('port', postgresName, '5432/tcp').split(':').at(-1)!;
	const blobPort = docker('port', azuriteName, '10000/tcp').split(':').at(-1)!;
	const storageConnectionString = `DefaultEndpointsProtocol=http;AccountName=pr2test;AccountKey=${blobKey};BlobEndpoint=http://127.0.0.1:${blobPort}/pr2test;`;
	const settings = readSettings({
		IMAGE_WORKER_LOCAL: 'true', PGHOST: '127.0.0.1', PGPORT: pgPort,
		PGDATABASE: 'pr2test', PGUSER: 'pr2test', PGPASSWORD: password,
		IMAGE_STORAGE_CONNECTION_STRING: storageConnectionString,
	});
	admin = new Pool(databaseConfig(settings));
	const db = admin;
	const container = BlobServiceClient.fromConnectionString(storageConnectionString).getContainerClient(settings.container);
	await ready(() => db.query('SELECT 1'));
	await ready(() => container.createIfNotExists());

	const sqlPath = join(directory, 'schema.sql');
	execFileSync('dotnet', ['ef', 'migrations', 'script',
		'--project', 'backend/SharePlate.Infrastructure', '--startup-project', 'backend/SharePlate.API',
		'--output', sqlPath], {
		cwd: repository, timeout: 120_000, stdio: 'pipe',
		env: {
			...process.env,
			Telemetry__Enabled: 'false',
			ConnectionStrings__DefaultConnection: `Host=127.0.0.1;Port=${pgPort};Database=pr2test;Username=pr2test;Password=${password}`,
			AzureStorage__AccountUri: '',
			AzureStorage__ConnectionString: storageConnectionString,
			AzureStorage__ImageContainerName: settings.container,
		},
	});
	const migrationSql = (await readFile(sqlPath, 'utf8')).replace(/^\uFEFF/, '');
	await db.query(migrationSql);
	const history = await db.query<{ MigrationId: string }>('SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId"');
	assert.equal(history.rows.at(-1)?.MigrationId, '20261016200426_AddRecipeNotesDocument');
	assert.equal(history.rowCount, migrationSql.match(/INSERT INTO "__EFMigrationsHistory"/g)?.length);
	assert.equal((await db.query(`SELECT to_regclass('"ImageJobs"') AS jobs`)).rows[0].jobs, null);

	await db.query(`CREATE ROLE pr2worker LOGIN PASSWORD '${workerPassword}'`);
	await db.query('GRANT SELECT ON "Recipes", "Users" TO pr2worker');
	await db.query('GRANT UPDATE ("ImageUrl", "UpdatedAt") ON "Recipes" TO pr2worker');
	await db.query('GRANT UPDATE ("ProfilePictureUrl", "UpdatedAt") ON "Users" TO pr2worker');
	workerPool = new Pool({ ...databaseConfig(settings), user: 'pr2worker', password: workerPassword });
	const dependencies: WorkerDependencies = { blobs: new AzureImages(container), database: new PostgresImages(workerPool) };
	const original = await sharp({
		create: { width: 1600, height: 900, channels: 3, background: '#587aa1' },
	}).png().toBuffer();

	async function fixture(kind: ImageKind = 'recipe', bytes = original, extension = '.png') {
		const name = `${randomUUID()}${extension}`;
		const sourceUrl = container.getBlobClient(name).url;
		await container.getBlockBlobClient(name).uploadData(bytes, { blobHTTPHeaders: { blobContentType: 'image/png' } });
		const userId = randomUUID();
		const id = kind === 'recipe' ? randomUUID() : userId;
		await db.query(
			`INSERT INTO "Users" ("Id","Name","Email","ProfilePictureUrl","CreatedAt","UpdatedAt")
			 VALUES ($1,'Synthetic test user',$2,$3,'2020-01-01','2020-01-01')`,
			[userId, `${userId}@example.invalid`, kind === 'avatar' ? sourceUrl : ''],
		);
		if (kind === 'recipe') await db.query(
			`INSERT INTO "Recipes" ("Id","Title","Notes","ImageUrl","AuthorId","CreatedAt","UpdatedAt")
			 VALUES ($1,'Synthetic recipe','',$2,$3,'2020-01-01','2020-01-01')`,
			[id, sourceUrl, userId],
		);
		const event = { eventType: 'Microsoft.Storage.BlobCreated', data: { url: sourceUrl } };
		const output = outputName(sourceUrl, kind);
		const sql = kind === 'recipe'
			? 'SELECT "ImageUrl" AS url,"UpdatedAt" AS updated FROM "Recipes" WHERE "Id"=$1'
			: 'SELECT "ProfilePictureUrl" AS url,"UpdatedAt" AS updated FROM "Users" WHERE "Id"=$1';
		return {
			name, sourceUrl, id, kind, event, output,
			outputUrl: container.getBlobClient(output).url,
			async row() { return (await db.query<{ url: string; updated: Date }>(sql, [id])).rows[0]; },
		};
	}

	await t.test('recipe and avatar share the configured container; one correctly sized WebP each', async () => {
		for (const kind of ['recipe', 'avatar'] as const) {
			const f = await fixture(kind);
			assert.deepEqual(await processImageEvent(f.event, dependencies), { status: 'updated', updated: 1 });
			const row = await f.row();
			assert.equal(row?.url, f.outputUrl);
			assert.ok(row.updated > new Date('2020-01-01'));
			const blob = container.getBlobClient(f.output);
			assert.equal((await blob.getProperties()).contentType, 'image/webp');
			const metadata = await sharp(await blob.downloadToBuffer()).metadata();
			assert.equal(metadata.format, 'webp');
			assert.equal(metadata.width, kind === 'recipe' ? 1280 : 192);
			assert.equal(metadata.height, kind === 'recipe' ? 720 : 192);
			assert.equal(await container.getBlobClient(f.name).exists(), true);
			const names = [];
			for await (const item of container.listBlobsFlat({ prefix: f.output.slice(0, -5) })) names.push(item.name);
			assert.deepEqual(names, [f.output]);
			assert.deepEqual(await processImageEvent(f.event, dependencies), { status: 'duplicate' });
		}
	});

	await t.test('extensionless GUID originals are optimized in the shared container', async () => {
		for (const kind of ['recipe', 'avatar'] as const) {
			const f = await fixture(kind, original, '');
			assert.deepEqual(await processImageEvent(f.event, dependencies), { status: 'updated', updated: 1 });
			assert.equal((await f.row())?.url, f.outputUrl);
			const metadata = await sharp(await container.getBlobClient(f.output).downloadToBuffer()).metadata();
			assert.equal(metadata.format, 'webp');
			assert.equal(metadata.width, kind === 'recipe' ? 1280 : 192);
			assert.equal(await container.getBlobClient(f.name).exists(), true);
		}
	});

	await t.test('event before original URL save is retried and then succeeds', async () => {
		const f = await fixture();
		await db.query('UPDATE "Recipes" SET "ImageUrl"=$1 WHERE "Id"=$2', ['', f.id]);
		let waits = 0;
		assert.equal((await processImageEvent(f.event, {
			...dependencies,
			wait: async () => {
				waits++;
				await db.query('UPDATE "Recipes" SET "ImageUrl"=$1 WHERE "Id"=$2', [f.sourceUrl, f.id]);
			},
		})).status, 'updated');
		assert.equal(waits, 1);
		assert.equal((await f.row())?.url, f.outputUrl);
	});

	await t.test('concurrent duplicates use real SQL compare-and-swap', async () => {
		const f = await fixture();
		const outcomes = await Promise.all([processImageEvent(f.event, dependencies), processImageEvent(f.event, dependencies)]);
		assert.equal(outcomes.filter((outcome) => outcome.status === 'updated').length, 1);
		assert.equal((await f.row())?.url, f.outputUrl);
	});

	await t.test('recipe and avatar A -> B/deletion between upload and SQL cannot be overwritten', async () => {
		for (const kind of ['recipe', 'avatar'] as const) {
			for (const scenario of ['replacement', 'deletion'] as const) {
				const f = await fixture(kind);
				const nextUrl = container.getBlobClient(`${randomUUID()}.png`).url;
				const realBlobs = dependencies.blobs;
				const racingBlobs = {
					containerUrl: realBlobs.containerUrl,
					url: (name: string) => realBlobs.url(name),
					download: (name: string) => realBlobs.download(name),
					upload: async (name: string, content: Buffer) => {
						await realBlobs.upload(name, content);
						if (scenario === 'deletion') await db.query(
							kind === 'recipe' ? 'DELETE FROM "Recipes" WHERE "Id"=$1' : 'DELETE FROM "Users" WHERE "Id"=$1', [f.id]);
						else await db.query(kind === 'recipe'
							? 'UPDATE "Recipes" SET "ImageUrl"=$1 WHERE "Id"=$2'
							: 'UPDATE "Users" SET "ProfilePictureUrl"=$1 WHERE "Id"=$2', [nextUrl, f.id]);
					},
				};
				assert.deepEqual(await processImageEvent(f.event, { ...dependencies, blobs: racingBlobs }),
					{ status: 'obsolete', updated: 0 });
				assert.equal((await f.row())?.url, scenario === 'deletion' ? undefined : nextUrl);
				assert.equal(await container.getBlobClient(f.name).exists(), true);
				assert.equal(await container.getBlobClient(f.output).exists(), true);
			}
		}
	});

	await t.test('real DB update failure after upload retains both blobs and replay converges', async () => {
		const f = await fixture();
		await db.query('REVOKE UPDATE ("ImageUrl", "UpdatedAt") ON "Recipes" FROM pr2worker');
		try {
			await assert.rejects(processImageEvent(f.event, dependencies), { code: '42501' });
			assert.equal((await f.row())?.url, f.sourceUrl);
			assert.equal(await container.getBlobClient(f.name).exists(), true);
			assert.equal(await container.getBlobClient(f.output).exists(), true);
		} finally {
			await db.query('GRANT UPDATE ("ImageUrl", "UpdatedAt") ON "Recipes" TO pr2worker');
		}
		assert.equal((await processImageEvent(f.event, dependencies)).status, 'updated');
		assert.equal((await f.row())?.url, f.outputUrl);
	});

	await t.test('DB read failure cannot trigger source/output deletion or conversion', async () => {
		const f = await fixture();
		await db.query('REVOKE SELECT ON "Recipes" FROM pr2worker');
		try {
			await assert.rejects(processImageEvent(f.event, dependencies), { code: '42501' });
			assert.equal((await f.row())?.url, f.sourceUrl);
			assert.equal(await container.getBlobClient(f.name).exists(), true);
			assert.equal(await container.getBlobClient(f.output).exists(), false);
		} finally {
			await db.query('GRANT SELECT ON "Recipes" TO pr2worker');
		}
	});

	await t.test('missing/deleted DB reference ends bounded retry with an explicit error', async () => {
		const f = await fixture();
		await db.query('DELETE FROM "Recipes" WHERE "Id"=$1', [f.id]);
		let waits = 0;
		await assert.rejects(processImageEvent(f.event, { ...dependencies, wait: async () => { waits++; } }),
			{ message: 'image_reference_not_found' });
		assert.equal(waits, 3);
		assert.equal(await container.getBlobClient(f.name).exists(), true);
		assert.equal(await container.getBlobClient(f.output).exists(), false);
	});

	await t.test('corrupt original and missing source leave DB URL unchanged', async () => {
		const corrupt = await fixture('recipe', Buffer.from('not an image'));
		await assert.rejects(processImageEvent(corrupt.event, dependencies));
		assert.equal((await corrupt.row())?.url, corrupt.sourceUrl);
		assert.equal(await container.getBlobClient(corrupt.output).exists(), false);
		const missing = await fixture();
		await container.getBlobClient(missing.name).delete();
		await assert.rejects(processImageEvent(missing.event, dependencies), { statusCode: 404 });
		assert.equal((await missing.row())?.url, missing.sourceUrl);
	});

	await t.test('worker output BlobCreated is ignored before any DB query', async () => {
		const f = await fixture();
		await processImageEvent(f.event, dependencies);
		assert.deepEqual(await processImageEvent({ ...f.event, data: { url: f.outputUrl } }, dependencies),
			{ status: 'ignored', reason: 'worker_output' });
		assert.equal((await f.row())?.url, f.outputUrl);
	});

	await t.test('SQL URL values are parameters, including quotes and SQL-like text', async () => {
		const f = await fixture();
		const unsafeUrl = `https://example.invalid/image' ; DROP TABLE "Users"; --`;
		await db.query('UPDATE "Recipes" SET "ImageUrl"=$1 WHERE "Id"=$2', [unsafeUrl, f.id]);
		const database = dependencies.database;
		const references = await database.find(unsafeUrl, 'unused-recipe', 'unused-avatar');
		assert.deepEqual(references.targets, [{ kind: 'recipe', id: f.id }]);
		assert.equal(await database.replace(references.targets[0]!, unsafeUrl, f.outputUrl), true);
		assert.equal(await database.replace(references.targets[0]!, unsafeUrl, 'stale-url'), false);
		assert.equal((await f.row())?.url, f.outputUrl);
		assert.ok((await db.query('SELECT COUNT(*) FROM "Users"')).rows[0]);
	});
});
