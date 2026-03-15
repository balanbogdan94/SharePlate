import { useEffect, useRef, useState } from 'react';
import {
	Link,
	Outlet,
	useCanGoBack,
	useLocation,
	useNavigate,
	useRouter,
} from '@tanstack/react-router';
import {
	ChevronLeft,
	House,
	Layers3,
	Settings2,
	UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { apiFetch } from '@/lib/api';
import { IosInstallPrompt } from '@/components/pwa/IosInstallPrompt';
import {
	type Language,
	type Theme,
	useUserSettings,
} from '@/settings/UserSettingsContext';

type TabItem = {
	to: '/recipes' | '/tab-2' | '/tab-3';
	label: string;
	icon: typeof House;
};

export function AppShell() {
	const auth = useAuth();
	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const location = useLocation();
	const { t } = useI18n();
	const { theme, setTheme, language, setLanguage } = useUserSettings();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const tabs: TabItem[] = [
		{ to: '/recipes', label: t('tabs.home'), icon: House },
		{ to: '/tab-2', label: t('tabs.board'), icon: Layers3 },
		{ to: '/tab-3', label: t('tabs.more'), icon: Settings2 },
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
		if ('startViewTransition' in document) {
			document.documentElement.dataset.navDirection = 'back';
			(
				document as Document & {
					startViewTransition: (callback: () => void | Promise<void>) => {
						finished: Promise<void>;
					};
				}
			).startViewTransition(() => {
				if (canGoBack) {
					router.history.back();
					return;
				}

				void navigate({ to: '/' });
			});
			return;
		}

		if (canGoBack) {
			router.history.back();
			return;
		}

		void navigate({ to: '/' });
	};

	return (
		<div className='mobile-shell min-h-screen min-h-[100dvh] bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100'>
			<header className='safe-top sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90'>
				<div className='mx-auto grid h-14 w-full max-w-5xl grid-cols-[minmax(6.5rem,auto),1fr,minmax(6.5rem,auto)] items-center gap-2 px-4 sm:h-16'>
					<div className='min-w-[6.5rem]'>
						{!isMainRoute && (
							<button
								type='button'
								onClick={handleBack}
								className='inline-flex items-center gap-1 text-base font-semibold text-sky-600 transition hover:text-sky-700'>
								<ChevronLeft className='h-5 w-5' />
								Back
							</button>
						)}
					</div>

					<p className='text-center text-base font-semibold tracking-tight'>
						{t('app.brand')}
					</p>

					<div className='relative justify-self-end' ref={menuRef}>
						<button
							type='button'
							onClick={() => setMenuOpen((prev) => !prev)}
							className='inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800'>
							<UserCircle2 className='h-5 w-5' />
							{t('shell.profile')}
						</button>

						{menuOpen && (
							<div className='absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900'>
								<div className='space-y-3'>
									<label className='block text-xs font-medium text-stone-500 dark:text-stone-400'>
										{t('shell.theme')}
										<select
											value={theme}
											onChange={(event) =>
												setTheme(event.target.value as Theme)
											}
											className='mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
											<option value='light'>{t('shell.theme.light')}</option>
											<option value='dark'>{t('shell.theme.dark')}</option>
										</select>
									</label>

									<label className='block text-xs font-medium text-stone-500 dark:text-stone-400'>
										{t('shell.language')}
										<select
											value={language}
											onChange={(event) =>
												setLanguage(event.target.value as Language)
											}
											className='mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
											<option value='en'>{t('shell.language.en')}</option>
											<option value='ro'>{t('shell.language.ro')}</option>
										</select>
									</label>

									<button
										type='button'
										onClick={handleLogout}
										className='min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40'>
										{t('shell.logout')}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</header>

			<main className='mx-auto h-[calc(100dvh-3.5rem)] w-full max-w-5xl overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 sm:h-[calc(100dvh-4rem)] sm:pt-4'>
				<Outlet />
			</main>

			<footer className='safe-bottom fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200/80 bg-white/92 pt-2 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/92'>
				<div className='mx-auto grid w-full max-w-md grid-cols-3 gap-2 rounded-2xl bg-stone-100/80 p-2 dark:bg-stone-800/70'>
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = location.pathname.includes(tab.to);

						return (
							<Link
								key={tab.to}
								to={tab.to}
								className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
									isActive
										? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
										: 'text-stone-500 hover:text-stone-700 dark:text-stone-300 dark:hover:text-stone-100'
								}`}>
								<Icon className='h-4 w-4' />
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
