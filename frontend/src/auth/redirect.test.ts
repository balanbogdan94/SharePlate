import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { broadcastResponseToMainFrame } = vi.hoisted(() => ({
	broadcastResponseToMainFrame: vi.fn(),
}));

vi.mock('@azure/msal-browser/redirect-bridge', () => ({
	broadcastResponseToMainFrame,
}));

describe('standalone authentication callback', () => {
	beforeEach(() => {
		vi.resetModules();
		broadcastResponseToMainFrame.mockReset();
		document.body.innerHTML = '<p id="auth-status" role="status">Completing sign-in...</p>';
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	it('hands the response to the MSAL bridge without starting the app', async () => {
		broadcastResponseToMainFrame.mockResolvedValue(undefined);

		await import('./redirect');

		expect(broadcastResponseToMainFrame).toHaveBeenCalledExactlyOnceWith();
		expect(document.getElementById('auth-status')).toHaveTextContent('Completing sign-in...');
	});

	it('logs callback failures and shows a recovery message', async () => {
		const error = new Error('Invalid authentication response');
		const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
		broadcastResponseToMainFrame.mockRejectedValue(error);

		await import('./redirect');

		expect(logError).toHaveBeenCalledWith('Authentication callback failed.', error);
		expect(document.getElementById('auth-status')).toHaveTextContent(
			'Unable to complete sign-in. Return to SharePlate and try again.',
		);
	});
});
