import { Avatar } from '@/components/ui/avatar';
import type { RecipeDetail } from '@/pages/tabs/home/types';

type RecipeMetaProps = {
	recipe: RecipeDetail;
};

export function RecipeMeta({ recipe }: RecipeMetaProps) {
	return (
		<div className="animate-in fade-in slide-in-from-bottom-3 flex flex-col gap-3 pt-5 duration-500">
			{(recipe.categories?.length ?? 0) > 0 && (
				<div className="flex flex-wrap gap-2">
					{recipe.categories?.map((cat) => (
						<span
							key={cat}
							className="rounded-full bg-green-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-700 dark:bg-sp-primary-subtle dark:text-sp-primary"
						>
							{cat}
						</span>
					))}
				</div>
			)}
			<div className="flex items-center justify-between gap-3">
				<h1 className="min-w-0 flex-1 text-[1.75rem] font-extrabold leading-tight tracking-tight text-stone-900 dark:text-sp-text-primary">
					{recipe.title}
				</h1>
				<div className="flex shrink-0 items-center gap-2">
					<Avatar
						name={recipe.authorName}
						photoUrl={recipe.authorAvatarUrl}
						className="h-6 w-6"
						fallbackClassName="bg-stone-200 text-[10px] text-stone-600 dark:bg-sp-surface-active dark:text-sp-text-secondary"
					/>
					<p className="text-sm text-stone-500 dark:text-sp-text-secondary">{recipe.authorName}</p>
				</div>
			</div>
		</div>
	);
}
