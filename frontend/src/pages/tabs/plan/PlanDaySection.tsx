import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import { CATEGORY_TYPES, type CategoryType, type PlanDay } from '@/pages/tabs/plan/types';
import { countDayRecipes } from '@/pages/tabs/plan/planUtils';
import { PlanRecipeCard } from '@/pages/tabs/plan/PlanRecipeCard';

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
				<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7f858f]">
					{categoryType}
				</p>
			)}
			{recipeIds.map((recipeId, idx) => (
				<PlanRecipeCard
					key={`${recipeId}-${idx}`}
					recipeId={recipeId}
					recipe={recipeMap.get(recipeId)}
				/>
			))}
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

export function PlanDaySection({
	day,
	isExpanded,
	onToggle,
	recipeMap,
	canAddRecipe = false,
	planId,
}: Props) {
	const navigate = useNavigate();
	const totalRecipes = countDayRecipes(day);
	const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
		new Date(`${day.date}T00:00:00`),
	);

	return (
		<div className="border-b border-white/10 last:border-0">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between py-4 text-left"
			>
				<p className="text-xl font-bold text-white">{dayLabel}</p>
				{isExpanded ? (
					<ChevronUp className="h-5 w-5 shrink-0 text-[#8a9098]" />
				) : (
					<ChevronDown className="h-5 w-5 shrink-0 text-[#8a9098]" />
				)}
			</button>
			{isExpanded && (
				<div className="space-y-3 pb-4">
					{CATEGORY_TYPES.map((cat) => (
						<CategorySection
							key={cat}
							categoryType={cat}
							recipeIds={day.categories[cat]}
							recipeMap={recipeMap}
						/>
					))}
					{canAddRecipe && totalRecipes === 0 && (
						<button
							type="button"
							onClick={() => void navigate({ to: '/plans/$planId/edit', params: { planId } })}
							className="min-h-11 rounded-full border border-white/10 bg-[#2b3034] px-4 py-2 text-sm font-semibold text-[#7ce485]"
						>
							+ Add Recipe
						</button>
					)}
				</div>
			)}
		</div>
	);
}
