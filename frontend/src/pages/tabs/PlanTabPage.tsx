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
	const [segment, setSegment] = useState<'current' | 'other'>('current');
	const [manualExpandedPlanId, setManualExpandedPlanId] = useState<string | null>(null);
	const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

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
		if (plans[0]) {
			return plans[0].id;
		}
		return null;
	}, [currentPlan, manualExpandedPlanId, plans, search.expand]);

	const expandedPlanQuery = useQuery({
		queryKey: ['plans', 'detail', expandedPlanId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${expandedPlanId}`),
		enabled: Boolean(expandedPlanId),
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

	const recipeCountForDay = (dayDate: string): number => {
		const day = activePlanDays.find((item) => item.date === dayDate);
		if (!day) {
			return 0;
		}
		return CATEGORY_TYPES.reduce((count, categoryType) => count + day.categories[categoryType].length, 0);
	};

	const showNoPlansState = plans.length === 0 && !plansQuery.isLoading && !plansQuery.isError;

	return (
		<section className='relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(38,52,84,0.26),_rgba(8,10,14,1)_45%)] p-5 pb-28 text-[#f5f5f5]'>
			<div className='absolute -left-10 top-24 h-52 w-52 rounded-full bg-[#6fdb68]/10 blur-3xl' />
			<div className='relative space-y-5'>
				<div className='space-y-1'>
					<p className='text-xs font-semibold uppercase tracking-[0.28em] text-[#9cc7ff]'>Weekly Journey</p>
					<h1 className='text-[3.2rem] font-extrabold leading-none tracking-tight text-white'>Meal Plans</h1>
				</div>

				<div className='grid grid-cols-2 rounded-full border border-white/10 bg-[#1d2025] p-1'>
					<button
						type='button'
						onClick={() => setSegment('current')}
						className={`rounded-full px-4 py-3 text-lg font-semibold transition ${
							segment === 'current'
								? 'bg-[#2b2f35] text-[#7ce485]'
								: 'text-[#808791]'
						}`}>
						Current Plan
					</button>
					<button
						type='button'
						onClick={() => setSegment('other')}
						className={`rounded-full px-4 py-3 text-lg font-semibold transition ${
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
					<div className='space-y-8 rounded-[2.3rem] border border-white/10 bg-[#14161c]/80 p-5'>
						<div className='mx-auto flex h-36 w-36 items-center justify-center rounded-[2.3rem] border border-white/10 bg-[#1d2026] shadow-[0_14px_40px_rgba(0,0,0,0.45)]'>
							<span className='text-[3rem]'>🍽️</span>
						</div>
						<div className='text-center'>
							<p className='text-xs font-semibold uppercase tracking-[0.3em] text-[#7ce485]'>Kitchen Status</p>
							<h2 className='mt-2 text-5xl font-extrabold text-white'>No plans yet</h2>
							<p className='mt-3 text-2xl leading-relaxed text-[#afb5be]'>
								Start your culinary journey by creating a shared household meal plan.
							</p>
						</div>
						<Button
							type='button'
							onClick={() => void navigate({ to: '/plans/create-plan' })}
							className='h-16 w-full rounded-full bg-[#2f3338] text-2xl font-extrabold text-[#7ce485] hover:bg-[#3a3f45]'>
							<Plus className='mr-2 h-6 w-6' />
							Create Plan
						</Button>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='rounded-[1.9rem] border border-l-2 border-white/10 border-l-[#9cc7ff] bg-[#1a1c22] p-4'>
								<Sparkles className='mb-2 h-6 w-6 text-[#9cc7ff]' />
								<p className='text-xl font-extrabold text-white'>Smart Suggester</p>
								<p className='mt-1 text-lg text-[#afb5be]'>AI-curated meals based on your pantry.</p>
							</div>
							<div className='rounded-[1.9rem] border border-l-2 border-white/10 border-l-[#ff9fbc] bg-[#1a1c22] p-4'>
								<Users className='mb-2 h-6 w-6 text-[#ff9fbc]' />
								<p className='text-xl font-extrabold text-white'>Family Sync</p>
								<p className='mt-1 text-lg text-[#afb5be]'>Real-time updates for every member.</p>
							</div>
						</div>
					</div>
				)}

				{plansQuery.isLoading && (
					<div className='rounded-3xl border border-white/10 bg-[#171a1f] px-4 py-3 text-[#98a0aa]'>
						Loading plans...
					</div>
				)}

				{plans.length > 0 && segment === 'current' && expandedPlanQuery.data && (
					<div className='space-y-4'>
						<div className='rounded-[2.2rem] border border-white/10 bg-[#1a1c22] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.5)]'>
							<div className='mb-3 flex items-start justify-between gap-3'>
								<div>
									<h2 className='text-[2.5rem] font-extrabold text-white'>
										{currentPlan ? 'Current Plan' : 'Active Preview'}
									</h2>
									<p className='text-2xl font-semibold text-[#9cc7ff]'>
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
									className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#7ce485]'>
									<PenLine className='h-5 w-5' />
								</button>
							</div>

							<div className='space-y-3'>
								{activePlanDays.map((day) => {
									const isExpanded = activeExpandedDayDate === day.date;
									return (
										<div
											key={day.date}
											className='rounded-[1.8rem] border border-white/10 bg-[#15181d] p-3'>
											<button
												type='button'
												onClick={() =>
													setExpandedDayDate((current) => (current === day.date ? null : day.date))
												}
												className='flex w-full items-center justify-between gap-3 text-left'>
												<div>
													<p className='text-3xl font-bold text-white'>
														{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
															new Date(`${day.date}T00:00:00`),
														)}
													</p>
													<p className='text-sm uppercase tracking-[0.2em] text-[#7ce485]'>
														{recipeCountForDay(day.date)} recipes
													</p>
												</div>
												{isExpanded ? (
													<ChevronUp className='h-5 w-5 text-[#8a9098]' />
												) : (
													<ChevronDown className='h-5 w-5 text-[#8a9098]' />
												)}
											</button>

											{isExpanded && (
												<div className='mt-3 space-y-3'>
													{CATEGORY_TYPES.map((categoryType) => {
														const recipes = day.categories[categoryType] ?? [];
														return (
															<div
																key={`${day.date}-${categoryType}`}
																className={`rounded-[1.5rem] border border-white/10 border-l-2 bg-[#101217] p-3 ${CATEGORY_TINT[categoryType]}`}>
																<p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#7f858f]'>
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
																		className='mt-2 rounded-full border border-white/10 bg-[#2b3034] px-4 py-2 text-lg font-semibold text-[#7ce485]'>
																		+ Add Recipe
																	</button>
																) : (
																	<div className='mt-2 space-y-2'>
																		{recipes.map((recipeId, index) => {
																			const recipe = recipeMap.get(recipeId);
																			return (
																				<div
																					key={`${recipeId}-${index}`}
																					className='flex items-center gap-3 rounded-full border border-white/10 bg-[#2c2f35] p-2'>
																					<div className='h-16 w-16 overflow-hidden rounded-full bg-black/40'>
																						{recipe?.imageUrl ? (
																							<img
																								src={recipe.imageUrl}
																								alt={recipe.title}
																								className='h-full w-full object-cover'
																							/>
																						) : (
																							<div className='flex h-full w-full items-center justify-center text-lg font-bold text-[#7f848b]'>
																								{(recipe?.title ?? 'R').slice(0, 1)}
																							</div>
																						)}
																					</div>
																					<div className='min-w-0'>
																						<p className='truncate text-2xl font-bold text-white'>
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
						{[...groupedPlans.future, ...groupedPlans.past].length === 0 ? (
							<div className='rounded-3xl border border-white/10 bg-[#171a1f] px-4 py-3 text-[#98a0aa]'>
								No other plans yet.
							</div>
						) : (
							[...groupedPlans.future, ...groupedPlans.past].map((plan) => (
								<button
									key={plan.id}
									type='button'
									onClick={() => {
										setManualExpandedPlanId(plan.id);
										setSegment('current');
										if (search.expand) {
											void navigate({ to: '/plans', search: {} });
										}
									}}
									className='w-full rounded-[1.9rem] border border-white/10 bg-[#1a1c22] p-4 text-left'>
									<p className='text-3xl font-bold text-white'>
										{formatDisplayDate(plan.startDate)} - {formatDisplayDate(plan.endDate)}
									</p>
									<p className='text-sm uppercase tracking-[0.2em] text-[#7ce485]'>
										{plan.startDate > today ? 'Future Plan' : 'Previous Plan'}
									</p>
								</button>
							))
						)}
					</div>
				)}
			</div>

			{plans.length > 0 && (
				<button
					type='button'
					onClick={() => void navigate({ to: '/plans/create-plan' })}
					className='fixed bottom-32 right-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#6fdb68] text-[#05240f] shadow-[0_18px_30px_rgba(111,219,104,0.35)]'>
					<Plus className='h-8 w-8' />
				</button>
			)}
		</section>
	);
}
