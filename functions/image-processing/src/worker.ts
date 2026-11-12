import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { encode, encodeAvatar } from './conversion.js';

export type ImageKind = 'recipe' | 'avatar';
export type ImageTarget = { kind: ImageKind; id: string };
export type References = { targets: ImageTarget[]; completed: boolean };

export interface ImageDatabase {
	find(kind: ImageKind, sourceUrl: string, outputUrl: string): Promise<References>;
	replace(target: ImageTarget, sourceUrl: string, outputUrl: string): Promise<boolean>;
}

export interface ImageBlobs {
	containerUrl: string;
	url(name: string): string;
	download(name: string): Promise<Buffer>;
	upload(name: string, content: Buffer): Promise<void>;
}

export type WorkerDependencies = {
	blobs: Record<ImageKind, ImageBlobs>;
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

function locateSource(
	value: unknown,
	blobs: Record<ImageKind, ImageBlobs>,
): { kind: ImageKind; name: string } {
	if (typeof value !== 'string') throw new WorkerError('invalid_blob_event');
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new WorkerError('invalid_blob_url');
	}
	if (url.username || url.password || url.search || url.hash)
		throw new WorkerError('unexpected_blob_location');
	// The container decides the kind: recipe-images -> recipe, user-images -> avatar.
	for (const kind of ['recipe', 'avatar'] as const) {
		const container = new URL(blobs[kind].containerUrl);
		if (url.origin !== container.origin || !url.pathname.startsWith(`${container.pathname}/`))
			continue;
		const name = url.pathname.slice(container.pathname.length + 1);
		if (name.startsWith(outputPrefix)) return { kind, name };
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[a-z0-9]+)?$/i.test(name))
			throw new WorkerError('unexpected_original_name');
		return { kind, name };
	}
	throw new WorkerError('unexpected_blob_location');
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
	const { database } = dependencies;
	if (!event.data || typeof event.data !== 'object' || !('url' in event.data))
		throw new WorkerError('invalid_blob_event');
	const { kind, name } = locateSource(event.data.url, dependencies.blobs);
	if (name.startsWith(outputPrefix))
		return { status: 'ignored', reason: 'worker_output' };
	const blobs = dependencies.blobs[kind];
	const sourceUrl = blobs.url(name);
	const outputUrl = blobs.url(outputName(sourceUrl, kind));
	let references = await database.find(kind, sourceUrl, outputUrl);
	// BlobCreated can arrive before the API saves the original URL.
	for (const delay of referenceRetryDelays) {
		if (references.targets.length || references.completed) break;
		await (dependencies.wait ?? setTimeout)(delay);
		references = await database.find(kind, sourceUrl, outputUrl);
	}
	if (!references.targets.length) {
		if (references.completed) return { status: 'duplicate' };
		throw new WorkerError('image_reference_not_found');
	}

	const original = await blobs.download(name);
	const output = kind === 'recipe'
		? await encode(original, 1280)
		: await encodeAvatar(original);
	const resultName = outputName(sourceUrl, kind);
	await blobs.upload(resultName, output.content);
	let updated = 0;
	for (const reference of references.targets) {
		if (await database.replace(reference, sourceUrl, blobs.url(resultName)))
			updated++;
	}
	return { status: updated ? 'updated' : 'obsolete', updated };
}
