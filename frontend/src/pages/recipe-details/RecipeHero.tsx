type RecipeHeroProps = {
	imageUrl?: string | null;
	title: string;
};

export function RecipeHero({ imageUrl, title }: RecipeHeroProps) {
	return (
		<div className="relative -mx-4">
			{imageUrl ? (
				<>
					<img src={imageUrl} alt={title} className="h-56 w-full object-cover sm:h-72" />
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/80 to-transparent" />
				</>
			) : (
				<div className="flex h-40 items-center justify-center bg-stone-100 text-sm text-stone-400 dark:bg-sp-surface dark:text-sp-text-tertiary">
					No photo
				</div>
			)}
		</div>
	);
}
