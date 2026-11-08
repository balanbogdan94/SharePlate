import assert from 'node:assert/strict';
import test from 'node:test';
import { app, InvocationContext, type EventGridFunctionOptions } from '@azure/functions';
import { databaseConfig, PostgresImages, readSettings } from './adapters.js';

const azure = {
	PGHOST: 'test.postgres.database.azure.com', PGDATABASE: 'shareplate', PGUSER: 'worker-identity',
	IMAGE_STORAGE_ACCOUNT_URL: 'https://test.blob.core.windows.net',
};
const local = {
	IMAGE_WORKER_LOCAL: 'true', PGHOST: '127.0.0.1', PGDATABASE: 'isolated-test', PGUSER: 'test',
	PGPASSWORD: 'local-test-only',
	IMAGE_STORAGE_CONNECTION_STRING: 'BlobEndpoint=http://127.0.0.1:10000/test;AccountName=test;AccountKey=unused',
};

test('production uses verified TLS and a managed identity token callback, not an env password', () => {
	const settings = readSettings({ ...azure, PGPASSWORD: 'must-not-be-used', PGSSLMODE: 'disable' });
	const config = databaseConfig(settings);
	assert.equal(settings.container, 'recipe-images');
	assert.deepEqual(config.ssl, { rejectUnauthorized: true });
	assert.equal(typeof config.password, 'function');
	assert.equal(config.connectionString, undefined);
});

test('local mode is explicit and restricted to loopback storage/database', () => {
	assert.equal(databaseConfig(readSettings(local)).ssl, false);
	assert.throws(() => readSettings({ ...local, PGHOST: azure.PGHOST }), { message: 'local_database_must_be_loopback' });
	assert.throws(() => readSettings({ ...local, IMAGE_STORAGE_CONNECTION_STRING: 'BlobEndpoint=https://test.blob.core.windows.net' }),
		{ message: 'local_storage_must_be_loopback' });
	assert.throws(() => readSettings({ ...local, WEBSITE_INSTANCE_ID: 'azure' }), { message: 'local_mode_not_allowed_in_azure' });
	assert.throws(() => readSettings({ ...local, WEBSITE_HOSTNAME: 'azure' }), { message: 'local_mode_not_allowed_in_azure' });
	assert.throws(() => readSettings({ ...local, IMAGE_WORKER_LOCAL: 'false' }), { message: 'invalid_local_mode' });
});

test('invalid settings fail explicitly without embedding env values in error messages', () => {
	for (const url of ['http://test.blob.core.windows.net', 'https://user:secret@test.blob.core.windows.net',
		'https://test.blob.core.windows.net?sig=secret', 'https://test.blob.core.windows.net/container', 'invalid']) {
		assert.throws(() => readSettings({ ...azure, IMAGE_STORAGE_ACCOUNT_URL: url }), { message: 'invalid_storage_account_url' });
	}
	for (const port of ['0', '65536', 'NaN', '5432.5', '']) {
		assert.throws(() => readSettings({ ...azure, PGPORT: port }), { message: 'invalid_database_port' });
	}
	assert.throws(() => readSettings({ ...azure, PGUSER: '' }), { message: 'missing_setting_PGUSER' });
	assert.throws(() => readSettings({ ...azure, IMAGE_CONTAINER_NAME: 'user/images' }), { message: 'invalid_image_container' });
});

test('Function registers Event Grid, logs/rethrows failures without raw SDK/DB details', async (t) => {
	let registration: EventGridFunctionOptions | undefined;
	t.mock.method(app, 'eventGrid', (name: string, options: EventGridFunctionOptions) => {
		assert.equal(name, 'optimizeImage');
		registration = options;
	});
	await import('./function.js');
	assert.ok(registration);
	const handler = registration.handler;
	const previousEnv = process.env;
	t.after(() => { process.env = previousEnv; });
	process.env = {
		...local,
		IMAGE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=http;AccountName=test;AccountKey=dGVzdA==;BlobEndpoint=http://127.0.0.1:10000/test;',
	};
	const find = t.mock.method(PostgresImages.prototype, 'find', async () => {
		throw new Error('password=do-not-log; token=do-not-log; https://private.example/image');
	});
	const messages: unknown[][] = [];
	const context = new InvocationContext({ functionName: 'optimizeImage', logHandler: (...args: unknown[]) => { messages.push(args); } });
	const event = {
		id: 'synthetic-event', subject: 'synthetic-subject', topic: 'synthetic-topic',
		eventType: 'Microsoft.Storage.BlobCreated', eventTime: '2026-01-01T00:00:00Z',
		dataVersion: '1', metadataVersion: '1',
		data: { url: 'http://127.0.0.1:10000/test/recipe-images/11111111-1111-1111-1111-111111111111.png' },
	};
	await assert.rejects(async () => { await handler(event, context); }, (error: unknown) => {
		assert.ok(error instanceof Error);
		assert.equal(error.message, 'image_processing_failed');
		assert.equal(error.cause, undefined);
		return true;
	});
	assert.equal(find.mock.callCount(), 1);
	assert.match(JSON.stringify(messages), /image_worker_failed/);
	assert.doesNotMatch(JSON.stringify(messages), /do-not-log|private\.example/);
	messages.length = 0;
	await handler({ ...event, eventType: 'Microsoft.Storage.BlobDeleted' }, context);
	assert.match(JSON.stringify(messages), /image_worker_result/);
	assert.match(JSON.stringify(messages), /ignored/);
});
