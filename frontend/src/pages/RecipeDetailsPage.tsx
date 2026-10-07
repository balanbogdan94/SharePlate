import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CollapsibleSection } from './recipe-details/CollapsibleSection';
import { IngredientsList } from './recipe-details/IngredientsList';
import { RecipeHero } from './recipe-details/RecipeHero';
import { RecipeHeroActions } from './recipe-details/RecipeHeroActions';
import { RecipeMeta } from './recipe-details/RecipeMeta';
import type { RecipeDetail } from '@/pages/tabs/home/types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return fallback;
}

export function RecipeDetailsPage() {
	const { recipeId } = useParams({ from: '/app-layout/recipes/$recipeId' });
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const currentUser = useCurrentUser();
	const [notesOpen, setNotesOpen] = useState(false);
	const [ingredientsOpen, setIngredientsOpen] = useState(true);

	const recipeQuery = useQuery({
		queryKey: ['recipes', 'detail', recipeId],
		queryFn: () => apiFetch<RecipeDetail>(`/recipes/${recipeId}`),
	});

	const deleteRecipeMutation = useMutation({
		mutationFn: () => apiFetch<void>(`/recipes/${recipeId}`, { method: 'DELETE' }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] }),
				queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] }),
				queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', recipeId] }),
			]);
			await navigate({ to: '/recipes', search: { expand: undefined } });
		},
	});

	const onDeleteRecipe = () => {
		const title = recipeQuery.data?.title ?? 'this recipe';
		if (!window.confirm(`Delete recipe "${title}"?`)) return;
		deleteRecipeMutation.reset();
		deleteRecipeMutation.mutate();
	};

	if (recipeQuery.isLoading) {
		return (
			<section className="relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10">
				<p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-secondary">
					Loading recipe...
				</p>
			</section>
		);
	}

	if (recipeQuery.isError || !recipeQuery.data) {
		return (
			<section className="relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10">
				<Alert variant="destructive">
					<AlertTitle>Could not load recipe</AlertTitle>
					<AlertDescription>
						{toErrorMessage(recipeQuery.error, 'Could not load recipe.')}
					</AlertDescription>
				</Alert>
			</section>
		);
	}

	const recipe = recipeQuery.data;
	const actorUserId = currentUser.data?.id ?? null;
	const canManageRecipe =
		Boolean(actorUserId) && actorUserId?.toLowerCase() === recipe.authorId.toLowerCase();

	return (
		<section className="relative mx-auto flex w-full max-w-2xl flex-col pb-24">
			<RecipeHero
				imageUrl={recipe.imageUrl}
				title={recipe.title}
				recipeId={recipeId}
				canEdit={canManageRecipe}
				actions={
					<RecipeHeroActions
						recipeId={recipeId}
						recipeTitle={recipe.title}
						canManage={canManageRecipe}
						isDeleting={deleteRecipeMutation.isPending}
						onDelete={onDeleteRecipe}
					/>
				}
			/>
			<div className="flex flex-col gap-3 px-4 pb-4">
				<RecipeMeta recipe={recipe} />
				{deleteRecipeMutation.isError && (
					<Alert variant="destructive">
						<AlertTitle>Could not delete recipe</AlertTitle>
						<AlertDescription>
							{toErrorMessage(deleteRecipeMutation.error, 'Please try again.')}
						</AlertDescription>
					</Alert>
				)}
				<CollapsibleSection
					title="Chef's notes"
					open={notesOpen}
					onToggle={() => setNotesOpen((o) => !o)}
				>
					<p className="text-sm leading-relaxed text-stone-600 dark:text-sp-text-secondary">
						{recipe.notes?.trim() || 'No notes yet.'}
					</p>
				</CollapsibleSection>
				<CollapsibleSection
					title="Ingredients"
					badge={`${recipe.ingredients.length}`}
					open={ingredientsOpen}
					onToggle={() => setIngredientsOpen((o) => !o)}
				>
					<IngredientsList ingredients={recipe.ingredients} />
				</CollapsibleSection>
			</div>
		</section>
	);
}
