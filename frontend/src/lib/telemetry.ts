import {
	ApplicationInsights,
	DistributedTracingModes,
	SeverityLevel,
} from '@microsoft/applicationinsights-web';
import { ApiError, isAbortError } from '@/lib/apiError';
import { env } from '@/lib/env';
import { safeErrorType, sanitizeTelemetryItem } from '@/lib/telemetryPolicy';
import { normalizeRoute } from '@/lib/telemetryRoutes';

type ErrorCode =
	| 'query.failed'
	| 'mutation.failed'
	| 'auth.provision.failed'
	| 'auth.login.failed'
	| 'auth.logout.failed'
	| 'auth.token.failed'
	| 'plan.export.failed'
	| 'plan.shortcut.failed'
	| 'react.crashed'
	| 'router.failed'
	| 'global.error'
	| 'global.rejection'
	| 'pwa.registration.failed';

let client: ApplicationInsights | undefined;
let initialized = false;
const reported = new WeakSet<object>();

function isExpected(error: unknown): boolean {
	if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status ?? 0))
		return true;
	if (isAbortError(error)) return true;
	return (
		error !== null &&
		typeof error === 'object' &&
		'errorCode' in error &&
		['interaction_required', 'login_required', 'consent_required', 'user_cancelled'].includes(
			String(error.errorCode),
		)
	);
}

function safeStack(error: unknown): string {
	if (!(error instanceof Error) || !error.stack) return '';
	return error.stack
		.split('\n')
		.flatMap((line) => {
			const frame = /\/assets\/([a-zA-Z0-9_-]+\.js):(\d+):(\d+)\)?$/u.exec(line);
			return frame
				? [`    at app (https://shareplate.invalid/assets/${frame[1]}:${frame[2]}:${frame[3]})`]
				: [];
		})
		.slice(0, 30)
		.join('\n');
}

function underlyingError(error: unknown): unknown {
	return error instanceof Error && error.cause instanceof ApiError ? error.cause : error;
}

function errorProperties(source: unknown, code: ErrorCode) {
	return {
		code,
		errorType: safeErrorType(source),
		route: source instanceof ApiError ? source.route : normalizeRoute(window.location.pathname),
		serverTraceId: source instanceof ApiError ? source.traceId : undefined,
		method: source instanceof ApiError ? source.method : undefined,
		status: source instanceof ApiError ? source.status : undefined,
	};
}

function shouldWarn(error: unknown, requested: boolean): boolean {
	return requested || (error instanceof ApiError && error.status === 429);
}

export function reportFailure(error: unknown, code: ErrorCode, warning = false): void {
	const source = underlyingError(error);
	if (isExpected(source)) return;
	if (error !== null && typeof error === 'object') {
		if (reported.has(error)) return;
		reported.add(error);
	}
	const properties = errorProperties(source, code);
	const asWarning = shouldWarn(source, warning);
	if (!client) {
		if (asWarning) console.warn(code, properties.errorType);
		else console.error(code, properties.errorType);
		return;
	}
	try {
		if (asWarning) {
			client.trackTrace({ message: code, severityLevel: SeverityLevel.Warning, properties });
		} else {
			const exception = new Error(code);
			exception.name = properties.errorType;
			exception.stack = safeStack(error);
			client.trackException({ exception, severityLevel: SeverityLevel.Error, properties });
		}
	} catch {
		console.error('telemetry.reporting.failed');
	}
}

export function initializeTelemetry(): void {
	if (initialized) return;
	initialized = true;
	if (!env.telemetry.enabled) return;
	const apiUrl = new URL(env.apiBaseUrl, window.location.origin);
	try {
		client = createTelemetryClient(
			apiUrl,
			env.telemetry.connectionString,
			env.telemetry.buildVersion,
		);
		window.addEventListener('error', (event) => reportFailure(event.error, 'global.error'));
		window.addEventListener('unhandledrejection', (event) =>
			reportFailure(event.reason, 'global.rejection'),
		);
	} catch {
		console.error('telemetry.initialization.failed');
	}
}

export function createTelemetryClient(
	apiUrl: URL,
	connectionString: string | undefined,
	buildVersion: string,
) {
	const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const allowed = `${escape(apiUrl.href.replace(/\/$/u, ''))}|${escape(apiUrl.pathname.replace(/\/$/u, ''))}`;
	const insights = new ApplicationInsights({
		config: {
			connectionString,
			samplingPercentage: 100,
			distributedTracingMode: DistributedTracingModes.W3C,
			enableCorsCorrelation: true,
			correlationHeaderDomains: [apiUrl.host],
			excludeRequestFromAutoTrackingPatterns: [new RegExp(`^(?!(?:${allowed})(?:/|\\?|$))`, 'u')],
			disableAjaxTracking: true,
			disableFetchTracking: false,
			maxAjaxCallsPerView: -1,
			enableRequestHeaderTracking: false,
			enableResponseHeaderTracking: false,
			disableExceptionTracking: true,
			enableUnhandledPromiseRejectionTracking: false,
			enableAutoRouteTracking: false,
			disableCookiesUsage: true,
			isStorageUseDisabled: true,
			enableSessionStorageBuffer: false,
			featureOptIn: { sdkStats: { mode: 2 } },
			extensionConfig: {
				AppInsightsCfgSyncPlugin: { syncMode: 0, blkCdnCfg: true },
			},
		},
	});
	insights.addTelemetryInitializer((item) =>
		sanitizeTelemetryItem(item, apiUrl, buildVersion, 'production'),
	);
	insights.loadAppInsights();
	return insights;
}
