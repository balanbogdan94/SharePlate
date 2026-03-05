const DEFAULT_API_BASE = 'http://localhost:5211/api';

export const apiBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE;

type ApiAuthConfig = {
	getAccessToken: () => string | null;
	refreshAccessToken: () => Promise<string | null>;
};

let apiAuthConfig: ApiAuthConfig | null = null;

export function configureApiAuth(config: ApiAuthConfig): void {
	apiAuthConfig = config;
}

function normalizePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

export async function apiFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const normalizedPath = normalizePath(path);
	const isRefreshRequest = normalizedPath === '/auth/refresh';

	const request = async (overrideAccessToken?: string): Promise<Response> => {
		const accessToken = overrideAccessToken ?? apiAuthConfig?.getAccessToken() ?? null;

		return fetch(`${apiBaseUrl}${normalizedPath}`, {
			headers: {
				'Content-Type': 'application/json',
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				...(init?.headers ?? {}),
			},
			...init,
		});
	};

	let response = await request();

	if (!response.ok && response.status === 401 && !isRefreshRequest && apiAuthConfig) {
		const refreshedAccessToken = await apiAuthConfig.refreshAccessToken();
		if (refreshedAccessToken) {
			response = await request(refreshedAccessToken);
		}
	}

	if (!response.ok) {
		const body = await response.text();
		throw new Error(body || `Request failed with status ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}
