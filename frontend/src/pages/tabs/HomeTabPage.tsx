import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { CreateRecipeForm } from './home/CreateRecipeForm';
import { RecipeCard } from './home/RecipeCard';
import type {
	CreateRecipePayload,
	FormState,
	IngredientEditPayload,
	IngredientFormState,
	IngredientPayload,
	IngredientSearchItem,
	RecipeDetail,
	RecipeIngredient,
	RecipeSummary,
	Unit,
	UnitType,
} from './home/types';

const defaultRecipeForm: FormState = {
	title: '',
	notes: '',
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

function serializeIngredients(ingredients: IngredientPayload[]): string {
	return JSON.stringify(
		ingredients.map((ingredient) => ({
			name: ingredient.name,
			quantity: ingredient.quantity,
			unit: ingredient.unit,
		})),
	);
}

export function HomeTabPage() {
	const queryClient = useQueryClient();
	const [showCreate, setShowCreate] = useState(false);
	const [createForm, setCreateForm] = useState<FormState>(defaultRecipeForm);
	const [createImageFile, setCreateImageFile] = useState<File | null>(null);
	const [editImageFile, setEditImageFile] = useState<File | null>(null);
	const [createIngredientForm, setCreateIngredientForm] =
		useState<IngredientFormState>({
			ingredientName: '',
			quantity: '',
			unitId: 'Piece',
		});
	const [createIngredients, setCreateIngredients] = useState<
		IngredientPayload[]
	>([]);
	const [createIngredientsError, setCreateIngredientsError] = useState<
		string | null
	>(null);
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
		mutationFn: async (payload: CreateRecipePayload) => {
			const formData = new FormData();
			formData.append('Title', payload.form.title);
			formData.append('Notes', payload.form.notes ?? '');
			if (payload.imageFile) {
				formData.append('Image', payload.imageFile, payload.imageFile.name);
			}
			formData.append('Ingredients', serializeIngredients(payload.ingredients));

			const created = await apiFetch<RecipeSummary>('/api/recipes', {
				method: 'POST',
				body: formData,
			});

			return apiFetch<RecipeDetail>(`/api/recipes/${created.id}`);
		},
		onSuccess: (createdDetail) => {
			setCreateForm(defaultRecipeForm);
			setCreateImageFile(null);
			setCreateIngredientForm({
				ingredientName: '',
				quantity: '',
				unitId: defaultUnit,
			});
			setCreateIngredients([]);
			setCreateIngredientsError(null);
			setShowCreate(false);
			setOpenRecipeId(createdDetail.id);
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', createdDetail.id],
			});
		},
	});

	const updateRecipeMutation = useMutation({
		mutationFn: ({
			id,
			form,
			ingredients,
			imageFile,
			removeImage,
		}: {
			id: string;
			form: FormState;
			ingredients: IngredientPayload[];
			imageFile: File | null;
			removeImage: boolean;
		}) => {
			const formData = new FormData();
			formData.append('Title', form.title);
			formData.append('Notes', form.notes ?? '');
			formData.append('RemoveImage', String(removeImage));
			if (imageFile) {
				formData.append('Image', imageFile, imageFile.name);
			}
			formData.append('Ingredients', serializeIngredients(ingredients));
			return apiFetch<RecipeSummary>(`/api/recipes/${id}`, {
				method: 'PUT',
				body: formData,
			});
		},
		onSuccess: (_, vars) => {
			setEditingRecipeId(null);
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', vars.id],
			});
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
		mutationFn: ({
			recipeId,
			payload,
		}: {
			recipeId: string;
			payload: IngredientPayload;
		}) =>
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
			apiFetch<void>(
				`/api/recipes/${recipeId}/ingredients/${recipeIngredientId}`,
				{
					method: 'DELETE',
				},
			),
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
		? (ingredientFormsByRecipeId[openRecipeId] ?? {
				ingredientName: '',
				quantity: '',
				unitId: defaultUnit,
			})
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
	const createIngredientSearchTerm = createIngredientForm.ingredientName.trim();
	const createIngredientSearchQuery = useQuery({
		queryKey: ['ingredients', 'search', 'create', createIngredientSearchTerm],
		enabled: showCreate && createIngredientSearchTerm.length >= 2,
		queryFn: () =>
			apiFetch<IngredientSearchItem[]>(
				`/api/ingredients/search?name=${encodeURIComponent(createIngredientSearchTerm)}`,
			),
	});

	const onCreateRecipe = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (createIngredients.length === 0) {
			setCreateIngredientsError('Add at least one ingredient.');
			return;
		}
		setCreateIngredientsError(null);
		createRecipeMutation.reset();
		createRecipeMutation.mutate({
			form: createForm,
			ingredients: createIngredients,
			imageFile: createImageFile,
		});
	};

	const onQueueCreateIngredient = () => {
		const ingredientName = createIngredientForm.ingredientName.trim();
		if (ingredientName.length < 2) {
			return;
		}

		const quantity = Number(createIngredientForm.quantity);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			return;
		}

		setCreateIngredients((prev) => [
			...prev,
			{
				name: ingredientName,
				quantity,
				unit: createIngredientForm.unitId,
			},
		]);
		setCreateIngredientsError(null);
		setCreateIngredientForm({
			ingredientName: '',
			quantity: '',
			unitId: defaultUnit,
		});
	};

	const onRemoveQueuedCreateIngredient = (index: number) => {
		setCreateIngredients((prev) => {
			const next = prev.filter((_, currentIndex) => currentIndex !== index);
			if (next.length === 0) {
				setCreateIngredientsError('Add at least one ingredient.');
			}
			return next;
		});
	};

	const onStartEditRecipe = (recipe: RecipeSummary) => {
		setEditingRecipeId(recipe.id);
		setOpenRecipeId(recipe.id);
		setEditForm({
			title: recipe.title,
			notes: recipe.notes,
			imageUrl: recipe.imageUrl,
		});
		setEditImageFile(null);
		updateRecipeMutation.reset();
	};

	const onUpdateRecipe = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!editingRecipeId) {
			return;
		}

		const recipeDetail =
			openRecipeQuery.data && openRecipeQuery.data.id === editingRecipeId
				? openRecipeQuery.data
				: null;
		if (!recipeDetail) {
			window.alert('Open the recipe first so ingredients can be loaded.');
			return;
		}

		const ingredients = recipeDetail.ingredients.map((ingredient) => ({
			name: ingredient.ingredientName,
			quantity: ingredient.quantity,
			unit: ingredient.unitId,
		}));
		const removeImage = Boolean(recipeDetail.imageUrl) && !editForm.imageUrl;

		updateRecipeMutation.reset();
		updateRecipeMutation.mutate({
			id: editingRecipeId,
			form: editForm,
			ingredients,
			imageFile: editImageFile,
			removeImage,
		});
	};

	const onDeleteRecipe = (recipe: RecipeSummary) => {
		if (!window.confirm(`Delete recipe "${recipe.title}"?`)) {
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
				name: currentOpenForm.ingredientName,
				quantity,
				unit: currentOpenForm.unitId,
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

	const onRemoveIngredient = (
		recipeId: string,
		ingredient: RecipeIngredient,
	) => {
		removeIngredientMutation.reset();
		removeIngredientMutation.mutate({
			recipeId,
			recipeIngredientId: ingredient.id,
		});
	};

	const createErrorMessage = createRecipeMutation.isError
		? toErrorMessage(createRecipeMutation.error, 'Could not create recipe.')
		: null;
	const updateErrorMessage = updateRecipeMutation.isError
		? toErrorMessage(updateRecipeMutation.error, 'Could not update recipe.')
		: null;
	const openRecipeErrorMessage = openRecipeQuery.isError
		? toErrorMessage(openRecipeQuery.error, 'Could not load recipe details.')
		: null;
	const ingredientsErrorMessage =
		addIngredientMutation.isError ||
		updateIngredientMutation.isError ||
		removeIngredientMutation.isError
			? toErrorMessage(
					addIngredientMutation.error ??
						updateIngredientMutation.error ??
						removeIngredientMutation.error,
					'Could not update ingredients.',
				)
			: null;

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
						setCreateIngredientsError(null);
					}}
					aria-label='Add recipe'>
					<Plus className='h-4 w-4' />
				</Button>
			</div>

			{showCreate && (
				<CreateRecipeForm
					form={createForm}
					setForm={setCreateForm}
					onImageFileChange={setCreateImageFile}
					ingredientForm={createIngredientForm}
					setIngredientForm={setCreateIngredientForm}
					ingredients={createIngredients}
					ingredientsError={createIngredientsError}
					ingredientSearchResults={createIngredientSearchQuery.data}
					units={unitsQuery.data}
					defaultUnit={defaultUnit}
					onQueueIngredient={onQueueCreateIngredient}
					onRemoveIngredient={onRemoveQueuedCreateIngredient}
					onSubmit={onCreateRecipe}
					isPending={createRecipeMutation.isPending}
					errorMessage={createErrorMessage}
				/>
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

			{!recipesQuery.isLoading &&
				!recipesQuery.isError &&
				recipesQuery.data?.length === 0 && (
					<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
						You have no recipes yet. Tap + to add one.
					</p>
				)}

			<div className='space-y-3'>
				{recipesQuery.data?.map((recipe) => {
					const isOpen = openRecipeId === recipe.id;
					const isEditing = editingRecipeId === recipe.id;

					return (
						<RecipeCard
							key={recipe.id}
							recipe={recipe}
							isOpen={isOpen}
							isEditing={isEditing}
							onToggle={onToggleRecipe}
							onStartEdit={onStartEditRecipe}
							onCancelEdit={() => setEditingRecipeId(null)}
							onDelete={onDeleteRecipe}
							deletePending={deleteRecipeMutation.isPending}
							editForm={editForm}
							setEditForm={setEditForm}
							onUpdateRecipe={onUpdateRecipe}
							updatePending={updateRecipeMutation.isPending}
							updateErrorMessage={updateErrorMessage}
							onEditImageFileChange={setEditImageFile}
							openRecipe={isOpen ? currentOpenRecipe : null}
							openRecipeLoading={openRecipeQuery.isLoading && isOpen}
							openRecipeErrorMessage={isOpen ? openRecipeErrorMessage : null}
							units={unitsQuery.data}
							ingredientEditsById={ingredientEditsById}
							setIngredientEditsById={setIngredientEditsById}
							onSaveIngredient={onSaveIngredient}
							onRemoveIngredient={onRemoveIngredient}
							currentOpenForm={isOpen ? currentOpenForm : null}
							onIngredientFormChange={(next) => {
								if (!openRecipeId) return;
								setIngredientFormsByRecipeId((prev) => ({
									...prev,
									[openRecipeId]: next,
								}));
							}}
							onAddIngredient={onAddIngredient}
							ingredientSearchResults={
								isOpen ? ingredientSearchQuery.data : undefined
							}
							addIngredientPending={addIngredientMutation.isPending}
							updateIngredientPending={updateIngredientMutation.isPending}
							removeIngredientPending={removeIngredientMutation.isPending}
							ingredientsErrorMessage={isOpen ? ingredientsErrorMessage : null}
						/>
					);
				})}
			</div>
		</section>
	);
}
