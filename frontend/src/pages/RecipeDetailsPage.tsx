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
import { useI18n } from '@/i18n/I18nContext';
import type { Language } from '@/settings/UserSettingsContext';
import { formatMeasurement } from '@/lib/measurements';
import { RecipeNotesContent } from '@/components/recipe-notes/RecipeNotesContent';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return fallback;
}

function buildRecipeShareText(recipe: RecipeDetail, language: Language): string {
	const ingredients =
		recipe.ingredients
			.map(
				(ingredient) =>
					`- ${ingredient.ingredientName}: ${formatMeasurement(ingredient.quantity, ingredient.unitId, language)}`,
			)
			.join('\n') || '- No ingredients yet.';
	const chefNotes = recipe.notes?.trim() || 'No notes yet.';
	return `${recipe.title}\n\nIngredients:\n${ingredients}\n\nChef's notes:\n${chefNotes}`;
}

export function RecipeDetailsPage() {
	const { language } = useI18n();
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
						shareText={buildRecipeShareText(recipe, language)}
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
					<RecipeNotesContent notes={recipe.notes ?? ''} document={recipe.notesDocument} />
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
