import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { router } from './router';

const queryClient = new QueryClient();

function AppRouter() {
	const auth = useAuth();

	if (auth.status === 'loading') {
		return <main className="min-h-screen bg-background" />;
	}

	return <RouterProvider router={router} context={{ auth }} />;
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<UserSettingsProvider>
				<I18nProvider>
					<AuthProvider>
						<AppRouter />
					</AuthProvider>
				</I18nProvider>
			</UserSettingsProvider>
		</QueryClientProvider>
	);
}
