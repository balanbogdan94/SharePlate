// @vitest-environment node
import { expect, it } from 'vitest';

it('runs the shared test setup without browser globals in Node', () => {
	expect(typeof globalThis.document).toBe('undefined');
	expect(typeof globalThis.HTMLDialogElement).toBe('undefined');
});
