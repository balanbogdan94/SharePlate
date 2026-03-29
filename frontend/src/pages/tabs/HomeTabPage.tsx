import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api';
import { RecipeCard } from './home/RecipeCard';
import type { RecipeDetail, RecipeSummary } from './home/types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

export function HomeTabPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
	const [search, setSearch] = useState('');

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'my'],
		queryFn: () => apiFetch<RecipeSummary[]>('/api/recipes/my'),
	});

	const openRecipeQuery = useQuery({
		queryKey: ['recipes', 'detail', openRecipeId],
		enabled: Boolean(openRecipeId),
		queryFn: () => apiFetch<RecipeDetail>(`/api/recipes/${openRecipeId}`),
	});

	const deleteRecipeMutation = useMutation({
		mutationFn: (id: string) =>
			apiFetch<void>(`/api/recipes/${id}`, {
				method: 'DELETE',
			}),
		onSuccess: (_, id) => {
			if (openRecipeId === id) {
				setOpenRecipeId(null);
			}

			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] });
		},
	});

	const currentOpenRecipe =
		openRecipeId && openRecipeQuery.data?.id === openRecipeId
			? openRecipeQuery.data
			: null;

	const onEditRecipe = (recipe: RecipeSummary) => {
		void navigate({
			to: '/recipes/$recipeId/edit',
			params: { recipeId: recipe.id },
		});
	};

	const onDeleteRecipe = (recipe: RecipeSummary) => {
		if (!window.confirm(`Delete recipe "${recipe.title}"?`)) {
			return;
		}

		deleteRecipeMutation.reset();
		deleteRecipeMutation.mutate(recipe.id);
	};

	const onToggleRecipe = (id: string) => {
		setOpenRecipeId((prev) => (prev === id ? null : id));
	};
	const openRecipeErrorMessage = openRecipeQuery.isError
		? toErrorMessage(openRecipeQuery.error, 'Could not load recipe details.')
		: null;

	const filteredRecipes = (recipesQuery.data ?? []).filter((r) =>
		r.title.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<section className='relative h-full w-full space-y-3 rounded-2xl border border-stone-200/70 bg-white/40 p-3 pb-24 dark:border-stone-700/70 dark:bg-stone-900/40 sm:p-4'>
			<div className='flex items-center gap-2'>
				<div className='relative flex-1'>
					<svg
						className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400'
						xmlns='http://www.w3.org/2000/svg'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
						strokeWidth={2}>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z'
						/>
					</svg>
					<input
						type='search'
						placeholder='Search recipes…'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='w-full rounded-full border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm text-stone-900 placeholder-stone-400 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-sky-500 dark:focus:ring-sky-900'
					/>
				</div>
				<button
					type='button'
					aria-label='Filter recipes'
					className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						fill='none'
						viewBox='0 0 24 24'
						stroke='currentColor'
						strokeWidth={2}
						className='h-4 w-4'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M4 6h16M7 12h10M10 18h4'
						/>
					</svg>
				</button>
			</div>

			{recipesQuery.isLoading && (
				<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
					Loading recipes...
				</p>
			)}

			{recipesQuery.isError && (
				<Alert variant='destructive'>
					<AlertTitle>Could not load recipes</AlertTitle>
					<AlertDescription>
						{toErrorMessage(recipesQuery.error, 'Please try again.')}
					</AlertDescription>
				</Alert>
			)}

			{!recipesQuery.isLoading &&
				!recipesQuery.isError &&
				recipesQuery.data?.length === 0 && (
					<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
						You have no recipes yet. Tap + to add one.
					</p>
				)}

			{!recipesQuery.isLoading &&
				!recipesQuery.isError &&
				(recipesQuery.data?.length ?? 0) > 0 &&
				filteredRecipes.length === 0 && (
					<p className='rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
						No recipes match your search.
					</p>
				)}

			<div className='space-y-3'>
				{filteredRecipes.map((recipe) => {
					const isOpen = openRecipeId === recipe.id;

					return (
						<RecipeCard
							key={recipe.id}
							recipe={recipe}
							isOpen={isOpen}
							onToggle={onToggleRecipe}
							onEdit={onEditRecipe}
							onDelete={onDeleteRecipe}
							deletePending={deleteRecipeMutation.isPending}
							openRecipe={isOpen ? currentOpenRecipe : null}
							openRecipeLoading={openRecipeQuery.isLoading && isOpen}
							openRecipeErrorMessage={isOpen ? openRecipeErrorMessage : null}
						/>
					);
				})}
			</div>

			<Link
				to='/recipes/add'
				className='fixed bottom-24 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-2xl font-bold text-white shadow-lg transition hover:bg-sky-700 active:scale-95'>
				+
			</Link>
		</section>
	);
}
