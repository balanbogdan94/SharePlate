import { useEffect, useRef, useState } from 'react';
import {
	Link,
	Outlet,
	useCanGoBack,
	useLocation,
	useNavigate,
	useRouter,
} from '@tanstack/react-router';
import { ChevronLeft, CalendarDays, MoreHorizontal, UtensilsCrossed } from 'lucide-react';
import { getInitials, getNameFromToken } from '@/lib/jwt';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { apiFetch } from '@/lib/api';
import { IosInstallPrompt } from '@/components/pwa/IosInstallPrompt';
import { type Language, type Theme, useUserSettings } from '@/settings/UserSettingsContext';

type TabItem = {
	to: '/recipes' | '/plans' | '/house';
	label: string;
	icon: typeof UtensilsCrossed;
};

export function AppShell() {
	const auth = useAuth();
	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const location = useLocation();
	const { t } = useI18n();
	const { theme, setTheme, language, setLanguage } = useUserSettings();
	const initials = getInitials(getNameFromToken(auth.tokens?.accessToken ?? '') ?? '');
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const tabs: TabItem[] = [
		{ to: '/recipes', label: t('tabs.home'), icon: UtensilsCrossed },
		{ to: '/plans', label: t('tabs.plan'), icon: CalendarDays },
		{ to: '/house', label: t('tabs.more'), icon: MoreHorizontal },
	];
	const isMainRoute = tabs.some((tab) => tab.to === location.pathname);

	useEffect(() => {
		const onDocumentClick = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', onDocumentClick);
		return () => document.removeEventListener('mousedown', onDocumentClick);
	}, []);

	const handleLogout = async () => {
		const refreshToken = auth.tokens?.refreshToken;
		setMenuOpen(false);

		if (refreshToken) {
			try {
				await apiFetch<void>('/auth/logout', {
					method: 'POST',
					body: JSON.stringify({ refreshToken }),
				});
			} catch {
				// Ignore logout API failure and clear local auth regardless.
			}
		}

		auth.logout();
		await navigate({ to: '/login' });
	};

	const handleBack = () => {
		if (canGoBack) {
			router.history.back();
			return;
		}

		void navigate({ to: '/recipes' });
	};

	return (
		<div className="mobile-shell min-h-screen min-h-[100dvh] bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
			<header className="safe-top sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-stone-800/50 dark:bg-stone-950/95">
				<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:h-16">
					<div className="flex items-center gap-2">
						{!isMainRoute && (
							<button
								type="button"
								onClick={handleBack}
								aria-label="Go back"
								className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
						)}
						<p className="text-xl font-extrabold uppercase tracking-wide text-green-600 dark:text-green-400">
							{t('app.brand')}
						</p>
					</div>

					<div className="relative" ref={menuRef}>
						<button
							type="button"
							onClick={() => setMenuOpen((prev) => !prev)}
							aria-label={t('shell.profile')}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
						>
							<span className="text-sm font-semibold leading-none">{initials}</span>
						</button>

						{menuOpen && (
							<div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
								<div className="space-y-3">
									<label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
										{t('shell.theme')}
										<select
											value={theme}
											onChange={(event) => setTheme(event.target.value as Theme)}
											className="mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
										>
											<option value="light">{t('shell.theme.light')}</option>
											<option value="dark">{t('shell.theme.dark')}</option>
										</select>
									</label>

									<label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
										{t('shell.language')}
										<select
											value={language}
											onChange={(event) => setLanguage(event.target.value as Language)}
											className="mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
										>
											<option value="en">{t('shell.language.en')}</option>
											<option value="ro">{t('shell.language.ro')}</option>
										</select>
									</label>

									<button
										type="button"
										onClick={handleLogout}
										className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
									>
										{t('shell.logout')}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</header>

			<main className="mx-auto h-[calc(100dvh-3.5rem)] w-full max-w-5xl overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 sm:h-[calc(100dvh-4rem)] sm:pt-4">
				<Outlet />
			</main>

			<footer className="safe-bottom fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200/80 bg-white/92 pt-2 backdrop-blur-md dark:border-stone-800/50 dark:bg-stone-950/92">
				<div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 rounded-2xl bg-stone-100/80 p-2 dark:bg-stone-900/80">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = location.pathname.includes(tab.to);

						return (
							<Link
								key={tab.to}
								to={tab.to}
								className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wide transition ${
									isActive
										? 'bg-green-100 text-green-700 shadow-sm dark:bg-green-900/40 dark:text-green-400'
										: 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-100'
								}`}
							>
								<Icon className="h-4 w-4" />
								<span>{tab.label}</span>
							</Link>
						);
					})}
				</div>
			</footer>

			<IosInstallPrompt />
		</div>
	);
}
