import {
	Link,
	Outlet,
	useCanGoBack,
	useLocation,
	useNavigate,
	useRouter,
} from '@tanstack/react-router';
import { ChevronLeft, CalendarDays, UtensilsCrossed } from 'lucide-react';
import { getNameFromToken } from '@/lib/jwt';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Avatar } from '@/components/ui/avatar';
import { IosInstallPrompt } from '@/components/pwa/IosInstallPrompt';

type TabItem = {
	to: '/recipes' | '/plans';
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
	const currentUser = useCurrentUser();
	const name = currentUser.data?.name ?? getNameFromToken(auth.tokens?.accessToken ?? '') ?? '';

	const tabs: TabItem[] = [
		{ to: '/recipes', label: t('tabs.home'), icon: UtensilsCrossed },
		{ to: '/plans', label: t('tabs.plan'), icon: CalendarDays },
	];
	const isMainRoute = tabs.some((tab) => tab.to === location.pathname);
	const brand = t('app.brand');

	const handleBack = () => {
		if (canGoBack) {
			router.history.back();
			return;
		}

		void navigate({ to: '/recipes' });
	};

	return (
		<div className="mobile-shell min-h-screen bg-stone-100 text-stone-900 dark:bg-sp-background dark:text-sp-text-primary">
			<header className="safe-top sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-sp-border-subtle dark:bg-sp-background">
				<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:h-16">
					<div className="flex items-center gap-2">
						{!isMainRoute && (
							<button
								type="button"
								onClick={handleBack}
								aria-label="Go back"
								className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 dark:text-sp-icon-secondary dark:hover:bg-sp-surface-hover"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
						)}
						<p className="text-xl font-extrabold uppercase tracking-wide">
							<span className="text-green-600 dark:text-sp-text-primary">{brand.slice(0, 5)}</span>
							<span className="text-green-600 dark:text-sp-primary">{brand.slice(5)}</span>
						</p>
					</div>

					<Link
						to="/profile"
						aria-label={t('shell.profile')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-primary dark:hover:bg-sp-surface-hover"
					>
						<Avatar
							name={name}
							photoUrl={currentUser.data?.profilePictureUrl}
							className="h-full w-full border-0"
							fallbackClassName="text-sm text-stone-700 dark:text-sp-text-secondary"
						/>
					</Link>
				</div>
			</header>

			<main className="mx-auto h-[calc(100dvh-3.5rem)] w-full max-w-5xl overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 sm:h-[calc(100dvh-4rem)] sm:pt-4">
				<Outlet />
			</main>

			<footer className="safe-bottom fixed flex justify-evenly bottom-0 left-0 right-0 z-20 border-t border-stone-200/80 bg-white/92 pt-2 backdrop-blur-md dark:border-sp-nav-border dark:bg-sp-nav-background ">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = location.pathname.includes(tab.to);
					return (
						<Link
							key={tab.to}
							to={tab.to}
							className={`relative flex min-h-11 min-w-24 flex-col items-center justify-center gap-1 rounded-xl px-6 py-2 text-xs font-semibold uppercase tracking-wide transition ${
								isActive
									? 'bg-green-100 text-green-700 shadow-sm dark:bg-transparent dark:text-sp-nav-active dark:shadow-none'
									: 'text-stone-500 hover:text-stone-700 dark:text-sp-nav-inactive dark:hover:text-sp-text-primary'
							}`}
						>
							{isActive && (
								<span className="absolute top-0 hidden h-0.5 w-8 rounded-full bg-sp-nav-active dark:block" />
							)}
							<Icon className="h-4 w-4" />
							<span>{tab.label}</span>
						</Link>
					);
				})}
			</footer>

			<IosInstallPrompt />
		</div>
	);
}
