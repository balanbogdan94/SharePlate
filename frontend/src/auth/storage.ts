export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
	expiresAtUtc: string;
};

const AUTH_STORAGE_KEY = 'shareplate.auth.tokens';

export function readStoredTokens(): AuthTokens | null {
	try {
		const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as Partial<AuthTokens>;
		if (
			typeof parsed.accessToken !== 'string' ||
			typeof parsed.refreshToken !== 'string' ||
			typeof parsed.expiresAtUtc !== 'string'
		) {
			return null;
		}

		return {
			accessToken: parsed.accessToken,
			refreshToken: parsed.refreshToken,
			expiresAtUtc: parsed.expiresAtUtc,
		};
	} catch {
		return null;
	}
}

export function writeStoredTokens(tokens: AuthTokens): void {
	window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
	window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAccessTokenExpired(expiresAtUtc: string): boolean {
	const expiresAtMs = new Date(expiresAtUtc).getTime();
	if (Number.isNaN(expiresAtMs)) {
		return true;
	}

	const nowMs = Date.now();
	const safetyWindowMs = 30_000;
	return expiresAtMs - safetyWindowMs <= nowMs;
}
