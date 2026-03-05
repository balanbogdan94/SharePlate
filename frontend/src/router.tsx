import {
	Outlet,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	redirect,
} from '@tanstack/react-router';
import type { AuthContextValue } from '@/auth/AuthContext';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

type RouterContext = {
	auth: AuthContextValue;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
	component: HomePage,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: '/' });
		}
	},
	component: LoginPage,
});

const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/register',
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: '/' });
		}
	},
	component: RegisterPage,
});

const routeTree = rootRoute.addChildren([homeRoute, loginRoute, registerRoute]);

export const router = createRouter({
	routeTree,
	context: {
		auth: undefined!,
	},
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
