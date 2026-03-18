import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RecipeDetail, RecipeSummary } from './types';

type RecipeCardProps = {
	recipe: RecipeSummary;
	isOpen: boolean;
	onToggle: (id: string) => void;
	onEdit: (recipe: RecipeSummary) => void;
	onDelete: (recipe: RecipeSummary) => void;
	deletePending: boolean;
	openRecipe: RecipeDetail | null;
	openRecipeLoading: boolean;
	openRecipeErrorMessage: string | null;
};

export function RecipeCard({
	recipe,
	isOpen,
	onToggle,
	onEdit,
	onDelete,
	deletePending,
	openRecipe,
	openRecipeLoading,
	openRecipeErrorMessage,
}: RecipeCardProps) {
	const [notesExpanded, setNotesExpanded] = useState(false);
	const [isClamped, setIsClamped] = useState(false);
	const notesRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		const el = notesRef.current;
		if (!el) return;
		el.classList.remove('line-clamp-2');
		const fullHeight = el.scrollHeight;
		el.classList.add('line-clamp-2');
		setIsClamped(fullHeight > el.clientHeight);
	}, [recipe.notes]);

	return (
		<article
			className='cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'
			onClick={() => onToggle(recipe.id)}>
			<div className='flex'>
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
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0 flex-1'>
							<p className='line-clamp-2 text-sm font-semibold leading-tight text-stone-900 dark:text-stone-100'>
								{recipe.title}
							</p>
							<p className='mt-0.5 text-[11px] text-stone-500 dark:text-stone-400'>
								{recipe.authorName}
							</p>
							{recipe.notes && (
								<div className='mt-1'>
									<p
										ref={notesRef}
										className={`text-xs text-stone-500 dark:text-stone-400${notesExpanded ? '' : ' line-clamp-2'}`}>
										{recipe.notes}
									</p>
									{isClamped && (
										<button
											type='button'
											onClick={(e) => {
												e.stopPropagation();
												setNotesExpanded((v) => !v);
											}}
											className='mt-0.5 text-[11px] text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300'>
											{notesExpanded ? 'Show less' : 'Show more'}
										</button>
									)}
								</div>
							)}
						</div>

						<div className='flex items-center gap-0.5 sm:gap-1'>
							<Button
								type='button'
								variant='outline'
								size='icon'
								className='h-9 w-9 sm:h-11 sm:w-11 [&_svg]:!size-3.5 sm:[&_svg]:!size-4'
								onClick={(e) => {
									e.stopPropagation();
									onEdit(recipe);
								}}
								aria-label={`Edit ${recipe.title}`}>
								<Pencil />
							</Button>
							<Button
								type='button'
								variant='outline'
								size='icon'
								className='h-9 w-9 sm:h-11 sm:w-11 [&_svg]:!size-3.5 sm:[&_svg]:!size-4'
								onClick={(e) => {
									e.stopPropagation();
									onDelete(recipe);
								}}
								disabled={deletePending}
								aria-label={`Delete ${recipe.title}`}>
								<Trash2 />
							</Button>
						</div>
					</div>
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
