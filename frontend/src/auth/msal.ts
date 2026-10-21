import {
	BrowserCacheLocation,
	PublicClientApplication,
	type Configuration,
	type RedirectRequest,
} from '@azure/msal-browser';
import { env } from '@/lib/env';

const authorityHost = new URL(env.entraAuthority).host;
const redirectUri = new URL('/redirect.html', env.entraRedirectUri).href;
const postLogoutRedirectUri = new URL('/', env.entraRedirectUri).href;

const msalConfig: Configuration = {
	auth: {
		clientId: env.entraClientId,
		authority: env.entraAuthority,
		knownAuthorities: [authorityHost],
		redirectUri,
		postLogoutRedirectUri,
	},
	cache: {
		cacheLocation: BrowserCacheLocation.LocalStorage,
	},
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const apiTokenRequest = {
	scopes: [env.entraApiScope],
} satisfies RedirectRequest;
