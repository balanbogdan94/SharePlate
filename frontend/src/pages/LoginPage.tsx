import { useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

function sanitizeRedirectTarget(target: string | undefined): string {
	if (!target || !target.startsWith('/') || target.startsWith('//')) {
		return '/plans';
	}

	const pathname = target.split(/[?#]/, 1)[0] ?? '/';
	if (pathname === '/login') {
		return '/plans';
	}

	return target;
}

export function LoginPage() {
	const auth = useAuth();
	const search = useSearch({ from: '/login' });
	const { t } = useI18n();
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const handleLogin = async () => {
		setError(null);
		setIsPending(true);
		try {
			await auth.login(sanitizeRedirectTarget(search.redirect));
		} catch (loginError) {
			setError(loginError instanceof Error ? loginError.message : t('auth.login.errorDescription'));
			setIsPending(false);
		}
	};

	return (
		<AuthShell title={t('auth.login.title')} description={t('auth.login.description')}>
			<div className="space-y-4">
				<Button
					className="relative h-14 w-full overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-base font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_-8px_rgba(34,197,94,0.6)] transition hover:brightness-110 active:scale-95 dark:from-sp-primary dark:to-emerald-400 dark:text-sp-text-on-primary dark:shadow-[0_10px_30px_-8px_rgba(48,209,88,0.5)]"
					disabled={isPending}
					onClick={() => void handleLogin()}
				>
					<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
					{isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
					{isPending ? t('auth.login.submitting') : t('auth.login.submit')}
				</Button>

				{error && (
					<Alert variant="destructive">
						<AlertTitle>{t('auth.login.errorTitle')}</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</div>
		</AuthShell>
	);
}
