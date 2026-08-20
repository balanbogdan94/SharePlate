import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { RecipesList } from './home/RecipesList';
import type { RecipeSummary } from './home/types';

export function HomeTabPage() {
	const [search, setSearch] = useState('');

	const recipesQuery = useQuery({
		queryKey: ['recipes', 'house'],
		queryFn: () => apiFetch<RecipeSummary[]>('/recipes/house'),
	});

	const filteredRecipes = (recipesQuery.data ?? []).filter((r) =>
		r.title.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<section className="flex h-full flex-col gap-3 p-1 pt-3 sm:p-2 sm:pt-4">
			<div className="flex items-center gap-3 rounded-full border border-green-500 bg-white px-4 py-2.5 shadow-sm dark:border-sp-border dark:bg-sp-search-background dark:focus-within:border-sp-search-focus">
				<Search className="h-4 w-4 shrink-0 text-green-500 dark:text-sp-search-icon" />
				<input
					type="search"
					aria-label="Search your recipes"
					placeholder="Search your recipes..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 outline-none dark:text-sp-search-text dark:placeholder-sp-search-placeholder"
				/>
				<button
					type="button"
					aria-label="Filter recipes"
					className="shrink-0 text-green-500 transition hover:text-green-400 dark:text-sp-search-icon dark:hover:text-sp-icon-primary"
				>
					<SlidersHorizontal className="h-4 w-4" />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto space-y-3 pb-24">
				<RecipesList
					isLoading={recipesQuery.isLoading}
					isError={recipesQuery.isError}
					error={recipesQuery.error}
					totalCount={recipesQuery.data?.length ?? 0}
					filteredRecipes={filteredRecipes}
				/>
			</div>

			<Link to="/recipes/add" aria-label="Add recipe" className="sp-fab-button">
				<Plus className="sp-fab-icon" />
			</Link>
		</section>
	);
}
