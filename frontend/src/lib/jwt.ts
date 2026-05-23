type JwtPayload = Record<string, unknown>;

const NAME_CLAIMS = ['name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];

function parseJwtPayload(token: string): JwtPayload | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	try {
		const base64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
		return JSON.parse(atob(base64)) as JwtPayload;
	} catch {
		return null;
	}
}

export function getNameFromToken(token: string): string | null {
	const payload = parseJwtPayload(token);
	if (!payload) return null;
	for (const key of NAME_CLAIMS) {
		if (typeof payload[key] === 'string') return payload[key] as string;
	}
	if (typeof payload['email'] === 'string') return payload['email'] as string;
	return null;
}

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '?';
	return parts
		.slice(0, 2)
		.map((p) => p.charAt(0).toUpperCase())
		.join('');
}
