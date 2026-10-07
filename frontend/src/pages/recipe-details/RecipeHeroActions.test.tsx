import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { RecipeHeroActions } from './RecipeHeroActions';

vi.mock('@tanstack/react-router', () => ({
	Link: ({
		to,
		params,
		children,
		className,
	}: {
		to: string;
		params: { recipeId: string };
		children: ReactNode;
		className?: string;
	}) => (
		<a href={to.replace('$recipeId', params.recipeId)} className={className}>
			{children}
		</a>
	),
}));

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

function renderActions(canManage = true) {
	const onDelete = vi.fn();
	render(
		<RecipeHeroActions
			recipeId="recipe-1"
			recipeTitle="Tomato soup"
			canManage={canManage}
			isDeleting={false}
			onDelete={onDelete}
		/>,
	);
	return { onDelete };
}

describe('RecipeHeroActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
	});

	it('shares recipes and offers edit and delete actions to their owner', async () => {
		const user = userEvent.setup();
		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { configurable: true, value: share });
		const { onDelete } = renderActions();

		await user.click(screen.getByRole('button', { name: 'Share recipe' }));
		expect(share).toHaveBeenCalledWith({ title: 'Tomato soup', url: window.location.href });

		await user.click(screen.getByRole('button', { name: 'Recipe options' }));
		expect(screen.getByRole('link', { name: 'Edit recipe' })).toHaveAttribute(
			'href',
			'/recipes/recipe-1/edit',
		);
		await user.click(screen.getByRole('menuitem', { name: 'Delete recipe' }));
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it('copies the recipe link when native sharing is unavailable', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
		renderActions(false);

		await userEvent.setup().click(screen.getByRole('button', { name: 'Share recipe' }));

		expect(writeText).toHaveBeenCalledWith(window.location.href);
		expect(toast.success).toHaveBeenCalledWith('Recipe link copied');
		expect(screen.queryByRole('button', { name: 'Recipe options' })).not.toBeInTheDocument();
	});
});
