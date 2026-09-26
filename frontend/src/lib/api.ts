import { env } from '@/lib/env';
import { acquireApiAccessToken } from '@/auth/accessToken';

export const apiBaseUrl = env.apiBaseUrl;

function getLocalDateHeaderValue(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function normalizePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const normalizedPath = normalizePath(path);
	const isFormData = init?.body instanceof FormData;

	const request = async (forceRefresh = false): Promise<Response> => {
		const accessToken = await acquireApiAccessToken(forceRefresh);

		return fetch(`${apiBaseUrl}${normalizedPath}`, {
			headers: {
				...(isFormData ? {} : { 'Content-Type': 'application/json' }),
				...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				'X-Local-Date': getLocalDateHeaderValue(),
				...(init?.headers ?? {}),
			},
			...init,
		});
	};

	let response = await request();

	if (!response.ok && response.status === 401) {
		response = await request(true);
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
