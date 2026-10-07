import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link } from '@tanstack/react-router';
import { EllipsisVertical, PenLine, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type RecipeHeroActionsProps = {
	recipeId: string;
	recipeTitle: string;
	canManage: boolean;
	isDeleting: boolean;
	onDelete: () => void;
};

const buttonClassName =
	'flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/60 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/75 active:scale-95 disabled:opacity-50';

export function RecipeHeroActions({
	recipeId,
	recipeTitle,
	canManage,
	isDeleting,
	onDelete,
}: RecipeHeroActionsProps) {
	const shareRecipe = async () => {
		const url = window.location.href;
		try {
			if (typeof navigator.share === 'function') {
				await navigator.share({ title: recipeTitle, url });
				return;
			}
			if (!navigator.clipboard?.writeText) {
				throw new Error('Sharing is unavailable in this browser.');
			}
			await navigator.clipboard.writeText(url);
			toast.success('Recipe link copied');
		} catch (error) {
			const cancelled =
				typeof error === 'object' &&
				error !== null &&
				'name' in error &&
				error.name === 'AbortError';
			if (!cancelled) {
				toast.error(
					'Could not share recipe',
					error instanceof Error && error.message.trim()
						? { description: error.message }
						: undefined,
				);
			}
		}
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				aria-label="Share recipe"
				onClick={() => void shareRecipe()}
				className={cn(buttonClassName, 'text-white')}
			>
				<Share2 className="h-[18px] w-[18px]" />
			</button>
			{canManage && (
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							aria-label="Recipe options"
							className={cn(buttonClassName, 'text-white')}
						>
							<EllipsisVertical className="h-[18px] w-[18px]" />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							aria-label="Recipe options"
							align="end"
							sideOffset={6}
							collisionPadding={12}
							className="z-50 min-w-48 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-1.5 text-stone-900 shadow-xl backdrop-blur-xl motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:zoom-in-95 motion-safe:duration-150 dark:border-sp-border dark:bg-sp-surface-elevated dark:text-sp-text-primary"
						>
							<DropdownMenu.Item asChild>
								<Link
									to="/recipes/$recipeId/edit"
									params={{ recipeId }}
									className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-stone-100 dark:data-[highlighted]:bg-sp-surface-active"
								>
									<PenLine className="h-4 w-4" />
									Edit recipe
								</Link>
							</DropdownMenu.Item>
							<DropdownMenu.Separator className="my-1 h-px bg-stone-200 dark:bg-sp-separator" />
							<DropdownMenu.Item
								onSelect={onDelete}
								disabled={isDeleting}
								className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
							>
								<Trash2 className="h-4 w-4" />
								Delete recipe
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			)}
		</div>
	);
}
