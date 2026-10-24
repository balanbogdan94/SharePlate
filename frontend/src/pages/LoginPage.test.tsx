import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { LoginPage } from './LoginPage';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('@/auth/AuthContext', () => ({ useAuth: () => ({ login }) }));
vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({ redirect: undefined }) }));

function renderPage() {
	return render(
		<UserSettingsProvider>
			<I18nProvider>
				<LoginPage />
			</I18nProvider>
		</UserSettingsProvider>,
	);
}

describe('LoginPage', () => {
	beforeEach(() => {
		login.mockReset();
	});

	it('shows the splash while the sign-in redirect is in flight', async () => {
		login.mockReturnValue(new Promise(() => {}));
		renderPage();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

		expect(screen.getByRole('status', { name: 'SharePlate' })).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('returns to the form with an error when sign-in fails', async () => {
		login.mockRejectedValue(new Error('boom'));
		renderPage();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

		expect(await screen.findByText('boom')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
	});
});
