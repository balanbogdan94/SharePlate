import { useEffect, useState } from 'react';

export function useMinimumDuration(durationMs: number): boolean {
	const [elapsed, setElapsed] = useState(durationMs <= 0);

	useEffect(() => {
		if (durationMs <= 0) return;
		const timeout = window.setTimeout(() => setElapsed(true), durationMs);
		return () => window.clearTimeout(timeout);
	}, [durationMs]);

	return elapsed;
}
