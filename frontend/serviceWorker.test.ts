// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type WorkerFetchEvent = {
	request: { url: string; method: string; mode: string };
	respondWith: (response: Promise<Response>) => void;
};

const source = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');

describe('service-worker authentication callback handling', () => {
	const listeners = new Map<string, (event: WorkerFetchEvent) => void>();
	const fetchMock = vi.fn();
	const cacheMatch = vi.fn();
	const cachePut = vi.fn();
	const cacheOpen = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		listeners.clear();
		cacheOpen.mockResolvedValue({ put: cachePut });
		runInNewContext(source, {
			URL,
			fetch: fetchMock,
			caches: { match: cacheMatch, open: cacheOpen },
			self: {
				location: { origin: 'https://shareplate.example' },
				addEventListener: (name: string, listener: (event: WorkerFetchEvent) => void) =>
					listeners.set(name, listener),
			},
		});
	});

	it.each(['/redirect.html', '/redirect.html?code=test-code&state=test-state'])(
		'does not intercept or cache %s',
		(path) => {
			const respondWith = vi.fn();

			listeners.get('fetch')?.({
				request: { url: `https://shareplate.example${path}`, method: 'GET', mode: 'navigate' },
				respondWith,
			});

			expect(respondWith).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(cacheMatch).not.toHaveBeenCalled();
			expect(cacheOpen).not.toHaveBeenCalled();
		},
	);

	it('preserves network-first caching for app navigations', async () => {
		const response = new Response('<html>SharePlate</html>');
		fetchMock.mockResolvedValue(response);
		const respondWith = vi.fn<(response: Promise<Response>) => void>();
		const request = {
			url: 'https://shareplate.example/plans',
			method: 'GET',
			mode: 'navigate',
		};

		listeners.get('fetch')?.({ request, respondWith });

		expect(respondWith).toHaveBeenCalledOnce();
		expect(await respondWith.mock.calls[0]?.[0]).toBe(response);
		expect(fetchMock).toHaveBeenCalledWith(request);
		expect(cacheOpen).toHaveBeenCalledWith('shareplate-runtime-v2');
		expect(cachePut).toHaveBeenCalledWith(request, expect.any(Response));
	});
});
