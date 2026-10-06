import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecipeCard } from './RecipeCard';
import type { RecipeSummary } from './types';

vi.mock('@tanstack/react-router', () => ({
	Link: ({
		children,
		params,
		className,
	}: {
		children: ReactNode;
		params: { recipeId: string };
		className: string;
	}) => (
		<a href={`/recipes/${params.recipeId}`} className={className}>
			{children}
		</a>
	),
}));

const recipe: RecipeSummary = {
	id: 'soup',
	title: 'Tomato soup',
	notes: '',
	imageUrl: '',
	authorId: 'author',
	authorName: 'Alex',
	authorAvatarUrl: '',
	createdAt: '2026-10-06T00:00:00Z',
	updatedAt: '2026-10-06T00:00:00Z',
};

describe('RecipeCard', () => {
	it('keeps the standard navigation card linked to recipe details', () => {
		render(<RecipeCard recipe={recipe} />);
		expect(screen.getByRole('link')).toHaveAttribute('href', '/recipes/soup');
		expect(screen.getByText('Tomato soup')).toBeInTheDocument();
		expect(screen.getByText('Alex')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('uses the same card surface for selection without a nested link', async () => {
		const onSelect = vi.fn();
		const { rerender } = render(<RecipeCard recipe={recipe} onSelect={onSelect} />);
		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('aria-pressed', 'false');
		expect(button).toHaveClass('bg-sp-card-background', 'shadow-sp-card', 'border-sp-card-border');
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		await userEvent.setup().click(button);
		expect(onSelect).toHaveBeenCalledTimes(1);
		rerender(<RecipeCard recipe={recipe} onSelect={onSelect} selected />);
		expect(button).toHaveAttribute('aria-pressed', 'true');
		expect(button).toHaveClass('border-sp-primary', 'bg-sp-card-background');
	});
});
