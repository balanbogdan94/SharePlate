import {
	BrowserAuthError,
	BrowserAuthErrorCodes,
	InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { apiTokenRequest, msalInstance } from '@/auth/msal';

// When the refresh token expired, MSAL falls back to a hidden iframe, which times out
// (e.g. in an installed PWA or with blocked third-party cookies) instead of reporting interaction_required.
function requiresInteraction(error: unknown): boolean {
	return (
		error instanceof InteractionRequiredAuthError ||
		(error instanceof BrowserAuthError && error.errorCode === BrowserAuthErrorCodes.timedOut)
	);
}

export async function acquireApiAccessToken(forceRefresh = false): Promise<string | null> {
	const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
	if (!account) return null;

	try {
		const result = await msalInstance.acquireTokenSilent({
			...apiTokenRequest,
			account,
			forceRefresh,
		});
		return result.accessToken;
	} catch (error) {
		if (!requiresInteraction(error)) throw error;

		await msalInstance.acquireTokenRedirect({
			...apiTokenRequest,
			account,
			redirectStartPage: window.location.href,
		});
		return null;
	}
}
