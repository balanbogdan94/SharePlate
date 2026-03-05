import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
	translations,
	type TranslationKey,
} from '@/i18n/translations';
import { useUserSettings } from '@/settings/UserSettingsContext';

type I18nContextValue = {
	language: 'en' | 'ro';
	t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
	const { language } = useUserSettings();

	const value = useMemo<I18nContextValue>(
		() => ({
			language,
			t: (key: TranslationKey) => translations[language][key],
		}),
		[language],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error('useI18n must be used within an I18nProvider');
	}

	return context;
}
