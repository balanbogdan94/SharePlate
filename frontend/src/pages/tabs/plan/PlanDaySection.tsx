import { ChevronDown } from 'lucide-react';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import { CATEGORY_TYPES, type CategoryType, type PlanDay } from '@/pages/tabs/plan/types';
import { countDayRecipes } from '@/pages/tabs/plan/planUtils';
import { cn } from '@/lib/utils';
import { RecipeCard } from '../home/RecipeCard';

type CategorySectionProps = {
	categoryType: CategoryType;
	recipeIds: string[];
	recipeMap: Map<string, RecipeSummary>;
};

function CategorySection({ categoryType, recipeIds, recipeMap }: CategorySectionProps) {
	if (recipeIds.length === 0) return null;
	return (
		<div className="space-y-2">
			{categoryType !== 'Unnamed' && (
				<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-sp-text-tertiary">
					{categoryType}
				</p>
			)}
			{recipeIds.map((recipeId, idx) => {
				const currentRecipe = recipeMap.get(recipeId);
				return currentRecipe ? (
					<RecipeCard key={`${recipeId}-${idx}`} recipe={currentRecipe} />
				) : (
					<></>
				);
			})}
		</div>
	);
}

type Props = {
	day: PlanDay;
	isExpanded: boolean;
	onToggle: () => void;
	recipeMap: Map<string, RecipeSummary>;
	canAddRecipe?: boolean;
	planId: string;
};

export function PlanDaySection({ day, isExpanded, onToggle, recipeMap }: Props) {
	const totalRecipes = countDayRecipes(day);
	const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
		new Date(`${day.date}T00:00:00`),
	);
	const isEmpty = totalRecipes === 0;

	return (
		<div>
			{isEmpty ? (
				<p className="py-4 text-base font-semibold text-stone-300 dark:text-sp-text-tertiary">
					{dayLabel}
				</p>
			) : (
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={isExpanded}
					className="flex w-full items-center justify-between py-4 text-left"
				>
					<span className="flex items-center gap-2">
						<span className="text-base font-bold text-stone-900 dark:text-sp-text-primary">
							{dayLabel}
						</span>
						<span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-sp-primary-subtle dark:text-sp-primary">
							{totalRecipes}
						</span>
					</span>
					<ChevronDown
						className={cn(
							'h-5 w-5 shrink-0 text-stone-400 transition-transform duration-300 dark:text-sp-icon-secondary',
							isExpanded && 'rotate-180',
						)}
					/>
				</button>
			)}
			{(isEmpty || isExpanded) && (
				<div className="space-y-3 pb-4">
					{CATEGORY_TYPES.map((cat) => (
						<CategorySection
							key={cat}
							categoryType={cat}
							recipeIds={day.categories[cat]}
							recipeMap={recipeMap}
						/>
					))}
				</div>
			)}
		</div>
	);
}
