import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { ReactNode } from 'react';
import {
	clearStoredTokens,
	isAccessTokenExpired,
	readStoredTokens,
	writeStoredTokens,
	type AuthTokens,
} from '@/auth/storage';
import { apiFetch, configureApiAuth } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
	status: AuthStatus;
	isAuthenticated: boolean;
	tokens: AuthTokens | null;
	login: (tokens: AuthTokens) => void;
	logout: () => void;
	refreshAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type RefreshResponse = {
	accessToken: string;
	refreshToken: string;
	expiresAtUtc: string;
};

async function requestRefreshToken(
	refreshToken: string,
): Promise<AuthTokens | null> {
	try {
		const response = await apiFetch<RefreshResponse>('/auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refreshToken }),
		});

		return {
			accessToken: response.accessToken,
			refreshToken: response.refreshToken,
			expiresAtUtc: response.expiresAtUtc,
		};
	} catch {
		return null;
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<AuthStatus>('loading');
	const [tokens, setTokens] = useState<AuthTokens | null>(null);
	const tokensRef = useRef<AuthTokens | null>(null);

	const commitTokens = useCallback((nextTokens: AuthTokens | null) => {
		tokensRef.current = nextTokens;
		setTokens(nextTokens);

		if (nextTokens) {
			writeStoredTokens(nextTokens);
			setStatus('authenticated');
			return;
		}

		clearStoredTokens();
		setStatus('unauthenticated');
	}, []);

	const refreshAccessToken = useCallback(async (): Promise<string | null> => {
		const current = tokensRef.current ?? readStoredTokens();
		if (!current?.refreshToken) {
			commitTokens(null);
			return null;
		}

		const refreshed = await requestRefreshToken(current.refreshToken);
		if (!refreshed) {
			commitTokens(null);
			return null;
		}

		commitTokens(refreshed);
		return refreshed.accessToken;
	}, [commitTokens]);

	const login = useCallback(
		(nextTokens: AuthTokens) => {
			commitTokens(nextTokens);
		},
		[commitTokens],
	);

	const logout = useCallback(() => {
		commitTokens(null);
	}, [commitTokens]);

	useEffect(() => {
		configureApiAuth({
			getAccessToken: () => tokensRef.current?.accessToken ?? null,
			refreshAccessToken,
		});
	}, [refreshAccessToken]);

	useEffect(() => {
		let cancelled = false;

		const bootstrap = async () => {
			const stored = readStoredTokens();
			if (!stored) {
				if (!cancelled) {
					commitTokens(null);
				}
				return;
			}

			if (!isAccessTokenExpired(stored.expiresAtUtc)) {
				if (!cancelled) {
					commitTokens(stored);
				}
				return;
			}

			const refreshed = await requestRefreshToken(stored.refreshToken);
			if (!cancelled) {
				commitTokens(refreshed);
			}
		};

		void bootstrap();

		return () => {
			cancelled = true;
		};
	}, [commitTokens]);

	const value = useMemo<AuthContextValue>(
		() => ({
			status,
			isAuthenticated: status === 'authenticated',
			tokens,
			login,
			logout,
			refreshAccessToken,
		}),
		[login, logout, refreshAccessToken, status, tokens],
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
