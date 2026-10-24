import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

void broadcastResponseToMainFrame().catch((error: unknown) => {
	console.error('Authentication callback failed.', error);
	const status = document.getElementById('auth-status');
	if (status) {
		status.textContent = 'Unable to complete sign-in. Return to SharePlate and try again.';
	}
	document.getElementById('auth-return')?.removeAttribute('hidden');
});
