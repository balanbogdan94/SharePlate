import { describe, expect, it } from 'vitest';
import type { ITelemetryItem } from '@microsoft/applicationinsights-web';
import { sanitizeTelemetryItem } from '@/lib/telemetryPolicy';
import { normalizeRoute } from '@/lib/telemetryRoutes';
import { parseTelemetryConfig } from '@/lib/telemetryConfig';

const api = new URL('https://api.example/api');
const marker = 'synthetic-private-marker';

describe('telemetry privacy', () => {
	it('removes resource IDs, email addresses, query strings and fragments', () => {
		expect(normalizeRoute(`/api/users/${marker}@example.com?search=${marker}#${marker}`)).toBe(
			'/api/users/*',
		);
		expect(normalizeRoute(`data:image/${marker}`)).toBe('/unknown');
	});

	it('rebuilds exception envelopes with only safe fields and stack frames', () => {
		const item: ITelemetryItem = {
			name: 'exception',
			baseType: 'ExceptionData',
			tags: { 'ai.user.id': marker, 'ai.session.id': marker },
			ext: {
				user: { id: marker },
				device: { ip: marker },
				trace: { traceID: 'a'.repeat(32), name: marker },
			},
			data: { token: marker },
			baseData: {
				properties: {
					code: 'query.failed',
					route: `/recipes/${marker}`,
					body: marker,
					serverTraceId: 'b'.repeat(32),
				},
				exceptions: [
					{
						message: marker,
						stack: marker,
						typeName: marker,
						parsedStack: [
							{
								fileName: `https://app.example/assets/index-abc.js`,
								line: 45,
								method: marker,
								assembly: marker,
							},
							{ fileName: `/Users/${marker}/source.ts`, line: 2 },
						],
					},
				],
			},
		};
		expect(sanitizeTelemetryItem(item, api, 'abc123', 'production')).toBe(true);
		const serialized = JSON.stringify(item);
		expect(serialized).not.toContain(marker);
		expect(serialized).toContain('query.failed');
		expect(serialized).toContain('index-abc.js');
		expect(serialized).toContain('b'.repeat(32));
	});

	it('normalizes API dependency URLs and drops non-API dependencies', () => {
		const item: ITelemetryItem = {
			name: 'dependency',
			baseType: 'RemoteDependencyData',
			baseData: {
				id: '|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.',
				target: `https://api.example/api/recipes/${marker}?token=${marker}`,
				name: `GET ${marker}`,
				success: false,
				responseCode: 500,
				duration: 10,
				properties: { Authorization: marker },
			},
		};
		expect(sanitizeTelemetryItem(item, api, 'abc123', 'production')).toBe(true);
		expect(JSON.stringify(item)).not.toContain(marker);
		expect(item.baseData?.data).toBe('https://api.example/api/recipes/*');
		for (const url of [
			'https://shareplate.ciamlogin.com/token',
			'https://storage.example/photo?sig=private',
			'data:image/png;base64,private',
		]) {
			item.baseData = { data: url };
			expect(sanitizeTelemetryItem(item, api, 'abc123', 'production')).toBe(false);
		}
	});

	it.each(['PageviewData', 'EventData', 'MetricData'])('drops analytics type %s', (baseType) => {
		expect(sanitizeTelemetryItem({ name: baseType, baseType }, api, 'abc123', 'production')).toBe(
			false,
		);
	});

	it.each([new Date(NaN), 'synthetic-private-marker', undefined])(
		'does not preserve an invalid dependency startTime',
		(startTime) => {
			const item: ITelemetryItem = {
				name: 'dependency',
				baseType: 'RemoteDependencyData',
				baseData: { target: 'https://api.example/api/plans', startTime, name: 'GET /api/plans' },
			};
			expect(sanitizeTelemetryItem(item, api, 'build', 'production')).toBe(true);
			expect(item.baseData?.startTime).toBeUndefined();
		},
	);
});

describe('telemetry configuration', () => {
	it('is intentionally disabled by default and outside production', () => {
		expect(parseTelemetryConfig({}, true).enabled).toBe(false);
		expect(
			parseTelemetryConfig(
				{
					VITE_TELEMETRY_ENABLED: 'true',
					VITE_APPLICATIONINSIGHTS_CONNECTION_STRING:
						'InstrumentationKey=11111111-1111-1111-1111-111111111111',
				},
				false,
			).enabled,
		).toBe(false);
	});

	it.each([
		{ VITE_TELEMETRY_ENABLED: 'true' },
		{ VITE_TELEMETRY_ENABLED: 'invalid' },
		{ VITE_BUILD_VERSION: marker + '@example.com' },
		{
			VITE_TELEMETRY_ENABLED: 'true',
			VITE_APPLICATIONINSIGHTS_CONNECTION_STRING:
				'InstrumentationKey=11111111-1111-1111-1111-111111111111;IngestionEndpoint=http://unsafe.example',
		},
	])('rejects invalid configuration without exposing values', (values) => {
		expect(() => parseTelemetryConfig(values, true)).toThrow('Invalid telemetry configuration.');
		expect(() => parseTelemetryConfig(values, true)).not.toThrow(marker);
	});
});
