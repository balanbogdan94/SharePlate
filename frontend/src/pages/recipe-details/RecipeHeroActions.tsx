import { Link } from '@tanstack/react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecipeHeroActionsProps = {
	recipeId: string;
	isDeleting: boolean;
	onDelete: () => void;
};

const buttonClassName =
	'flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/60 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-black/75 active:scale-95 disabled:opacity-50';

export function RecipeHeroActions({ recipeId, isDeleting, onDelete }: RecipeHeroActionsProps) {
	return (
		<>
			<Link
				to="/recipes/$recipeId/edit"
				params={{ recipeId }}
				aria-label="Edit recipe"
				className={cn(buttonClassName, 'text-white')}
			>
				<Pencil className="h-[18px] w-[18px]" />
			</Link>
			<button
				type="button"
				aria-label="Delete recipe"
				onClick={onDelete}
				disabled={isDeleting}
				className={cn(buttonClassName, 'text-red-400 hover:text-red-300')}
			>
				<Trash2 className="h-[18px] w-[18px]" />
			</button>
		</>
	);
}
