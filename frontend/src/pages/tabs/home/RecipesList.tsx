import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RecipeCard } from './RecipeCard';
import type { RecipeSummary } from './types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

type RecipesListProps = {
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	totalCount: number;
	filteredRecipes: RecipeSummary[];
};

const messageClassName =
	'rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-secondary';

export function RecipesList({
	isLoading,
	isError,
	error,
	totalCount,
	filteredRecipes,
}: RecipesListProps) {
	if (isLoading) {
		return <p className={messageClassName}>Loading recipes...</p>;
	}

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertTitle>Could not load recipes</AlertTitle>
				<AlertDescription>{toErrorMessage(error, 'Please try again.')}</AlertDescription>
			</Alert>
		);
	}

	if (totalCount === 0) {
		return <p className={messageClassName}>You have no recipes yet. Tap + to add one.</p>;
	}

	if (filteredRecipes.length === 0) {
		return <p className={messageClassName}>No recipes match your search.</p>;
	}

	return (
		<div className="space-y-3">
			{filteredRecipes.map((recipe) => (
				<RecipeCard key={recipe.id} recipe={recipe} />
			))}
		</div>
	);
}
