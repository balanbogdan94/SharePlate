import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { encode, encodeAvatar } from './conversion.js';

export type ImageKind = 'recipe' | 'avatar';
export type ImageTarget = { kind: ImageKind; id: string };
export type References = { targets: ImageTarget[]; completed: boolean };

export interface ImageDatabase {
	find(sourceUrl: string, recipeUrl: string, avatarUrl: string): Promise<References>;
	replace(target: ImageTarget, sourceUrl: string, outputUrl: string): Promise<boolean>;
}

export interface ImageBlobs {
	containerUrl: string;
	url(name: string): string;
	download(name: string): Promise<Buffer>;
	upload(name: string, content: Buffer): Promise<void>;
}

export type WorkerDependencies = {
	blobs: ImageBlobs;
	database: ImageDatabase;
	wait?: (milliseconds: number) => Promise<void>;
};

export class WorkerError extends Error {}

export const outputPrefix = 'optimized-v1-';
export const referenceRetryDelays = [250, 1000, 2000] as const;

export function outputName(sourceUrl: string, kind: ImageKind): string {
	const hash = createHash('sha256').update(sourceUrl).digest('hex');
	return `${outputPrefix}${kind}-${hash}.webp`;
}

function sourceName(value: unknown, containerUrl: string): string {
	if (typeof value !== 'string') throw new WorkerError('invalid_blob_event');
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new WorkerError('invalid_blob_url');
	}
	const container = new URL(containerUrl);
	if (
		url.origin !== container.origin ||
		url.username || url.password || url.search || url.hash ||
		!url.pathname.startsWith(`${container.pathname}/`)
	) throw new WorkerError('unexpected_blob_location');
	const name = url.pathname.slice(container.pathname.length + 1);
	if (name.startsWith(outputPrefix)) return name;
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[a-z0-9]+)?$/i.test(name))
		throw new WorkerError('unexpected_original_name');
	return name;
}

export type WorkerOutcome =
	| { status: 'ignored'; reason: 'event_type' | 'worker_output' }
	| { status: 'duplicate' }
	| { status: 'updated' | 'obsolete'; updated: number };

export async function processImageEvent(
	event: { eventType: string; data?: unknown },
	dependencies: WorkerDependencies,
): Promise<WorkerOutcome> {
	if (event.eventType !== 'Microsoft.Storage.BlobCreated')
		return { status: 'ignored', reason: 'event_type' };
	const { blobs, database } = dependencies;
	if (!event.data || typeof event.data !== 'object' || !('url' in event.data))
		throw new WorkerError('invalid_blob_event');
	const name = sourceName(event.data.url, blobs.containerUrl);
	if (name.startsWith(outputPrefix))
		return { status: 'ignored', reason: 'worker_output' };
	const sourceUrl = blobs.url(name);
	const recipeUrl = blobs.url(outputName(sourceUrl, 'recipe'));
	const avatarUrl = blobs.url(outputName(sourceUrl, 'avatar'));
	let references = await database.find(sourceUrl, recipeUrl, avatarUrl);
	// BlobCreated can arrive before the API saves the original URL.
	for (const delay of referenceRetryDelays) {
		if (references.targets.length || references.completed) break;
		await (dependencies.wait ?? setTimeout)(delay);
		references = await database.find(sourceUrl, recipeUrl, avatarUrl);
	}
	const target = references.targets[0];
	if (!target) {
		if (references.completed) return { status: 'duplicate' };
		throw new WorkerError('image_reference_not_found');
	}
	if (references.targets.some((candidate) => candidate.kind !== target.kind))
		throw new WorkerError('ambiguous_image_reference');

	const original = await blobs.download(name);
	const output = target.kind === 'recipe'
		? await encode(original, 1280)
		: await encodeAvatar(original);
	const resultName = outputName(sourceUrl, target.kind);
	await blobs.upload(resultName, output.content);
	let updated = 0;
	for (const reference of references.targets) {
		if (await database.replace(reference, sourceUrl, blobs.url(resultName)))
			updated++;
	}
	return { status: updated ? 'updated' : 'obsolete', updated };
}
