import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { RecipeDetail } from '@/pages/tabs/home/types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return fallback;
}

function getUserIdFromAccessToken(token: string | null): string | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length < 2) return null;
	try {
		const base64 = parts[1]
			.replace(/-/g, '+')
			.replace(/_/g, '/')
			.padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
		const payload = JSON.parse(atob(base64)) as {
			sub?: string;
			nameid?: string;
			'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
		};
		return (
			payload.sub ??
			payload.nameid ??
			payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
			null
		);
	} catch {
		return null;
	}
}

export function RecipeDetailsPage() {
	const auth = useAuth();
	const { recipeId } = useParams({ from: '/app-layout/recipes/$recipeId' });
	const queryClient = useQueryClient();
	const navigate = useNavigate();
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
				<p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
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
	const actorUserId = getUserIdFromAccessToken(auth.tokens?.accessToken ?? null);
	const canManageRecipe =
		Boolean(actorUserId) && actorUserId?.toLowerCase() === recipe.authorId.toLowerCase();

	return (
		<section className="relative mx-auto flex w-full max-w-2xl flex-col pb-24">
			<div className="relative -mx-4">
				{recipe.imageUrl ? (
					<>
						<img
							src={recipe.imageUrl}
							alt={recipe.title}
							className="h-56 w-full object-cover sm:h-72"
						/>
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/80 to-transparent" />
					</>
				) : (
					<div className="flex h-40 items-center justify-center bg-stone-100 text-sm text-stone-400 dark:bg-stone-800 dark:text-stone-500">
						No photo
					</div>
				)}
			</div>
			<div className="flex flex-col gap-1 p-4">
				{deleteRecipeMutation.isError && (
					<Alert variant="destructive" className="mb-2">
						<AlertTitle>Could not delete recipe</AlertTitle>
						<AlertDescription>
							{toErrorMessage(deleteRecipeMutation.error, 'Please try again.')}
						</AlertDescription>
					</Alert>
				)}
				<h1 className="text-2xl font-extrabold leading-tight text-stone-900 dark:text-stone-100">
					{recipe.title}
				</h1>
				<div className="flex items-center gap-2">
					<Avatar
						name={recipe.authorName}
						photoUrl={recipe.authorAvatarUrl}
						className="h-5 w-5"
						fallbackClassName="bg-stone-200 text-[9px] text-stone-600 dark:bg-stone-700 dark:text-stone-300"
					/>
					<p className="text-sm italic text-stone-500 dark:text-stone-400">{recipe.authorName}</p>
					{canManageRecipe && (
						<>
							<span className="flex-1" />
							<Button
								asChild
								size="icon"
								variant="ghost"
								className="text-green-600 dark:text-green-400"
							>
								<Link to="/recipes/$recipeId/edit" params={{ recipeId }}>
									<Pencil className="h-4 w-4" />
								</Link>
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="text-red-600 dark:text-red-400"
								onClick={onDeleteRecipe}
								disabled={deleteRecipeMutation.isPending}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</>
					)}
				</div>
				{(recipe.categories?.length ?? 0) > 0 && (
					<div className="mt-2 flex flex-wrap gap-2">
						{recipe.categories?.map((cat) => (
							<span
								key={cat}
								className="rounded-full border border-stone-400 px-3 py-0.5 text-xs text-stone-600 dark:border-stone-500 dark:text-stone-300"
							>
								{cat}
							</span>
						))}
					</div>
				)}
				<div className="mt-4 border-t border-stone-200 dark:border-stone-700">
					<button
						type="button"
						aria-expanded={notesOpen}
						onClick={() => setNotesOpen((o) => !o)}
						className="flex w-full items-center justify-between py-4 text-left"
					>
						<span className="text-lg font-bold text-stone-900 dark:text-stone-100">
							Chef&#39;s notes
						</span>
						<ChevronDown
							className={cn(
								'h-5 w-5 text-stone-500 transition-transform duration-200',
								notesOpen && 'rotate-180',
							)}
						/>
					</button>
					{notesOpen && (
						<p className="pb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
							{recipe.notes?.trim() || 'No notes yet.'}
						</p>
					)}
				</div>
				<div className="border-t border-stone-200 dark:border-stone-700">
					<button
						type="button"
						aria-expanded={ingredientsOpen}
						onClick={() => setIngredientsOpen((o) => !o)}
						className="flex w-full items-center justify-between py-4 text-left"
					>
						<span className="text-lg font-bold text-stone-900 dark:text-stone-100">
							Ingredients
						</span>
						<ChevronDown
							className={cn(
								'h-5 w-5 text-stone-500 transition-transform duration-200',
								ingredientsOpen && 'rotate-180',
							)}
						/>
					</button>
					{ingredientsOpen && (
						<ul className="space-y-3 pb-4">
							{recipe.ingredients.length === 0 ? (
								<li className="text-sm text-stone-500 dark:text-stone-400">No ingredients yet.</li>
							) : (
								recipe.ingredients.map((ing) => (
									<li key={ing.id} className="flex items-center justify-between gap-3">
										<span className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
											<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400 dark:bg-stone-500" />
											{ing.ingredientName}
										</span>
										<span className="shrink-0 text-sm text-stone-500 dark:text-stone-400">
											{ing.quantity} {ing.unitId}
										</span>
									</li>
								))
							)}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
