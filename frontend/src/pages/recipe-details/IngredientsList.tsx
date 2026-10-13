import type { RecipeIngredient } from '@/pages/tabs/home/types';
import { useI18n } from '@/i18n/I18nContext';
import { formatMeasurement } from '@/lib/measurements';

type IngredientsListProps = {
	ingredients: RecipeIngredient[];
};

export function IngredientsList({ ingredients }: IngredientsListProps) {
	const { language } = useI18n();
	if (ingredients.length === 0) {
		return (
			<p className="text-sm text-stone-500 dark:text-sp-text-secondary">No ingredients yet.</p>
		);
	}

	return (
		<ul className="-mx-4 divide-y divide-stone-100 dark:divide-sp-separator">
			{ingredients.map((ing) => (
				<li key={ing.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
					<span className="min-w-0 text-sm wrap-break-word text-stone-700 dark:text-sp-text-primary">
						{ing.ingredientName}
					</span>
					<span className="max-w-[60%] rounded-full bg-stone-100 px-2.5 py-0.5 text-right text-xs font-medium tabular-nums text-stone-600 dark:bg-sp-surface-active dark:text-sp-text-secondary">
						{formatMeasurement(ing.quantity, ing.unitId, language)}
					</span>
				</li>
			))}
		</ul>
	);
}
