import { InteractionStatus } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiTokenRequest } from '@/auth/msal';
import { apiFetch } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type ProvisioningResult = {
	accountId: string;
	attempt: number;
	status: 'authenticated' | 'error';
	error: string | null;
};

type AuthContextValue = {
	status: AuthStatus;
	isAuthenticated: boolean;
	accountName: string;
	error: string | null;
	login: (returnTo?: string) => Promise<void>;
	logout: () => Promise<void>;
	retryProvisioning: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const { instance, accounts, inProgress } = useMsal();
	const account = instance.getActiveAccount() ?? accounts[0] ?? null;
	const accountId = account?.homeAccountId ?? null;
	const [provisioningResult, setProvisioningResult] = useState<ProvisioningResult | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const currentResult =
		provisioningResult &&
		provisioningResult.accountId === accountId &&
		provisioningResult.attempt === retryCount
			? provisioningResult
			: null;
	const status: AuthStatus =
		inProgress !== InteractionStatus.None
			? 'loading'
			: !account
				? 'unauthenticated'
				: (currentResult?.status ?? 'loading');
	const error = currentResult?.error ?? null;

	useEffect(() => {
		if (account && !instance.getActiveAccount()) instance.setActiveAccount(account);
	}, [account, instance]);

	useEffect(() => {
		if (inProgress !== InteractionStatus.None || !accountId) return;

		let cancelled = false;
		void apiFetch('/session/provision', { method: 'POST' })
			.then(() => {
				if (!cancelled) {
					setProvisioningResult({
						accountId,
						attempt: retryCount,
						status: 'authenticated',
						error: null,
					});
				}
			})
			.catch((provisioningError: unknown) => {
				if (cancelled) return;
				setProvisioningResult({
					accountId,
					attempt: retryCount,
					status: 'error',
					error:
						provisioningError instanceof Error ? provisioningError.message : 'Provisioning failed.',
				});
			});

		return () => {
			cancelled = true;
		};
	}, [accountId, inProgress, retryCount]);

	const login = useCallback(
		async (returnTo = '/plans') => {
			const redirectStartPage = new URL(returnTo, window.location.origin).toString();
			await instance.loginRedirect({ ...apiTokenRequest, redirectStartPage });
		},
		[instance],
	);

	const logout = useCallback(async () => {
		await instance.logoutRedirect({ account });
	}, [account, instance]);

	const retryProvisioning = useCallback(() => {
		setRetryCount((current) => current + 1);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			status,
			isAuthenticated: status === 'authenticated',
			accountName: account?.name ?? '',
			error,
			login,
			logout,
			retryProvisioning,
		}),
		[account?.name, error, login, logout, retryProvisioning, status],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
}

export type { AuthContextValue };
