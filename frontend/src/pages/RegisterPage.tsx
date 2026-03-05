import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
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

const passwordHint =
	'8+ characters with uppercase, lowercase, number, and special symbol.';

export function RegisterPage() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [passwordMismatch, setPasswordMismatch] = useState(false);
	const navigate = useNavigate();

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
			title='Create your account'
			description='Register to start meal planning with your people.'
			footer={
				<p className='text-center text-sm text-stone-600'>
					Already have an account?{' '}
					<Link
						to='/login'
						className='font-semibold text-stone-900 underline-offset-4 hover:underline'>
						Sign in
					</Link>
				</p>
			}>
			<form className='space-y-4' onSubmit={handleSubmit}>
				<div className='space-y-2'>
					<Label htmlFor='register-name'>Name</Label>
					<Input
						id='register-name'
						autoComplete='name'
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='register-email'>Email</Label>
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
					<Label htmlFor='register-password'>Pass</Label>
					<Input
						id='register-password'
						type='password'
						autoComplete='new-password'
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
					/>
					<p className='text-xs text-stone-500'>{passwordHint}</p>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='register-repeat-password'>Repeat pass</Label>
					<Input
						id='register-repeat-password'
						type='password'
						autoComplete='new-password'
						value={repeatPassword}
						onChange={(event) => setRepeatPassword(event.target.value)}
						required
					/>
				</div>

				<Button
					type='submit'
					className='w-full bg-stone-900 text-white hover:bg-stone-800'
					disabled={registerMutation.isPending}>
					{registerMutation.isPending ? 'Creating account...' : 'Create account'}
				</Button>

				{passwordMismatch && (
					<Alert variant='destructive'>
						<AlertTitle>Password mismatch</AlertTitle>
						<AlertDescription>
							Pass and Repeat pass must be the same.
						</AlertDescription>
					</Alert>
				)}

				{registerMutation.isError && (
					<Alert variant='destructive'>
						<AlertTitle>Registration failed</AlertTitle>
						<AlertDescription>
							{registerMutation.error.message ||
								'Could not create account. Please try again.'}
						</AlertDescription>
					</Alert>
				)}
			</form>
		</AuthShell>
	);
}
