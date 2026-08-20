import { Link } from '@tanstack/react-router';
import { ChevronRight, UtensilsCrossed } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { RecipeSummary } from './types';

type RecipeCardProps = {
	recipe: RecipeSummary;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
	return (
		<Link
			to="/recipes/$recipeId"
			params={{ recipeId: recipe.id }}
			className="h-20 grid grid-cols-[25%_1fr_auto] align-middle transition active:scale-[0.9] active:bg-sp-card-background-hover overflow-hidden rounded-2xl border border-sp-card-border bg-sp-card-background shadow-sp-card"
		>
			<div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_58%,transparent_100%)]">
				{recipe.imageUrl ? (
					<img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-sp-primary-subtle">
						<UtensilsCrossed className="h-6 w-6 text-sp-primary" />
					</div>
				)}
			</div>

			<div className="min-w-0 flex-1 flex flex-col gap-4 px-3 py-3">
				<p className="line-clamp-2 text-base font-bold leading-snug text-sp-text-primary">
					{recipe.title}
				</p>
				<p className="mt-0.5 flex items-center gap-1 text-xs italic text-sp-text-secondary">
					<Avatar
						name={recipe.authorName}
						photoUrl={recipe.authorAvatarUrl}
						className="h-4 w-4"
						fallbackClassName="text-[8px] bg-sp-surface-active text-sp-text-secondary"
					/>
					{recipe.authorName}
				</p>
			</div>

			<ChevronRight className="mr-3 h-full w-4 shrink-0 text-sp-text-tertiary" />
		</Link>
	);
}
