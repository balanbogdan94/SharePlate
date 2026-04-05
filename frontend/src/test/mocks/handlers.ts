import { http, HttpResponse } from 'msw';

const healthHandler = http.get('/api/health', () =>
	HttpResponse.json({
		ok: true,
	}),
);

export const handlers = [healthHandler];
