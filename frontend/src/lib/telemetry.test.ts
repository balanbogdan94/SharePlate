import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const sdk = vi.hoisted(() => ({
	load: vi.fn(),
	exception: vi.fn(),
	trace: vi.fn(),
	initializer: vi.fn(),
	constructor: vi.fn(),
}));
vi.mock('@microsoft/applicationinsights-web', () => ({
	ApplicationInsights: class {
		constructor(options: unknown) {
			sdk.constructor(options);
		}
		loadAppInsights = sdk.load;
		trackException = sdk.exception;
		trackTrace = sdk.trace;
		addTelemetryInitializer = sdk.initializer;
	},
	DistributedTracingModes: { W3C: 2 },
	SeverityLevel: { Error: 3, Warning: 2 },
}));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.stubEnv('PROD', true);
	vi.stubEnv('VITE_TELEMETRY_ENABLED', 'true');
	vi.stubEnv(
		'VITE_APPLICATIONINSIGHTS_CONNECTION_STRING',
		'InstrumentationKey=11111111-1111-1111-1111-111111111111',
	);
});
afterEach(() => vi.unstubAllEnvs());

async function telemetry() {
	const module = await import('@/lib/telemetry');
	module.initializeTelemetry();
	return module;
}

describe('error reporting ownership', () => {
	it('initializes only once and reports the same error only once across boundaries', async () => {
		const module = await telemetry();
		const { ApiError } = await import('@/lib/apiError');
		module.initializeTelemetry();
		const error = new ApiError('private body', {
			status: 500,
			route: '/recipes/*',
			method: 'GET',
			traceId: 'a'.repeat(32),
		});
		module.reportFailure(error, 'query.failed');
		module.reportFailure(error, 'router.failed');
		expect(sdk.load).toHaveBeenCalledTimes(1);
		expect(sdk.exception).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(sdk.exception.mock.calls)).not.toContain('private body');
		expect(sdk.exception.mock.calls[0][0].properties.serverTraceId).toBe('a'.repeat(32));
	});

	it('ignores expected validation/auth errors and normal cancellation', async () => {
		const module = await telemetry();
		const { ApiError } = await import('@/lib/apiError');
		for (const status of [400, 401, 403, 404, 409, 422]) {
			module.reportFailure(
				new ApiError('private', { status, route: '/plans', method: 'POST' }),
				'mutation.failed',
			);
		}
		module.reportFailure(new DOMException('private', 'AbortError'), 'query.failed');
		module.reportFailure({ errorCode: 'user_cancelled', message: 'private' }, 'auth.login.failed');
		expect(sdk.exception).not.toHaveBeenCalled();
	});

	it('reports only a final query failure after retries and preserves local mutation callbacks', async () => {
		const module = await telemetry();
		const { ApiError } = await import('@/lib/apiError');
		const client = new QueryClient({
			queryCache: new QueryCache({
				onError: (error) => module.reportFailure(error, 'query.failed'),
			}),
			mutationCache: new MutationCache({
				onError: (error) => module.reportFailure(error, 'mutation.failed'),
			}),
			defaultOptions: { queries: { retry: 2, retryDelay: 0 } },
		});
		const query = vi
			.fn()
			.mockRejectedValue(new ApiError('private', { status: 500, route: '/plans', method: 'GET' }));
		await expect(client.fetchQuery({ queryKey: ['test'], queryFn: query })).rejects.toBeInstanceOf(
			ApiError,
		);
		expect(query).toHaveBeenCalledTimes(3);
		expect(sdk.exception).toHaveBeenCalledTimes(1);
		const localError = vi.fn();
		const mutation = client.getMutationCache().build(client, {
			mutationFn: async () => {
				throw new Error('private');
			},
			onError: localError,
		});
		await expect(mutation.execute(undefined)).rejects.toThrow('private');
		expect(localError).toHaveBeenCalledTimes(1);
		expect(sdk.exception).toHaveBeenCalledTimes(2);
		client.clear();
	});

	it('surfaces telemetry transport failures without changing application behavior', async () => {
		const module = await telemetry();
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		sdk.exception.mockImplementationOnce(() => {
			throw new Error('private transport details');
		});
		expect(() => module.reportFailure(new Error('private'), 'react.crashed')).not.toThrow();
		expect(consoleError).toHaveBeenCalledWith('telemetry.reporting.failed');
		consoleError.mockRestore();
	});
});
