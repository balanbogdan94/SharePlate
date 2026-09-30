import { InteractionStatus, type AccountInfo } from '@azure/msal-browser';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { apiFetch } from '@/lib/api';

const msal = vi.hoisted(() => {
	const state: { inProgress: InteractionStatus; accounts: AccountInfo[] } = {
		inProgress: 'startup',
		accounts: [],
	};
	return {
		state,
		instance: {
			getActiveAccount: vi.fn<() => AccountInfo | null>(),
			setActiveAccount: vi.fn(),
			loginRedirect: vi.fn(),
			logoutRedirect: vi.fn(),
		},
	};
});

vi.mock('@azure/msal-react', () => ({
	useMsal: () => ({ ...msal.state, instance: msal.instance }),
}));

vi.mock('@/lib/api', () => ({
	apiFetch: vi.fn(),
}));

const account: AccountInfo = {
	homeAccountId: 'test-home-account',
	localAccountId: 'test-local-account',
	environment: 'login.example.com',
	tenantId: 'test-tenant',
	username: 'test@example.com',
	name: 'Test User',
};

function AuthState() {
	const auth = useAuth();
	return <p role="status">{auth.status}</p>;
}

function renderAuth() {
	return render(
		<AuthProvider>
			<AuthState />
		</AuthProvider>,
	);
}

describe('authentication startup with persistent accounts', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		msal.state.inProgress = InteractionStatus.Startup;
		msal.state.accounts = [];
		msal.instance.getActiveAccount.mockReturnValue(null);
		vi.mocked(apiFetch).mockResolvedValue(undefined);
	});

	afterEach(cleanup);

	it('does not read local-storage accounts until MSAL has initialized', async () => {
		msal.instance.getActiveAccount.mockImplementation(() => {
			throw new Error('uninitialized_public_client_application');
		});

		const view = renderAuth();

		expect(screen.getByRole('status')).toHaveTextContent('loading');
		expect(msal.instance.getActiveAccount).not.toHaveBeenCalled();
		expect(apiFetch).not.toHaveBeenCalled();

		msal.state.inProgress = InteractionStatus.None;
		msal.state.accounts = [account];
		msal.instance.getActiveAccount.mockReturnValue(account);
		view.rerender(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('authenticated');
		});
		expect(apiFetch).toHaveBeenCalledWith('/session/provision', { method: 'POST' });
	});

	it('selects and provisions the first account when there is no active account', async () => {
		msal.state.inProgress = InteractionStatus.None;
		msal.state.accounts = [account];

		renderAuth();

		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('authenticated');
		});
		expect(msal.instance.setActiveAccount).toHaveBeenCalledWith(account);
	});

	it('remains unauthenticated when initialization finishes without an account', () => {
		msal.state.inProgress = InteractionStatus.None;

		renderAuth();

		expect(screen.getByRole('status')).toHaveTextContent('unauthenticated');
		expect(apiFetch).not.toHaveBeenCalled();
	});

	it('surfaces provisioning failure rather than staying in the loading state', async () => {
		msal.state.inProgress = InteractionStatus.None;
		msal.instance.getActiveAccount.mockReturnValue(account);
		vi.mocked(apiFetch).mockRejectedValue(new Error('Provisioning failed'));

		renderAuth();

		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('error');
		});
	});
});
