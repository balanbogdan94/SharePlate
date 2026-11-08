const routeSegments = new Set([
	'api',
	'health',
	'login',
	'plans',
	'create-plan',
	'recipes',
	'add',
	'edit',
	'house',
	'houses',
	'settings',
	'profile',
	'users',
	'me',
	'session',
	'provision',
	'units',
	'ingredients',
	'state',
	'members',
	'join-requests',
	'join',
	'leave',
	'name',
	'approve',
	'reject',
	'search',
	'my',
	'avatar',
	'by-email',
]);

export function normalizeRoute(value: string): string {
	const pathname = value.split(/[?#]/u, 1)[0];
	if (!pathname.startsWith('/') || pathname.startsWith('//')) return '/unknown';
	return pathname
		.split('/')
		.map((segment) => (!segment || routeSegments.has(segment) ? segment : '*'))
		.join('/');
}
