import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useI18n } from '@/i18n/I18nContext';
import { apiFetch } from '@/lib/api';

type RegisterRequest = {
	name: string;
	email: string;
	password: string;
};

type RegisterResponse = {
	id: string;
	name: string;
	email: string;
};

export function RegisterPage() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [passwordMismatch, setPasswordMismatch] = useState(false);
	const navigate = useNavigate();
	const { t } = useI18n();

	const registerMutation = useMutation({
		mutationFn: (payload: RegisterRequest) =>
			apiFetch<RegisterResponse>('/auth/register', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: async () => {
			await navigate({ to: '/login' });
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		registerMutation.reset();

		if (password !== repeatPassword) {
			setPasswordMismatch(true);
			return;
		}

		setPasswordMismatch(false);
		registerMutation.mutate({ name, email, password });
	};

	return (
		<AuthShell
			title={t('auth.register.title')}
			description={t('auth.register.description')}
			footer={
				<p className='text-center text-sm text-stone-600 dark:text-stone-300'>
					{t('auth.register.alreadyAccount')}{' '}
					<Link
						to='/login'
						className='font-semibold text-stone-900 underline-offset-4 hover:underline dark:text-stone-100'>
						{t('auth.register.signIn')}
					</Link>
				</p>
			}>
			<form className='space-y-4' onSubmit={handleSubmit}>
				<div className='space-y-2'>
					<Label htmlFor='register-name'>{t('auth.register.name')}</Label>
					<Input
						id='register-name'
						autoComplete='name'
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='register-email'>{t('auth.register.email')}</Label>
					<Input
						id='register-email'
						type='email'
						autoComplete='email'
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='register-password'>{t('auth.register.password')}</Label>
					<Input
						id='register-password'
						type='password'
						autoComplete='new-password'
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
					/>
					<p className='text-xs text-stone-500 dark:text-stone-400'>
						{t('auth.register.passwordHint')}
					</p>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='register-repeat-password'>
						{t('auth.register.repeatPassword')}
					</Label>
					<Input
						id='register-repeat-password'
						type='password'
						autoComplete='new-password'
						value={repeatPassword}
						onChange={(event) => setRepeatPassword(event.target.value)}
						required
					/>
				</div>

				<Button type='submit' className='w-full' disabled={registerMutation.isPending}>
					{registerMutation.isPending
						? t('auth.register.submitting')
						: t('auth.register.submit')}
				</Button>

				{passwordMismatch && (
					<Alert variant='destructive'>
						<AlertTitle>{t('auth.register.passwordMismatchTitle')}</AlertTitle>
						<AlertDescription>
							{t('auth.register.passwordMismatchDescription')}
						</AlertDescription>
					</Alert>
				)}

				{registerMutation.isError && (
					<Alert variant='destructive'>
						<AlertTitle>{t('auth.register.errorTitle')}</AlertTitle>
						<AlertDescription>
							{registerMutation.error.message ||
								t('auth.register.errorDescription')}
						</AlertDescription>
					</Alert>
				)}
			</form>
		</AuthShell>
	);
}
