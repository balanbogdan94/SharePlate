import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	CalendarDays,
	Check,
	CirclePlus,
	Coffee,
	Loader2,
	Sandwich,
	Sunrise,
	UtensilsCrossed,
	X,
	type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import {
	CATEGORY_TYPES,
	type CategoryType,
	type PlanDay,
	type PlanDetails,
	type PlanListItem,
	type PlanPayload,
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

function getDatesInRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	let current = startDate;

	while (current <= endDate) {
		dates.push(current);
		current = addDays(current, 1);
	}

	return dates;
}

function getDayDifference(startDate: string, endDate: string): number {
	const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
	const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
	const start = Date.UTC(startYear, startMonth - 1, startDay);
	const end = Date.UTC(endYear, endMonth - 1, endDay);
	return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function formatDayChip(value: string): { weekday: string; day: string } {
	const date = new Date(`${value}T00:00:00`);
	return {
		weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' })
			.format(date)
			.toUpperCase(),
		day: String(date.getDate()),
	};
}

function buildEmptyCategories(): Record<CategoryType, string[]> {
	return {
		Unnamed: [],
		Morning: [],
		Breakfast: [],
		Lunch: [],
		Dinner: [],
	};
}

function normalizeDay(day: PlanDay): PlanDay {
	return {
		date: day.date,
		categories: {
			Unnamed: day.categories.Unnamed ?? [],
			Morning: day.categories.Morning ?? [],
			Breakfast: day.categories.Breakfast ?? [],
			Lunch: day.categories.Lunch ?? [],
			Dinner: day.categories.Dinner ?? [],
		},
	};
}

function hasAtLeastOneRecipe(payload: PlanPayload): boolean {
	return payload.days.some((day) =>
		CATEGORY_TYPES.some((categoryType) => (day.categories[categoryType] ?? []).length > 0),
	);
}

function isStrictNoOverlap(plans: PlanListItem[], startDate: string, endDate: string): boolean {
	return plans.every((plan) => endDate < plan.startDate || startDate > plan.endDate);
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

const CATEGORY_UI: Record<
	CategoryType,
	{
		label: string;
		icon: LucideIcon;
		frameClass: string;
		plusClass: string;
	}
> = {
	Unnamed: {
		label: 'General',
		icon: UtensilsCrossed,
		frameClass: 'border-l-[#8df27b]/40',
		plusClass: 'text-[#8df27b]',
	},
	Morning: {
		label: 'Morning',
		icon: Sunrise,
		frameClass: 'border-l-[#99c3ff]/50',
		plusClass: 'text-[#99c3ff]',
	},
	Breakfast: {
		label: 'Breakfast',
		icon: Coffee,
		frameClass: 'border-l-[#8df27b]/50',
		plusClass: 'text-[#8df27b]',
	},
	Lunch: {
		label: 'Lunch',
		icon: Sandwich,
		frameClass: 'border-l-[#ff9fbc]/50',
		plusClass: 'text-[#ff9fbc]',
	},
	Dinner: {
		label: 'Dinner',
		icon: UtensilsCrossed,
		frameClass: 'border-l-[#5aa9ff]/40',
		plusClass: 'text-[#5aa9ff]',
	},
};

export function CreatePlanPage() {
	const params = useParams({ strict: false }) as { planId?: string };
	const planId = params.planId;
	const isEditMode = Boolean(planId);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const today = useMemo(() => formatDateInput(new Date()), []);
	const [step, setStep] = useState<1 | 2>(isEditMode ? 2 : 1);
	const [startDate, setStartDate] = useState(today);
	const [endDate, setEndDate] = useState(addDays(today, 6));
	const [payload, setPayload] = useState<PlanPayload | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [focusedDayIndex, setFocusedDayIndex] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modalDayIndex, setModalDayIndex] = useState<number | null>(null);
	const [modalCategoryType, setModalCategoryType] = useState<CategoryType | null>(null);
	const [recipeSearch, setRecipeSearch] = useState('');
	const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);

	const plansQuery = useQuery({
		queryKey: ['plans'],
		queryFn: () => apiFetch<PlanListItem[]>('/plans'),
	});

	const planDetailQuery = useQuery({
		queryKey: ['plans', 'detail', planId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${planId}`),
		enabled: isEditMode && Boolean(planId),
	});

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'house'],
		queryFn: () => apiFetch<RecipeSummary[]>('/api/recipes/house'),
	});

	const recipeSearchQuery = useQuery({
		queryKey: ['recipes', 'house', 'search', recipeSearch],
		queryFn: () =>
			apiFetch<RecipeSummary[]>(`/api/recipes/house?search=${encodeURIComponent(recipeSearch)}`),
		enabled: modalOpen,
	});

	const hydratedEditPayload = useMemo(() => {
		if (!planDetailQuery.data) {
			return null;
		}
		return {
			startDate: planDetailQuery.data.startDate,
			endDate: planDetailQuery.data.endDate,
			days: planDetailQuery.data.days.map(normalizeDay),
		};
	}, [planDetailQuery.data]);

	const effectivePayload = isEditMode ? payload ?? hydratedEditPayload : payload;
	const safeFocusedDayIndex = effectivePayload
		? Math.min(focusedDayIndex, Math.max(0, effectivePayload.days.length - 1))
		: 0;
	const focusedDay = effectivePayload?.days[safeFocusedDayIndex];

	const recipesById = useMemo(() => {
		const map = new Map<string, RecipeSummary>();
		for (const recipe of recipesQuery.data ?? []) {
			map.set(recipe.id, recipe);
		}
		for (const recipe of recipeSearchQuery.data ?? []) {
			map.set(recipe.id, recipe);
		}
		return map;
	}, [recipesQuery.data, recipeSearchQuery.data]);

	const totalRecipes = useMemo(() => {
		if (!effectivePayload) {
			return 0;
		}
		return effectivePayload.days.reduce(
			(total, day) =>
				total + CATEGORY_TYPES.reduce((categoryTotal, category) => categoryTotal + day.categories[category].length, 0),
			0,
		);
	}, [effectivePayload]);

	const closeModal = () => {
		setModalOpen(false);
		setRecipeSearch('');
		setSelectedRecipeIds([]);
		setModalDayIndex(null);
		setModalCategoryType(null);
	};

	const updatePayload = (updater: (current: PlanPayload) => PlanPayload) => {
		setPayload((current) => {
			const base = current ?? (isEditMode ? hydratedEditPayload : null);
			if (!base) {
				return current;
			}
			return updater(base);
		});
	};

	const createPlanMutation = useMutation({
		mutationFn: (nextPayload: PlanPayload) =>
			apiFetch<PlanDetails>('/plans', {
				method: 'POST',
				body: JSON.stringify(nextPayload),
			}),
		onSuccess: async (created) => {
			await queryClient.invalidateQueries({ queryKey: ['plans'] });
			await navigate({
				to: '/plans',
				search: { expand: created.id },
			});
		},
	});

	const updatePlanMutation = useMutation({
		mutationFn: (nextPayload: PlanPayload) =>
			apiFetch<PlanDetails>(`/plans/${planId}`, {
				method: 'PUT',
				body: JSON.stringify(nextPayload),
			}),
		onSuccess: async (updated) => {
			await queryClient.invalidateQueries({ queryKey: ['plans'] });
			await queryClient.invalidateQueries({ queryKey: ['plans', 'detail', planId] });
			await navigate({
				to: '/plans',
				search: { expand: updated.id },
			});
		},
	});

	const onContinueToStepTwo = () => {
		if (startDate < today) {
			setFormError('Start date must be today or later.');
			return;
		}
		if (endDate < startDate) {
			setFormError('End date must be on or after start date.');
			return;
		}
		if (getDayDifference(startDate, endDate) > 6) {
			setFormError('Meal plans are optimized for a maximum of 7 days.');
			return;
		}
		if (!isStrictNoOverlap(plansQuery.data ?? [], startDate, endDate)) {
			setFormError('Selected date range overlaps an existing plan.');
			return;
		}

		setPayload({
			startDate,
			endDate,
			days: getDatesInRange(startDate, endDate).map((date) => ({
				date,
				categories: buildEmptyCategories(),
			})),
		});
		setFocusedDayIndex(0);
		setFormError(null);
		setStep(2);
	};

	const openRecipeModal = (dayIndex: number, categoryType: CategoryType) => {
		setModalDayIndex(dayIndex);
		setModalCategoryType(categoryType);
		setSelectedRecipeIds([]);
		setRecipeSearch('');
		setModalOpen(true);
	};

	const toggleRecipeSelection = (recipeId: string) => {
		setSelectedRecipeIds((current) =>
			current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId],
		);
	};

	const addSelectedRecipes = () => {
		if (modalDayIndex === null || !modalCategoryType || !effectivePayload || selectedRecipeIds.length === 0) {
			closeModal();
			return;
		}

		updatePayload((current) => ({
			...current,
			days: current.days.map((day, dayIndex) =>
				dayIndex !== modalDayIndex
					? day
					: {
						...day,
						categories: {
							...day.categories,
							[modalCategoryType]: [...day.categories[modalCategoryType], ...selectedRecipeIds],
						},
					},
			),
		}));

		closeModal();
		setSaveError(null);
	};

	const removeRecipe = (dayIndex: number, categoryType: CategoryType, recipeIndex: number) => {
		updatePayload((current) => ({
			...current,
			days: current.days.map((day, currentDayIndex) => {
				if (currentDayIndex !== dayIndex) {
					return day;
				}
				const nextRecipes = [...day.categories[categoryType]];
				nextRecipes.splice(recipeIndex, 1);
				return {
					...day,
					categories: {
						...day.categories,
						[categoryType]: nextRecipes,
					},
				};
			}),
		}));
	};

	const reorderRecipe = (
		dayIndex: number,
		categoryType: CategoryType,
		fromIndex: number,
		toIndex: number,
	) => {
		updatePayload((current) => ({
			...current,
			days: current.days.map((day, currentDayIndex) => {
				if (currentDayIndex !== dayIndex) {
					return day;
				}
				const nextRecipes = [...day.categories[categoryType]];
				if (toIndex < 0 || toIndex >= nextRecipes.length) {
					return day;
				}
				const [moved] = nextRecipes.splice(fromIndex, 1);
				nextRecipes.splice(toIndex, 0, moved);
				return {
					...day,
					categories: {
						...day.categories,
						[categoryType]: nextRecipes,
					},
				};
			}),
		}));
	};

	const onSave = () => {
		if (!effectivePayload) {
			return;
		}
		if (!hasAtLeastOneRecipe(effectivePayload)) {
			setSaveError('Add at least one recipe to save the plan.');
			return;
		}
		setSaveError(null);
		if (isEditMode) {
			updatePlanMutation.reset();
			updatePlanMutation.mutate(effectivePayload);
			return;
		}
		createPlanMutation.reset();
		createPlanMutation.mutate(effectivePayload);
	};

	const mutationError = createPlanMutation.isError
		? toErrorMessage(createPlanMutation.error, 'Could not create plan.')
		: updatePlanMutation.isError
			? toErrorMessage(updatePlanMutation.error, 'Could not update plan.')
			: null;

	const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;
	const recipesForModal = recipeSearchQuery.data ?? [];

	if (isEditMode && planDetailQuery.isLoading) {
		return (
			<section className='rounded-[2rem] bg-[#090b0f] p-5 pb-28 text-[#f2f2f2]'>
				<div className='flex items-center gap-3 text-sm text-[#8c949f]'>
					<Loader2 className='h-4 w-4 animate-spin' />
					Loading plan...
				</div>
			</section>
		);
	}

	return (
		<section className='relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(38,52,84,0.28),_rgba(8,10,14,1)_42%)] p-5 pb-28 text-[#f5f5f5]'>
			<div className='absolute -right-12 top-10 h-40 w-40 rounded-full bg-[#8df27b]/10 blur-3xl' />
			<div className='relative space-y-5'>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<h1 className='text-[2.1rem] font-extrabold tracking-tight text-[#f7f7f7]'>
							{isEditMode ? 'Build Plan' : 'Create Plan'}
						</h1>
						<p className='mt-1 text-sm uppercase tracking-[0.28em] text-[#7ce485]'>
							Step {isEditMode ? '2 / 2' : `${step} / 2`}
						</p>
					</div>
				</div>

				{!isEditMode && (
					<div className='grid grid-cols-2 gap-2'>
						<div className={`h-2 rounded-full ${step >= 1 ? 'bg-[#6fdb68]' : 'bg-white/10'}`} />
						<div className={`h-2 rounded-full ${step >= 2 ? 'bg-[#6fdb68]' : 'bg-white/10'}`} />
					</div>
				)}

				{plansQuery.isError && !isEditMode && (
					<Alert variant='destructive'>
						<AlertTitle>Could not load plans</AlertTitle>
						<AlertDescription>{toErrorMessage(plansQuery.error, 'Please try again.')}</AlertDescription>
					</Alert>
				)}

				{planDetailQuery.isError && isEditMode && (
					<Alert variant='destructive'>
						<AlertTitle>Could not load plan</AlertTitle>
						<AlertDescription>{toErrorMessage(planDetailQuery.error, 'Please try again.')}</AlertDescription>
					</Alert>
				)}

				{mutationError && (
					<Alert variant='destructive'>
						<AlertTitle>Save failed</AlertTitle>
						<AlertDescription>{mutationError}</AlertDescription>
					</Alert>
				)}

				{step === 1 && !isEditMode && (
					<div className='space-y-5'>
						<div className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#17181d] p-5'>
							<div className='absolute -right-12 top-6 h-40 w-40 rounded-full bg-[#8fd8ff]/20 blur-2xl' />
							<h2 className='relative text-[2rem] font-bold leading-tight text-white'>
								When are we{' '}
								<span className='italic text-[#7ce485]'>
									cooking?
								</span>
							</h2>
							<p className='relative mt-2 text-base text-[#b0b3b7]'>
								Select the duration for your weekly nutrition cycle.
							</p>
						</div>

						<div className='space-y-4'>
							<label className='block text-xs font-semibold uppercase tracking-[0.22em] text-[#9aa0a6]'>
								Start Date
								<div className='mt-2 flex items-center gap-3 rounded-3xl border border-white/10 bg-black/55 px-4 py-4'>
									<CalendarDays className='h-5 w-5 text-[#7ce485]' />
									<Input
										id='create-plan-start'
										type='date'
										value={startDate}
										min={today}
										onChange={(event) => setStartDate(event.target.value)}
										className='h-auto border-0 bg-transparent px-0 text-lg font-semibold text-white'
									/>
								</div>
							</label>

							<label className='block text-xs font-semibold uppercase tracking-[0.22em] text-[#9aa0a6]'>
								End Date
								<div className='mt-2 flex items-center gap-3 rounded-3xl border border-[#63cf76]/60 bg-black/55 px-4 py-4'>
									<CalendarDays className='h-5 w-5 text-[#9cc7ff]' />
									<Input
										id='create-plan-end'
										type='date'
										value={endDate}
										min={startDate}
										onChange={(event) => setEndDate(event.target.value)}
										className='h-auto border-0 bg-transparent px-0 text-lg font-semibold text-white'
									/>
								</div>
							</label>
						</div>

						<div className='rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#c7cad0]'>
							Meal plans are optimized for a maximum of 7 days.
						</div>

						{formError && (
							<p className='rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
								{formError}
							</p>
						)}

						<div className='space-y-3'>
							<Button
								type='button'
								onClick={onContinueToStepTwo}
								className='h-16 w-full rounded-full bg-[#66cf63] text-2xl font-extrabold text-[#062510] hover:bg-[#73de70]'>
								Continue
								<ArrowRight className='ml-2 h-6 w-6' />
							</Button>
							<Button
								type='button'
								variant='ghost'
								onClick={() => void navigate({ to: '/plans' })}
								className='w-full rounded-full border border-white/10 text-[#bfc4cd] hover:bg-white/10 hover:text-white'>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{step === 2 && effectivePayload && focusedDay && (
					<div className='space-y-5'>
						<div className='flex gap-3 overflow-x-auto pb-1'>
							{effectivePayload.days.map((day, dayIndex) => {
								const chip = formatDayChip(day.date);
								const active = dayIndex === safeFocusedDayIndex;
								return (
									<button
										key={day.date}
										type='button'
										onClick={() => setFocusedDayIndex(dayIndex)}
										className={`min-w-24 rounded-[1.8rem] border px-3 py-3 text-left transition ${
											active
												? 'border-[#6bd56b] bg-[#1f2128] shadow-[0_12px_30px_rgba(110,214,114,0.18)]'
												: 'border-white/10 bg-[#15171d]'
										}`}>
										<p className={`text-xs font-semibold tracking-[0.2em] ${active ? 'text-[#7ce485]' : 'text-[#8c9097]'}`}>
											{chip.weekday}
										</p>
										<p className='mt-1 text-4xl font-black leading-none text-white'>{chip.day}</p>
									</button>
								);
							})}
						</div>

						<div className='flex items-end justify-between'>
							<div>
								<p className='text-xs font-semibold uppercase tracking-[0.28em] text-[#f4a8bf]'>Current Focus</p>
								<h2 className='mt-1 text-5xl font-extrabold tracking-tight text-white'>
									{new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
										new Date(`${focusedDay.date}T00:00:00`),
									)}
								</h2>
							</div>
							<div className='rounded-full border border-white/10 bg-[#2a2d30] px-4 py-2 text-sm font-bold text-[#7ce485]'>
								{totalRecipes} RECIPES
							</div>
						</div>

						<div className='space-y-4'>
							{CATEGORY_TYPES.map((categoryType) => {
								const config = CATEGORY_UI[categoryType];
								const CategoryIcon = config.icon;
								const recipeIds = focusedDay.categories[categoryType] ?? [];

								return (
									<div
										key={categoryType}
										className={`rounded-[2.1rem] border border-white/10 border-l-2 bg-[#1b1c22] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${config.frameClass}`}>
										<div className='mb-3 flex items-center justify-between gap-3'>
											<div className='flex items-center gap-3'>
												<div className='rounded-full border border-white/10 bg-black/20 p-2'>
													<CategoryIcon className={`h-5 w-5 ${config.plusClass}`} />
												</div>
												<h3 className='text-4xl font-semibold text-white'>{config.label}</h3>
											</div>
											<button
												type='button'
												onClick={() => openRecipeModal(safeFocusedDayIndex, categoryType)}
												className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] shadow-[0_12px_24px_rgba(0,0,0,0.45)]'>
												<CirclePlus className={`h-6 w-6 ${config.plusClass}`} />
											</button>
										</div>

										{recipeIds.length === 0 ? (
											<button
												type='button'
												onClick={() => openRecipeModal(safeFocusedDayIndex, categoryType)}
												className='w-full rounded-[1.8rem] border border-dashed border-white/10 bg-black/20 py-6 text-center text-2xl font-semibold text-[#6e727a]'>
												+ Add Recipe
											</button>
										) : (
											<div className='space-y-3'>
												{recipeIds.map((recipeId, recipeIndex) => {
													const recipe = recipesById.get(recipeId);
													return (
														<div
															key={`${recipeId}-${recipeIndex}`}
															className='flex items-center gap-3 rounded-[1.7rem] border border-white/10 bg-[#2b2d33] p-3'>
															<div className='h-20 w-20 overflow-hidden rounded-2xl bg-black/40'>
																{recipe?.imageUrl ? (
																	<img
																		src={recipe.imageUrl}
																		alt={recipe.title}
																		className='h-full w-full object-cover'
																	/>
																) : (
																	<div className='flex h-full w-full items-center justify-center text-2xl font-bold text-[#6f7379]'>
																		{(recipe?.title ?? 'R').slice(0, 1)}
																	</div>
																)}
															</div>
															<div className='min-w-0 flex-1'>
																<p className='truncate text-3xl font-bold text-white'>
																	{recipe?.title ?? recipeId}
																</p>
																<p className='mt-1 text-sm uppercase tracking-[0.2em] text-[#7ce485]'>
																	{recipe?.authorName ?? 'House Recipe'}
																</p>
															</div>
															<div className='flex flex-col gap-2'>
																<button
																	type='button'
																	onClick={() =>
																		reorderRecipe(
																			safeFocusedDayIndex,
																			categoryType,
																			recipeIndex,
																			recipeIndex - 1,
																		)
																	}
																	className='rounded-full border border-white/10 bg-[#1b1d22] p-2 text-[#9aa0a8]'>
																	<ArrowUp className='h-4 w-4' />
																</button>
																<button
																	type='button'
																	onClick={() =>
																		reorderRecipe(
																			safeFocusedDayIndex,
																			categoryType,
																			recipeIndex,
																			recipeIndex + 1,
																		)
																	}
																	className='rounded-full border border-white/10 bg-[#1b1d22] p-2 text-[#9aa0a8]'>
																	<ArrowDown className='h-4 w-4' />
																</button>
																<button
																	type='button'
																	onClick={() => removeRecipe(safeFocusedDayIndex, categoryType, recipeIndex)}
																	className='rounded-full border border-white/10 bg-[#1b1d22] p-2 text-[#f4a8bf]'>
																	<X className='h-4 w-4' />
																</button>
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

						{saveError && (
							<div className='rounded-3xl border border-[#f4a8bf]/30 bg-[#2d2a2c] px-4 py-3 text-lg text-[#ffd1de]'>
								{saveError}
							</div>
						)}

						<div className='space-y-3'>
							<Button
								type='button'
								disabled={isSaving}
								onClick={onSave}
								className='h-16 w-full rounded-full bg-[#66cf63] text-2xl font-extrabold text-[#062510] hover:bg-[#73de70] disabled:bg-[#3a3d42] disabled:text-[#8d939b]'>
								{isSaving ? (
									<>
										<Loader2 className='mr-2 h-5 w-5 animate-spin' />
										Saving...
									</>
								) : isEditMode ? (
									'Save Plan'
								) : (
									'Save Plan'
								)}
							</Button>
							<Button
								type='button'
								variant='ghost'
								onClick={() => void navigate({ to: '/plans' })}
								className='w-full rounded-full border border-white/10 text-[#bfc4cd] hover:bg-white/10 hover:text-white'>
								Cancel
							</Button>
						</div>
					</div>
				)}
			</div>

			<div
				className={`fixed inset-0 z-40 transition-all duration-200 ${
					modalOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
				}`}
				aria-hidden={!modalOpen}>
				<div className='absolute inset-0 bg-black/70 backdrop-blur-sm' onClick={closeModal} />
				<div className='absolute inset-x-3 bottom-3 top-[20%] rounded-[2.2rem] border border-white/10 bg-[#1a1b20] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.65)]'>
					<div className='flex h-full flex-col'>
						<div className='mb-4 flex items-center justify-between'>
							<h3 className='text-5xl font-extrabold text-white'>Add Recipes</h3>
							<button
								type='button'
								onClick={closeModal}
								className='flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#d6d9df]'>
								<X className='h-6 w-6' />
							</button>
						</div>

						<div className='mb-4 rounded-3xl border border-white/10 bg-black/40 px-4 py-3'>
							<Input
								value={recipeSearch}
								onChange={(event) => setRecipeSearch(event.target.value)}
								placeholder='Search your kitchen...'
								className='h-auto border-0 bg-transparent px-0 text-2xl text-white placeholder:text-[#6f747c]'
							/>
						</div>

						<div className='min-h-0 flex-1 overflow-y-auto rounded-[1.8rem] border border-white/10 bg-black/25 p-3'>
							{recipeSearchQuery.isLoading ? (
								<div className='flex items-center gap-2 px-2 py-3 text-[#9ca2ab]'>
									<Loader2 className='h-4 w-4 animate-spin' />
									Loading recipes...
								</div>
							) : recipesForModal.length === 0 ? (
								<p className='px-2 py-4 text-[#7d828a]'>No recipes found.</p>
							) : (
								<div className='space-y-3'>
									{recipesForModal.map((recipe) => {
										const selected = selectedRecipeIds.includes(recipe.id);
										return (
											<button
												key={recipe.id}
												type='button'
												onClick={() => toggleRecipeSelection(recipe.id)}
												className={`flex w-full items-center gap-3 rounded-[1.8rem] border p-3 text-left transition ${
													selected
														? 'border-[#6fdb68]/70 bg-[#262d26]'
														: 'border-white/10 bg-[#1f2127]'
												}`}>
												<div className='h-14 w-14 overflow-hidden rounded-full bg-black/40'>
													{recipe.imageUrl ? (
														<img src={recipe.imageUrl} alt={recipe.title} className='h-full w-full object-cover' />
													) : (
														<div className='flex h-full w-full items-center justify-center text-xl font-bold text-[#7e838b]'>
															{recipe.title.slice(0, 1)}
														</div>
													)}
												</div>
												<div className='min-w-0 flex-1'>
													<p className='truncate text-3xl font-bold text-white'>{recipe.title}</p>
													<p className='truncate text-sm uppercase tracking-[0.22em] text-[#7ce485]'>
														{recipe.authorName}
													</p>
												</div>
												<div
													className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
														selected
															? 'border-[#6fdb68] bg-[#6fdb68] text-[#05240f]'
															: 'border-[#4d5a4e] bg-transparent text-transparent'
													}`}>
													<Check className='h-5 w-5' />
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						<Button
							type='button'
							disabled={selectedRecipeIds.length === 0}
							onClick={addSelectedRecipes}
							className='mt-4 h-16 rounded-full bg-[#66cf63] text-2xl font-extrabold text-[#062510] hover:bg-[#73de70] disabled:bg-[#3a3d42] disabled:text-[#8d939b]'>
							Add Selected ({selectedRecipeIds.length})
							<CirclePlus className='ml-2 h-5 w-5' />
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
