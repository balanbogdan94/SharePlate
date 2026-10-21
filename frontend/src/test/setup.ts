import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/test/mocks/server';

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' });
	if (typeof HTMLDialogElement === 'undefined') return;
	Object.defineProperties(HTMLDialogElement.prototype, {
		showModal: {
			configurable: true,
			value: function (this: HTMLDialogElement) {
				this.setAttribute('open', '');
			},
		},
		close: {
			configurable: true,
			value: function (this: HTMLDialogElement) {
				this.removeAttribute('open');
			},
		},
	});
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
