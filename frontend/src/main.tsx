import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { registerServiceWorker } from '@/pwa/registerServiceWorker';
import './index.css';
import { router } from './router';

const queryClient = new QueryClient();

export function AppRouter() {
	const auth = useAuth();
	const hasPatchedTransitions = useRef(false);

	useEffect(() => {
		if (hasPatchedTransitions.current) {
			return;
		}
		hasPatchedTransitions.current = true;

		if (!('startViewTransition' in document)) {
			return;
		}

		const originalNavigate = router.navigate.bind(router);
		router.navigate = ((options) => {
			let navPromise: ReturnType<typeof originalNavigate> | undefined;
			document.documentElement.dataset.navDirection = 'forward';
			(document as Document & {
				startViewTransition: (
					callback: () => void | Promise<void>,
				) => { finished: Promise<void> };
			}).startViewTransition(() => {
				navPromise = originalNavigate(options);
				return navPromise;
			});

			return navPromise ?? originalNavigate(options);
		}) as typeof router.navigate;

		document.documentElement.dataset.navDirection =
			document.documentElement.dataset.navDirection ?? 'forward';
		const unsubscribe = router.history.subscribe(({ action }) => {
			if (action.type === 'BACK' || (action.type === 'GO' && action.index < 0)) {
				document.documentElement.dataset.navDirection = 'back';
				return;
			}

			if (
				action.type === 'FORWARD' ||
				(action.type === 'GO' && action.index > 0) ||
				action.type === 'PUSH'
			) {
				document.documentElement.dataset.navDirection = 'forward';
			}
		});

		return unsubscribe;
	}, []);

	if (auth.status === 'loading') {
		return <main className='min-h-screen bg-background' />;
	}

	return <RouterProvider router={router} context={{ auth }} />;
}

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<UserSettingsProvider>
				<I18nProvider>
					<AuthProvider>
						<AppRouter />
					</AuthProvider>
				</I18nProvider>
			</UserSettingsProvider>
		</QueryClientProvider>
	</StrictMode>,
);
