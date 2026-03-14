import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2 } from 'lucide-react';
import { ImagePickerField } from './ImagePickerField';
import type {
	IngredientFormState,
	IngredientSearchItem,
	RecipeDetail,
	RecipeIngredient,
	RecipeSummary,
	Unit,
	UnitType,
	FormState,
} from './types';

function formatQuantity(value: number): string {
	if (Number.isInteger(value)) {
		return String(value);
	}

	return String(Number(value.toFixed(3)));
}

type RecipeCardProps = {
	recipe: RecipeSummary;
	isOpen: boolean;
	isEditing: boolean;
	onToggle: (id: string) => void;
	onStartEdit: (recipe: RecipeSummary) => void;
	onCancelEdit: () => void;
	onDelete: (recipe: RecipeSummary) => void;
	deletePending: boolean;
	editForm: FormState;
	setEditForm: React.Dispatch<React.SetStateAction<FormState>>;
	onUpdateRecipe: (event: React.FormEvent<HTMLFormElement>) => void;
	updatePending: boolean;
	updateErrorMessage: string | null;
	onEditImageFileChange: (file: File | null) => void;
	openRecipe: RecipeDetail | null;
	openRecipeLoading: boolean;
	openRecipeErrorMessage: string | null;
	units: Unit[] | undefined;
	ingredientEditsById: Record<string, { quantity: string; unitId: UnitType }>;
	setIngredientEditsById: React.Dispatch<
		React.SetStateAction<Record<string, { quantity: string; unitId: UnitType }>>
	>;
	onSaveIngredient: (recipeId: string, ingredient: RecipeIngredient) => void;
	onRemoveIngredient: (recipeId: string, ingredient: RecipeIngredient) => void;
	currentOpenForm: IngredientFormState | null;
	onIngredientFormChange: (next: IngredientFormState) => void;
	onAddIngredient: (event: React.FormEvent<HTMLFormElement>) => void;
	ingredientSearchResults: IngredientSearchItem[] | undefined;
	addIngredientPending: boolean;
	updateIngredientPending: boolean;
	removeIngredientPending: boolean;
	ingredientsErrorMessage: string | null;
};

export function RecipeCard({
	recipe,
	isOpen,
	isEditing,
	onToggle,
	onStartEdit,
	onCancelEdit,
	onDelete,
	deletePending,
	editForm,
	setEditForm,
	onUpdateRecipe,
	updatePending,
	updateErrorMessage,
	onEditImageFileChange,
	openRecipe,
	openRecipeLoading,
	openRecipeErrorMessage,
	units,
	ingredientEditsById,
	setIngredientEditsById,
	onSaveIngredient,
	onRemoveIngredient,
	currentOpenForm,
	onIngredientFormChange,
	onAddIngredient,
	ingredientSearchResults,
	addIngredientPending,
	updateIngredientPending,
	removeIngredientPending,
	ingredientsErrorMessage,
}: RecipeCardProps) {
	return (
		<article className='flex overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'>
			<div className='relative w-32 shrink-0'>
				{recipe.imageUrl ? (
					<img
						src={recipe.imageUrl}
						alt={recipe.title}
						className='absolute inset-0 h-full w-full object-cover'
					/>
				) : (
					<div className='absolute inset-0 bg-stone-100 dark:bg-stone-800' />
				)}
				<div className='pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-r from-transparent to-white dark:to-stone-900' />
			</div>

			<div className='min-w-0 flex-1 space-y-3 p-3'>
				<div className='flex items-start justify-between gap-3'>
					<button
						type='button'
						onClick={() => onToggle(recipe.id)}
						className='min-w-0 flex-1 text-left'>
						<p className='truncate text-sm font-semibold text-stone-900 dark:text-stone-100'>
							{recipe.title}
						</p>
						<p className='mt-1 text-[11px] text-stone-500 dark:text-stone-400'>
							authorId: {recipe.authorId}
						</p>
						<p className='text-[11px] text-stone-500 dark:text-stone-400'>
							authorName: {recipe.authorName}
						</p>
						<p className='text-[11px] text-stone-500 dark:text-stone-400'>
							createdAt: {recipe.createdAt}
						</p>
						<p className='text-[11px] text-stone-500 dark:text-stone-400'>
							updatedAt: {recipe.updatedAt}
						</p>
						{recipe.notes && (
							<p className='mt-1 text-xs text-stone-500 dark:text-stone-400'>
								{recipe.notes}
							</p>
						)}
					</button>

					<div className='flex items-center gap-1'>
						<Button
							type='button'
							variant='outline'
							size='icon'
							onClick={() => onStartEdit(recipe)}
							aria-label={`Edit ${recipe.title}`}>
							<Pencil className='h-4 w-4' />
						</Button>
						<Button
							type='button'
							variant='outline'
							size='icon'
							onClick={() => onDelete(recipe)}
							disabled={deletePending}
							aria-label={`Delete ${recipe.title}`}>
							<Trash2 className='h-4 w-4' />
						</Button>
					</div>
				</div>

				{isEditing && (
					<form
						onSubmit={onUpdateRecipe}
						className='space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700'>
						<div className='space-y-2'>
							<Label htmlFor={`edit-name-${recipe.id}`}>title</Label>
							<Input
								id={`edit-name-${recipe.id}`}
								value={editForm.title}
								onChange={(event) =>
									setEditForm((prev) => ({
										...prev,
										title: event.target.value,
									}))
								}
								minLength={2}
								maxLength={200}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor={`edit-description-${recipe.id}`}>notes</Label>
							<Input
								id={`edit-description-${recipe.id}`}
								value={editForm.notes}
								onChange={(event) =>
									setEditForm((prev) => ({
										...prev,
										notes: event.target.value,
									}))
								}
							/>
						</div>
						<ImagePickerField
							id={`edit-image-${recipe.id}`}
							label='Image'
							value={editForm.imageUrl}
							onChange={(imageUrl) =>
								setEditForm((prev) => ({
									...prev,
									imageUrl,
								}))
							}
							onFileChange={onEditImageFileChange}
						/>
						<div className='grid grid-cols-2 gap-2'>
							<Button type='button' variant='outline' onClick={onCancelEdit}>
								Cancel
							</Button>
							<Button type='submit' disabled={updatePending}>
								{updatePending ? 'Saving...' : 'Save'}
							</Button>
						</div>

						{updateErrorMessage && (
							<Alert variant='destructive'>
								<AlertDescription>{updateErrorMessage}</AlertDescription>
							</Alert>
						)}
					</form>
				)}

				{isOpen && (
					<div className='space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700'>
						<p className='text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400'>
							Ingredients
						</p>

						{openRecipeLoading && (
							<p className='text-sm text-stone-500 dark:text-stone-400'>
								Loading ingredients...
							</p>
						)}

						{openRecipeErrorMessage && (
							<Alert variant='destructive'>
								<AlertDescription>{openRecipeErrorMessage}</AlertDescription>
							</Alert>
						)}

						{openRecipe && openRecipe.ingredients.length === 0 && (
							<p className='text-sm text-stone-500 dark:text-stone-400'>
								No ingredients yet.
							</p>
						)}

						{openRecipe?.ingredients.map((ingredient) => {
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
											{units?.map((unit) => (
												<option key={unit.id} value={unit.id}>
													{unit.name}
												</option>
											))}
										</select>
										<Button
											type='button'
											variant='outline'
											onClick={() => onSaveIngredient(recipe.id, ingredient)}
											disabled={updateIngredientPending}>
											Save
										</Button>
										<Button
											type='button'
											variant='outline'
											onClick={() => onRemoveIngredient(recipe.id, ingredient)}
											disabled={removeIngredientPending}>
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
										onIngredientFormChange({
											...currentOpenForm,
											ingredientName: event.target.value,
										})
									}
									minLength={2}
									maxLength={200}
									required
								/>
								{ingredientSearchResults &&
									ingredientSearchResults.length > 0 && (
										<div className='rounded-md border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60'>
											{ingredientSearchResults.slice(0, 5).map((item) => (
												<button
													key={item.id}
													type='button'
													onClick={() =>
														onIngredientFormChange({
															...currentOpenForm,
															ingredientName: item.name,
															unitId: item.defaultUnitId,
														})
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
											onIngredientFormChange({
												...currentOpenForm,
												quantity: event.target.value,
											})
										}
										required
									/>
									<select
										value={currentOpenForm.unitId}
										onChange={(event) =>
											onIngredientFormChange({
												...currentOpenForm,
												unitId: event.target.value as UnitType,
											})
										}
										className='h-11 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
										{units?.map((unit) => (
											<option key={unit.id} value={unit.id}>
												{unit.name}
											</option>
										))}
									</select>
								</div>

								<Button
									type='submit'
									className='w-full'
									disabled={addIngredientPending}>
									{addIngredientPending ? 'Adding...' : 'Add ingredient'}
								</Button>
							</form>
						)}

						{ingredientsErrorMessage && (
							<Alert variant='destructive'>
								<AlertDescription>{ingredientsErrorMessage}</AlertDescription>
							</Alert>
						)}
					</div>
				)}
			</div>
		</article>
	);
}
