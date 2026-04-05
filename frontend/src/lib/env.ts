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
});

const parseResult = envSchema.safeParse({
	VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});

if (!parseResult.success) {
	const issueMessages = parseResult.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');
	throw new Error(`Invalid frontend environment configuration. ${issueMessages}`);
}

export const env = {
	apiBaseUrl: parseResult.data.VITE_API_BASE_URL.replace(/\/$/u, ''),
};
