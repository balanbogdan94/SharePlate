import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import {
	CATEGORY_TYPES,
	type CategoryType,
	type PlanDetails,
	type PlanListItem,
} from '@/pages/tabs/plan/types';

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

function formatDisplayDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(`${value}T00:00:00`));
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

type SearchParams = {
	expand?: string;
};

export function PlanTabPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: '/app-layout/plans' }) as SearchParams;
	const today = useMemo(() => formatDateInput(new Date()), []);
	const pastCutoff = useMemo(() => addDays(today, -30), [today]);
	const [manualExpandedPlanId, setManualExpandedPlanId] = useState<string | null>(null);

	const plansQuery = useQuery({
		queryKey: ['plans'],
		queryFn: () => apiFetch<PlanListItem[]>('/plans'),
	});

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'house'],
		queryFn: () => apiFetch<RecipeSummary[]>('/api/recipes/house'),
	});

	const plans = useMemo(
		() => (plansQuery.data ?? []).slice().sort((left, right) => left.startDate.localeCompare(right.startDate)),
		[plansQuery.data],
	);

	const currentPlan = useMemo(
		() => plans.find((plan) => plan.startDate <= today && plan.endDate >= today) ?? null,
		[plans, today],
	);

	const groupedPlans = useMemo(() => {
		const current = plans.filter((plan) => plan.startDate <= today && plan.endDate >= today);
		const future = plans.filter((plan) => plan.startDate > today);
		const past = plans.filter((plan) => plan.endDate < today && plan.endDate >= pastCutoff);
		return { current, future, past };
	}, [pastCutoff, plans, today]);

	const expandedPlanId = useMemo(() => {
		if (search.expand && plans.some((plan) => plan.id === search.expand)) {
			return search.expand;
		}
		if (manualExpandedPlanId && plans.some((plan) => plan.id === manualExpandedPlanId)) {
			return manualExpandedPlanId;
		}
		if (currentPlan) {
			return currentPlan.id;
		}
		return null;
	}, [currentPlan, manualExpandedPlanId, plans, search.expand]);

	const expandedPlanQuery = useQuery({
		queryKey: ['plans', 'detail', expandedPlanId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${expandedPlanId}`),
		enabled: Boolean(expandedPlanId),
	});

	const recipesById = useMemo(() => {
		const map = new Map<string, RecipeSummary>();
		for (const recipe of recipesQuery.data ?? []) {
			map.set(recipe.id, recipe);
		}
		return map;
	}, [recipesQuery.data]);

	const renderPlanCard = (plan: PlanListItem, badge: string) => {
		const isExpanded = expandedPlanId === plan.id;
		return (
				<button
					key={plan.id}
					type='button'
					onClick={() => {
						setManualExpandedPlanId(plan.id);
						if (search.expand) {
							void navigate({ to: '/plans', search: {} });
						}
					}}
					className={`w-full rounded-2xl border p-4 text-left transition ${
					isExpanded
						? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/40'
						: 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700'
				}`}>
				<div className='flex flex-wrap items-start justify-between gap-3'>
					<div>
						<p className='text-base font-semibold text-stone-900 dark:text-stone-100'>
							{formatDisplayDate(plan.startDate)} - {formatDisplayDate(plan.endDate)}
						</p>
						<p className='mt-1 text-sm text-stone-600 dark:text-stone-300'>
							Plan starts {formatDisplayDate(plan.startDate)}
						</p>
					</div>
					<span className='rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200'>
						{badge}
					</span>
				</div>
			</button>
		);
	};

	const renderCategory = (categoryType: CategoryType, recipeIds: string[]) => (
		<div key={categoryType} className='rounded-2xl border border-stone-200 p-3 dark:border-stone-800'>
			<p className='text-sm font-semibold text-stone-800 dark:text-stone-100'>{categoryType}</p>
			{recipeIds.length === 0 ? (
				<p className='mt-2 text-sm text-stone-500 dark:text-stone-400'>No recipes</p>
			) : (
				<ul className='mt-2 space-y-1'>
					{recipeIds.map((recipeId, recipeIndex) => {
						const recipe = recipesById.get(recipeId);
						return (
							<li
								key={`${categoryType}-${recipeId}-${recipeIndex}`}
								className='truncate text-sm text-stone-700 dark:text-stone-200'>
								{recipe?.title ?? recipeId}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);

	return (
		<section className='space-y-4 rounded-2xl border border-stone-200/70 bg-white/60 p-4 pb-24 dark:border-stone-700/70 dark:bg-stone-900/50'>
			<div className='flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-sky-100 via-white to-emerald-100 p-4 shadow-sm dark:from-sky-950 dark:via-stone-900 dark:to-emerald-950'>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<p className='text-sm font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300'>
							Plans
						</p>
						<h1 className='mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50'>
							Meal Plans
						</h1>
						<p className='mt-1 text-sm text-stone-600 dark:text-stone-300'>
							View plans by current, future, and recent past windows.
						</p>
					</div>
					<Button type='button' onClick={() => void navigate({ to: '/plans/create-plan' })}>
						Create Plan
					</Button>
				</div>

				{!currentPlan && plans.length > 0 && (
					<div className='rounded-2xl border border-dashed border-stone-300 bg-white/80 p-4 dark:border-stone-700 dark:bg-stone-950/60'>
						<p className='text-lg font-semibold text-stone-900 dark:text-stone-100'>No active plan</p>
						<p className='mt-1 text-sm text-stone-600 dark:text-stone-300'>
							Create a new plan to cover today.
						</p>
					</div>
				)}
			</div>

			{plansQuery.isLoading && (
				<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300'>
					Loading plans...
				</p>
			)}

			{plansQuery.isError && (
				<Alert variant='destructive'>
					<AlertTitle>Could not load plans</AlertTitle>
					<AlertDescription>{toErrorMessage(plansQuery.error, 'Please try again.')}</AlertDescription>
				</Alert>
			)}

			{plans.length === 0 && !plansQuery.isLoading && !plansQuery.isError && (
				<div className='rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center dark:border-stone-700 dark:bg-stone-950'>
					<p className='text-lg font-semibold text-stone-900 dark:text-stone-100'>No plans yet</p>
					<p className='mt-1 text-sm text-stone-600 dark:text-stone-300'>
						Create your first plan to start assigning recipes.
					</p>
					<Button className='mt-4' type='button' onClick={() => void navigate({ to: '/plans/create-plan' })}>
						Create Plan
					</Button>
				</div>
			)}

			{plans.length > 0 && (
				<div className='grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]'>
					<div className='space-y-4'>
						<div className='rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
							<div className='flex items-center justify-between'>
								<h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>Current</h2>
								<span className='text-xs text-stone-500 dark:text-stone-400'>{groupedPlans.current.length}</span>
							</div>
							<div className='mt-3 space-y-3'>
								{groupedPlans.current.length === 0 ? (
									<p className='text-sm text-stone-500 dark:text-stone-400'>No current plan</p>
								) : (
									groupedPlans.current.map((plan) => renderPlanCard(plan, 'Current'))
								)}
							</div>
						</div>

						<div className='rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
							<div className='flex items-center justify-between'>
								<h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>Future</h2>
								<span className='text-xs text-stone-500 dark:text-stone-400'>{groupedPlans.future.length}</span>
							</div>
							<div className='mt-3 space-y-3'>
								{groupedPlans.future.length === 0 ? (
									<p className='text-sm text-stone-500 dark:text-stone-400'>No future plans</p>
								) : (
									groupedPlans.future.map((plan) => renderPlanCard(plan, 'Future'))
								)}
							</div>
						</div>

						<div className='rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
							<div className='flex items-center justify-between'>
								<h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>Past (last 30 days)</h2>
								<span className='text-xs text-stone-500 dark:text-stone-400'>{groupedPlans.past.length}</span>
							</div>
							<div className='mt-3 space-y-3'>
								{groupedPlans.past.length === 0 ? (
									<p className='text-sm text-stone-500 dark:text-stone-400'>No recent past plans</p>
								) : (
									groupedPlans.past.map((plan) => renderPlanCard(plan, 'Past'))
								)}
							</div>
						</div>
					</div>

					<aside className='space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
						<div className='flex items-center justify-between'>
							<h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>Expanded Plan</h2>
							{expandedPlanId && (
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => void navigate({ to: '/plans/$planId/edit', params: { planId: expandedPlanId } })}>
									Edit
								</Button>
							)}
						</div>

						{!expandedPlanId && (
							<p className='text-sm text-stone-500 dark:text-stone-400'>Select a plan to inspect details.</p>
						)}

						{expandedPlanQuery.isLoading && expandedPlanId && (
							<p className='text-sm text-stone-500 dark:text-stone-400'>Loading plan details...</p>
						)}

						{expandedPlanQuery.isError && expandedPlanId && (
							<Alert variant='destructive'>
								<AlertTitle>Could not load plan details</AlertTitle>
								<AlertDescription>
									{toErrorMessage(expandedPlanQuery.error, 'Please try again.')}
								</AlertDescription>
							</Alert>
						)}

						{expandedPlanQuery.data && (
							<div className='space-y-4'>
								<p className='text-sm text-stone-600 dark:text-stone-300'>
									{formatDisplayDate(expandedPlanQuery.data.startDate)} -{' '}
									{formatDisplayDate(expandedPlanQuery.data.endDate)}
								</p>

								{expandedPlanQuery.data.days.map((day) => (
									<div
										key={day.date}
										className='space-y-3 rounded-2xl border border-stone-200 p-3 dark:border-stone-800'>
										<h3 className='text-sm font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400'>
											{formatDisplayDate(day.date)}
										</h3>
										<div className='grid gap-2'>
											{CATEGORY_TYPES.map((categoryType) =>
												renderCategory(categoryType, day.categories[categoryType] ?? []),
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</aside>
				</div>
			)}
		</section>
	);
}
