import { z } from 'zod';

function validConnectionString(value: string | undefined): boolean {
	if (
		!value ||
		!/(?:^|;)InstrumentationKey=[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}(?:;|$)/iu.test(value)
	)
		return false;
	return value
		.split(';')
		.filter((part) => /^(?:Ingestion|Live)Endpoint=/iu.test(part))
		.every((part) => {
			try {
				const url = new URL(part.slice(part.indexOf('=') + 1));
				return (
					url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
				);
			} catch (error) {
				if (!(error instanceof TypeError)) throw error;
				return false;
			}
		});
}

const telemetrySchema = z
	.object({
		VITE_TELEMETRY_ENABLED: z.enum(['true', 'false']).default('false'),
		VITE_APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().trim().optional(),
		VITE_BUILD_VERSION: z
			.string()
			.regex(/^[a-zA-Z0-9._-]{1,64}$/u)
			.default('development'),
	})
	.refine(
		(value) =>
			value.VITE_TELEMETRY_ENABLED !== 'true' ||
			validConnectionString(value.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING),
		{ message: 'Enabled telemetry requires a valid Application Insights connection string.' },
	);

export function parseTelemetryConfig(values: Record<string, unknown>, production: boolean) {
	const result = telemetrySchema.safeParse(values);
	if (!result.success) {
		throw new Error(
			'Invalid telemetry configuration. Check the enable flag, connection string and build version.',
		);
	}
	return {
		enabled: production && result.data.VITE_TELEMETRY_ENABLED === 'true',
		connectionString: result.data.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
		buildVersion: result.data.VITE_BUILD_VERSION,
	};
}
