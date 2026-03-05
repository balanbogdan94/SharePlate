import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/auth/AuthContext';
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

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const auth = useAuth();
	const navigate = useNavigate();

	const loginMutation = useMutation({
		mutationFn: (payload: LoginRequest) =>
			apiFetch<LoginResponse>('/auth/login', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: async (tokens) => {
			auth.login(tokens);
			await navigate({ to: '/' });
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginMutation.reset();
		loginMutation.mutate({ email, password });
	};

	return (
		<AuthShell
			title='Welcome back'
			description='Sign in to continue to your household workspace.'
			footer={
				<p className='text-center text-sm text-stone-600'>
					No account yet?{' '}
					<Link
						to='/register'
						className='font-semibold text-stone-900 underline-offset-4 hover:underline'>
						Register
					</Link>
				</p>
			}>
			<form className='space-y-4' onSubmit={handleSubmit}>
				<div className='space-y-2'>
					<Label htmlFor='login-email'>Email</Label>
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
					<Label htmlFor='login-password'>Pass</Label>
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
					className='w-full bg-stone-900 text-white hover:bg-stone-800'
					disabled={loginMutation.isPending}>
					{loginMutation.isPending ? 'Signing in...' : 'Sign in'}
				</Button>

				{loginMutation.isError && (
					<Alert variant='destructive'>
						<AlertTitle>Login failed</AlertTitle>
						<AlertDescription>
							{loginMutation.error.message ||
								'Invalid credentials. Please try again.'}
						</AlertDescription>
					</Alert>
				)}
			</form>
		</AuthShell>
	);
}
