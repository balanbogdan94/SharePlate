import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Camera, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecipeHeroProps = {
	imageUrl?: string | null;
	title: string;
	recipeId: string;
	canEdit: boolean;
	actions?: ReactNode;
};

function HeroPlaceholderContent({ canEdit }: { canEdit: boolean }) {
	return (
		<>
			<div className="relative">
				<div className="absolute inset-0 -z-10 rounded-full bg-green-400/30 blur-2xl dark:bg-green-500/20" />
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-sp-primary-subtle">
					<Camera className="h-7 w-7 text-green-600 dark:text-sp-primary" />
				</div>
				{canEdit && (
					<span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-sm dark:bg-sp-primary dark:text-sp-text-on-primary">
						<Plus className="h-3.5 w-3.5" />
					</span>
				)}
			</div>
			<p className="text-sm font-medium text-stone-500 dark:text-sp-text-secondary">
				{canEdit ? 'Add a cover photo' : 'No photo yet'}
			</p>
		</>
	);
}

const placeholderClassName =
	'flex h-64 w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-stone-100 to-stone-200 transition dark:from-sp-surface dark:to-sp-background sm:h-80';

export function RecipeHero({ imageUrl, title, recipeId, canEdit, actions }: RecipeHeroProps) {
	return (
		<div className="animate-in fade-in relative -mx-4 duration-700">
			{imageUrl ? (
				<>
					<img src={imageUrl} alt={title} className="h-64 w-full object-cover sm:h-80" />
					<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
				</>
			) : canEdit ? (
				<Link
					to="/recipes/$recipeId/edit"
					params={{ recipeId }}
					aria-label="Add a cover photo"
					className={cn(
						placeholderClassName,
						'active:scale-[0.99] hover:from-stone-200 dark:hover:from-sp-surface-hover',
					)}
				>
					<HeroPlaceholderContent canEdit />
				</Link>
			) : (
				<div className={placeholderClassName}>
					<HeroPlaceholderContent canEdit={false} />
				</div>
			)}
			{actions && (
				<div className="absolute right-4 top-4 flex items-center gap-2">{actions}</div>
			)}
		</div>
	);
}
