type SafeFrame = {
	level: number;
	method: string;
	assembly: string;
	fileName: string;
	line: number;
};

function safeColumn(assembly: unknown, file: string, line: number): string {
	if (typeof assembly !== 'string') return '';
	const position = /([a-zA-Z0-9_-]+\.js):(\d+):(\d+)\)?$/u.exec(assembly);
	if (!position || position[1] !== file || Number(position[2]) !== line) return '';
	const column = Number(position[3]);
	return Number.isSafeInteger(column) && column > 0 ? `:${column}` : '';
}

function safeFrame(value: unknown, level: number): SafeFrame | undefined {
	if (value === null || typeof value !== 'object') return undefined;
	const frame = value as Record<string, unknown>;
	if (typeof frame.fileName !== 'string' || typeof frame.line !== 'number') return undefined;
	const file = /(?:^|\/assets\/)([a-zA-Z0-9_-]+\.js)$/u.exec(frame.fileName)?.[1];
	if (!file || !Number.isSafeInteger(frame.line) || frame.line < 1) return undefined;
	const suffix = safeColumn(frame.assembly, file, frame.line);
	return {
		level,
		method: 'app',
		assembly: `at app (${file}:${frame.line}${suffix})`,
		fileName: file,
		line: frame.line,
	};
}

export function sanitizeStackFrames(value: unknown): SafeFrame[] {
	if (!Array.isArray(value)) return [];
	return value.slice(0, 30).flatMap((value, level) => {
		const frame = safeFrame(value, level);
		return frame ? [frame] : [];
	});
}
