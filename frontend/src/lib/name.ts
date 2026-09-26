export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '?';
	return parts
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join('');
}
