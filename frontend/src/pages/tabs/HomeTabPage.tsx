import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api';
import { RecipeCard } from './home/RecipeCard';
import type {
	RecipeDetail,
	RecipeSummary,
} from './home/types';

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

	return (
		<section className='h-full w-full space-y-3 rounded-2xl border border-stone-200/70 bg-white/40 p-3 pb-24 dark:border-stone-700/70 dark:bg-stone-900/40 sm:p-4'>
			<div className='flex items-center justify-between'>
				<h1 className='text-base font-semibold text-stone-900 dark:text-stone-100'>
					My recipes
				</h1>
				<div className='flex items-center gap-2'>
					<Link
						to='/recipes/add'
						className='inline-flex h-10 items-center rounded-full border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50'>
						Add Recipe
					</Link>
				</div>
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

			<div className='space-y-3'>
				{recipesQuery.data?.map((recipe) => {
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
		</section>
	);
}
