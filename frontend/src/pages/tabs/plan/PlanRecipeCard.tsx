import { useNavigate } from '@tanstack/react-router';
import type { RecipeSummary } from '@/pages/tabs/home/types';

type Props = {
	recipeId: string;
	recipe: RecipeSummary | undefined;
};

export function PlanRecipeCard({ recipeId, recipe }: Props) {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => void navigate({ to: '/recipes/$recipeId', params: { recipeId } })}
			className="flex w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1e2025] text-left transition hover:border-white/20 hover:bg-[#252830]"
		>
			<div className="h-20 w-24 shrink-0 bg-black/30">
				{recipe?.imageUrl ? (
					<img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center text-xl font-bold text-[#7f848b]">
						{(recipe?.title ?? recipeId).slice(0, 1)}
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1 px-3 py-3">
				<p className="line-clamp-2 text-base font-bold leading-tight text-white">
					{recipe?.title ?? recipeId}
				</p>
				{recipe?.authorName && (
					<p className="mt-0.5 text-sm italic text-stone-400">{recipe.authorName}</p>
				)}
			</div>
		</button>
	);
}
