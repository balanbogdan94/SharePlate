import {
	Outlet,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	redirect,
} from '@tanstack/react-router';
import type { AuthContextValue } from '@/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AddRecipePage } from '@/pages/AddRecipePage';
import { HomeTabPage } from '@/pages/tabs/HomeTabPage';
import { SecondTabPage } from '@/pages/tabs/SecondTabPage';
import { ThirdTabPage } from '@/pages/tabs/ThirdTabPage';

type RouterContext = {
	auth: AuthContextValue;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});

const appLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: 'app-layout',
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({ to: '/login' });
		}
	},
	component: AppShell,
});

const homeTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes',
	component: HomeTabPage,
});

const addRecipeRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes/add',
	component: AddRecipePage,
});

const secondTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/tab-2',
	component: SecondTabPage,
});

const thirdTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/tab-3',
	component: ThirdTabPage,
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

const routeTree = rootRoute.addChildren([
	appLayoutRoute.addChildren([
		homeTabRoute,
		addRecipeRoute,
		secondTabRoute,
		thirdTabRoute,
	]),
	loginRoute,
	registerRoute,
]);

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
