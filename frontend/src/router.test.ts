import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '@/auth/AuthContext';
import { router } from '@/router';

function createTestRouter(href: string, isAuthenticated = false) {
	const auth: AuthContextValue = {
		status: isAuthenticated ? 'authenticated' : 'unauthenticated',
		isAuthenticated,
		accountName: '',
		error: null,
		login: vi.fn(),
		logout: vi.fn(),
		retryProvisioning: vi.fn(),
	};

	return createRouter({
		routeTree: router.routeTree,
		history: createMemoryHistory({ initialEntries: [href] }),
		context: { auth },
	});
}

describe('post-login return URL', () => {
	it.each([
		'/plans',
		'/plans?expand=plan-123',
		'/plans#week-2',
		'/plans?expand=plan-123#week-2',
		'/recipes?expand=recipe-123#ingredients',
		'/plans/plan-123/edit',
	])('preserves %s through the login redirect', async (href) => {
		const unauthenticatedRouter = createTestRouter(href);
		await unauthenticatedRouter.load();

		expect(unauthenticatedRouter.state.location.pathname).toBe('/login');
		expect(unauthenticatedRouter.state.location.search).toEqual({ redirect: href });

		const returnTo = unauthenticatedRouter.state.location.search.redirect;
		if (typeof returnTo !== 'string') {
			throw new Error('Login redirect must include a string return URL');
		}
		const authenticatedRouter = createTestRouter(returnTo, true);
		await authenticatedRouter.load();

		expect(authenticatedRouter.state.location.href).toBe(href);
		expect(authenticatedRouter.state.matches.some((match) => match.status === 'notFound')).toBe(false);
	});

	it('does not redirect authenticated users to login', async () => {
		const authenticatedRouter = createTestRouter('/plans', true);
		await authenticatedRouter.load();

		expect(authenticatedRouter.state.location.pathname).toBe('/plans');
	});
});
