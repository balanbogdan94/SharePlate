import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { MsalProvider } from '@azure/msal-react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { msalInstance } from '@/auth/msal';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import { UserSettingsProvider } from '@/settings/UserSettingsContext';
import { router } from './router';

const queryClient = new QueryClient();

function AppRouter() {
	const auth = useAuth();

	if (auth.status === 'loading') {
		return <main className="min-h-screen bg-background" />;
	}

	if (auth.status === 'error') {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background p-6">
				<div className="w-full max-w-sm space-y-4 text-center">
					<p className="text-sm text-destructive">{auth.error}</p>
					<Button onClick={auth.retryProvisioning}>Try again</Button>
					<Button variant="ghost" onClick={() => void auth.logout()}>
						Sign out
					</Button>
				</div>
			</main>
		);
	}

	return <RouterProvider router={router} context={{ auth }} />;
}

export default function App() {
	return (
		<MsalProvider instance={msalInstance}>
			<QueryClientProvider client={queryClient}>
				<UserSettingsProvider>
					<I18nProvider>
						<AuthProvider>
							<AppRouter />
							<Toaster />
						</AuthProvider>
					</I18nProvider>
				</UserSettingsProvider>
			</QueryClientProvider>
		</MsalProvider>
	);
}
