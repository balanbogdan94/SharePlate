import type { RecipeIngredient } from '@/pages/tabs/home/types';

type IngredientsListProps = {
	ingredients: RecipeIngredient[];
};

export function IngredientsList({ ingredients }: IngredientsListProps) {
	if (ingredients.length === 0) {
		return (
			<p className="text-sm text-stone-500 dark:text-sp-text-secondary">No ingredients yet.</p>
		);
	}

	return (
		<ul className="-mx-4 divide-y divide-stone-100 dark:divide-sp-separator">
			{ingredients.map((ing) => (
				<li key={ing.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
					<span className="text-sm text-stone-700 dark:text-sp-text-primary">
						{ing.ingredientName}
					</span>
					<span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-sp-surface-active dark:text-sp-text-secondary">
						{ing.quantity} {ing.unitId}
					</span>
				</li>
			))}
		</ul>
	);
}
