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
	Loader2,
	UserCircle2,
	X,
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
		weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date).toUpperCase(),
		day: String(date.getDate()),
	};
}

function formatRangeLabel(startDate: string, endDate: string): string {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
	const startMonth = monthFormatter.format(start);
	const endMonth = monthFormatter.format(end);

	if (startMonth === endMonth) {
		return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
	}

	return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
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

const CATEGORY_UI: Record<CategoryType, { label: string; plusClass: string }> = {
	Unnamed: { label: 'Recipes', plusClass: 'text-[#7ce485]' },
	Morning: { label: 'Morning', plusClass: 'text-[#7ce485]' },
	Breakfast: { label: 'Breakfast', plusClass: 'text-[#7ce485]' },
	Lunch: { label: 'Lunch', plusClass: 'text-[#7ce485]' },
	Dinner: { label: 'Dinner', plusClass: 'text-[#7ce485]' },
};

export function CreatePlanPage() {
	const params = useParams({ strict: false }) as { planId?: string };
	const planId = params.planId;
	const isEditMode = Boolean(planId);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const today = useMemo(() => formatDateInput(new Date()), []);
	const [startDate, setStartDate] = useState(today);
	const [endDate, setEndDate] = useState(addDays(today, 6));
	const [payload, setPayload] = useState<PlanPayload | null>(null);
	const [dateError, setDateError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [datePanelOpen, setDatePanelOpen] = useState(false);

	const [focusedDayIndex, setFocusedDayIndex] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modalDayIndex, setModalDayIndex] = useState<number | null>(null);
	const [modalCategoryType, setModalCategoryType] = useState<CategoryType | null>(null);
	const [recipeSearch, setRecipeSearch] = useState('');
	const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
	const [expandedRecipeKey, setExpandedRecipeKey] = useState<string | null>(null);

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

	const effectivePayload = isEditMode ? (payload ?? hydratedEditPayload) : payload;
	const hasUnappliedDateRangeChange =
		!isEditMode &&
		Boolean(
			effectivePayload &&
			(effectivePayload.startDate !== startDate || effectivePayload.endDate !== endDate),
		);
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


	const closeModal = () => {
		setModalOpen(false);
		setRecipeSearch('');
		setSelectedRecipeIds([]);
		setModalDayIndex(null);
		setModalCategoryType(null);
	};

	const applyDateRange = () => {
		if (startDate < today) {
			setDateError('Start date must be today or later.');
			return;
		}
		if (endDate < startDate) {
			setDateError('End date must be on or after start date.');
			return;
		}
		if (getDayDifference(startDate, endDate) > 6) {
			setDateError('Meal plans are optimized for a maximum of 7 days.');
			return;
		}
		if (!isStrictNoOverlap(plansQuery.data ?? [], startDate, endDate)) {
			setDateError('Selected date range overlaps an existing plan.');
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
		setDateError(null);
		setSaveError(null);
		setDatePanelOpen(false);
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
		if (
			modalDayIndex === null ||
			!modalCategoryType ||
			!effectivePayload ||
			selectedRecipeIds.length === 0
		) {
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
		setExpandedRecipeKey(null);
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
			setSaveError('Select a date range to start building your plan.');
			return;
		}
		if (hasUnappliedDateRangeChange) {
			setSaveError('Apply your updated date range before saving.');
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
	const recipesForModal = recipeSearchQuery.data ?? recipesQuery.data ?? [];

	if (isEditMode && planDetailQuery.isLoading) {
		return (
			<section className="rounded-2xl bg-[#090b0f] p-3 pb-24 text-[#f2f2f2] sm:rounded-[2rem] sm:p-5 sm:pb-28">
				<div className="flex items-center gap-3 text-sm text-[#8c949f]">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading plan...
				</div>
			</section>
		);
	}

	return (
		<section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_12%_8%,rgba(42,58,90,0.28),rgba(8,10,14,1)_40%)] p-3 pb-24 text-[#f5f5f5] sm:rounded-[2rem] sm:p-5 sm:pb-28">
			<div className="absolute -left-8 top-20 h-28 w-28 rounded-full bg-[#76dc6e]/10 blur-3xl sm:h-36 sm:w-36" />
			<div className="absolute -right-12 top-6 h-36 w-36 rounded-full bg-[#5aa9ff]/10 blur-3xl sm:h-44 sm:w-44" />
			<div className="relative space-y-4 sm:space-y-5">
				<div>
					<h1 className="text-[2.2rem] font-black leading-none tracking-tight text-[#f8f8f9] sm:text-[2.4rem]">
						{isEditMode ? 'Edit plan' : 'Create plan'}
					</h1>
				</div>

				<div className="rounded-2xl border border-white/10 bg-[#15171c]/95 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.45)] sm:rounded-[1.9rem] sm:p-4">
					<p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#97a1aa] sm:text-[0.68rem]">
						Select dates
					</p>
					<button
						type="button"
						onClick={() => !isEditMode && setDatePanelOpen((value) => !value)}
						className={`mt-2 flex min-h-12 w-full items-center gap-2 rounded-2xl border px-3 py-3 text-left transition sm:min-h-14 sm:rounded-3xl sm:px-4 ${
							datePanelOpen && !isEditMode
								? 'border-[#6fdb68]/60 bg-[#21252a]'
								: 'border-white/10 bg-[#1d2025]'
						}`}
						aria-expanded={datePanelOpen}
					>
						<CalendarDays className="h-4 w-4 shrink-0 text-[#6fdb68] sm:h-5 sm:w-5" />
						<span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#e8eaee] sm:text-base">
							{effectivePayload
								? formatRangeLabel(effectivePayload.startDate, effectivePayload.endDate)
								: formatRangeLabel(startDate, endDate)}
						</span>
						<ArrowDown
							className={`h-4 w-4 shrink-0 text-[#8f97a1] transition-transform ${
								datePanelOpen ? 'rotate-180' : ''
							}`}
						/>
					</button>

					{datePanelOpen && !isEditMode && (
						<div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3 sm:rounded-3xl sm:p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#95a0aa] sm:text-[0.68rem]">
									Start
									<Input
										type="date"
										value={startDate}
										min={today}
										onChange={(event) => setStartDate(event.target.value)}
										className="mt-1 h-11 rounded-xl border-white/10 bg-[#14161a] text-sm font-semibold text-white"
									/>
								</label>
								<label className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#95a0aa] sm:text-[0.68rem]">
									End
									<Input
										type="date"
										value={endDate}
										min={startDate}
										onChange={(event) => setEndDate(event.target.value)}
										className="mt-1 h-11 rounded-xl border-white/10 bg-[#14161a] text-sm font-semibold text-white"
									/>
								</label>
							</div>
							<Button
								type="button"
								onClick={applyDateRange}
								className="h-11 w-full rounded-full bg-[#68d461] text-sm font-extrabold text-[#09240f] hover:bg-[#79de73] sm:text-base"
							>
								Apply dates
							</Button>
						</div>
					)}

					{dateError && (
						<p className="mt-3 rounded-2xl border border-[#f4a8bf]/35 bg-[#35262d] px-3 py-2 text-sm text-[#ffd2df]">
							{dateError}
						</p>
					)}
				</div>

				{plansQuery.isError && !isEditMode && (
					<Alert variant="destructive">
						<AlertTitle>Could not load plans</AlertTitle>
						<AlertDescription>
							{toErrorMessage(plansQuery.error, 'Please try again.')}
						</AlertDescription>
					</Alert>
				)}

				{planDetailQuery.isError && isEditMode && (
					<Alert variant="destructive">
						<AlertTitle>Could not load plan</AlertTitle>
						<AlertDescription>
							{toErrorMessage(planDetailQuery.error, 'Please try again.')}
						</AlertDescription>
					</Alert>
				)}

				{mutationError && (
					<Alert variant="destructive">
						<AlertTitle>Save failed</AlertTitle>
						<AlertDescription>{mutationError}</AlertDescription>
					</Alert>
				)}

				{effectivePayload && focusedDay ? (
					<div className="space-y-4 sm:space-y-5">
						<div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
							{effectivePayload.days.map((day, dayIndex) => {
								const chip = formatDayChip(day.date);
								const active = dayIndex === safeFocusedDayIndex;
								return (
									<button
										key={day.date}
										type="button"
										onClick={() => setFocusedDayIndex(dayIndex)}
										className={`min-w-20 rounded-full border px-3 py-2 text-center transition-all duration-200 sm:min-w-24 sm:py-3 ${
											active
												? 'border-[#6bd56b] bg-[#1d2221] shadow-[0_10px_24px_rgba(108,214,107,0.24)]'
												: 'border-white/10 bg-[#1a1d23]'
										}`}
									>
										<p
											className={`text-[0.62rem] font-semibold tracking-[0.15em] sm:text-xs sm:tracking-[0.2em] ${active ? 'text-[#7ce485]' : 'text-[#8c9097]'}`}
										>
											{chip.weekday}
										</p>
										<p className="mt-1 text-[1.6rem] font-black leading-none text-white sm:text-[1.9rem]">
											{chip.day}
										</p>
									</button>
								);
							})}
						</div>

						<div className="space-y-0.5">
							{CATEGORY_TYPES.filter((cat) => cat !== 'Morning').map((categoryType) => {
								const config = CATEGORY_UI[categoryType];
								const recipeIds = focusedDay.categories[categoryType] ?? [];

								return (
									<div key={categoryType}>
										<button
											type="button"
											onClick={() => openRecipeModal(safeFocusedDayIndex, categoryType)}
											className="flex items-center gap-2 py-2.5"
										>
											<CirclePlus className={`h-4 w-4 ${config.plusClass}`} />
											<span
												className={`text-xs font-bold uppercase tracking-[0.16em] ${config.plusClass}`}
											>
												{config.label}
											</span>
										</button>

										{recipeIds.length > 0 && (
											<div className="mb-2 space-y-2">
												{recipeIds.map((recipeId, recipeIndex) => {
													const recipe = recipesById.get(recipeId);
													const recipeKey = `${safeFocusedDayIndex}-${categoryType}-${recipeIndex}`;
													const isExpanded = expandedRecipeKey === recipeKey;
													return (
														<article
															key={`${recipeId}-${recipeIndex}`}
															className="overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-900"
														>
															<button
																type="button"
																onClick={() =>
																	setExpandedRecipeKey((current) =>
																		current === recipeKey ? null : recipeKey,
																	)
																}
																className="flex min-w-0 w-full text-left"
															>
																<div className="relative h-[5.5rem] w-[5.5rem] shrink-0 sm:h-24 sm:w-24">
																	{recipe?.imageUrl ? (
																		<img
																			src={recipe.imageUrl}
																			alt={recipe.title}
																			className="h-full w-full object-cover"
																		/>
																	) : (
																		<div className="h-full w-full bg-stone-700" />
																	)}
																	<div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-stone-900" />
																</div>
																<div className="min-w-0 flex-1 px-3 py-3">
																	<p className="line-clamp-2 text-sm font-bold leading-snug text-stone-100 sm:text-base">
																		{recipe?.title ?? recipeId}
																	</p>
																	<p className="mt-0.5 flex items-center gap-1 text-xs italic text-stone-400">
																		<UserCircle2 className="h-3.5 w-3.5 shrink-0" />
																		{recipe?.authorName ?? 'House Recipe'}
																	</p>
																</div>
																<div className="flex items-center pr-3">
																	<ArrowDown
																		className={`h-4 w-4 text-stone-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
																	/>
																</div>
															</button>
															{isExpanded && (
																<div className="flex items-center justify-end gap-2 border-t border-stone-800 px-3 py-2">
																	<button
																		type="button"
																		onClick={() =>
																			reorderRecipe(
																				safeFocusedDayIndex,
																				categoryType,
																				recipeIndex,
																				recipeIndex - 1,
																			)
																		}
																		className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400"
																	>
																		<ArrowUp className="h-3.5 w-3.5" />
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			reorderRecipe(
																				safeFocusedDayIndex,
																				categoryType,
																				recipeIndex,
																				recipeIndex + 1,
																			)
																		}
																		className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-stone-400"
																	>
																		<ArrowDown className="h-3.5 w-3.5" />
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			removeRecipe(safeFocusedDayIndex, categoryType, recipeIndex)
																		}
																		className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-rose-400"
																	>
																		<X className="h-3.5 w-3.5" />
																	</button>
																</div>
															)}
														</article>
													);
												})}
											</div>
										)}
									</div>
								);
							})}
						</div>

						{saveError && (
							<div className="rounded-2xl border border-[#f4a8bf]/30 bg-[#2d2a2c] px-4 py-3 text-sm text-[#ffd1de] sm:text-base">
								{saveError}
							</div>
						)}

						{hasUnappliedDateRangeChange && (
							<div className="rounded-2xl border border-[#ffd96b]/35 bg-[#332f1f] px-4 py-3 text-sm text-[#ffe7a0] sm:text-base">
								Your date range changed. Tap Apply dates to refresh the plan days.
							</div>
						)}

						<div className="space-y-3">
							<Button
								type="button"
								disabled={isSaving || hasUnappliedDateRangeChange}
								onClick={onSave}
								className="h-12 w-full rounded-full bg-[#66cf63] text-base font-extrabold text-[#062510] hover:bg-[#73de70] disabled:bg-[#3a3d42] disabled:text-[#8d939b] sm:h-14 sm:text-lg"
							>
								{isSaving ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Saving...
									</>
								) : isEditMode ? (
									'Save Plan'
								) : (
									'Save Plan'
								)}
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4 rounded-2xl border border-dashed border-white/15 bg-[#111317]/70 p-5 text-center sm:rounded-[2rem] sm:p-7">
						<p className="text-sm uppercase tracking-[0.18em] text-[#8c95a0] sm:text-base">
							Plan days will appear here
						</p>
						<p className="text-sm text-[#a7afb8] sm:text-base">
							Pick a date range and apply it to start organizing recipes by day.
						</p>
						<Button
							type="button"
							onClick={() => setDatePanelOpen(true)}
							className="h-11 rounded-full bg-[#66cf63] px-6 font-bold text-[#062510] hover:bg-[#73de70]"
						>
							Select dates
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				)}
			</div>

			<div
				className={`fixed inset-0 z-40 transition-all duration-200 ${
					modalOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
				}`}
				aria-hidden={!modalOpen}
			>
				<div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
				<div className="absolute inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.6rem] border border-white/10 bg-[#1a1b20] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:inset-x-3 sm:bottom-3 sm:top-[10%] sm:max-h-none sm:rounded-[2.2rem] sm:p-4">
					<div className="flex h-full flex-col overflow-hidden">
						<div className="sticky top-0 z-10 -mx-3 border-b border-white/10 bg-[#1a1b20]/95 px-3 pb-3 pt-1 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-4 sm:pt-0">
							<div className="mb-3 flex items-center justify-between">
								<h3 className="text-[1.75rem] font-extrabold text-white sm:text-[2rem]">
									Add Recipes
								</h3>
								<button
									type="button"
									onClick={closeModal}
									className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#d6d9df]"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							<div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 sm:rounded-3xl sm:px-4 sm:py-3">
								<Input
									value={recipeSearch}
									onChange={(event) => setRecipeSearch(event.target.value)}
									placeholder="Search your kitchen..."
									className="h-auto border-0 bg-transparent px-0 text-sm text-white placeholder:text-[#6f747c] sm:text-base"
								/>
							</div>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-2.5 sm:rounded-[1.8rem] sm:p-3">
							{recipeSearchQuery.isLoading ? (
								<div className="flex items-center gap-2 px-2 py-3 text-[#9ca2ab]">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading recipes...
								</div>
							) : recipesForModal.length === 0 ? (
								<p className="px-2 py-4 text-[#7d828a]">No recipes found.</p>
							) : (
								<div className="space-y-2.5 sm:space-y-3">
									{recipesForModal.map((recipe) => {
										const selected = selectedRecipeIds.includes(recipe.id);
										return (
											<button
												key={recipe.id}
												type="button"
												onClick={() => toggleRecipeSelection(recipe.id)}
												className={`w-full overflow-hidden rounded-2xl border text-left transition ${
													selected
														? 'border-[#6fdb68]/60 bg-[#141f14]'
														: 'border-stone-800/80 bg-stone-900'
												}`}
											>
												<div className="flex min-w-0">
													<div className="relative h-[5.5rem] w-[5.5rem] shrink-0 sm:h-24 sm:w-24">
														{recipe.imageUrl ? (
															<img
																src={recipe.imageUrl}
																alt={recipe.title}
																className="h-full w-full object-cover"
															/>
														) : (
															<div className="h-full w-full bg-stone-700" />
														)}
														<div
															className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent ${selected ? 'to-[#141f14]' : 'to-stone-900'}`}
														/>
													</div>
													<div className="min-w-0 flex-1 px-3 py-3">
														<p className="line-clamp-2 text-sm font-bold leading-snug text-stone-100 sm:text-base">
															{recipe.title}
														</p>
														<p className="mt-0.5 flex items-center gap-1 text-xs italic text-stone-400">
															<UserCircle2 className="h-3.5 w-3.5 shrink-0" />
															{recipe.authorName}
														</p>
													</div>
													<div className="flex items-center pr-3">
														<div
															className={`flex h-6 w-6 items-center justify-center rounded-full border ${
																selected
																	? 'border-[#6fdb68] bg-[#6fdb68] text-[#05240f]'
																	: 'border-stone-700 text-transparent'
															}`}
														>
															<Check className="h-3.5 w-3.5" />
														</div>
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						<div className="sticky bottom-0 z-10 mt-3 -mx-3 border-t border-white/10 bg-[#1a1b20]/95 px-3 pt-3 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-4">
							<Button
								type="button"
								disabled={selectedRecipeIds.length === 0}
								onClick={addSelectedRecipes}
								className="h-12 w-full rounded-full bg-[#66cf63] text-base font-extrabold text-[#062510] hover:bg-[#73de70] disabled:bg-[#3a3d42] disabled:text-[#8d939b] sm:h-14 sm:text-lg"
							>
								Add Selected ({selectedRecipeIds.length})
								<CirclePlus className="ml-2 h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
