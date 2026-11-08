import { env } from '@/lib/env';
import { acquireApiAccessToken } from '@/auth/accessToken';
import { ApiError, isAbortError } from '@/lib/apiError';
import { safeTraceId } from '@/lib/telemetryPolicy';
import { normalizeRoute } from '@/lib/telemetryRoutes';

const apiBaseUrl = env.apiBaseUrl;

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
		}).catch((error: unknown) => {
			if (isAbortError(error)) throw error;
			throw new ApiError(error instanceof Error ? error.message : 'Network request failed.', {
				status: null,
				route: normalizeRoute(normalizedPath),
				method: init?.method ?? 'GET',
			});
		});
	};

	let response = await request();

	if (!response.ok && response.status === 401) {
		response = await request(true);
	}

	if (!response.ok) {
		const body = await response.text();
		throw new ApiError(body || `Request failed with status ${response.status}`, {
			status: response.status,
			route: normalizeRoute(normalizedPath),
			method: init?.method ?? 'GET',
			traceId: readTraceId(body),
		});
	}

	function readTraceId(body: string): string | undefined {
		try {
			const value: unknown = JSON.parse(body);
			return value !== null && typeof value === 'object' && 'traceId' in value
				? safeTraceId(value.traceId)
				: undefined;
		} catch (error) {
			if (!(error instanceof SyntaxError)) throw error;
			return undefined;
		}
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}
