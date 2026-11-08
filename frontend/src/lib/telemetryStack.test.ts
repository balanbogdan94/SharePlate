import { describe, expect, it } from 'vitest';
import { sanitizeStackFrames } from '@/lib/telemetryStack';

describe('safe stack frame positions', () => {
	it('reconstructs only the validated bundle location, not the method or URL', () => {
		expect(
			sanitizeStackFrames([
				{
					fileName: 'https://app.example/assets/main-abc.js',
					line: 1,
					assembly: 'at privateFunction (https://app.example/assets/main-abc.js:1:123)',
				},
			]),
		).toEqual([
			{
				level: 0,
				method: 'app',
				assembly: 'at app (main-abc.js:1:123)',
				fileName: 'main-abc.js',
				line: 1,
			},
		]);
	});

	it.each([
		'at privateFunction (https://app.example/assets/other.js:1:123)',
		'at privateFunction (https://app.example/assets/main-abc.js:2:123)',
		'at privateFunction (https://app.example/assets/main-abc.js:1:9007199254740992)',
		'synthetic-private-marker',
	])('does not trust inconsistent or invalid column metadata: %s', (assembly) => {
		const frames = sanitizeStackFrames([{ fileName: 'main-abc.js', line: 1, assembly }]);
		expect(frames[0].assembly).toBe('at app (main-abc.js:1)');
	});

	it.each([NaN, Infinity, -1, 0, 0.5])('drops invalid line number %s', (line) => {
		expect(sanitizeStackFrames([{ fileName: 'main-abc.js', line }])).toEqual([]);
	});
});
