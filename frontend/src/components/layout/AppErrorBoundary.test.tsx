import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { reportFailure } from '@/lib/telemetry';

vi.mock('@/lib/telemetry', () => ({ reportFailure: vi.fn() }));
afterEach(() => {
	document.documentElement.lang = 'en';
	vi.restoreAllMocks();
});

function BrokenComponent(): never {
	throw new Error('private details');
}

it('reports render crashes once and shows a localized fallback without internal details', () => {
	document.documentElement.lang = 'ro';
	vi.spyOn(console, 'error').mockImplementation(() => {});
	render(
		<AppErrorBoundary>
			<BrokenComponent />
		</AppErrorBoundary>,
	);
	expect(screen.getByRole('alert')).toHaveTextContent('A aparut o eroare.');
	expect(screen.getByRole('button', { name: 'Reincarca' })).toBeInTheDocument();
	expect(screen.queryByText('private details')).not.toBeInTheDocument();
	expect(reportFailure).toHaveBeenCalledTimes(1);
	expect(reportFailure).toHaveBeenCalledWith(expect.any(Error), 'react.crashed');
});
