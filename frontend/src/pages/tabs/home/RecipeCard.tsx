import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RecipeDetail, RecipeSummary } from './types';

type RecipeCardProps = {
	recipe: RecipeSummary;
	isOpen: boolean;
	onToggle: (id: string) => void;
	openRecipe: RecipeDetail | null;
	openRecipeLoading: boolean;
	openRecipeErrorMessage: string | null;
};

export function RecipeCard({
	recipe,
	isOpen,
	onToggle,
	openRecipe,
	openRecipeLoading,
	openRecipeErrorMessage,
}: RecipeCardProps) {
	return (
		<article className='overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'>
			<div className='flex min-w-0'>
				<Link
					to='/recipes/$recipeId'
					params={{ recipeId: recipe.id }}
					className='flex min-w-0 flex-1 transition active:scale-[0.997]'>
					<div className='relative h-24 w-24 shrink-0 self-start sm:h-32 sm:w-32'>
						{recipe.imageUrl ? (
							<img
								src={recipe.imageUrl}
								alt={recipe.title}
								className='absolute inset-0 h-full w-full object-cover'
							/>
						) : (
							<div className='absolute inset-0 bg-stone-100 dark:bg-stone-800' />
						)}
						<div className='pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-white sm:w-14 dark:to-stone-900' />
					</div>

					<div className='min-w-0 flex-1 p-3'>
						<p className='line-clamp-2 text-sm font-semibold leading-tight text-stone-900 dark:text-stone-100'>
							{recipe.title}
						</p>
						<p className='mt-0.5 text-[11px] text-stone-500 dark:text-stone-400'>
							{recipe.authorName}
						</p>
						{recipe.notes && (
							<p className='mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400'>
								{recipe.notes}
							</p>
						)}
					</div>
				</Link>

				<div className='flex shrink-0 items-center border-l border-stone-200/70 px-2 dark:border-stone-700/70'>
					<button
						type='button'
						onClick={() => onToggle(recipe.id)}
						aria-expanded={isOpen}
						aria-label={
							isOpen
								? `Collapse ingredients for ${recipe.title}`
								: `Expand ingredients for ${recipe.title}`
						}
						className='inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800'>
						{isOpen ? (
							<ChevronUp className='h-4 w-4' />
						) : (
							<ChevronDown className='h-4 w-4' />
						)}
					</button>
				</div>
			</div>

			<div
				className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
				<div className='overflow-hidden'>
					<div className='border-t border-stone-200 dark:border-stone-700'>
						<div className='px-4 py-3'>
							<p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500'>
								Ingredients
							</p>

							{openRecipeLoading && (
								<p className='text-sm text-stone-500 dark:text-stone-400'>
									Loading ingredients...
								</p>
							)}

							{openRecipeErrorMessage && (
								<Alert variant='destructive'>
									<AlertDescription>{openRecipeErrorMessage}</AlertDescription>
								</Alert>
							)}

							{openRecipe && openRecipe.ingredients.length === 0 && (
								<p className='text-sm text-stone-500 dark:text-stone-400'>
									No ingredients yet.
								</p>
							)}

							{openRecipe && openRecipe.ingredients.length > 0 && (
								<ul className='divide-y divide-stone-100 dark:divide-stone-800'>
									{openRecipe.ingredients.map((ingredient) => (
										<li
											key={ingredient.id}
											className='flex items-center justify-between py-2'>
											<span className='text-sm text-stone-800 dark:text-stone-200'>
												{ingredient.ingredientName}
											</span>
											<span className='ml-4 shrink-0 text-sm font-medium text-stone-500 dark:text-stone-400'>
												{ingredient.quantity} {ingredient.unitId}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
