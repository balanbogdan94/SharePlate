import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	useCanGoBack,
	useNavigate,
	useParams,
	useRouter,
} from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePickerField } from '@/pages/tabs/home/ImagePickerField';
import { apiFetch } from '@/lib/api';
import type {
	FormState,
	IngredientPayload,
	RecipeDetail,
	Unit,
	UnitType,
} from '@/pages/tabs/home/types';

type IngredientDraft = {
	name: string;
	quantity: string;
	unit: UnitType;
};

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

function serializeIngredients(ingredients: IngredientPayload[]): string {
	return JSON.stringify(
		ingredients.map((ingredient) => ({
			name: ingredient.name,
			quantity: ingredient.quantity,
			unit: ingredient.unit,
		})),
	);
}

type AddRecipeFormProps = {
	recipeId?: string;
	initialData?: RecipeDetail;
};

function AddRecipeForm({ recipeId, initialData }: AddRecipeFormProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const isEditing = Boolean(recipeId);
	const [form, setForm] = useState<FormState>(() =>
		initialData
			? {
					title: initialData.title,
					notes: initialData.notes ?? '',
					imageUrl: initialData.imageUrl ?? '',
				}
			: defaultRecipeForm,
	);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [ingredients, setIngredients] = useState<IngredientPayload[]>(() =>
		initialData
			? initialData.ingredients.map((ingredient) => ({
					name: ingredient.ingredientName,
					quantity: ingredient.quantity,
					unit: ingredient.unitId,
				}))
			: [],
	);
	const [ingredientsError, setIngredientsError] = useState<string | null>(null);
	const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
	const [ingredientDraft, setIngredientDraft] = useState<IngredientDraft>({
		name: '',
		quantity: '',
		unit: 'Piece',
	});

	const unitsQuery = useQuery({
		queryKey: ['units'],
		queryFn: () => apiFetch<Unit[]>('/api/units'),
	});

	const defaultUnit = useMemo<UnitType>(
		() => unitsQuery.data?.[0]?.id ?? 'Piece',
		[unitsQuery.data],
	);

	const createRecipeMutation = useMutation({
		mutationFn: async () => {
			const formData = new FormData();
			formData.append('Title', form.title);
			formData.append('Notes', form.notes ?? '');
			if (imageFile) {
				formData.append('Image', imageFile, imageFile.name);
			}
			formData.append('Ingredients', serializeIngredients(ingredients));

			return apiFetch('/api/recipes', {
				method: 'POST',
				body: formData,
			});
		},
		onSuccess: async () => {
			setForm(defaultRecipeForm);
			setImageFile(null);
			setIngredients([]);
			setIngredientsError(null);
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			if ('startViewTransition' in document) {
				document.documentElement.dataset.navDirection = 'back';
				(
					document as Document & {
						startViewTransition: (callback: () => void | Promise<void>) => {
							finished: Promise<void>;
						};
					}
				).startViewTransition(() => {
					if (canGoBack) {
						router.history.back();
						return;
					}
					void navigate({ to: '/' });
				});
				return;
			}

			if (canGoBack) {
				router.history.back();
				return;
			}
			await navigate({ to: '/' });
		},
	});

	const updateRecipeMutation = useMutation({
		mutationFn: async () => {
			if (!recipeId) {
				throw new Error('Missing recipe id.');
			}

			const formData = new FormData();
			formData.append('Title', form.title);
			formData.append('Notes', form.notes ?? '');
			const removeImage = Boolean(initialData?.imageUrl) && !form.imageUrl;
			formData.append('RemoveImage', String(removeImage));
			if (imageFile) {
				formData.append('Image', imageFile, imageFile.name);
			}
			formData.append('Ingredients', serializeIngredients(ingredients));

			return apiFetch(`/api/recipes/${recipeId}`, {
				method: 'PUT',
				body: formData,
			});
		},
		onSuccess: async () => {
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({
				queryKey: ['recipes', 'detail', recipeId],
			});
			if ('startViewTransition' in document) {
				document.documentElement.dataset.navDirection = 'back';
				(
					document as Document & {
						startViewTransition: (callback: () => void | Promise<void>) => {
							finished: Promise<void>;
						};
					}
				).startViewTransition(() => {
					if (canGoBack) {
						router.history.back();
						return;
					}
					void navigate({ to: '/' });
				});
				return;
			}

			if (canGoBack) {
				router.history.back();
				return;
			}
			await navigate({ to: '/' });
		},
	});

	const onOpenIngredientModal = () => {
		setIngredientDraft({
			name: '',
			quantity: '',
			unit: defaultUnit,
		});
		setIsIngredientModalOpen(true);
	};

	const onAddIngredient = () => {
		const name = ingredientDraft.name.trim();
		const quantity = Number(ingredientDraft.quantity);
		if (name.length < 2 || !Number.isFinite(quantity) || quantity <= 0) {
			return;
		}

		setIngredients((prev) => [
			...prev,
			{ name, quantity, unit: ingredientDraft.unit },
		]);
		setIngredientsError(null);
		setIsIngredientModalOpen(false);
	};

	const onRemoveIngredient = (index: number) => {
		setIngredients((prev) => {
			const next = prev.filter((_, currentIndex) => currentIndex !== index);
			if (next.length === 0) {
				setIngredientsError('Add at least one ingredient.');
			}
			return next;
		});
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (ingredients.length === 0) {
			setIngredientsError('Add at least one ingredient.');
			return;
		}

		if (isEditing) {
			updateRecipeMutation.reset();
			updateRecipeMutation.mutate();
			return;
		}

		createRecipeMutation.reset();
		createRecipeMutation.mutate();
	};

	const submitErrorMessage = createRecipeMutation.isError
		? toErrorMessage(createRecipeMutation.error, 'Could not create recipe.')
		: updateRecipeMutation.isError
			? toErrorMessage(updateRecipeMutation.error, 'Could not update recipe.')
			: null;
	const isIngredientDraftValid =
		ingredientDraft.name.trim().length >= 2 &&
		Number.isFinite(Number(ingredientDraft.quantity)) &&
		Number(ingredientDraft.quantity) > 0;
	const isSaveDisabled =
		createRecipeMutation.isPending ||
		updateRecipeMutation.isPending ||
		form.title.trim().length === 0 ||
		ingredients.length === 0;

	return (
		<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10'>
			<form
				onSubmit={handleSubmit}
				className='space-y-4 rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/70'>
				<div className='space-y-2'>
					<Label htmlFor='recipe-title'>Title</Label>
					<Input
						id='recipe-title'
						value={form.title}
						onChange={(event) =>
							setForm((prev) => ({
								...prev,
								title: event.target.value,
							}))
						}
						required
					/>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='recipe-notes'>Notes</Label>
					<textarea
						id='recipe-notes'
						value={form.notes}
						onChange={(event) =>
							setForm((prev) => ({
								...prev,
								notes: event.target.value,
							}))
						}
						rows={4}
						className='w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-sky-500 dark:focus:ring-sky-900'
					/>
				</div>

				<ImagePickerField
					id='add-recipe-image'
					label='Photo'
					value={form.imageUrl}
					onChange={(nextValue) =>
						setForm((prev) => ({ ...prev, imageUrl: nextValue }))
					}
					onFileChange={setImageFile}
				/>

				<div className='space-y-3 rounded-2xl border border-stone-200/70 bg-stone-50/70 p-3 dark:border-stone-700/70 dark:bg-stone-950/60'>
					<div className='flex items-center justify-between'>
						<p className='text-sm font-semibold text-stone-900 dark:text-stone-100'>
							Ingredients
						</p>
						<Button
							type='button'
							variant='outline'
							onClick={onOpenIngredientModal}
							className='h-9 gap-1 rounded-full border-sky-200 bg-white/80 text-sky-700 hover:bg-sky-50'>
							<Plus className='h-4 w-4' />
							Add Ingredient
						</Button>
					</div>

					{ingredients.length === 0 ? (
						<p className='text-sm text-stone-500 dark:text-stone-400'>
							No ingredients yet. Add your first one.
						</p>
					) : (
						<ul className='space-y-2'>
							{ingredients.map((ingredient, index) => (
								<li
									key={`${ingredient.name}-${index}`}
									className='flex items-center justify-between rounded-xl border border-stone-200/70 bg-white/90 px-3 py-2 text-sm text-stone-700 shadow-sm dark:border-stone-700/70 dark:bg-stone-900/70 dark:text-stone-200'>
									<div>
										<p className='font-medium text-stone-900 dark:text-stone-100'>
											{ingredient.name}
										</p>
										<p className='text-xs text-stone-500 dark:text-stone-400'>
											{ingredient.quantity} {ingredient.unit}
										</p>
									</div>
									<button
										type='button'
										onClick={() => onRemoveIngredient(index)}
										className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'>
										<X className='h-4 w-4' />
									</button>
								</li>
							))}
						</ul>
					)}

					{ingredientsError && (
						<p className='text-xs text-red-600 dark:text-red-400'>
							{ingredientsError}
						</p>
					)}
				</div>

				<Button
					type='submit'
					className='h-12 w-full rounded-full text-base'
					disabled={isSaveDisabled}>
					{createRecipeMutation.isPending || updateRecipeMutation.isPending
						? 'Saving...'
						: isEditing
							? 'Update Recipe'
							: 'Save Recipe'}
				</Button>

				{submitErrorMessage && (
					<Alert variant='destructive'>
						<AlertTitle>Could not save recipe</AlertTitle>
						<AlertDescription>{submitErrorMessage}</AlertDescription>
					</Alert>
				)}
			</form>

			<div
				className={`fixed inset-0 z-40 transition-all duration-300 ${
					isIngredientModalOpen
						? 'pointer-events-auto opacity-100'
						: 'pointer-events-none opacity-0'
				}`}
				aria-hidden={!isIngredientModalOpen}>
				<div
					className='absolute inset-0 bg-stone-900/30 backdrop-blur-[3px]'
					onClick={() => setIsIngredientModalOpen(false)}
				/>
				<div
					className={`absolute bottom-0 left-0 right-0 mx-auto w-full max-w-2xl rounded-t-[28px] border border-stone-200/70 bg-white/85 px-4 pb-8 pt-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-stone-700/70 dark:bg-stone-900/80 ${
						isIngredientModalOpen ? 'translate-y-0' : 'translate-y-8'
					}`}>
					<div className='mb-4 flex items-center justify-between text-sm font-semibold text-sky-600'>
						<button
							type='button'
							onClick={() => setIsIngredientModalOpen(false)}
							className='transition hover:text-sky-700'>
							Cancel
						</button>
						<p className='text-base font-semibold text-stone-900 dark:text-stone-100'>
							New Ingredient
						</p>
						<button
							type='button'
							onClick={onAddIngredient}
							disabled={!isIngredientDraftValid}
							className={`transition hover:text-sky-700 ${
								!isIngredientDraftValid
									? 'pointer-events-none text-stone-300 dark:text-stone-600'
									: ''
							}`}>
							Add
						</button>
					</div>

					<div className='space-y-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3 shadow-sm dark:border-stone-700/70 dark:bg-stone-950/70'>
						<label className='block'>
							<span className='text-xs font-medium text-stone-500 dark:text-stone-400'>
								Ingredient
							</span>
							<Input
								value={ingredientDraft.name}
								onChange={(event) =>
									setIngredientDraft((prev) => ({
										...prev,
										name: event.target.value,
									}))
								}
								placeholder='e.g. Cherry tomatoes'
								className='mt-1'
							/>
						</label>

						<div className='grid grid-cols-[1fr,1.1fr] gap-3'>
							<label className='block'>
								<span className='text-xs font-medium text-stone-500 dark:text-stone-400'>
									Quantity
								</span>
								<Input
									value={ingredientDraft.quantity}
									onChange={(event) =>
										setIngredientDraft((prev) => ({
											...prev,
											quantity: event.target.value,
										}))
									}
									inputMode='decimal'
									placeholder='2'
									className='mt-1'
								/>
							</label>

							<label className='block'>
								<span className='text-xs font-medium text-stone-500 dark:text-stone-400'>
									Unit
								</span>
								<select
									value={ingredientDraft.unit}
									onChange={(event) =>
										setIngredientDraft((prev) => ({
											...prev,
											unit: event.target.value as UnitType,
										}))
									}
									className='mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-800 shadow-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100'>
									{unitsQuery.data?.map((unit) => (
										<option key={unit.id} value={unit.id}>
											{unit.name}
										</option>
									)) ?? <option value={defaultUnit}>{defaultUnit}</option>}
								</select>
							</label>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function AddRecipePage() {
	const params = useParams({ strict: false }) as { recipeId?: string };
	const recipeId = params.recipeId;
	const isEditing = Boolean(recipeId);

	const recipeDetailQuery = useQuery({
		queryKey: ['recipes', 'detail', recipeId],
		enabled: isEditing,
		queryFn: () => apiFetch<RecipeDetail>(`/api/recipes/${recipeId}`),
	});

	if (isEditing && recipeDetailQuery.isLoading) {
		return (
			<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10'>
				<p className='rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
					Loading recipe...
				</p>
			</section>
		);
	}

	if (isEditing && recipeDetailQuery.isError) {
		return (
			<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10'>
				<Alert variant='destructive'>
					<AlertTitle>Could not load recipe</AlertTitle>
					<AlertDescription>
						{toErrorMessage(recipeDetailQuery.error, 'Could not load recipe.')}
					</AlertDescription>
				</Alert>
			</section>
		);
	}

	return (
		<AddRecipeForm
			key={recipeId ?? 'new'}
			recipeId={recipeId}
			initialData={recipeDetailQuery.data}
		/>
	);
}
