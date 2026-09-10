import { useState } from 'react';
import { useSearch } from '@tanstack/react-router';
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
				<Button className="w-full" disabled={isPending} onClick={() => void handleLogin()}>
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
