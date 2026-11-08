import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import sharp from 'sharp';
import { InvalidImage } from './conversion.js';
import {
	outputName, processImageEvent, referenceRetryDelays, WorkerError,
	type ImageKind, type References,
} from './worker.js';

async function fixture(kind: ImageKind = 'recipe', width = 1600, height = 900, extension = '.png') {
	const containerUrl = 'https://images.blob.core.windows.net/recipe-images';
	const name = `${randomUUID()}${extension}`;
	const sourceUrl = `${containerUrl}/${name}`;
	const original = await sharp({ create: { width, height, channels: 3, background: '#587aa1' } }).png().toBuffer();
	const target = { kind, id: randomUUID() };
	const state = { currentUrl: sourceUrl, deleted: false, downloads: 0, uploads: 0, reads: 0 };
	const outputs = new Map<string, Buffer>();
	const waits: number[] = [];
	const blobs = {
		containerUrl,
		url: (blobName: string) => `${containerUrl}/${blobName}`,
		async download(): Promise<Buffer> { state.downloads++; return original; },
		async upload(blobName: string, bytes: Buffer): Promise<void> {
			state.uploads++;
			outputs.set(blobName, bytes);
		},
	};
	const database = {
		async find(source: string, recipe: string, avatar: string): Promise<References> {
			state.reads++;
			return {
				targets: !state.deleted && state.currentUrl === source ? [target] : [],
				completed: !state.deleted && [recipe, avatar].includes(state.currentUrl),
			};
		},
		async replace(_target: typeof target, source: string, output: string): Promise<boolean> {
			if (state.deleted || state.currentUrl !== source) return false;
			state.currentUrl = output;
			return true;
		},
	};
	const dependencies = { blobs, database, wait: async (delay: number) => { waits.push(delay); } };
	const event = { eventType: 'Microsoft.Storage.BlobCreated', data: { url: sourceUrl } };
	return { dependencies, event, state, waits, outputs, original, name, sourceUrl, target };
}

test('recipe: one WebP up to 1280px; original remains visible until upload succeeds', async () => {
	const f = await fixture();
	const upload = f.dependencies.blobs.upload;
	f.dependencies.blobs.upload = async (name, content) => {
		assert.equal(f.state.currentUrl, f.sourceUrl);
		await upload(name, content);
	};
	assert.deepEqual(await processImageEvent(f.event, f.dependencies), { status: 'updated', updated: 1 });
	assert.equal(f.outputs.size, 1);
	assert.equal(f.state.uploads, 1);
	const output = f.outputs.get(outputName(f.sourceUrl, 'recipe'))!;
	const metadata = await sharp(output).metadata();
	assert.equal(metadata.format, 'webp');
	assert.equal(metadata.width, 1280);
	assert.equal(metadata.height, 720);
	assert.equal(f.state.currentUrl, f.dependencies.blobs.url(outputName(f.sourceUrl, 'recipe')));
});

test('recipe and avatar do not upscale; avatar is square', async () => {
	for (const kind of ['recipe', 'avatar'] as const) {
		const f = await fixture(kind, 100, 60);
		await processImageEvent(f.event, f.dependencies);
		const metadata = await sharp(f.outputs.get(outputName(f.sourceUrl, kind))!).metadata();
		assert.equal(metadata.width, kind === 'recipe' ? 100 : 60);
		assert.equal(metadata.height, 60);
	}
	const f = await fixture('avatar');
	await processImageEvent(f.event, f.dependencies);
	const metadata = await sharp(f.outputs.get(outputName(f.sourceUrl, 'avatar'))!).metadata();
	assert.equal(metadata.width, 192);
	assert.equal(metadata.height, 192);
});

test('GUID originals without a filename extension are optimized for recipes and avatars', async () => {
	for (const kind of ['recipe', 'avatar'] as const) {
		const f = await fixture(kind, 1600, 900, '');
		assert.deepEqual(await processImageEvent(f.event, f.dependencies), { status: 'updated', updated: 1 });
		assert.equal(f.state.reads, 1);
		assert.equal(f.state.uploads, 1);
		assert.equal(f.state.currentUrl, f.dependencies.blobs.url(outputName(f.sourceUrl, kind)));
		const metadata = await sharp(f.outputs.get(outputName(f.sourceUrl, kind))!).metadata();
		assert.equal(metadata.format, 'webp');
		assert.equal(metadata.width, kind === 'recipe' ? 1280 : 192);
	}
});

test('BlobCreated before DB save: bounded lookup retry finds the eventual URL', async () => {
	const f = await fixture();
	f.state.currentUrl = '';
	f.dependencies.wait = async (delay) => {
		f.waits.push(delay);
		f.state.currentUrl = f.sourceUrl;
	};
	assert.equal((await processImageEvent(f.event, f.dependencies)).status, 'updated');
	assert.deepEqual(f.waits, [250]);
	assert.equal(f.state.reads, 2);
});

test('no DB reference: bounded retry then explicit error, no downloads/uploads', async () => {
	const f = await fixture();
	f.state.deleted = true;
	await assert.rejects(processImageEvent(f.event, f.dependencies), { message: 'image_reference_not_found' });
	assert.deepEqual(f.waits, [...referenceRetryDelays]);
	assert.equal(f.state.reads, referenceRetryDelays.length + 1);
	assert.equal(f.state.downloads, 0);
	assert.equal(f.state.uploads, 0);
});

test('completed duplicate avoids download, upload and reference retry', async () => {
	const f = await fixture();
	await processImageEvent(f.event, f.dependencies);
	assert.deepEqual(await processImageEvent(f.event, f.dependencies), { status: 'duplicate' });
	assert.equal(f.state.downloads, 1);
	assert.equal(f.state.uploads, 1);
	assert.deepEqual(f.waits, []);
});

test('concurrent duplicates converge on a single output URL', async () => {
	const f = await fixture();
	const outcomes = await Promise.all([
		processImageEvent(f.event, f.dependencies),
		processImageEvent(f.event, f.dependencies),
	]);
	assert.equal(outcomes.filter((outcome) => outcome.status === 'updated').length, 1);
	assert.equal(f.outputs.size, 1);
	assert.equal(f.state.currentUrl, f.dependencies.blobs.url(outputName(f.sourceUrl, 'recipe')));
});

test('A -> B and deletion during conversion cannot overwrite or resurrect the record', async () => {
	for (const scenario of ['replacement', 'deletion'] as const) {
		const f = await fixture();
		const nextUrl = f.dependencies.blobs.url(`${randomUUID()}.png`);
		const upload = f.dependencies.blobs.upload;
		f.dependencies.blobs.upload = async (name, content) => {
			await upload(name, content);
			if (scenario === 'replacement') f.state.currentUrl = nextUrl;
			else f.state.deleted = true;
		};
		assert.deepEqual(await processImageEvent(f.event, f.dependencies), { status: 'obsolete', updated: 0 });
		assert.equal(f.state.currentUrl, scenario === 'replacement' ? nextUrl : f.sourceUrl);
		assert.equal(f.outputs.size, 1);
	}
});

test('DB failure after upload leaves original and output intact; operational replay succeeds', async () => {
	const f = await fixture();
	const replace = f.dependencies.database.replace;
	f.dependencies.database.replace = async () => { throw new Error('database_unavailable'); };
	await assert.rejects(processImageEvent(f.event, f.dependencies), { message: 'database_unavailable' });
	assert.equal(f.state.currentUrl, f.sourceUrl);
	assert.equal(f.outputs.size, 1);
	f.dependencies.database.replace = replace;
	assert.equal((await processImageEvent(f.event, f.dependencies)).status, 'updated');
	assert.equal(f.outputs.size, 1);
});

test('DB read, download, upload and invalid decode errors never change the URL', async () => {
	for (const failure of ['read', 'download', 'upload', 'decode'] as const) {
		const f = await fixture();
		if (failure === 'read')
			f.dependencies.database.find = async () => { throw new Error('read_failed'); };
		if (failure === 'download')
			f.dependencies.blobs.download = async () => { throw new Error('download_failed'); };
		if (failure === 'upload')
			f.dependencies.blobs.upload = async () => { throw new Error('upload_failed'); };
		if (failure === 'decode')
			f.dependencies.blobs.download = async () => Buffer.from('not an image');
		await assert.rejects(processImageEvent(f.event, f.dependencies));
		assert.equal(f.state.currentUrl, f.sourceUrl);
		assert.equal(f.outputs.size, 0);
	}
});

test('output events and unrelated event types cannot cause a conversion loop', async () => {
	const f = await fixture();
	const outputEvent = { ...f.event, data: { url: f.dependencies.blobs.url(outputName(f.sourceUrl, 'recipe')) } };
	assert.deepEqual(await processImageEvent(outputEvent, f.dependencies), { status: 'ignored', reason: 'worker_output' });
	assert.deepEqual(await processImageEvent({ eventType: 'Microsoft.Storage.BlobDeleted' }, f.dependencies),
		{ status: 'ignored', reason: 'event_type' });
	assert.equal(f.state.reads, 0);
	assert.equal(f.state.downloads, 0);
});

test('only root-level originals in the configured account/container are accepted', async () => {
	const f = await fixture();
	for (const url of [
		'https://other.blob.core.windows.net/recipe-images/' + f.name,
		f.sourceUrl.replace('/recipe-images/', '/user-images/'),
		f.sourceUrl + '?sig=secret',
		f.sourceUrl + '#fragment',
		f.sourceUrl.replace(f.name, `folder/${f.name}`),
		f.sourceUrl.replace(f.name, 'photo.png'),
		f.sourceUrl.replace(f.name, `${f.name.slice(0, -4)}.`),
		f.sourceUrl.replace(f.name, `${f.name.slice(0, -4)}..png`),
		'https://user:secret@images.blob.core.windows.net/recipe-images/' + f.name,
		'not-a-url',
	]) {
		await assert.rejects(processImageEvent({ ...f.event, data: { url } }, f.dependencies), WorkerError);
	}
	await assert.rejects(processImageEvent({ eventType: f.event.eventType }, f.dependencies), WorkerError);
	assert.equal(f.state.reads, 0);
});

test('one source referenced as both recipe and avatar fails explicitly before upload', async () => {
	const f = await fixture();
	f.dependencies.database.find = async () => ({
		targets: [f.target, { kind: 'avatar', id: randomUUID() }], completed: false,
	});
	await assert.rejects(processImageEvent(f.event, f.dependencies), { message: 'ambiguous_image_reference' });
	assert.equal(f.state.downloads, 0);
});

test('invalid image validation errors keep the PR1 error type', async () => {
	const f = await fixture();
	f.dependencies.blobs.download = async () => Buffer.alloc(0);
	await assert.rejects(processImageEvent(f.event, f.dependencies), InvalidImage);
});
