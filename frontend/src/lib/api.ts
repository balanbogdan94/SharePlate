const DEFAULT_API_BASE = 'http://localhost:5211/api';

export const apiBaseUrl =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE;

export async function apiFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const response = await fetch(`${apiBaseUrl}${normalizedPath}`, {
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {}),
		},
		...init,
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(body || `Request failed with status ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}
