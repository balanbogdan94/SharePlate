import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiTokenRequest, msalInstance } from '@/auth/msal';

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
		if (error instanceof InteractionRequiredAuthError) return null;
		throw error;
	}
}
