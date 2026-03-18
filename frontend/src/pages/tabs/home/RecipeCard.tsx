import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
	RecipeDetail,
	RecipeSummary,
} from './types';

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
		<article className='flex overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'>
			<div className='relative w-24 shrink-0 sm:w-32'>
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

			<div className='min-w-0 flex-1 space-y-3 p-3'>
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
										onClick={() => setNotesExpanded((v) => !v)}
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
							onClick={() => onToggle(recipe.id)}
							aria-label={isOpen ? 'Collapse recipe' : 'Expand recipe'}>
							{isOpen ? <ChevronUp /> : <ChevronDown />}
						</Button>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='h-9 w-9 sm:h-11 sm:w-11 [&_svg]:!size-3.5 sm:[&_svg]:!size-4'
							onClick={() => onEdit(recipe)}
							aria-label={`Edit ${recipe.title}`}>
							<Pencil />
						</Button>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='h-9 w-9 sm:h-11 sm:w-11 [&_svg]:!size-3.5 sm:[&_svg]:!size-4'
							onClick={() => onDelete(recipe)}
							disabled={deletePending}
							aria-label={`Delete ${recipe.title}`}>
							<Trash2 />
						</Button>
					</div>
				</div>

				{isOpen && (
					<div className='space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700'>
						<p className='text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400'>
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

						{openRecipe?.ingredients.map((ingredient) => (
							<div
								key={ingredient.id}
								className='rounded-lg border border-stone-200 p-2 dark:border-stone-700'>
								<p className='text-sm font-medium text-stone-900 dark:text-stone-100'>
									{ingredient.ingredientName}
								</p>
								<p className='mt-1 text-xs text-stone-500 dark:text-stone-400'>
									{ingredient.quantity} {ingredient.unitId}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</article>
	);
}
