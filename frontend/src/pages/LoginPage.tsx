import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { apiFetch } from '@/lib/api';

type LoginRequest = {
	email: string;
	password: string;
};

type LoginResponse = {
	accessToken: string;
	refreshToken: string;
	expiresAtUtc: string;
};

function sanitizeRedirectTarget(target: string | undefined): string | null {
	if (!target || !target.startsWith('/') || target.startsWith('//')) {
		return null;
	}

	const pathname = target.split(/[?#]/, 1)[0] ?? '/';
	if (pathname === '/login' || pathname === '/register') {
		return null;
	}

	return target;
}

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const auth = useAuth();
	const navigate = useNavigate();
	const search = useSearch({ from: '/login' });
	const { t } = useI18n();
	const postLoginTarget = sanitizeRedirectTarget(search.redirect);

	const loginMutation = useMutation({
		mutationFn: (payload: LoginRequest) =>
			apiFetch<LoginResponse>('/auth/login', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: async (tokens) => {
			auth.login(tokens);
			if (postLoginTarget) {
				await navigate({ href: postLoginTarget });
				return;
			}

			await navigate({ to: '/plans' });
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginMutation.reset();
		loginMutation.mutate({ email, password });
	};

	return (
		<AuthShell
			title={t('auth.login.title')}
			description={t('auth.login.description')}
			footer={
				<p className='text-center text-sm text-stone-600 dark:text-stone-300'>
					{t('auth.login.noAccount')}{' '}
					<Link
						to='/register'
						className='font-semibold text-stone-900 underline-offset-4 hover:underline dark:text-stone-100'>
						{t('auth.login.register')}
					</Link>
				</p>
			}>
			<form className='space-y-4' onSubmit={handleSubmit}>
				<div className='space-y-2'>
					<Label htmlFor='login-email'>{t('auth.login.email')}</Label>
					<Input
						id='login-email'
						type='email'
						autoComplete='email'
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='login-password'>{t('auth.login.password')}</Label>
					<Input
						id='login-password'
						type='password'
						autoComplete='current-password'
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
					/>
				</div>

				<Button
					type='submit'
					className='w-full'
					disabled={loginMutation.isPending}>
					{loginMutation.isPending
						? t('auth.login.submitting')
						: t('auth.login.submit')}
				</Button>

				{loginMutation.isError && (
					<Alert variant='destructive'>
						<AlertTitle>{t('auth.login.errorTitle')}</AlertTitle>
						<AlertDescription>
							{loginMutation.error.message || t('auth.login.errorDescription')}
						</AlertDescription>
					</Alert>
				)}
			</form>
		</AuthShell>
	);
}
