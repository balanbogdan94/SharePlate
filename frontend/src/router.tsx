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
import { RecipeDetailsPage } from '@/pages/RecipeDetailsPage';
import { CreatePlanPage } from '@/pages/CreatePlanPage';
import { HomeTabPage } from '@/pages/tabs/HomeTabPage';
import { PlanTabPage } from '@/pages/tabs/PlanTabPage';
import { ThirdTabPage } from '@/pages/tabs/ThirdTabPage';

type RouterContext = {
	auth: AuthContextValue;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: ({ context }) => {
		throw redirect({ to: context.auth.isAuthenticated ? '/plans' : '/login' });
	},
});

const appLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: 'app-layout',
	beforeLoad: ({ context, location }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({
				to: '/login',
				search: {
					redirect: `${location.pathname}${location.search}${location.hash}`,
				},
			});
		}
	},
	component: AppShell,
});

const homeTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes',
	validateSearch: (
		search: Record<string, unknown>,
	): { expand?: string } => ({
		expand: typeof search.expand === 'string' ? search.expand : undefined,
	}),
	component: HomeTabPage,
});

const addRecipeRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes/add',
	component: AddRecipePage,
});

const recipeDetailsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes/$recipeId',
	component: RecipeDetailsPage,
});

const editRecipeRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/recipes/$recipeId/edit',
	component: AddRecipePage,
});

const planTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/plans',
	validateSearch: (
		search: Record<string, unknown>,
	): { expand?: string } => ({
		expand: typeof search.expand === 'string' ? search.expand : undefined,
	}),
	component: PlanTabPage,
});

const createPlanRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/plans/create-plan',
	component: CreatePlanPage,
});

const editPlanRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/plans/$planId/edit',
	component: CreatePlanPage,
});

const thirdTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: '/tab-3',
	component: ThirdTabPage,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	validateSearch: (
		search: Record<string, unknown>,
	): { redirect?: string } => ({
		redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
	}),
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: '/plans' });
		}
	},
	component: LoginPage,
});

const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/register',
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: '/plans' });
		}
	},
	component: RegisterPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	appLayoutRoute.addChildren([
		homeTabRoute,
		addRecipeRoute,
		recipeDetailsRoute,
		editRecipeRoute,
		planTabRoute,
		createPlanRoute,
		editPlanRoute,
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
