import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
	ChevronDown,
	ChevronUp,
	PenLine,
	Plus,
	Sparkles,
	Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import {
	CATEGORY_TYPES,
	type CategoryType,
	type PlanDay,
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
	}).format(new Date(`${value}T00:00:00`));
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function isPlanActiveOnDate(plan: PlanListItem, date: string): boolean {
	return plan.startDate <= date && plan.endDate >= date;
}

function isFuturePlan(plan: PlanListItem, date: string): boolean {
	return plan.startDate > date;
}

type SearchParams = {
	expand?: string;
};

const CATEGORY_TINT: Record<CategoryType, string> = {
	Unnamed: 'border-l-[#8df27b]/40',
	Morning: 'border-l-[#99c3ff]/50',
	Breakfast: 'border-l-[#8df27b]/50',
	Lunch: 'border-l-[#ff9fbc]/50',
	Dinner: 'border-l-[#5aa9ff]/40',
};

export function PlanTabPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: '/app-layout/plans' }) as SearchParams;
	const today = useMemo(() => formatDateInput(new Date()), []);
	const pastCutoff = useMemo(() => addDays(today, -30), [today]);
	const [manualSegment, setManualSegment] = useState<'current' | 'other' | null>(null);
	const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);
	const [manualExpandedOtherPlanId, setManualExpandedOtherPlanId] = useState<string | null>(null);
	const [expandedOtherDayDate, setExpandedOtherDayDate] = useState<string | null>(null);

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
		() => plans.find((plan) => isPlanActiveOnDate(plan, today)) ?? null,
		[plans, today],
	);
	const expandedSearchPlan = useMemo(
		() => (search.expand ? plans.find((plan) => plan.id === search.expand) ?? null : null),
		[plans, search.expand],
	);
	const shouldDefaultToOtherSegment = useMemo(
		() => Boolean(expandedSearchPlan && !isPlanActiveOnDate(expandedSearchPlan, today)),
		[expandedSearchPlan, today],
	);
	const segment = manualSegment ?? (shouldDefaultToOtherSegment ? 'other' : 'current');

	const groupedPlans = useMemo(() => {
		const current = plans.filter((plan) => isPlanActiveOnDate(plan, today));
		const future = plans.filter((plan) => isFuturePlan(plan, today));
		const past = plans.filter((plan) => plan.endDate < today && plan.endDate >= pastCutoff);
		return { current, future, past };
	}, [pastCutoff, plans, today]);
	const otherPlans = useMemo(() => [...groupedPlans.future, ...groupedPlans.past], [groupedPlans.future, groupedPlans.past]);
	const expandedOtherPlanId = useMemo(() => {
		if (search.expand && otherPlans.some((plan) => plan.id === search.expand)) {
			return search.expand;
		}
		if (manualExpandedOtherPlanId && otherPlans.some((plan) => plan.id === manualExpandedOtherPlanId)) {
			return manualExpandedOtherPlanId;
		}
		return null;
	}, [manualExpandedOtherPlanId, otherPlans, search.expand]);

	const expandedPlanId = useMemo(() => currentPlan?.id ?? null, [currentPlan]);

	const expandedPlanQuery = useQuery({
		queryKey: ['plans', 'detail', expandedPlanId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${expandedPlanId}`),
		enabled: Boolean(expandedPlanId),
	});
	const expandedOtherPlanQuery = useQuery({
		queryKey: ['plans', 'detail', 'other', expandedOtherPlanId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${expandedOtherPlanId}`),
		enabled: Boolean(expandedOtherPlanId),
	});

	const recipeMap = useMemo(() => {
		const map = new Map<string, RecipeSummary>();
		for (const recipe of recipesQuery.data ?? []) {
			map.set(recipe.id, recipe);
		}
		return map;
	}, [recipesQuery.data]);

	const activePlanDays = expandedPlanQuery.data?.days ?? [];
	const activeExpandedDayDate = expandedDayDate ?? activePlanDays[0]?.date ?? null;
	const expandedOtherPlanDays = expandedOtherPlanQuery.data?.days ?? [];
	const activeExpandedOtherDayDate = expandedOtherDayDate ?? expandedOtherPlanDays[0]?.date ?? null;

	const recipeCountForDay = (dayDate: string): number => {
		const day = activePlanDays.find((item) => item.date === dayDate);
		if (!day) {
			return 0;
		}
		return CATEGORY_TYPES.reduce((count, categoryType) => count + day.categories[categoryType].length, 0);
	};
	const recipeCountForPlanDay = (day: PlanDay): number =>
		CATEGORY_TYPES.reduce((count, categoryType) => count + day.categories[categoryType].length, 0);

	const showNoPlansState = plans.length === 0 && !plansQuery.isLoading && !plansQuery.isError;
	const showNoActivePlanState =
		plans.length > 0 && !plansQuery.isLoading && !plansQuery.isError && !currentPlan;

	return (
		<section className='relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(38,52,84,0.26),_rgba(8,10,14,1)_45%)] p-3 pb-24 text-[#f5f5f5] sm:rounded-[2rem] sm:p-5 sm:pb-28'>
			<div className='absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#6fdb68]/10 blur-3xl sm:top-24 sm:h-52 sm:w-52' />
			<div className='relative space-y-4 sm:space-y-5'>
				<div className='space-y-1'>
					<p className='text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#9cc7ff] sm:text-xs sm:tracking-[0.28em]'>
						Weekly Journey
					</p>
					<h1 className='text-[2rem] font-extrabold leading-none tracking-tight text-white sm:text-[2.8rem]'>
						Meal Plans
					</h1>
				</div>

				<div className='grid grid-cols-2 rounded-full border border-white/10 bg-[#1d2025] p-1'>
					<button
						type='button'
						onClick={() => setManualSegment('current')}
						className={`min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-3 sm:text-base ${
							segment === 'current'
								? 'bg-[#2b2f35] text-[#7ce485]'
								: 'text-[#808791]'
						}`}>
						Current Plan
					</button>
					<button
						type='button'
						onClick={() => setManualSegment('other')}
						className={`min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-3 sm:text-base ${
							segment === 'other'
								? 'bg-[#2b2f35] text-[#7ce485]'
								: 'text-[#808791]'
						}`}>
						Other Plans
					</button>
				</div>

				{plansQuery.isError && (
					<Alert variant='destructive'>
						<AlertTitle>Could not load plans</AlertTitle>
						<AlertDescription>{toErrorMessage(plansQuery.error, 'Please try again.')}</AlertDescription>
					</Alert>
				)}

				{showNoPlansState && (
					<div className='space-y-5 rounded-2xl border border-white/10 bg-[#14161c]/80 p-4 sm:space-y-8 sm:rounded-[2.3rem] sm:p-5'>
						<div className='mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-[#1d2026] shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:h-32 sm:w-32 sm:rounded-[2.3rem]'>
							<span className='text-[2.2rem] sm:text-[2.8rem]'>🍽️</span>
						</div>
						<div className='text-center'>
							<p className='text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#7ce485] sm:text-xs sm:tracking-[0.3em]'>
								Kitchen Status
							</p>
							<h2 className='mt-2 text-[1.75rem] font-extrabold leading-tight text-white sm:text-5xl'>
								No plans yet
							</h2>
							<p className='mt-2 text-sm leading-relaxed text-[#afb5be] sm:mt-3 sm:text-lg'>
								Start your culinary journey by creating a shared household meal plan.
							</p>
						</div>
						<Button
							type='button'
							onClick={() => void navigate({ to: '/plans/create-plan' })}
							className='h-12 w-full rounded-full bg-[#2f3338] text-base font-extrabold text-[#7ce485] hover:bg-[#3a3f45] sm:h-14 sm:text-xl'>
							<Plus className='mr-2 h-5 w-5 sm:h-6 sm:w-6' />
							Create Plan
						</Button>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='rounded-2xl border border-l-2 border-white/10 border-l-[#9cc7ff] bg-[#1a1c22] p-3 sm:rounded-[1.9rem] sm:p-4'>
								<Sparkles className='mb-2 h-5 w-5 text-[#9cc7ff] sm:h-6 sm:w-6' />
								<p className='text-base font-extrabold text-white sm:text-lg'>Smart Suggester</p>
								<p className='mt-1 text-sm text-[#afb5be] sm:text-base'>AI-curated meals based on your pantry.</p>
							</div>
							<div className='rounded-2xl border border-l-2 border-white/10 border-l-[#ff9fbc] bg-[#1a1c22] p-3 sm:rounded-[1.9rem] sm:p-4'>
								<Users className='mb-2 h-5 w-5 text-[#ff9fbc] sm:h-6 sm:w-6' />
								<p className='text-base font-extrabold text-white sm:text-lg'>Family Sync</p>
								<p className='mt-1 text-sm text-[#afb5be] sm:text-base'>Real-time updates for every member.</p>
							</div>
						</div>
					</div>
				)}

				{showNoActivePlanState && segment === 'current' && (
					<div className='space-y-5 rounded-2xl border border-white/10 bg-[#14161c]/80 p-4 sm:space-y-8 sm:rounded-[2.3rem] sm:p-5'>
						<div className='mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-[#1d2026] shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:h-32 sm:w-32 sm:rounded-[2.3rem]'>
							<span className='text-[2.2rem] sm:text-[2.8rem]'>📅</span>
						</div>
						<div className='text-center'>
							<p className='text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#7ce485] sm:text-xs sm:tracking-[0.3em]'>
								Today
							</p>
							<h2 className='mt-2 text-[1.75rem] font-extrabold leading-tight text-white sm:text-5xl'>
								No active plan today
							</h2>
							<p className='mt-2 text-sm leading-relaxed text-[#afb5be] sm:mt-3 sm:text-lg'>
								Create a plan now to start your week.
							</p>
						</div>
						<Button
							type='button'
							onClick={() => void navigate({ to: '/plans/create-plan' })}
							className='h-12 w-full rounded-full bg-[#2f3338] text-base font-extrabold text-[#7ce485] hover:bg-[#3a3f45] sm:h-14 sm:text-xl'>
							<Plus className='mr-2 h-5 w-5 sm:h-6 sm:w-6' />
							Create Plan
						</Button>
					</div>
				)}

				{plansQuery.isLoading && (
					<div className='rounded-3xl border border-white/10 bg-[#171a1f] px-4 py-3 text-[#98a0aa]'>
						Loading plans...
					</div>
				)}

				{plans.length > 0 && segment === 'current' && currentPlan && expandedPlanQuery.data && (
					<div className='space-y-4'>
						<div className='rounded-2xl border border-white/10 bg-[#1a1c22] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.5)] sm:rounded-[2.2rem] sm:p-4'>
							<div className='mb-3 flex items-start justify-between gap-2 sm:gap-3'>
								<div>
									<h2 className='text-xl font-extrabold text-white sm:text-[2rem]'>Current Plan</h2>
									<p className='text-sm font-semibold text-[#9cc7ff] sm:text-xl'>
										{formatDisplayDate(expandedPlanQuery.data.startDate)} -{' '}
										{formatDisplayDate(expandedPlanQuery.data.endDate)}
									</p>
								</div>
								<button
									type='button'
									onClick={() =>
										void navigate({
											to: '/plans/$planId/edit',
											params: { planId: expandedPlanQuery.data.id },
										})
									}
									className='flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#7ce485] sm:h-12 sm:w-12'>
									<PenLine className='h-4 w-4 sm:h-5 sm:w-5' />
								</button>
							</div>

							<div className='space-y-2 sm:space-y-3'>
								{activePlanDays.map((day) => {
									const isExpanded = activeExpandedDayDate === day.date;
									return (
										<div
											key={day.date}
											className='rounded-xl border border-white/10 bg-[#15181d] p-3 sm:rounded-[1.8rem]'>
											<button
												type='button'
												onClick={() =>
													setExpandedDayDate((current) => (current === day.date ? null : day.date))
												}
												className='flex w-full items-center justify-between gap-3 text-left'>
												<div className='min-w-0'>
													<p className='line-clamp-1 text-lg font-bold text-white sm:text-2xl'>
														{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
															new Date(`${day.date}T00:00:00`),
														)}
													</p>
													<p className='text-xs uppercase tracking-[0.16em] text-[#7ce485] sm:text-sm sm:tracking-[0.2em]'>
														{recipeCountForDay(day.date)} recipes
													</p>
												</div>
												{isExpanded ? (
													<ChevronUp className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
												) : (
													<ChevronDown className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
												)}
											</button>

											{isExpanded && (
												<div className='mt-2 space-y-2 sm:mt-3 sm:space-y-3'>
													{CATEGORY_TYPES.map((categoryType) => {
														const recipes = day.categories[categoryType] ?? [];
														return (
															<div
																key={`${day.date}-${categoryType}`}
																className={`rounded-xl border border-white/10 border-l-2 bg-[#101217] p-3 sm:rounded-[1.5rem] ${CATEGORY_TINT[categoryType]}`}>
																<p className='text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7f858f] sm:text-xs sm:tracking-[0.22em]'>
																	{categoryType}
																</p>
																{recipes.length === 0 ? (
																	<button
																		type='button'
																		onClick={() =>
																			void navigate({
																				to: '/plans/$planId/edit',
																				params: { planId: expandedPlanQuery.data.id },
																			})
																		}
																		className='mt-2 min-h-11 rounded-full border border-white/10 bg-[#2b3034] px-3 py-2 text-sm font-semibold text-[#7ce485] sm:px-4 sm:text-base'>
																		+ Add Recipe
																	</button>
																) : (
																	<div className='mt-2 space-y-2'>
																		{recipes.map((recipeId, index) => {
																			const recipe = recipeMap.get(recipeId);
																			return (
																				<div
																					key={`${recipeId}-${index}`}
																					role='button'
																					tabIndex={0}
																					onClick={() =>
																						void navigate({
																							to: '/recipes/$recipeId',
																							params: { recipeId },
																						})
																					}
																					onKeyDown={(event) => {
																						if (event.key === 'Enter' || event.key === ' ') {
																							event.preventDefault();
																							void navigate({
																								to: '/recipes/$recipeId',
																								params: { recipeId },
																							});
																						}
																					}}
																					className='flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-[#2c2f35] p-2 transition hover:border-white/20 hover:bg-[#353942] sm:gap-3 sm:rounded-full'>
																					<div className='h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/40 sm:h-14 sm:w-14'>
																						{recipe?.imageUrl ? (
																							<img
																								src={recipe.imageUrl}
																								alt={recipe.title}
																								className='h-full w-full object-cover'
																							/>
																						) : (
																							<div className='flex h-full w-full items-center justify-center text-sm font-bold text-[#7f848b] sm:text-base'>
																								{(recipe?.title ?? 'R').slice(0, 1)}
																							</div>
																						)}
																					</div>
																					<div className='min-w-0 flex-1'>
																						<p className='line-clamp-1 text-base font-bold text-white sm:text-lg'>
																							{recipe?.title ?? recipeId}
																						</p>
																					</div>
																				</div>
																			);
																		})}
																	</div>
																)}
															</div>
														);
													})}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{plans.length > 0 && segment === 'other' && (
					<div className='space-y-3'>
						{otherPlans.length === 0 ? (
							<div className='rounded-3xl border border-white/10 bg-[#171a1f] px-4 py-3 text-[#98a0aa]'>
								No other plans yet.
							</div>
						) : (
							otherPlans.map((plan) => (
								<div
									key={plan.id}
									className='rounded-2xl border border-white/10 bg-[#1a1c22] p-3 text-left sm:rounded-[1.9rem] sm:p-4'>
									<button
										type='button'
										onClick={() => {
											if (segment !== 'other') {
												setManualSegment('other');
											}
											const isExpanded = expandedOtherPlanId === plan.id;
											setManualExpandedOtherPlanId((current) => (current === plan.id ? null : plan.id));
											setExpandedOtherDayDate(null);
											if (isExpanded) {
												if (search.expand) {
													void navigate({ to: '/plans', search: {} });
												}
												return;
											}
											if (search.expand !== plan.id) {
												void navigate({ to: '/plans', search: { expand: plan.id } });
											}
										}}
										className='flex w-full items-center justify-between gap-3 text-left'>
										<div>
											<p className='text-lg font-bold text-white sm:text-2xl'>
												{formatDisplayDate(plan.startDate)} - {formatDisplayDate(plan.endDate)}
											</p>
											<p className='text-xs uppercase tracking-[0.16em] text-[#7ce485] sm:text-sm sm:tracking-[0.2em]'>
												{isFuturePlan(plan, today) ? 'Future Plan' : 'Previous Plan'}
											</p>
										</div>
										{expandedOtherPlanId === plan.id ? (
											<ChevronUp className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
										) : (
											<ChevronDown className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
										)}
									</button>

									{expandedOtherPlanId === plan.id && (
										<div className='mt-3 space-y-3'>
											{expandedOtherPlanQuery.isLoading && (
												<div className='rounded-3xl border border-white/10 bg-[#171a1f] px-4 py-3 text-[#98a0aa]'>
													Loading plan...
												</div>
											)}
											{expandedOtherPlanQuery.isError && (
												<Alert variant='destructive'>
													<AlertTitle>Could not load plan details</AlertTitle>
													<AlertDescription>
														{toErrorMessage(expandedOtherPlanQuery.error, 'Please try again.')}
													</AlertDescription>
												</Alert>
											)}
											{expandedOtherPlanQuery.data && (
												<div className='space-y-2 sm:space-y-3'>
													{isFuturePlan(plan, today) && (
														<div className='flex justify-end'>
															<button
																type='button'
																onClick={() =>
																	void navigate({
																		to: '/plans/$planId/edit',
																		params: { planId: plan.id },
																	})
																}
																className='flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#7ce485] sm:h-12 sm:w-12'>
																<PenLine className='h-4 w-4 sm:h-5 sm:w-5' />
															</button>
														</div>
													)}
													{expandedOtherPlanDays.map((day) => {
														const isExpanded = activeExpandedOtherDayDate === day.date;
														return (
															<div
																key={day.date}
																className='rounded-xl border border-white/10 bg-[#15181d] p-3 sm:rounded-[1.8rem]'>
																<button
																	type='button'
																	onClick={() =>
																		setExpandedOtherDayDate((current) =>
																			current === day.date ? null : day.date,
																		)
																	}
																	className='flex w-full items-center justify-between gap-3 text-left'>
																	<div className='min-w-0'>
																		<p className='line-clamp-1 text-lg font-bold text-white sm:text-2xl'>
																			{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
																				new Date(`${day.date}T00:00:00`),
																			)}
																		</p>
																		<p className='text-xs uppercase tracking-[0.16em] text-[#7ce485] sm:text-sm sm:tracking-[0.2em]'>
																			{recipeCountForPlanDay(day)} recipes
																		</p>
																	</div>
																	{isExpanded ? (
																		<ChevronUp className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
																	) : (
																		<ChevronDown className='h-4 w-4 text-[#8a9098] sm:h-5 sm:w-5' />
																	)}
																</button>

																{isExpanded && (
																	<div className='mt-2 space-y-2 sm:mt-3 sm:space-y-3'>
																		{CATEGORY_TYPES.map((categoryType) => {
																			const recipes = day.categories[categoryType] ?? [];
																			return (
																				<div
																					key={`${day.date}-${categoryType}`}
																					className={`rounded-xl border border-white/10 border-l-2 bg-[#101217] p-3 sm:rounded-[1.5rem] ${CATEGORY_TINT[categoryType]}`}>
																					<p className='text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7f858f] sm:text-xs sm:tracking-[0.22em]'>
																						{categoryType}
																					</p>
																					{recipes.length === 0 ? (
																						isFuturePlan(plan, today) ? (
																							<button
																								type='button'
																								onClick={() =>
																									void navigate({
																										to: '/plans/$planId/edit',
																										params: { planId: plan.id },
																									})
																								}
																								className='mt-2 min-h-11 rounded-full border border-white/10 bg-[#2b3034] px-3 py-2 text-sm font-semibold text-[#7ce485] sm:px-4 sm:text-base'>
																								+ Add Recipe
																							</button>
																						) : (
																							<p className='mt-2 text-sm text-[#98a0aa]'>No recipes planned</p>
																						)
																					) : (
																						<div className='mt-2 space-y-2'>
																							{recipes.map((recipeId, index) => {
																								const recipe = recipeMap.get(recipeId);
																								return (
																									<div
																										key={`${recipeId}-${index}`}
																										role='button'
																										tabIndex={0}
																										onClick={() =>
																											void navigate({
																												to: '/recipes/$recipeId',
																												params: { recipeId },
																											})
																										}
																										onKeyDown={(event) => {
																											if (
																												event.key === 'Enter' ||
																												event.key === ' '
																											) {
																												event.preventDefault();
																												void navigate({
																													to: '/recipes/$recipeId',
																													params: { recipeId },
																												});
																											}
																										}}
																										className='flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-[#2c2f35] p-2 transition hover:border-white/20 hover:bg-[#353942] sm:gap-3 sm:rounded-full'>
																										<div className='h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/40 sm:h-14 sm:w-14'>
																											{recipe?.imageUrl ? (
																												<img
																													src={recipe.imageUrl}
																													alt={recipe.title}
																													className='h-full w-full object-cover'
																												/>
																											) : (
																												<div className='flex h-full w-full items-center justify-center text-sm font-bold text-[#7f848b] sm:text-base'>
																													{(recipe?.title ?? 'R').slice(0, 1)}
																												</div>
																											)}
																										</div>
																										<div className='min-w-0 flex-1'>
																											<p className='line-clamp-1 text-base font-bold text-white sm:text-lg'>
																												{recipe?.title ?? recipeId}
																											</p>
																										</div>
																									</div>
																								);
																							})}
																						</div>
																					)}
																				</div>
																			);
																		})}
																	</div>
																)}
															</div>
														);
													})}
												</div>
											)}
										</div>
									)}
								</div>
							))
						)}
					</div>
				)}
			</div>

			{plans.length > 0 && (
				<button
					type='button'
					onClick={() => void navigate({ to: '/plans/create-plan' })}
					className='fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6fdb68] text-[#05240f] shadow-[0_18px_30px_rgba(111,219,104,0.35)] sm:bottom-32 sm:right-8 sm:h-14 sm:w-14'>
					<Plus className='h-6 w-6 sm:h-7 sm:w-7' />
				</button>
			)}
		</section>
	);
}
