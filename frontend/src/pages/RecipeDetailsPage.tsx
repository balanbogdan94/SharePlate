import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useAuth } from '@/auth/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { RecipeDetail } from '@/pages/tabs/home/types';

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function getUserIdFromAccessToken(token: string | null): string | null {
	if (!token) {
		return null;
	}

	const parts = token.split('.');
	if (parts.length < 2) {
		return null;
	}

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

	const recipeQuery = useQuery({
		queryKey: ['recipes', 'detail', recipeId],
		queryFn: () => apiFetch<RecipeDetail>(`/api/recipes/${recipeId}`),
	});

	const deleteRecipeMutation = useMutation({
		mutationFn: () =>
			apiFetch<void>(`/api/recipes/${recipeId}`, {
				method: 'DELETE',
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] }),
				queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] }),
				queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', recipeId] }),
			]);
			await navigate({
				to: '/recipes',
				search: { expand: undefined },
			});
		},
	});

	const onDeleteRecipe = () => {
		const title = recipeQuery.data?.title ?? 'this recipe';
		if (!window.confirm(`Delete recipe "${title}"?`)) {
			return;
		}
		deleteRecipeMutation.reset();
		deleteRecipeMutation.mutate();
	};

	if (recipeQuery.isLoading) {
		return (
			<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10'>
				<p className='rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'>
					Loading recipe...
				</p>
			</section>
		);
	}

	if (recipeQuery.isError || !recipeQuery.data) {
		return (
			<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col gap-4 pb-10'>
				<Alert variant='destructive'>
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
		Boolean(actorUserId) &&
		actorUserId?.toLowerCase() === recipe.authorId.toLowerCase();

	return (
		<section className='relative mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden pb-24'>
			<div className='space-y-4 rounded-3xl border border-stone-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/70'>
				{canManageRecipe && (
					<div className='flex flex-wrap items-center justify-end gap-2'>
						<Button
							asChild
							variant='outline'
							className='h-11 min-w-24 rounded-full px-4 text-sm font-semibold'>
							<Link to='/recipes/$recipeId/edit' params={{ recipeId }}>
								Edit
							</Link>
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={onDeleteRecipe}
							disabled={deleteRecipeMutation.isPending}
							className='h-11 min-w-24 rounded-full px-4 text-sm font-semibold'>
							{deleteRecipeMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</div>
				)}

				{deleteRecipeMutation.isError && (
					<Alert variant='destructive'>
						<AlertTitle>Could not delete recipe</AlertTitle>
						<AlertDescription>
							{toErrorMessage(deleteRecipeMutation.error, 'Please try again.')}
						</AlertDescription>
					</Alert>
				)}

				{recipe.imageUrl ? (
					<div className='overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-700/80'>
						<img
							src={recipe.imageUrl}
							alt={recipe.title}
							className='h-56 w-full object-cover sm:h-72'
						/>
					</div>
				) : (
					<div className='flex h-40 items-center justify-center rounded-2xl border border-dashed border-stone-200/80 bg-stone-50 text-sm text-stone-500 dark:border-stone-700/80 dark:bg-stone-950/60 dark:text-stone-400'>
						No photo
					</div>
				)}

				<div className='space-y-1'>
					<h1 className='text-2xl font-extrabold leading-tight text-stone-900 dark:text-stone-100'>
						{recipe.title}
					</h1>
					<p className='text-sm text-stone-500 dark:text-stone-400'>
						By {recipe.authorName}
					</p>
				</div>

				<div className='space-y-2 rounded-2xl border border-stone-200/70 bg-stone-50/70 p-3 dark:border-stone-700/70 dark:bg-stone-950/60'>
					<p className='text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400'>
						Notes
					</p>
					{recipe.notes?.trim().length ? (
						<p className='whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-200'>
							{recipe.notes}
						</p>
					) : (
						<p className='text-sm text-stone-500 dark:text-stone-400'>
							No notes yet.
						</p>
					)}
				</div>

				<div className='space-y-2 rounded-2xl border border-stone-200/70 bg-stone-50/70 p-3 dark:border-stone-700/70 dark:bg-stone-950/60'>
					<p className='text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400'>
						Ingredients
					</p>
					{recipe.ingredients.length === 0 ? (
						<p className='text-sm text-stone-500 dark:text-stone-400'>
							No ingredients yet.
						</p>
					) : (
						<ul className='divide-y divide-stone-200/70 dark:divide-stone-800'>
							{recipe.ingredients.map((ingredient) => (
								<li
									key={ingredient.id}
									className='flex items-center justify-between gap-3 py-2.5'>
									<span className='text-sm font-medium text-stone-800 dark:text-stone-100'>
										{ingredient.ingredientName}
									</span>
									<span className='shrink-0 text-sm text-stone-500 dark:text-stone-400'>
										{ingredient.quantity} {ingredient.unitId}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
