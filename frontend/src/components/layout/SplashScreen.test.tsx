import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { SplashScreen } from './SplashScreen';

describe('SplashScreen', () => {
	it('renders the brand as an accessible busy status', () => {
		render(
			<UserSettingsProvider>
				<I18nProvider>
					<SplashScreen />
				</I18nProvider>
			</UserSettingsProvider>,
		);

		const status = screen.getByRole('status', { name: 'SharePlate' });
		expect(status).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('SharePlate')).toBeInTheDocument();
	});
});
