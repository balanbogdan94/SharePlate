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
	'mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-sp-text-tertiary';

type AddRecipeFormProps = { recipeId?: string; initialData?: RecipeDetail };
type IngredientRowProps = { ingredient: IngredientPayload; onRemove: () => void };

function IngredientRow({ ingredient, onRemove }: IngredientRowProps) {
	return (
		<li className="flex items-center justify-between rounded-2xl bg-stone-100 px-4 py-3 dark:bg-sp-surface">
			<span className="text-sm font-medium text-stone-800 dark:text-sp-text-primary">
				{ingredient.quantity} {ingredient.unit} {ingredient.name}
			</span>
			<button
				type="button"
				aria-label={`Remove ${ingredient.name}`}
				onClick={onRemove}
				className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-stone-500 dark:bg-sp-surface-active dark:text-sp-text-secondary"
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
					className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-green-600 dark:text-sp-primary"
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
				className="h-14 rounded-2xl bg-stone-100 dark:bg-sp-surface"
			/>
		</div>
	);
}

function AddRecipeForm({ recipeId, initialData }: AddRecipeFormProps) {
	const s = useAddRecipeForm({ recipeId, initialData });
	return (
		<section className="animate-in fade-in mx-auto flex w-full max-w-2xl flex-col pb-8 duration-500">
			<h1 className="px-4 pb-6 pt-4 text-3xl font-extrabold text-stone-900 dark:text-sp-text-primary">
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
						className="w-full rounded-2xl border-0 bg-stone-100 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:bg-sp-surface dark:text-sp-text-primary dark:placeholder:text-sp-text-tertiary"
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
					className="relative h-14 w-full overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-base font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_-8px_rgba(34,197,94,0.55)] transition hover:brightness-110 active:scale-95 dark:from-sp-primary dark:to-emerald-400 dark:text-sp-text-on-primary dark:shadow-[0_10px_30px_-8px_rgba(48,209,88,0.45)]"
				>
					<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
					<CircleCheck className="mr-2 h-5 w-5" />
					{s.isPending ? 'Saving...' : s.isEditing ? 'Update Recipe' : 'Save Recipe'}
				</Button>
				<button
					type="button"
					onClick={() => void s.discard()}
					className="flex h-14 w-full items-center justify-center rounded-full border border-stone-300 bg-white text-sm font-bold uppercase tracking-wide text-stone-600 shadow-sm transition hover:bg-stone-100 active:scale-95 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-secondary dark:hover:bg-sp-surface-hover"
				>
					<X className="mr-2 h-4 w-4" />
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
				<p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-secondary">
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
