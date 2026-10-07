import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { PlanTabPage } from '@/pages/tabs/PlanTabPage';
import { formatDisplayDate } from '@/pages/tabs/plan/planUtils';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';

const navigateMock = vi.fn();
const searchState: { expand?: string } = {};

vi.mock('@tanstack/react-router', async () => {
	const actual =
		await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
	return {
		...actual,
		Link: ({
			children,
			params,
			className,
		}: {
			children: ReactNode;
			params: { recipeId: string };
			className: string;
		}) => (
			<a href={`/recipes/${params.recipeId}`} className={className}>
				{children}
			</a>
		),
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

function createRecipe(id: string, title: string): RecipeSummary {
	return {
		id,
		title,
		notes: '',
		imageUrl: '',
		authorId: 'author-1',
		authorName: 'Author',
		authorAvatarUrl: '',
		createdAt: '2026-04-01T10:00:00Z',
		updatedAt: '2026-04-01T10:00:00Z',
	};
}

function mockApi(
	plans: PlanListItem[],
	detailsById: Record<string, PlanDetails> = {},
	recipes: RecipeSummary[] = [],
) {
	vi.mocked(apiFetch).mockImplementation(async (path: string) => {
		if (path === '/plans') {
			return plans;
		}
		if (path === '/recipes/house') {
			return recipes;
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

		const currentTab = await screen.findByRole('tab', { name: 'Current Plan' });
		expect(currentTab).toHaveAttribute('aria-selected', 'true');
		expect(screen.queryByText('No active plan today')).not.toBeInTheDocument();
	});

	it('keeps multiple recipe days open in the current plan', async () => {
		const today = formatDateInput(new Date());
		const tomorrow = addDays(today, 1);
		const activePlan: PlanListItem = {
			id: 'active-plan',
			startDate: today,
			endDate: tomorrow,
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		const details: PlanDetails = {
			...activePlan,
			days: [today, tomorrow].map((date, index) => ({
				date,
				categories: {
					Unnamed: [],
					Morning: [],
					Breakfast: [],
					Lunch: [`recipe-${index + 1}`],
					Dinner: [],
				},
			})),
		};
		mockApi([activePlan], { [activePlan.id]: details });
		renderPage();

		const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
			new Date(`${today}T00:00:00`),
		);
		const tomorrowLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
			new Date(`${tomorrow}T00:00:00`),
		);
		const todayButton = await screen.findByRole('button', { name: new RegExp(todayLabel) });
		const tomorrowButton = screen.getByRole('button', { name: new RegExp(tomorrowLabel) });
		expect(todayButton).toHaveAttribute('aria-expanded', 'true');
		await userEvent.setup().click(screen.getByRole('button', { name: new RegExp(tomorrowLabel) }));

		expect(todayButton).toHaveAttribute('aria-expanded', 'true');
		expect(tomorrowButton).toHaveAttribute('aria-expanded', 'true');
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
		mockApi(
			[pastPlan, futurePlan],
			{
				[futurePlan.id]: createPopulatedPlanDetails(futurePlan, 'future-recipe-1'),
			},
			[createRecipe('future-recipe-1', 'Future Recipe One')],
		);
		renderPage();

		expect(await screen.findByText('Future plans')).toBeInTheDocument();
		expect(await screen.findByText('Future Recipe One')).toBeInTheDocument();
		const user = userEvent.setup();
		await user.click(screen.getByRole('tab', { name: 'Current Plan' }));
		expect(await screen.findByText('No active plan today')).toBeInTheDocument();
		expect(screen.queryByText('Future Recipe One')).not.toBeInTheDocument();
	});

	it('expands a future plan in Other and shows its recipes', async () => {
		const today = formatDateInput(new Date());
		const futurePlan: PlanListItem = {
			id: 'future-plan',
			startDate: addDays(today, 10),
			endDate: addDays(today, 14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi(
			[futurePlan],
			{
				[futurePlan.id]: createPopulatedPlanDetails(futurePlan, 'future-recipe-2'),
			},
			[createRecipe('future-recipe-2', 'Future Recipe Two')],
		);
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('tab', { name: 'Other Plans' }));
		await user.click(
			screen.getByRole('button', { name: new RegExp(formatDisplayDate(futurePlan.startDate)) }),
		);

		expect(await screen.findByText('Future Recipe Two')).toBeInTheDocument();
	});

	it('expands a past plan in Other and shows its recipes', async () => {
		const today = formatDateInput(new Date());
		const pastPlan: PlanListItem = {
			id: 'past-plan',
			startDate: addDays(today, -20),
			endDate: addDays(today, -14),
			createdAt: '2026-04-01T10:00:00Z',
			updatedAt: '2026-04-01T10:00:00Z',
		};
		mockApi(
			[pastPlan],
			{
				[pastPlan.id]: createPopulatedPlanDetails(pastPlan, 'past-recipe-1'),
			},
			[createRecipe('past-recipe-1', 'Past Recipe One')],
		);
		renderPage();
		const user = userEvent.setup();
		await user.click(await screen.findByRole('tab', { name: 'Other Plans' }));
		await user.click(
			screen.getByRole('button', { name: new RegExp(formatDisplayDate(pastPlan.startDate)) }),
		);

		expect(await screen.findByText('Past Recipe One')).toBeInTheDocument();
	});
});
