import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { AppShell } from './AppShell';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ to, children, ...props }: React.ComponentProps<'a'> & { to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	Outlet: () => <h1>Page content</h1>,
	useCanGoBack: () => false,
	useLocation: () => ({ pathname: '/plans' }),
	useNavigate: () => vi.fn(),
	useRouter: () => ({ history: { back: vi.fn() } }),
}));

vi.mock('@/lib/useCurrentUser', () => ({
	useCurrentUser: () => ({ data: { name: 'Test User' } }),
}));

vi.mock('@/components/pwa/IosInstallPrompt', () => ({
	IosInstallPrompt: () => null,
}));

describe('AppShell scroll containment', () => {
	it('keeps the shell inside the viewport and reserves the full safe-area header height', () => {
		render(
			<UserSettingsProvider>
				<I18nProvider>
					<AppShell />
				</I18nProvider>
			</UserSettingsProvider>,
		);

		const header = screen.getByRole('banner');
		const shell = header.parentElement;
		expect(shell).toHaveClass('fixed', 'top-0', 'h-dvh', 'flex', 'flex-col', 'overflow-hidden');
		expect(shell).not.toHaveClass('min-h-screen');
		expect(header).toHaveClass('safe-top', 'shrink-0');
		expect(header).not.toHaveClass('sticky');

		const content = screen.getByRole('main');
		expect(content).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-y-contain');
		expect(content.className).not.toContain('100dvh-');
		expect(screen.getByRole('heading', { name: 'Page content' })).toBeInTheDocument();
		expect(screen.getByRole('contentinfo')).toHaveClass('fixed', 'safe-bottom');
	});
});
