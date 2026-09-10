import { z } from 'zod';

const apiBaseUrlSchema = z
	.string()
	.trim()
	.min(1)
	.refine(
		(value) => {
			if (value.startsWith('/')) {
				return true;
			}
			try {
				const parsedUrl = new URL(value);
				return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{
			message:
				'VITE_API_BASE_URL must be a root-relative path (for example /api) or an absolute http/https URL.',
		},
	);

const envSchema = z.object({
	VITE_API_BASE_URL: apiBaseUrlSchema.default('http://localhost:5211/api'),
	VITE_ENTRA_CLIENT_ID: z.string().uuid().default('6113841b-007a-4c0f-94c1-f190169b3ca4'),
	VITE_ENTRA_AUTHORITY: z
		.url()
		.default('https://shareplate.ciamlogin.com/0898bb7a-da40-458d-82c3-6340b77ec68b'),
	VITE_ENTRA_API_SCOPE: z
		.string()
		.min(1)
		.default('api://009e0524-06fc-42ab-9124-c27633d315b4/access_as_user'),
	VITE_ENTRA_REDIRECT_URI: z.url().default('http://localhost:5173'),
});

const parseResult = envSchema.safeParse({
	VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
	VITE_ENTRA_CLIENT_ID: import.meta.env.VITE_ENTRA_CLIENT_ID,
	VITE_ENTRA_AUTHORITY: import.meta.env.VITE_ENTRA_AUTHORITY,
	VITE_ENTRA_API_SCOPE: import.meta.env.VITE_ENTRA_API_SCOPE,
	VITE_ENTRA_REDIRECT_URI: import.meta.env.VITE_ENTRA_REDIRECT_URI,
});

if (!parseResult.success) {
	const issueMessages = parseResult.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');
	throw new Error(`Invalid frontend environment configuration. ${issueMessages}`);
}

export const env = {
	apiBaseUrl: parseResult.data.VITE_API_BASE_URL.replace(/\/$/u, ''),
	entraClientId: parseResult.data.VITE_ENTRA_CLIENT_ID,
	entraAuthority: parseResult.data.VITE_ENTRA_AUTHORITY,
	entraApiScope: parseResult.data.VITE_ENTRA_API_SCOPE,
	entraRedirectUri: parseResult.data.VITE_ENTRA_REDIRECT_URI,
};
