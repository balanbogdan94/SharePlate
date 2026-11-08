type ApiErrorContext = {
	status: number | null;
	route: string;
	method: string;
	traceId?: string;
};

export class ApiError extends Error {
	readonly name = 'ApiError';
	readonly status: number | null;
	readonly route: string;
	readonly method: string;
	readonly traceId?: string;

	constructor(message: string, context: ApiErrorContext) {
		super(message);
		this.status = context.status;
		this.route = context.route;
		this.method = context.method;
		this.traceId = context.traceId;
	}
}

export function isAbortError(error: unknown): boolean {
	return (
		error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
	);
}
