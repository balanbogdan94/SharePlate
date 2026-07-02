import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { CircleCheck, CirclePlus, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePickerField } from '@/pages/tabs/home/ImagePickerField';
import { apiFetch } from '@/lib/api';
import type { IngredientPayload, RecipeDetail } from '@/pages/tabs/home/types';
import { AddRecipeIngredientModal } from './AddRecipeIngredientModal';
import { useAddRecipeForm } from './useAddRecipeForm';

const LABEL_CLS =
	'mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400';

type AddRecipeFormProps = { recipeId?: string; initialData?: RecipeDetail };
type IngredientRowProps = { ingredient: IngredientPayload; onRemove: () => void };

function IngredientRow({ ingredient, onRemove }: IngredientRowProps) {
	return (
		<li className="flex items-center justify-between rounded-2xl bg-stone-100 px-4 py-3 dark:bg-stone-800/50">
			<span className="text-sm font-medium text-stone-800 dark:text-stone-100">
				{ingredient.quantity} {ingredient.unit} {ingredient.name}
			</span>
			<button
				type="button"
				aria-label={`Remove ${ingredient.name}`}
				onClick={onRemove}
				className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
			>
				<X className="h-4 w-4" />
			</button>
		</li>
	);
}

type IngredientsSectionProps = {
	ingredients: IngredientPayload[];
	error: string | null;
	onAdd: () => void;
	onRemove: (index: number) => void;
};

function IngredientsSection({ ingredients, error, onAdd, onRemove }: IngredientsSectionProps) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<p className={LABEL_CLS}>Ingredients</p>
				<button
					type="button"
					onClick={onAdd}
					className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400"
				>
					<CirclePlus className="h-4 w-4" />
					Add Ingredient
				</button>
			</div>
			{error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
			<ul className="space-y-2">
				{ingredients.map((ing, i) => (
					<IngredientRow key={`${ing.name}-${i}`} ingredient={ing} onRemove={() => onRemove(i)} />
				))}
			</ul>
		</div>
	);
}

type TitleSectionProps = {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function TitleSection({ value, onChange }: TitleSectionProps) {
	return (
		<div>
			<p className={LABEL_CLS}>Recipe Title</p>
			<Input
				id="recipe-title"
				aria-label="Recipe title"
				value={value}
				required
				placeholder="e.g. Grandma's Secret Pasta"
				onChange={onChange}
				className="h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/50"
			/>
		</div>
	);
}

function AddRecipeForm({ recipeId, initialData }: AddRecipeFormProps) {
	const s = useAddRecipeForm({ recipeId, initialData });
	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col pb-24">
			<h1 className="px-4 pb-6 pt-4 text-3xl font-extrabold text-stone-900 dark:text-stone-100">
				{s.isEditing ? 'Edit Recipe' : 'Add Recipe'}
			</h1>
			<form onSubmit={s.handleSubmit} className="flex flex-col gap-6 px-4">
				<div>
					<p className={LABEL_CLS}>Recipe Cover</p>
					<ImagePickerField
						id="recipe-image"
						value={s.form.imageUrl}
						onChange={(url) => s.setForm((p) => ({ ...p, imageUrl: url }))}
						onFileChange={s.setImageFile}
					/>
				</div>
				<TitleSection
					value={s.form.title}
					onChange={(e) => s.setForm((p) => ({ ...p, title: e.target.value }))}
				/>
				<IngredientsSection
					ingredients={s.ingredients}
					error={s.ingredientsError}
					onAdd={s.openModal}
					onRemove={s.removeIngredient}
				/>
				<div>
					<p className={LABEL_CLS}>Chef&apos;s Notes</p>
					<textarea
						id="recipe-notes"
						aria-label="Chef's notes"
						value={s.form.notes}
						rows={4}
						placeholder="Any special tips or instructions..."
						onChange={(e) => s.setForm((p) => ({ ...p, notes: e.target.value }))}
						className="w-full rounded-2xl border-0 bg-stone-100 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:bg-stone-800/50 dark:text-stone-100"
					/>
				</div>
				{s.submitError && (
					<Alert variant="destructive">
						<AlertTitle>Could not save recipe</AlertTitle>
						<AlertDescription>{s.submitError}</AlertDescription>
					</Alert>
				)}
				<Button
					type="submit"
					disabled={s.isSaveDisabled}
					className="h-14 w-full rounded-full bg-green-600 text-base font-bold uppercase tracking-wide text-white hover:bg-green-700"
				>
					<CircleCheck className="mr-2 h-5 w-5" />
					{s.isPending ? 'Saving...' : s.isEditing ? 'Update Recipe' : 'Save Recipe'}
				</Button>
				<button
					type="button"
					onClick={() => void s.discard()}
					className="h-11 w-full rounded-full text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
				>
					Discard
				</button>
			</form>
			<AddRecipeIngredientModal
				isOpen={s.isModalOpen}
				draft={s.draft}
				units={s.units}
				defaultUnit={s.defaultUnit}
				isDraftValid={s.isDraftValid}
				onClose={s.closeModal}
				onAdd={s.addIngredient}
				onChange={s.setDraft}
			/>
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
		queryFn: () => apiFetch<RecipeDetail>(`/recipes/${recipeId}`),
	});
	if (isEditing && recipeDetailQuery.isLoading) {
		return (
			<section className="mx-auto w-full max-w-2xl px-4 pt-4">
				<p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
					Loading recipe...
				</p>
			</section>
		);
	}
	if (isEditing && recipeDetailQuery.isError) {
		return (
			<section className="mx-auto w-full max-w-2xl px-4 pt-4">
				<Alert variant="destructive">
					<AlertTitle>Could not load recipe</AlertTitle>
					<AlertDescription>{String(recipeDetailQuery.error)}</AlertDescription>
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
