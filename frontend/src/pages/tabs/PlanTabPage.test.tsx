import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { PlanTabPage } from '@/pages/tabs/PlanTabPage';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';

const navigateMock = vi.fn();
const searchState: { expand?: string } = {};

vi.mock('@tanstack/react-router', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
		'@tanstack/react-router',
	);
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
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<PlanTabPage />
		</QueryClientProvider>,
	);
}

function createPlanDetails(plan: PlanListItem): PlanDetails {
	return {
		...plan,
		days: [
			{
				date: plan.startDate,
				categories: {
					Unnamed: [],
					Morning: [],
					Breakfast: [],
					Lunch: [],
					Dinner: [],
				},
			},
		],
	};
}

function createPopulatedPlanDetails(plan: PlanListItem, recipeId: string): PlanDetails {
	return {
		...plan,
		days: [
			{
				date: plan.startDate,
				categories: {
					Unnamed: [],
					Morning: [],
					Breakfast: [],
					Lunch: [recipeId],
					Dinner: [],
				},
			},
		],
	};
}

function mockApi(plans: PlanListItem[], detailsById: Record<string, PlanDetails> = {}) {
	vi.mocked(apiFetch).mockImplementation(async (path: string) => {
		if (path === '/plans') {
			return plans;
		}
		if (path === '/recipes/house') {
			return [];
		}
		if (path.startsWith('/plans/')) {
			const planId = path.replace('/plans/', '');
			const details = detailsById[planId];
			if (!details) {
				throw new Error(`No mocked details for plan ${planId}`);
			}
			return details;
		}
		throw new Error(`Unhandled path: ${path}`);
	});
}

describe('PlanTabPage', () => {
	beforeEach(() => {
		searchState.expand = undefined;
		navigateMock.mockReset();
		vi.mocked(apiFetch).mockReset();
	});

	it('renders current plan details when an active plan exists for today', async () => {
		const today = formatDateInput(new Date());
		const activePlan: PlanListItem = {
			id: 'active-plan',
			startDate: addDays(today, -1),
			endDate: addDays(today, 2),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi([activePlan], { [activePlan.id]: createPlanDetails(activePlan) });
		renderPage();

		expect(await screen.findByRole('heading', { name: 'Current Plan' })).toBeInTheDocument();
		expect(screen.queryByText('No active plan today')).not.toBeInTheDocument();
	});

	it('renders no-active placeholder when plans exist but none are active today', async () => {
		const today = formatDateInput(new Date());
		const pastPlan: PlanListItem = {
			id: 'past-plan',
			startDate: addDays(today, -20),
			endDate: addDays(today, -14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		const futurePlan: PlanListItem = {
			id: 'future-plan',
			startDate: addDays(today, 10),
			endDate: addDays(today, 14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi([pastPlan, futurePlan]);
		renderPage();

		expect(await screen.findByText('No active plan today')).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Current Plan' })).not.toBeInTheDocument();
	});

	it('renders existing no-plans state when there are no plans', async () => {
		mockApi([]);
		renderPage();

		expect(await screen.findByText('No plans yet')).toBeInTheDocument();
		expect(screen.queryByText('No active plan today')).not.toBeInTheDocument();
	});

	it('shows non-active expand plan through Other Plans while Current remains placeholder', async () => {
		const today = formatDateInput(new Date());
		const pastPlan: PlanListItem = {
			id: 'past-plan',
			startDate: addDays(today, -20),
			endDate: addDays(today, -14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		const futurePlan: PlanListItem = {
			id: 'future-plan',
			startDate: addDays(today, 10),
			endDate: addDays(today, 14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		searchState.expand = futurePlan.id;
		mockApi([pastPlan, futurePlan], {
			[futurePlan.id]: createPopulatedPlanDetails(futurePlan, 'future-recipe-1'),
		});
		renderPage();

		expect(await screen.findByText('Future Plan')).toBeInTheDocument();
		expect(await screen.findByText('future-recipe-1')).toBeInTheDocument();
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Current Plan' }));
		expect(await screen.findByText('No active plan today')).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Current Plan' })).not.toBeInTheDocument();
	});

	it('expands a future plan in Other and shows recipes with edit actions', async () => {
		const today = formatDateInput(new Date());
		const futurePlan: PlanListItem = {
			id: 'future-plan',
			startDate: addDays(today, 10),
			endDate: addDays(today, 14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi([futurePlan], {
			[futurePlan.id]: createPopulatedPlanDetails(futurePlan, 'future-recipe-2'),
		});
		renderPage();
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Other Plans' }));
		await user.click(screen.getByRole('button', { name: /Future Plan/i }));

		expect(await screen.findByText('future-recipe-2')).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '+ Add Recipe' }).length).toBeGreaterThan(0);
	});

	it('expands a past plan in Other and keeps it read-only', async () => {
		const today = formatDateInput(new Date());
		const pastPlan: PlanListItem = {
			id: 'past-plan',
			startDate: addDays(today, -20),
			endDate: addDays(today, -14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi([pastPlan], {
			[pastPlan.id]: createPopulatedPlanDetails(pastPlan, 'past-recipe-1'),
		});
		renderPage();
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Other Plans' }));
		await user.click(screen.getByRole('button', { name: /Previous Plan/i }));

		expect(await screen.findByText('past-recipe-1')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '+ Add Recipe' })).not.toBeInTheDocument();
		expect(screen.getAllByText('No recipes planned').length).toBeGreaterThan(0);
	});
});
