import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePickerField } from './ImagePickerField';
import type {
	FormState,
	IngredientFormState,
	IngredientPayload,
	IngredientSearchItem,
	Unit,
	UnitType,
} from './types';

type CreateRecipeFormProps = {
	form: FormState;
	setForm: React.Dispatch<React.SetStateAction<FormState>>;
	onImageFileChange: (file: File | null) => void;
	ingredientForm: IngredientFormState;
	setIngredientForm: React.Dispatch<React.SetStateAction<IngredientFormState>>;
	ingredients: IngredientPayload[];
	ingredientsError: string | null;
	ingredientSearchResults: IngredientSearchItem[] | undefined;
	units: Unit[] | undefined;
	defaultUnit: UnitType;
	onQueueIngredient: () => void;
	onRemoveIngredient: (index: number) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
	isPending: boolean;
	errorMessage: string | null;
};

export function CreateRecipeForm({
	form,
	setForm,
	onImageFileChange,
	ingredientForm,
	setIngredientForm,
	ingredients,
	ingredientsError,
	ingredientSearchResults,
	units,
	defaultUnit,
	onQueueIngredient,
	onRemoveIngredient,
	onSubmit,
	isPending,
	errorMessage,
}: CreateRecipeFormProps) {
	return (
		<form
			onSubmit={onSubmit}
			className='space-y-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900'>
			<div className='space-y-2'>
				<Label htmlFor='new-recipe-name'>title</Label>
				<Input
					id='new-recipe-name'
					value={form.title}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, title: event.target.value }))
					}
					minLength={2}
					maxLength={200}
					required
				/>
			</div>
			<div className='space-y-2'>
				<Label htmlFor='new-recipe-description'>notes</Label>
				<Input
					id='new-recipe-description'
					value={form.notes}
					onChange={(event) =>
						setForm((prev) => ({
							...prev,
							notes: event.target.value,
						}))
					}
				/>
			</div>
			<ImagePickerField
				id='new-recipe-image'
				label='Image'
				value={form.imageUrl}
				onChange={(imageUrl) =>
					setForm((prev) => ({
						...prev,
						imageUrl,
					}))
				}
				onFileChange={onImageFileChange}
			/>
			<Button type='submit' className='w-full' disabled={isPending}>
				{isPending ? 'Saving...' : 'Create recipe'}
			</Button>

			<div className='space-y-2 rounded-lg border border-dashed border-stone-300 p-3 dark:border-stone-600'>
				<p className='text-xs font-medium text-stone-500 dark:text-stone-400'>
					ingredients
				</p>
				<div className='space-y-2'>
					<Input
						placeholder='ingredientName'
						value={ingredientForm.ingredientName}
						onChange={(event) =>
							setIngredientForm((prev) => ({
								...prev,
								ingredientName: event.target.value,
							}))
						}
						minLength={2}
						maxLength={200}
					/>
					{ingredientSearchResults && ingredientSearchResults.length > 0 && (
						<div className='rounded-md border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60'>
							{ingredientSearchResults.slice(0, 5).map((item) => (
								<button
									key={item.id}
									type='button'
									onClick={() =>
										setIngredientForm((prev) => ({
											...prev,
											ingredientName: item.name,
											unitId: item.defaultUnitId,
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
					<div className='grid grid-cols-[1fr_1fr_auto] gap-2'>
						<Input
							type='number'
							min='0.001'
							step='0.001'
							placeholder='quantity'
							value={ingredientForm.quantity}
							onChange={(event) =>
								setIngredientForm((prev) => ({
									...prev,
									quantity: event.target.value,
								}))
							}
						/>
						<select
							value={ingredientForm.unitId}
							onChange={(event) =>
								setIngredientForm((prev) => ({
									...prev,
									unitId: event.target.value as UnitType,
								}))
							}
							className='h-11 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100'>
							{units?.map((unit) => (
								<option key={unit.id} value={unit.id}>
									{unit.name}
								</option>
							)) ?? <option value={defaultUnit}>{defaultUnit}</option>}
						</select>
						<Button type='button' variant='outline' onClick={onQueueIngredient}>
							Add
						</Button>
					</div>
				</div>

				{ingredients.length > 0 && (
					<div className='space-y-2'>
						{ingredients.map((ingredient, index) => (
							<div
								key={`${ingredient.name}-${ingredient.unit}-${index}`}
								className='flex items-center justify-between rounded border border-stone-200 px-2 py-2 text-xs dark:border-stone-700'>
								<span>
									{ingredient.name} - {ingredient.quantity} {ingredient.unit}
								</span>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => onRemoveIngredient(index)}>
									Remove
								</Button>
							</div>
						))}
					</div>
				)}

				{ingredientsError && (
					<p className='text-xs text-red-600 dark:text-red-400'>
						{ingredientsError}
					</p>
				)}
			</div>

			{errorMessage && (
				<Alert variant='destructive'>
					<AlertTitle>Create failed</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}
		</form>
	);
}
