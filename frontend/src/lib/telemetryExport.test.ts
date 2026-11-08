import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { createTelemetryClient } from '@/lib/telemetry';

type ExportedEnvelope = {
	time: string;
	data: {
		baseType: string;
		baseData: {
			name?: string;
			duration?: string;
			exceptions?: {
				stack: string;
				parsedStack: { assembly: string; fileName: string; line: number }[];
			}[];
		};
	};
};

it('filters the real browser SDK payload before HTTP export', async () => {
	const payloads: string[] = [];
	let traceparent: string | null = null;
	server.use(
		http.post('https://telemetry.example/v2/track', async ({ request }) => {
			payloads.push(await request.text());
			return HttpResponse.json({ itemsReceived: 2, itemsAccepted: 2, errors: [] });
		}),
		http.get('https://api.example/api/recipes/:id', ({ request }) => {
			traceparent = request.headers.get('traceparent');
			return HttpResponse.json({ message: 'synthetic-private-marker' }, { status: 500 });
		}),
	);
	const client = createTelemetryClient(
		new URL('https://api.example/api'),
		'InstrumentationKey=11111111-1111-1111-1111-111111111111;IngestionEndpoint=https://telemetry.example',
		'test-build',
	);
	try {
		const exception = new Error('synthetic-private-marker');
		exception.stack =
			'Error: synthetic-private-marker\n at app (https://app.example/assets/index-abc.js:12:34)';
		client.trackException({
			exception,
			properties: {
				code: 'query.failed',
				route: '/recipes/synthetic-private-marker',
				token: 'synthetic-private-marker',
			},
		});
		await fetch(
			'https://api.example/api/recipes/synthetic-private-marker?token=synthetic-private-marker',
			{
				headers: { Authorization: 'Bearer synthetic-private-marker' },
			},
		);
		expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/u);
		client.trackDependencyData({
			id: '|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.',
			name: 'GET /api/plans',
			target: 'https://api.example/api/plans?search=synthetic-private-marker',
			type: 'Fetch',
			startTime: new Date('2026-01-01T00:00:00.000Z'),
			duration: 5000,
			responseCode: 200,
			success: true,
		});
		client.flush(false, () => {});
		await waitFor(() => expect(payloads.length).toBeGreaterThan(0));
		const payload = payloads.join('\n');
		expect(payload).not.toContain('synthetic-private-marker');
		expect(payload).not.toContain('ai.user.id');
		expect(payload).not.toContain('ai.session.id');
		expect(payload).toContain('query.failed');
		expect(payload).toContain('/api/recipes/*');
		expect(payload).toContain('index-abc.js');
		expect(payload).toContain('index-abc.js:12:34');
		const envelopes = payloads.flatMap((payload): ExportedEnvelope[] => JSON.parse(payload));
		const dependency = envelopes.find((item) => item.data.baseData.name === 'GET /api/plans');
		expect(dependency?.time).toBe('2026-01-01T00:00:00.000Z');
		expect(dependency?.data.baseData.duration).toBe('00:00:05.000');
	} finally {
		client.unload(false);
	}
});

it('keeps distinct minified call sites in real SDK exception payloads', async () => {
	const payloads: string[] = [];
	server.use(
		http.post('https://telemetry.example/v2/track', async ({ request }) => {
			payloads.push(await request.text());
			return HttpResponse.json({ itemsReceived: 2, itemsAccepted: 2, errors: [] });
		}),
	);
	const client = createTelemetryClient(
		new URL('https://api.example/api'),
		'InstrumentationKey=11111111-1111-1111-1111-111111111111;IngestionEndpoint=https://telemetry.example',
		'test-build',
	);
	try {
		for (const column of [123, 999]) {
			const exception = new Error('synthetic-private-marker');
			exception.stack = `Error: synthetic-private-marker\n at privateFunction (https://app.example/assets/main-abc.js:1:${column})`;
			client.trackException({ exception, properties: { code: 'react.crashed' } });
		}
		client.flush(false, () => {});
		await waitFor(() => expect(payloads.length).toBeGreaterThan(0));
		const envelopes = payloads.flatMap((payload): ExportedEnvelope[] => JSON.parse(payload));
		const frames = envelopes.flatMap((item) => item.data.baseData.exceptions ?? []);
		expect(frames).toHaveLength(2);
		expect(frames[0].stack).toContain('main-abc.js:1:123');
		expect(frames[1].stack).toContain('main-abc.js:1:999');
		expect(frames[0].parsedStack[0].assembly).not.toBe(frames[1].parsedStack[0].assembly);
		const payload = payloads.join('\n');
		expect(payload).not.toContain('synthetic-private-marker');
		expect(payload).not.toContain('privateFunction');
		expect(payload).not.toContain('https://app.example/assets');
	} finally {
		client.unload(false);
	}
});
