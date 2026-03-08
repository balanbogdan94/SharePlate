import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';

type UnitType =
	| 'Kilogram'
	| 'Gram'
	| 'Liter'
	| 'Milliliter'
	| 'Piece'
	| 'Portion';

type Unit = {
	id: UnitType;
	name: string;
	symbol: string;
	category: string;
};

type RecipeSummary = {
	id: string;
	name: string;
	description: string;
	imageUrl: string;
	authorId: string;
	createdAt: string;
	updatedAt: string;
};

type RecipeIngredient = {
	id: string;
	ingredientId: string;
	ingredientName: string;
	quantity: number;
	unitId: UnitType;
};

type IngredientSearchItem = {
	id: string;
	name: string;
	defaultUnitId: UnitType;
};

type RecipeDetail = RecipeSummary & {
	ingredients: RecipeIngredient[];
};

type RecipePayload = {
	name: string;
	description: string;
	imageUrl: string;
};

type IngredientPayload = {
	ingredientName: string;
	quantity: number;
	unitId: UnitType;
};

type IngredientEditPayload = {
	quantity: number;
	unitId: UnitType;
};

type FormState = {
	name: string;
	description: string;
	imageUrl: string;
};

type IngredientFormState = {
	ingredientName: string;
	quantity: string;
	unitId: UnitType;
};

const defaultRecipeForm: FormState = {
	name: '',
	description: '',
	imageUrl: '',
};

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function formatQuantity(value: number): string {
	if (Number.isInteger(value)) {
		return String(value);
	}

	return String(Number(value.toFixed(3)));
}

export function HomeTabPage() {
	const queryClient = useQueryClient();
	const [showCreate, setShowCreate] = useState(false);
	const [createForm, setCreateForm] = useState<FormState>(defaultRecipeForm);
	const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<FormState>(defaultRecipeForm);
	const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
	const [ingredientFormsByRecipeId, setIngredientFormsByRecipeId] = useState<
		Record<string, IngredientFormState>
	>({});
	const [ingredientEditsById, setIngredientEditsById] = useState<
		Record<string, { quantity: string; unitId: UnitType }>
	>({});

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'my'],
		queryFn: () => apiFetch<RecipeSummary[]>('/api/recipes/my'),
	});

	const unitsQuery = useQuery({
		queryKey: ['units'],
		queryFn: () => apiFetch<Unit[]>('/api/units'),
	});

	const openRecipeQuery = useQuery({
		queryKey: ['recipes', 'detail', openRecipeId],
		enabled: Boolean(openRecipeId),
		queryFn: () => apiFetch<RecipeDetail>(`/api/recipes/${openRecipeId}`),
	});

	const defaultUnit = useMemo<UnitType>(
		() => unitsQuery.data?.[0]?.id ?? 'Piece',
		[unitsQuery.data],
	);

	const createRecipeMutation = useMutation({
		mutationFn: (payload: RecipePayload) =>
			apiFetch<RecipeSummary>('/api/recipes', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: () => {
			setCreateForm(defaultRecipeForm);
			setShowCreate(false);
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
		},
	});

	const updateRecipeMutation = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: RecipePayload }) =>
			apiFetch<RecipeSummary>(`/api/recipes/${id}`, {
				method: 'PUT',
				body: JSON.stringify(payload),
			}),
		onSuccess: (_, vars) => {
			setEditingRecipeId(null);
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', vars.id] });
		},
	});

	const deleteRecipeMutation = useMutation({
		mutationFn: (id: string) =>
			apiFetch<void>(`/api/recipes/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: (_, id) => {
			if (openRecipeId === id) {
				setOpenRecipeId(null);
			}

			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
		},
	});

	const addIngredientMutation = useMutation({
		mutationFn: ({ recipeId, payload }: { recipeId: string; payload: IngredientPayload }) =>
			apiFetch<RecipeIngredient>(`/api/recipes/${recipeId}/ingredients`, {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: (_, vars) => {
			setIngredientFormsByRecipeId((prev) => ({
				...prev,
				[vars.recipeId]: {
					ingredientName: '',
					quantity: '',
					unitId: defaultUnit,
				},
			}));
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', vars.recipeId],
			});
		},
	});

	const updateIngredientMutation = useMutation({
		mutationFn: ({
			recipeId,
			recipeIngredientId,
			payload,
		}: {
			recipeId: string;
			recipeIngredientId: string;
			payload: IngredientEditPayload;
		}) =>
			apiFetch<RecipeIngredient>(
				`/api/recipes/${recipeId}/ingredients/${recipeIngredientId}`,
				{
					method: 'PUT',
					body: JSON.stringify(payload),
				},
			),
		onSuccess: (_, vars) => {
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', vars.recipeId],
			});
		},
	});

	const removeIngredientMutation = useMutation({
		mutationFn: ({
			recipeId,
			recipeIngredientId,
		}: {
			recipeId: string;
			recipeIngredientId: string;
		}) =>
			apiFetch<void>(`/api/recipes/${recipeId}/ingredients/${recipeIngredientId}`, {
				method: 'DELETE',
			}),
		onSuccess: (_, vars) => {
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', vars.recipeId],
			});
		},
	});

	const currentOpenRecipe =
		openRecipeId && openRecipeQuery.data?.id === openRecipeId
			? openRecipeQuery.data
			: null;

	const currentOpenForm = openRecipeId
		? ingredientFormsByRecipeId[openRecipeId] ?? {
				ingredientName: '',
				quantity: '',
				unitId: defaultUnit,
			}
		: null;
	const ingredientSearchTerm = currentOpenForm?.ingredientName.trim() ?? '';
	const ingredientSearchQuery = useQuery({
		queryKey: ['ingredients', 'search', ingredientSearchTerm],
		enabled: Boolean(openRecipeId) && ingredientSearchTerm.length >= 2,
		queryFn: () =>
			apiFetch<IngredientSearchItem[]>(
				`/api/ingredients/search?name=${encodeURIComponent(ingredientSearchTerm)}`,
			),
	});

	const onCreateRecipe = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		createRecipeMutation.reset();
		createRecipeMutation.mutate(createForm);
	};

	const onStartEditRecipe = (recipe: RecipeSummary) => {
		setEditingRecipeId(recipe.id);
		setEditForm({
			name: recipe.name,
			description: recipe.description,
			imageUrl: recipe.imageUrl,
		});
		updateRecipeMutation.reset();
	};

	const onUpdateRecipe = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!editingRecipeId) {
			return;
		}

		updateRecipeMutation.reset();
		updateRecipeMutation.mutate({
			id: editingRecipeId,
			payload: editForm,
		});
	};

	const onDeleteRecipe = (recipe: RecipeSummary) => {
		if (!window.confirm(`Delete recipe "${recipe.name}"?`)) {
			return;
		}

		deleteRecipeMutation.reset();
		deleteRecipeMutation.mutate(recipe.id);
	};

	const onToggleRecipe = (id: string) => {
		setOpenRecipeId((prev) => (prev === id ? null : id));
		addIngredientMutation.reset();
	};

	const onAddIngredient = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!openRecipeId || !currentOpenForm) {
			return;
		}

		const quantity = Number(currentOpenForm.quantity);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			return;
		}

		addIngredientMutation.reset();
		addIngredientMutation.mutate({
			recipeId: openRecipeId,
			payload: {
				ingredientName: currentOpenForm.ingredientName,
				quantity,
				unitId: currentOpenForm.unitId,
			},
		});
	};

	const onSaveIngredient = (recipeId: string, ingredient: RecipeIngredient) => {
		const edit = ingredientEditsById[ingredient.id] ?? {
			quantity: formatQuantity(ingredient.quantity),
			unitId: ingredient.unitId,
		};
		const quantity = Number(edit.quantity);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			return;
		}

		updateIngredientMutation.reset();
		updateIngredientMutation.mutate({
			recipeId,
			recipeIngredientId: ingredient.id,
			payload: {
				quantity,
				unitId: edit.unitId,
			},
		});
	};

	const onRemoveIngredient = (recipeId: string, ingredient: RecipeIngredient) => {
		removeIngredientMutation.reset();
		removeIngredientMutation.mutate({
			recipeId,
			recipeIngredientId: ingredient.id,
		});
	};

	return (
		<section className='h-full w-full space-y-3 rounded-2xl border border-stone-200/70 bg-white/40 p-3 pb-24 dark:border-stone-700/70 dark:bg-stone-900/40 sm:p-4'>
			<div className='flex items-center justify-between'>
				<h1 className='text-base font-semibold text-stone-900 dark:text-stone-100'>
					My recipes
				</h1>
				<Button
					type='button'
					size='icon'
					onClick={() => {
						setShowCreate((prev) => !prev);
						createRecipeMutation.reset();
					}}
					aria-label='Add recipe'>
					<Plus className='h-4 w-4' />
				</Button>
			</div>

			{showCreate && (
				<form
					onSubmit={onCreateRecipe}
					className='space-y-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900'>
					<div className='space-y-2'>
						<Label htmlFor='new-recipe-name'>name</Label>
						<Input
							id='new-recipe-name'
							value={createForm.name}
							onChange={(event) =>
								setCreateForm((prev) => ({ ...prev, name: event.target.value }))
							}
							minLength={2}
							maxLength={200}
							required
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='new-recipe-description'>description</Label>
						<Input
							id='new-recipe-description'
							value={createForm.description}
							onChange={(event) =>
								setCreateForm((prev) => ({
									...prev,
									description: event.target.value,
								}))
							}
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='new-recipe-image'>imageUrl</Label>
						<Input
							id='new-recipe-image'
							value={createForm.imageUrl}
							onChange={(event) =>
								setCreateForm((prev) => ({
									...prev,
									imageUrl: event.target.value,
								}))
							}
						/>
					</div>
					<Button type='submit' className='w-full' disabled={createRecipeMutation.isPending}>
						{createRecipeMutation.isPending ? 'Saving...' : 'Create recipe'}
					</Button>

					{createRecipeMutation.isError && (
						<Alert variant='destructive'>
							<AlertTitle>Create failed</AlertTitle>
							<AlertDescription>
								{toErrorMessage(createRecipeMutation.error, 'Could not create recipe.')}
							</AlertDescription>
						</Alert>
					)}
				</form>
			)}

			{recipesQuery.isLoading && (
				<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
					Loading recipes...
				</p>
			)}

			{recipesQuery.isError && (
				<Alert variant='destructive'>
					<AlertTitle>Could not load recipes</AlertTitle>
					<AlertDescription>
						{toErrorMessage(recipesQuery.error, 'Please try again.')}
					</AlertDescription>
				</Alert>
			)}

			{!recipesQuery.isLoading && !recipesQuery.isError && recipesQuery.data?.length === 0 && (
				<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
					You have no recipes yet. Tap + to add one.
				</p>
			)}

			<div className='space-y-3'>
				{recipesQuery.data?.map((recipe) => {
					const isOpen = openRecipeId === recipe.id;
					const isEditing = editingRecipeId === recipe.id;

					return (
						<article
							key={recipe.id}
							className='space-y-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900'>
							<div className='flex items-start justify-between gap-3'>
								<button
									type='button'
									onClick={() => onToggleRecipe(recipe.id)}
									className='min-w-0 flex-1 text-left'>
									<p className='truncate text-sm font-semibold text-stone-900 dark:text-stone-100'>
										{recipe.name}
									</p>
									<p className='mt-1 text-[11px] text-stone-500 dark:text-stone-400'>
										authorId: {recipe.authorId}
									</p>
									<p className='text-[11px] text-stone-500 dark:text-stone-400'>
										createdAt: {recipe.createdAt}
									</p>
									<p className='text-[11px] text-stone-500 dark:text-stone-400'>
										updatedAt: {recipe.updatedAt}
									</p>
									{recipe.description && (
										<p className='mt-1 text-xs text-stone-500 dark:text-stone-400'>
											{recipe.description}
										</p>
									)}
								</button>

								<div className='flex items-center gap-1'>
									<Button
										type='button'
										variant='outline'
										size='icon'
										onClick={() => onStartEditRecipe(recipe)}
										aria-label={`Edit ${recipe.name}`}>
										<Pencil className='h-4 w-4' />
									</Button>
									<Button
										type='button'
										variant='outline'
										size='icon'
										onClick={() => onDeleteRecipe(recipe)}
										disabled={deleteRecipeMutation.isPending}
										aria-label={`Delete ${recipe.name}`}>
										<Trash2 className='h-4 w-4' />
									</Button>
								</div>
							</div>

							{isEditing && (
								<form
									onSubmit={onUpdateRecipe}
									className='space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700'>
									<div className='space-y-2'>
										<Label htmlFor={`edit-name-${recipe.id}`}>name</Label>
										<Input
											id={`edit-name-${recipe.id}`}
											value={editForm.name}
											onChange={(event) =>
												setEditForm((prev) => ({ ...prev, name: event.target.value }))
											}
											minLength={2}
											maxLength={200}
											required
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor={`edit-description-${recipe.id}`}>description</Label>
										<Input
											id={`edit-description-${recipe.id}`}
											value={editForm.description}
											onChange={(event) =>
												setEditForm((prev) => ({
													...prev,
													description: event.target.value,
												}))
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor={`edit-image-${recipe.id}`}>imageUrl</Label>
										<Input
											id={`edit-image-${recipe.id}`}
											value={editForm.imageUrl}
											onChange={(event) =>
												setEditForm((prev) => ({
													...prev,
													imageUrl: event.target.value,
												}))
											}
										/>
									</div>
									<div className='grid grid-cols-2 gap-2'>
										<Button
											type='button'
											variant='outline'
											onClick={() => setEditingRecipeId(null)}>
											Cancel
										</Button>
										<Button type='submit' disabled={updateRecipeMutation.isPending}>
											{updateRecipeMutation.isPending ? 'Saving...' : 'Save'}
										</Button>
									</div>

									{updateRecipeMutation.isError && (
										<Alert variant='destructive'>
											<AlertDescription>
												{toErrorMessage(
													updateRecipeMutation.error,
													'Could not update recipe.',
												)}
											</AlertDescription>
										</Alert>
									)}
								</form>
							)}

							{isOpen && (
								<div className='space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700'>
									<p className='text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400'>
										Ingredients
									</p>

									{openRecipeQuery.isLoading && (
										<p className='text-sm text-stone-500 dark:text-stone-400'>
											Loading ingredients...
										</p>
									)}

									{openRecipeQuery.isError && (
										<Alert variant='destructive'>
											<AlertDescription>
												{toErrorMessage(openRecipeQuery.error, 'Could not load recipe details.')}
											</AlertDescription>
										</Alert>
									)}

									{currentOpenRecipe && currentOpenRecipe.ingredients.length === 0 && (
										<p className='text-sm text-stone-500 dark:text-stone-400'>
											No ingredients yet.
										</p>
									)}

									{currentOpenRecipe?.ingredients.map((ingredient) => {
										const edit = ingredientEditsById[ingredient.id] ?? {
											quantity: formatQuantity(ingredient.quantity),
											unitId: ingredient.unitId,
										};

										return (
											<div
												key={ingredient.id}
												className='rounded-lg border border-stone-200 p-2 dark:border-stone-700'>
												<p className='text-sm font-medium text-stone-900 dark:text-stone-100'>
													{ingredient.ingredientName}
												</p>
												<div className='mt-2 grid grid-cols-[1fr_1fr_auto_auto] gap-2'>
													<Input
														type='number'
														min='0.001'
														step='0.001'
														value={edit.quantity}
														onChange={(event) =>
															setIngredientEditsById((prev) => ({
																...prev,
																[ingredient.id]: {
																	quantity: event.target.value,
																	unitId: edit.unitId,
																},
															}))
														}
													/>
													<select
														value={edit.unitId}
														onChange={(event) =>
															setIngredientEditsById((prev) => ({
																...prev,
																[ingredient.id]: {
																	quantity: edit.quantity,
																	unitId: event.target.value as UnitType,
																},
															}))
														}
														className='h-11 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
														{unitsQuery.data?.map((unit) => (
															<option key={unit.id} value={unit.id}>
																{unit.name}
															</option>
														))}
													</select>
													<Button
														type='button'
														variant='outline'
														onClick={() => onSaveIngredient(recipe.id, ingredient)}
														disabled={updateIngredientMutation.isPending}>
														Save
													</Button>
													<Button
														type='button'
														variant='outline'
														onClick={() => onRemoveIngredient(recipe.id, ingredient)}
														disabled={removeIngredientMutation.isPending}>
														Remove
													</Button>
												</div>
											</div>
										);
									})}

									{currentOpenForm && (
										<form
											onSubmit={onAddIngredient}
											className='space-y-2 rounded-lg border border-dashed border-stone-300 p-3 dark:border-stone-600'>
											<p className='text-xs font-medium text-stone-500 dark:text-stone-400'>
												Add ingredient
											</p>
											<Input
												placeholder='ingredientName'
												value={currentOpenForm.ingredientName}
												onChange={(event) =>
													setIngredientFormsByRecipeId((prev) => ({
														...prev,
														[openRecipeId]: {
															...currentOpenForm,
															ingredientName: event.target.value,
														},
													}))
												}
												minLength={2}
												maxLength={200}
												required
											/>
											{ingredientSearchQuery.data &&
												ingredientSearchQuery.data.length > 0 && (
													<div className='rounded-md border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60'>
														{ingredientSearchQuery.data.slice(0, 5).map((item) => (
															<button
																key={item.id}
																type='button'
																onClick={() =>
																	setIngredientFormsByRecipeId((prev) => ({
																		...prev,
																		[openRecipeId]: {
																			...currentOpenForm,
																			ingredientName: item.name,
																			unitId: item.defaultUnitId,
																		},
																	}))
																}
																className='flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700/70'>
																<span>{item.name}</span>
																<span className='text-stone-500 dark:text-stone-400'>
																	{item.defaultUnitId}
																</span>
															</button>
														))}
													</div>
												)}
											<div className='grid grid-cols-[1fr_1fr] gap-2'>
												<Input
													type='number'
													min='0.001'
													step='0.001'
													placeholder='quantity'
													value={currentOpenForm.quantity}
													onChange={(event) =>
														setIngredientFormsByRecipeId((prev) => ({
															...prev,
															[openRecipeId]: {
																...currentOpenForm,
																quantity: event.target.value,
															},
														}))
													}
													required
												/>
												<select
													value={currentOpenForm.unitId}
													onChange={(event) =>
														setIngredientFormsByRecipeId((prev) => ({
															...prev,
															[openRecipeId]: {
																...currentOpenForm,
																unitId: event.target.value as UnitType,
															},
														}))
													}
													className='h-11 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
													{unitsQuery.data?.map((unit) => (
														<option key={unit.id} value={unit.id}>
															{unit.name}
														</option>
													))}
												</select>
											</div>

											<Button
												type='submit'
												className='w-full'
												disabled={addIngredientMutation.isPending || unitsQuery.isLoading}>
												{addIngredientMutation.isPending ? 'Adding...' : 'Add ingredient'}
											</Button>
										</form>
									)}

									{(addIngredientMutation.isError ||
										updateIngredientMutation.isError ||
										removeIngredientMutation.isError) && (
										<Alert variant='destructive'>
											<AlertDescription>
												{toErrorMessage(
													addIngredientMutation.error ??
														updateIngredientMutation.error ??
														removeIngredientMutation.error,
													'Could not update ingredients.',
												)}
											</AlertDescription>
										</Alert>
									)}
								</div>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
}
