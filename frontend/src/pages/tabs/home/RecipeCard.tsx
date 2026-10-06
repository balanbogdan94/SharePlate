import { Link } from '@tanstack/react-router';
import { Check, UtensilsCrossed } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { RecipeSummary } from './types';

type RecipeCardProps = {
	recipe: RecipeSummary;
	onSelect?: () => void;
	selected?: boolean;
};

export function RecipeCard({ recipe, onSelect, selected = false }: RecipeCardProps) {
	const className = `relative h-20 w-full grid grid-cols-[25%_1fr] align-middle transition active:scale-[0.9] active:bg-sp-card-background-hover overflow-hidden rounded-2xl border bg-sp-card-background shadow-sp-card text-left ${selected ? 'border-sp-primary ring-1 ring-sp-primary' : 'border-sp-card-border'}`;
	const content = (
		<>
			<div className="h-full w-full overflow-hidden [mask-image:linear-gradient(to_right,black_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_58%,transparent_100%)]">
				{recipe.imageUrl ? (
					<img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-sp-primary-subtle">
						<UtensilsCrossed className="h-6 w-6 text-sp-primary" />
					</div>
				)}
			</div>

			<div className={`min-w-0 flex-1 flex flex-col gap-4 px-3 py-3 ${onSelect ? 'pr-12' : ''}`}>
				<p className="line-clamp-2 text-base font-bold leading-snug text-sp-text-primary">
					{recipe.title}
				</p>
				<p className="mt-0.5 flex items-center gap-1 text-xs italic text-sp-text-secondary">
					<Avatar
						name={recipe.authorName}
						photoUrl={recipe.authorAvatarUrl}
						className="h-4 w-4"
						fallbackClassName="text-[8px] bg-sp-surface-active text-sp-text-secondary"
					/>
					{recipe.authorName}
				</p>
			</div>
			{onSelect && (
				<span
					aria-hidden="true"
					className={`absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border ${selected ? 'border-sp-primary bg-sp-primary text-sp-text-on-primary' : 'border-sp-border-strong text-transparent'}`}
				>
					<Check className="h-3.5 w-3.5" />
				</span>
			)}
		</>
	);
	if (onSelect) {
		return (
			<button type="button" aria-pressed={selected} onClick={onSelect} className={className}>
				{content}
			</button>
		);
	}
	return (
		<Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className={className}>
			{content}
		</Link>
	);
}
