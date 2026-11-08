import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import { acquireApiAccessToken } from '@/auth/accessToken';

vi.mock('@/auth/accessToken', () => ({ acquireApiAccessToken: vi.fn() }));

beforeEach(() => {
	vi.mocked(acquireApiAccessToken).mockResolvedValue('synthetic-token');
});
afterEach(() => vi.unstubAllGlobals());

describe('API error contract', () => {
	it('refreshes once after 401 and does not treat recovered requests as failures', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
			.mockResolvedValueOnce(Response.json({ success: true }));
		vi.stubGlobal('fetch', fetch);
		await expect(apiFetch('/units')).resolves.toEqual({ success: true });
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(acquireApiAccessToken).toHaveBeenLastCalledWith(true);
	});

	it('preserves existing messages and extracts only a valid server trace ID', async () => {
		const traceId = 'a'.repeat(32);
		const body = JSON.stringify({ title: 'Unexpected error', traceId });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 500 })));
		try {
			await apiFetch('/recipes/private-id?search=private', { method: 'PUT' });
			throw new Error('Expected failure');
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect(error).toMatchObject({
				message: body,
				status: 500,
				traceId,
				route: '/recipes/*',
				method: 'PUT',
			});
		}
	});

	it('still returns undefined for HTTP 204', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
		await expect(apiFetch('/plans/id', { method: 'DELETE' })).resolves.toBeUndefined();
	});

	it('keeps AbortError intact and adds safe context to network failures', async () => {
		const aborted = new DOMException('Cancelled', 'AbortError');
		const fetch = vi
			.fn()
			.mockRejectedValueOnce(aborted)
			.mockRejectedValueOnce(new TypeError('Network failed'));
		vi.stubGlobal('fetch', fetch);
		await expect(apiFetch('/plans')).rejects.toBe(aborted);
		await expect(apiFetch('/recipes/private-id')).rejects.toMatchObject({
			status: null,
			route: '/recipes/*',
		});
	});
});
