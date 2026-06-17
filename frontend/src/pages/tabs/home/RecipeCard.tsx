import { Link } from '@tanstack/react-router';
import { Avatar } from '@/components/ui/avatar';
import type { RecipeSummary } from './types';

type RecipeCardProps = {
	recipe: RecipeSummary;
};

export function RecipeCard({ recipe }: RecipeCardProps) {
	return (
		<article className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800/80 dark:bg-stone-900">
			<Link
				to="/recipes/$recipeId"
				params={{ recipeId: recipe.id }}
				className="flex min-w-0 transition active:scale-[0.997]"
			>
				<div className="relative h-[6.5rem] w-[6.5rem] shrink-0 sm:h-32 sm:w-32">
					{recipe.imageUrl ? (
						<img
							src={recipe.imageUrl}
							alt={recipe.title}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="h-full w-full bg-stone-200 dark:bg-stone-700" />
					)}
					<div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-white dark:to-stone-900" />
				</div>

				<div className="min-w-0 flex-1 px-3 py-3">
					<p className="line-clamp-2 text-base font-bold leading-snug text-stone-900 dark:text-stone-100">
						{recipe.title}
					</p>
					<p className="mt-0.5 flex items-center gap-1 text-xs italic text-stone-500 dark:text-stone-400">
						<Avatar
							name={recipe.authorName}
							photoUrl={recipe.authorAvatarUrl}
							className="h-4 w-4"
							fallbackClassName="bg-stone-200 text-[8px] text-stone-600 dark:bg-stone-700 dark:text-stone-300"
						/>
						{recipe.authorName}
					</p>
					{recipe.notes && (
						<p className="mt-1.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
							{recipe.notes}
						</p>
					)}
				</div>
			</Link>
		</article>
	);
}

