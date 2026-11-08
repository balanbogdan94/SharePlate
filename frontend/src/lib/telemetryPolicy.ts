import type { ITelemetryItem } from '@microsoft/applicationinsights-web';
import { normalizeRoute } from '@/lib/telemetryRoutes';
import { sanitizeStackFrames } from '@/lib/telemetryStack';
const errorTypes = new Set([
	'Error',
	'ApiError',
	'TypeError',
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'DOMException',
	'BrowserAuthError',
	'ServerError',
]);
const codes = new Set([
	'query.failed',
	'mutation.failed',
	'auth.provision.failed',
	'auth.login.failed',
	'auth.logout.failed',
	'auth.token.failed',
	'plan.export.failed',
	'plan.shortcut.failed',
	'react.crashed',
	'router.failed',
	'global.error',
	'global.rejection',
	'pwa.registration.failed',
]);

export function safeErrorType(error: unknown): string {
	return error instanceof Error && errorTypes.has(error.name) ? error.name : 'Error';
}

export function safeTraceId(value: unknown): string | undefined {
	return typeof value === 'string' && /^[a-f0-9]{32}$/iu.test(value) ? value : undefined;
}

function object(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function sanitizeContext(item: ITelemetryItem, buildVersion: string, environment: string) {
	const properties = object(object(item.baseData).properties);
	const code =
		typeof properties.code === 'string' && codes.has(properties.code)
			? properties.code
			: 'global.error';
	const route = normalizeRoute(
		typeof properties.route === 'string' ? properties.route : window.location.pathname,
	);
	const trace = object(object(item.ext).trace);
	item.tags = { 'ai.cloud.role': 'SharePlate.Web', 'ai.application.ver': buildVersion };
	item.ext = {
		trace: {
			traceID: safeTraceId(trace.traceID),
			parentID:
				typeof trace.parentID === 'string' && /^[a-f0-9]{16}$/iu.test(trace.parentID)
					? trace.parentID
					: undefined,
			name: route,
		},
	};
	return Object.fromEntries(
		Object.entries({
			code,
			route,
			buildVersion,
			environment,
			serverTraceId: safeTraceId(properties.serverTraceId),
			...safeHttpContext(properties),
			errorType:
				typeof properties.errorType === 'string' && errorTypes.has(properties.errorType)
					? properties.errorType
					: undefined,
		}).filter(([, value]) => value !== undefined && value !== null),
	);
}

function safeHttpContext(properties: Record<string, unknown>) {
	return {
		method:
			typeof properties.method === 'string' &&
			/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/u.test(properties.method)
				? properties.method
				: undefined,
		status:
			typeof properties.status === 'number' &&
			Number.isInteger(properties.status) &&
			properties.status >= 0 &&
			properties.status <= 599
				? properties.status
				: undefined,
	};
}

export function sanitizeTelemetryItem(
	item: ITelemetryItem,
	apiUrl: URL,
	buildVersion: string,
	environment: string,
): boolean {
	if (!['ExceptionData', 'MessageData', 'RemoteDependencyData'].includes(item.baseType ?? ''))
		return false;
	const base = object(item.baseData);
	const safeProperties = sanitizeContext(item, buildVersion, environment);
	item.data = {};
	if (item.baseType === 'RemoteDependencyData')
		return sanitizeDependency(item, base, apiUrl, safeProperties);
	if (item.baseType === 'MessageData') {
		item.baseData = {
			message: safeProperties.code,
			severityLevel: base.severityLevel,
			properties: safeProperties,
		};
		return true;
	}
	const exception = object(Array.isArray(base.exceptions) ? base.exceptions[0] : undefined);
	const frames = sanitizeStackFrames(exception.parsedStack);
	item.baseData = {
		ver: 2,
		severityLevel: base.severityLevel,
		properties: safeProperties,
		exceptions: [
			{
				id: 1,
				outerId: 0,
				typeName: typeof safeProperties.errorType === 'string' ? safeProperties.errorType : 'Error',
				message: safeProperties.code,
				hasFullStack: false,
				stack: frames.map((frame) => frame.assembly).join('\n'),
				parsedStack: frames,
			},
		],
	};
	return true;
}

function dependencyDestination(base: Record<string, unknown>): unknown {
	return typeof base.target === 'string' && /^https?:\/\//u.test(base.target)
		? base.target
		: base.data;
}

function dependencyMethod(base: Record<string, unknown>): string {
	return typeof base.name === 'string'
		? (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/u.exec(base.name)?.[1] ?? 'HTTP')
		: 'HTTP';
}

function dependencyStartTime(value: unknown): Date | undefined {
	return value instanceof Date && Number.isFinite(value.getTime())
		? new Date(value.getTime())
		: undefined;
}

function sanitizeDependency(
	item: ITelemetryItem,
	base: Record<string, unknown>,
	apiUrl: URL,
	properties: Record<string, unknown>,
): boolean {
	const destination = dependencyDestination(base);
	if (typeof destination !== 'string') return false;
	let url: URL;
	try {
		url = new URL(destination, window.location.origin);
	} catch (error) {
		if (!(error instanceof TypeError)) throw error;
		return false;
	}
	const prefix = apiUrl.pathname.replace(/\/$/u, '');
	if (
		url.origin !== apiUrl.origin ||
		!(url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
	)
		return false;
	const route = normalizeRoute(url.pathname);
	const method = dependencyMethod(base);
	item.baseData = {
		id: base.id,
		name: `${method} ${route}`,
		type: 'Fetch',
		data: `${apiUrl.origin}${route}`,
		target: `${apiUrl.origin}${route}`,
		duration: base.duration,
		startTime: dependencyStartTime(base.startTime),
		responseCode: base.responseCode ?? base.resultCode,
		success: base.success,
		properties: {
			...properties,
			route,
			code: base.success === false ? 'request.failed' : 'request.completed',
		},
	};
	return true;
}
