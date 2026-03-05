import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ro';

type UserSettings = {
	theme: Theme;
	language: Language;
	setTheme: (theme: Theme) => void;
	setLanguage: (language: Language) => void;
};

type StoredUserSettings = {
	theme?: Theme;
	language?: Language;
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
		};
	} catch {
		return {};
	}
}

function writeStoredSettings(theme: Theme, language: Language): void {
	window.localStorage.setItem(
		USER_SETTINGS_STORAGE_KEY,
		JSON.stringify({ theme, language }),
	);
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
	const stored = readStoredSettings();
	const [theme, setTheme] = useState<Theme>(stored.theme ?? 'light');
	const [language, setLanguage] = useState<Language>(stored.language ?? 'en');

	useEffect(() => {
		writeStoredSettings(theme, language);
	}, [theme, language]);

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
			setTheme,
			setLanguage,
		}),
		[language, theme],
	);

	return (
		<UserSettingsContext.Provider value={value}>
			{children}
		</UserSettingsContext.Provider>
	);
}

export function useUserSettings(): UserSettings {
	const context = useContext(UserSettingsContext);
	if (!context) {
		throw new Error('useUserSettings must be used within a UserSettingsProvider');
	}

	return context;
}
