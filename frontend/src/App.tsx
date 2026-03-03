import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function App() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const loginMutation = useMutation({
		mutationFn: (payload: LoginRequest) =>
			apiFetch<LoginResponse>('/auth/login', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginMutation.reset();
		loginMutation.mutate({ email, password });
	};

	return (
		<main className='min-h-screen bg-background px-6 py-12 text-foreground'>
			<div className='mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center'>
				<Card className='w-full'>
					<CardHeader>
						<CardTitle className='text-2xl'>Sign in</CardTitle>
						<CardDescription>
							Login to SharePlate using your account credentials.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className='space-y-4' onSubmit={handleSubmit}>
							<div className='space-y-2'>
								<Label htmlFor='email'>Email</Label>
								<Input
									id='email'
									type='email'
									autoComplete='email'
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='password'>Password</Label>
								<Input
									id='password'
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

							{loginMutation.isSuccess && (
								<Alert>
									<AlertTitle>Login successful</AlertTitle>
									<AlertDescription>
										Access token received. Expires at{' '}
										{new Date(loginMutation.data.expiresAtUtc).toLocaleString()}
									</AlertDescription>
								</Alert>
							)}
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

export default App;
