import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';

export function MeasurementProviders({ children }: { children: ReactNode }) {
	return (
		<UserSettingsProvider>
			<I18nProvider>{children}</I18nProvider>
		</UserSettingsProvider>
	);
}
