import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import './index.css';
import { router } from './router';

const queryClient = new QueryClient();

export function AppRouter() {
	const auth = useAuth();

	if (auth.status === 'loading') {
		return <main className='min-h-screen bg-background' />;
	}

	return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<AppRouter />
			</AuthProvider>
		</QueryClientProvider>
	</StrictMode>,
);
