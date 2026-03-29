import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function formatDisplayDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(`${value}T00:00:00`));
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
			apiFetch<RecipeSummary[]>(
				`/api/recipes/house?search=${encodeURIComponent(recipeSearch)}`,
			),
		enabled: modalOpen,
	});

	const hydratedEditPayload = useMemo(() => {
		if (!planDetailQuery.data) {
			return null;
		}
		const normalizedDays = planDetailQuery.data.days.map(normalizeDay);
		return {
			startDate: planDetailQuery.data.startDate,
			endDate: planDetailQuery.data.endDate,
			days: normalizedDays,
		};
	}, [planDetailQuery.data]);

	const effectivePayload = isEditMode ? payload ?? hydratedEditPayload : payload;

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
				search: {
					expand: created.id,
				},
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
				search: {
					expand: updated.id,
				},
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
			setFormError('Plan range cannot exceed 7 days.');
			return;
		}

		if (!isStrictNoOverlap(plansQuery.data ?? [], startDate, endDate)) {
			setFormError('Selected date range overlaps an existing plan.');
			return;
		}

		const days = getDatesInRange(startDate, endDate).map((date) => ({
			date,
			categories: buildEmptyCategories(),
		}));

		setPayload({
			startDate,
			endDate,
			days,
		});
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
			current.includes(recipeId)
				? current.filter((id) => id !== recipeId)
				: [...current, recipeId],
		);
	};

	const addSelectedRecipes = () => {
		if (modalDayIndex === null || !modalCategoryType || !effectivePayload || selectedRecipeIds.length === 0) {
			closeModal();
			return;
		}

		updatePayload((current) => {
			const nextDays = current.days.map((day, dayIndex) => {
				if (dayIndex !== modalDayIndex) {
					return day;
				}

				return {
					...day,
					categories: {
						...day.categories,
						[modalCategoryType]: [
							...(day.categories[modalCategoryType] ?? []),
							...selectedRecipeIds,
						],
					},
				};
			});

			return {
				...current,
				days: nextDays,
			};
		});

		closeModal();
		setSaveError(null);
	};

	const removeRecipe = (dayIndex: number, categoryType: CategoryType, recipeIndex: number) => {
		updatePayload((current) => {
			const nextDays = current.days.map((day, currentDayIndex) => {
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
			});

			return {
				...current,
				days: nextDays,
			};
		});
	};

	const reorderRecipe = (
		dayIndex: number,
		categoryType: CategoryType,
		fromIndex: number,
		toIndex: number,
	) => {
		updatePayload((current) => {
			const nextDays = current.days.map((day, currentDayIndex) => {
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
			});

			return {
				...current,
				days: nextDays,
			};
		});
	};

	const onSave = () => {
		if (!effectivePayload) {
			return;
		}

		if (!hasAtLeastOneRecipe(effectivePayload)) {
			setSaveError('Add at least one recipe before saving.');
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

	const recipesForModal = recipeSearchQuery.data ?? [];
	const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;

	if (isEditMode && planDetailQuery.isLoading) {
		return (
			<section className='space-y-4 rounded-2xl border border-stone-200/70 bg-white/60 p-4 pb-24 dark:border-stone-700/70 dark:bg-stone-900/50'>
				<p className='text-sm text-stone-600 dark:text-stone-300'>Loading plan...</p>
			</section>
		);
	}

	return (
		<section className='space-y-4 rounded-2xl border border-stone-200/70 bg-white/60 p-4 pb-24 dark:border-stone-700/70 dark:bg-stone-900/50'>
			<div className='rounded-2xl bg-gradient-to-br from-amber-100 via-white to-sky-100 p-4 shadow-sm dark:from-amber-950 dark:via-stone-900 dark:to-sky-950'>
				<p className='text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300'>
					Plans
				</p>
				<h1 className='mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50'>
					{isEditMode ? 'Edit Plan' : 'Create Plan'}
				</h1>
				<p className='mt-1 text-sm text-stone-600 dark:text-stone-300'>
					{isEditMode
						? 'Update recipes by day and category.'
						: step === 1
							? 'Step 1: pick a valid date range.'
							: 'Step 2: assign recipes to days and categories.'}
				</p>
			</div>

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
				<div className='space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='create-plan-start'>Start date</Label>
							<Input
								id='create-plan-start'
								type='date'
								value={startDate}
								min={today}
								onChange={(event) => setStartDate(event.target.value)}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='create-plan-end'>End date</Label>
							<Input
								id='create-plan-end'
								type='date'
								value={endDate}
								min={startDate}
								onChange={(event) => setEndDate(event.target.value)}
							/>
						</div>
					</div>

					{formError && (
						<p className='text-sm font-medium text-red-600 dark:text-red-400'>{formError}</p>
					)}

					<div className='flex flex-wrap justify-end gap-2'>
						<Button type='button' variant='ghost' onClick={() => void navigate({ to: '/plans' })}>
							Cancel
						</Button>
						<Button type='button' onClick={onContinueToStepTwo}>
							Continue
						</Button>
					</div>
				</div>
			)}

			{step === 2 && effectivePayload && (
				<div className='space-y-4'>
					<div className='rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
						<p className='text-sm text-stone-600 dark:text-stone-300'>
							Range: <strong>{formatDisplayDate(effectivePayload.startDate)}</strong> to{' '}
							<strong>{formatDisplayDate(effectivePayload.endDate)}</strong>
						</p>
						{isEditMode && (
							<p className='mt-2 text-sm text-stone-500 dark:text-stone-400'>
								Date range is immutable during edit.
							</p>
						)}
					</div>

					{effectivePayload.days.map((day, dayIndex) => (
						<div
							key={day.date}
							className='space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-950'>
							<h2 className='text-lg font-semibold text-stone-900 dark:text-stone-100'>
								{formatDisplayDate(day.date)}
							</h2>

							<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
								{CATEGORY_TYPES.map((categoryType) => {
									const recipeIds = day.categories[categoryType] ?? [];

									return (
										<div
											key={categoryType}
											className='rounded-2xl border border-stone-200 p-3 dark:border-stone-800'>
											<div className='mb-2 flex items-center justify-between gap-2'>
												<p className='text-sm font-semibold text-stone-800 dark:text-stone-100'>
													{categoryType}
												</p>
												<Button
													type='button'
													size='sm'
													variant='outline'
													onClick={() => openRecipeModal(dayIndex, categoryType)}>
													+ Add Recipe
												</Button>
											</div>

											{recipeIds.length === 0 ? (
												<p className='text-sm text-stone-500 dark:text-stone-400'>No recipes</p>
											) : (
												<div className='space-y-2'>
													{recipeIds.map((recipeId, recipeIndex) => {
														const recipe = recipesById.get(recipeId);
														return (
															<div
																key={`${recipeId}-${recipeIndex}`}
																className='rounded-xl border border-stone-200 p-2 text-sm dark:border-stone-700'>
																<p className='truncate font-medium text-stone-900 dark:text-stone-100'>
																	{recipe?.title ?? recipeId}
																</p>
																<div className='mt-2 flex gap-2'>
																	<Button
																		type='button'
																		size='sm'
																		variant='ghost'
																		onClick={() =>
																			reorderRecipe(
																				dayIndex,
																				categoryType,
																				recipeIndex,
																				recipeIndex - 1,
																			)
																		}>
																		↑
																	</Button>
																	<Button
																		type='button'
																		size='sm'
																		variant='ghost'
																		onClick={() =>
																			reorderRecipe(
																				dayIndex,
																				categoryType,
																				recipeIndex,
																				recipeIndex + 1,
																			)
																		}>
																		↓
																	</Button>
																	<Button
																		type='button'
																		size='sm'
																		variant='ghost'
																		onClick={() =>
																			removeRecipe(dayIndex, categoryType, recipeIndex)
																		}>
																		Remove
																	</Button>
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
						</div>
					))}

					{saveError && (
						<p className='text-sm font-medium text-red-600 dark:text-red-400'>{saveError}</p>
					)}

					<div className='flex flex-wrap justify-end gap-2'>
						<Button type='button' variant='ghost' onClick={() => void navigate({ to: '/plans' })}>
							Cancel
						</Button>
						<Button type='button' onClick={onSave} disabled={isSaving}>
							{isSaving ? 'Saving...' : isEditMode ? 'Update Plan' : 'Create Plan'}
						</Button>
					</div>
				</div>
			)}

			<div
				className={`fixed inset-0 z-40 transition-all duration-200 ${
					modalOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
				}`}
				aria-hidden={!modalOpen}>
				<div
					className='absolute inset-0 bg-stone-950/45 backdrop-blur-[3px]'
								onClick={closeModal}
				/>

				<div className='absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6'>
					<div
						onClick={(event) => event.stopPropagation()}
						className='flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-stone-200/70 bg-white shadow-2xl dark:border-stone-700/70 dark:bg-stone-950 sm:rounded-[28px]'>
						<div className='border-b border-stone-200/80 px-4 py-3 dark:border-stone-800 sm:px-6'>
							<p className='text-sm font-semibold text-stone-900 dark:text-stone-100'>
								Select Recipes
							</p>
							<p className='text-xs text-stone-500 dark:text-stone-400'>
								Choose one or more recipes to add.
							</p>
						</div>

						<div className='space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6'>
							<div className='space-y-2'>
								<Label htmlFor='plan-recipe-search'>Search</Label>
								<Input
									id='plan-recipe-search'
									value={recipeSearch}
									onChange={(event) => setRecipeSearch(event.target.value)}
									placeholder='Find recipes'
								/>
							</div>

							{recipeSearchQuery.isLoading && (
								<p className='text-sm text-stone-600 dark:text-stone-300'>Loading recipes...</p>
							)}

							{recipeSearchQuery.isError && (
								<Alert variant='destructive'>
									<AlertTitle>Could not load recipes</AlertTitle>
									<AlertDescription>
										{toErrorMessage(recipeSearchQuery.error, 'Please try again.')}
									</AlertDescription>
								</Alert>
							)}

							<div className='max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-stone-200 p-2 dark:border-stone-800'>
								{recipesForModal.map((recipe) => {
									const isSelected = selectedRecipeIds.includes(recipe.id);
									return (
										<label
											key={recipe.id}
											className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${
												isSelected
													? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/40'
													: 'border-stone-200 dark:border-stone-700'
											}`}>
											<input
												type='checkbox'
												checked={isSelected}
												onChange={() => toggleRecipeSelection(recipe.id)}
											/>
											<div className='min-w-0'>
												<p className='truncate text-sm font-semibold text-stone-900 dark:text-stone-100'>
													{recipe.title}
												</p>
												<p className='truncate text-xs text-stone-500 dark:text-stone-400'>
													{recipe.authorName}
												</p>
											</div>
										</label>
									);
								})}

								{!recipeSearchQuery.isLoading && recipesForModal.length === 0 && (
									<p className='rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300'>
										No recipes found.
									</p>
								)}
							</div>
						</div>

						<div className='flex flex-wrap justify-end gap-2 border-t border-stone-200/80 px-4 py-3 dark:border-stone-800 sm:px-6'>
							<Button type='button' variant='ghost' onClick={closeModal}>
								Cancel
							</Button>
							<Button type='button' onClick={addSelectedRecipes} disabled={selectedRecipeIds.length === 0}>
								Add Selected
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
