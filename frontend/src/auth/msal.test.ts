import { afterEach, describe, expect, it, vi } from 'vitest';

describe('authentication callback configuration', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it.each([
		'http://localhost:5173',
		'http://localhost:5173/redirect.html',
		'https://shareplate.example/redirect.html',
	])(
		'uses the standalone bridge and a separate logout destination for %s',
		async (configuredUri) => {
			vi.resetModules();
			vi.stubEnv('VITE_ENTRA_REDIRECT_URI', configuredUri);

			const { msalInstance } = await import('./msal');
			const { auth, cache } = msalInstance.getConfiguration();

			expect(auth.redirectUri).toBe(new URL('/redirect.html', configuredUri).href);
			expect(auth.postLogoutRedirectUri).toBe(new URL('/', configuredUri).href);
			expect(cache.cacheLocation).toBe('localStorage');
		},
	);
});
