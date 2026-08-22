import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ro';

type UserSettings = {
	theme: Theme;
	language: Language;
	soundEnabled: boolean;
	setTheme: (theme: Theme) => void;
	setLanguage: (language: Language) => void;
	setSoundEnabled: (enabled: boolean) => void;
};

type StoredUserSettings = {
	theme?: Theme;
	language?: Language;
	soundEnabled?: boolean;
};

const USER_SETTINGS_STORAGE_KEY = 'shareplate.user.settings';

const UserSettingsContext = createContext<UserSettings | undefined>(undefined);

function readStoredSettings(): StoredUserSettings {
	try {
		const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
		if (!raw) {
			return {};
		}

		const parsed = JSON.parse(raw) as StoredUserSettings;
		return {
			theme: parsed.theme === 'dark' ? 'dark' : parsed.theme === 'light' ? 'light' : undefined,
			language: parsed.language === 'ro' ? 'ro' : parsed.language === 'en' ? 'en' : undefined,
			soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : undefined,
		};
	} catch {
		return {};
	}
}

function writeStoredSettings(settings: Required<StoredUserSettings>): void {
	window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
	const stored = readStoredSettings();
	const [theme, setTheme] = useState<Theme>(stored.theme ?? 'light');
	const [language, setLanguage] = useState<Language>(stored.language ?? 'en');
	const [soundEnabled, setSoundEnabled] = useState<boolean>(stored.soundEnabled ?? true);

	useEffect(() => {
		writeStoredSettings({ theme, language, soundEnabled });
	}, [theme, language, soundEnabled]);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, [theme]);

	useEffect(() => {
		document.documentElement.lang = language;
	}, [language]);

	const value = useMemo<UserSettings>(
		() => ({
			theme,
			language,
			soundEnabled,
			setTheme,
			setLanguage,
			setSoundEnabled,
		}),
		[language, theme, soundEnabled],
	);

	return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings(): UserSettings {
	const context = useContext(UserSettingsContext);
	if (!context) {
		throw new Error('useUserSettings must be used within a UserSettingsProvider');
	}

	return context;
}
