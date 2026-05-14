import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api';
import { RecipeCard } from './home/RecipeCard';
import type { RecipeSummary } from './home/types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

export function HomeTabPage() {
	const [search, setSearch] = useState('');

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'house'],
		queryFn: () => apiFetch<RecipeSummary[]>('/api/recipes/house'),
	});

	const filteredRecipes = (recipesQuery.data ?? []).filter((r) =>
		r.title.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<section className="relative h-full w-full space-y-3 p-1 pb-24 sm:p-2">
			<div className="flex items-center gap-3 rounded-full border border-green-500 bg-white px-4 py-2.5 shadow-sm dark:bg-stone-900">
				<svg
					className="h-4 w-4 shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
					/>
				</svg>
				<input
					type="search"
					placeholder="Search your recipes..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 outline-none dark:text-stone-100 dark:placeholder-stone-500"
				/>
				<button
					type="button"
					aria-label="Filter recipes"
					className="shrink-0 text-green-500 transition hover:text-green-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						className="h-4 w-4"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 5h4m6 0h8M3 12h8m6 0h2M3 19h4m6 0h8"
						/>
					</svg>
				</button>
			</div>

			{recipesQuery.isLoading && (
				<p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
					Loading recipes...
				</p>
			)}

			{recipesQuery.isError && (
				<Alert variant="destructive">
					<AlertTitle>Could not load recipes</AlertTitle>
					<AlertDescription>
						{toErrorMessage(recipesQuery.error, 'Please try again.')}
					</AlertDescription>
				</Alert>
			)}

			{!recipesQuery.isLoading && !recipesQuery.isError && recipesQuery.data?.length === 0 && (
				<p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
					You have no recipes yet. Tap + to add one.
				</p>
			)}

			{!recipesQuery.isLoading &&
				!recipesQuery.isError &&
				(recipesQuery.data?.length ?? 0) > 0 &&
				filteredRecipes.length === 0 && (
					<p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
						No recipes match your search.
					</p>
				)}

			<div className="space-y-3">
				{filteredRecipes.map((recipe) => (
					<RecipeCard key={recipe.id} recipe={recipe} />
				))}
			</div>

			<Link
				to="/recipes/add"
				className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl font-bold text-white shadow-lg transition hover:bg-green-600 active:scale-95"
			>
				+
			</Link>
		</section>
	);
}
