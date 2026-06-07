import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { PlanTabPage } from '@/pages/tabs/PlanTabPage';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';
import type { RecipeDetail } from '@/pages/tabs/home/types';

const navigateMock = vi.fn();
const searchState: { expand?: string } = {};

vi.mock('@tanstack/react-router', async () => {
	const actual =
		await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
	return {
		...actual,
		useNavigate: () => navigateMock,
		useSearch: () => searchState,
	};
});

vi.mock('@/lib/api', () => ({
	apiFetch: vi.fn(),
}));

function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
	const date = new Date(`${value}T00:00:00`);
	date.setDate(date.getDate() + days);
	return formatDateInput(date);
}

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<PlanTabPage />
		</QueryClientProvider>,
	);
}

function createPlan(today: string): PlanListItem {
	return {
		id: 'active-plan',
		startDate: addDays(today, -1),
		endDate: addDays(today, 2),
		createdAt: '2026-04-01T10:00:00Z',
		updatedAt: '2026-04-01T10:00:00Z',
	};
}

function createFuturePlan(today: string): PlanListItem {
	return {
		id: 'future-plan',
		startDate: addDays(today, 8),
		endDate: addDays(today, 14),
		createdAt: '2026-04-01T10:00:00Z',
		updatedAt: '2026-04-01T10:00:00Z',
	};
}

function createCurrentPlan(): PlanListItem {
	return createPlan(formatDateInput(new Date()));
}

function createPlanDetails(plan: PlanListItem): PlanDetails {
	return {
		...plan,
		days: [
			{
				date: plan.startDate,
				categories: { Unnamed: [], Morning: [], Breakfast: [], Lunch: ['recipe-1'], Dinner: [] },
			},
		],
	};
}

function createRecipeDetail(): RecipeDetail {
	return {
		id: 'recipe-1',
		title: 'Soup',
		notes: '',
		imageUrl: '',
		authorId: 'author',
		authorName: 'Author',
		createdAt: '2026-04-01T10:00:00Z',
		updatedAt: '2026-04-01T10:00:00Z',
		ingredients: [
			{ id: 'ing-1', ingredientId: 'i-1', ingredientName: 'Tomato', quantity: 2, unitId: 'Piece' },
			{ id: 'ing-2', ingredientId: 'i-2', ingredientName: 'Flour', quantity: 100, unitId: 'Gram' },
		],
	};
}

function mockPlanApi(plan: PlanListItem, recipe: RecipeDetail | Error | null = null) {
	const details = createPlanDetails(plan);
	vi.mocked(apiFetch).mockImplementation(async (path: string) => {
		if (path === '/plans') return [plan];
		if (path === '/api/recipes/house') return [];
		if (path === `/plans/${plan.id}`) return details;
		if (path === '/api/recipes/recipe-1' && recipe instanceof Error) throw recipe;
		if (path === '/api/recipes/recipe-1' && recipe) return recipe;
		throw new Error(`Unhandled path: ${path}`);
	});
}

function setUserAgent(value: string) {
	Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

beforeEach(() => {
	searchState.expand = undefined;
	navigateMock.mockReset();
	vi.mocked(apiFetch).mockReset();
	setUserAgent('Mozilla/5.0');
});

describe('PlanTabPage reminders export visibility and fallback', () => {
	it('shows export button for expanded plan in other plans', async () => {
		const futurePlan = createFuturePlan(formatDateInput(new Date()));
		searchState.expand = futurePlan.id;
		mockPlanApi(futurePlan);
		renderPage();
		expect(await screen.findByRole('button', { name: 'Export to Reminders' })).toBeInTheDocument();
	});

	it('opens review panel after export click', async () => {
		const plan = createCurrentPlan();
		mockPlanApi(plan, createRecipeDetail());
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Export to Reminders' }));
		expect(await screen.findByTestId(`reminders-review-${plan.id}`)).toBeInTheDocument();
		expect(screen.getByText('2 ingredients ready.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
	});

	it('sends quantity edits and removals to shortcut bridge', async () => {
		setUserAgent('Mozilla/5.0 (iPhone)');
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const plan = createCurrentPlan();
		mockPlanApi(plan, createRecipeDetail());
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Export to Reminders' }));
		const tomatoQuantity = await screen.findByLabelText('Quantity for Tomato');
		await user.clear(tomatoQuantity);
		await user.type(tomatoQuantity, '5');
		await user.click(screen.getByRole('button', { name: 'Remove Flour' }));
		await user.click(screen.getByRole('button', { name: 'Send' }));
		await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
		const text = new URL(String(openSpy.mock.calls[0][0])).searchParams.get('text');
		expect(text).toContain('Tomato — 5 Piece');
		expect(text).not.toContain('Flour');
		openSpy.mockRestore();
	});
});

describe('PlanTabPage reminders export bridge and errors', () => {
	it('uses iOS shortcut bridge when device is iOS', async () => {
		setUserAgent('Mozilla/5.0 (iPhone)');
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const plan = createCurrentPlan();
		mockPlanApi(plan, createRecipeDetail());
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Export to Reminders' }));
		await user.click(await screen.findByRole('button', { name: 'Send' }));
		await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
		expect(openSpy.mock.calls[0][0]).toContain('shortcuts://run-shortcut?');
		expect(openSpy.mock.calls[0][1]).toBe('_self');
		openSpy.mockRestore();
	});

	it('uses shortcut bridge when device is macOS', async () => {
		setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)');
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const plan = createCurrentPlan();
		mockPlanApi(plan, createRecipeDetail());
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Export to Reminders' }));
		await user.click(await screen.findByRole('button', { name: 'Send' }));
		await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
		expect(openSpy.mock.calls[0][0]).toContain('shortcuts://run-shortcut?');
		expect(screen.queryByTestId(`reminders-fallback-${plan.id}`)).not.toBeInTheDocument();
		openSpy.mockRestore();
	});

	it('shows error when ingredient fetch fails', async () => {
		const plan = createCurrentPlan();
		mockPlanApi(plan, new Error('boom'));
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('button', { name: 'Export to Reminders' }));
		expect(await screen.findByText('Could not fetch all recipe ingredients.')).toBeInTheDocument();
	});
});
