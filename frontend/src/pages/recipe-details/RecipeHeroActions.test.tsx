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
			shareText={"Tomato soup\n\nIngredients:\n- Tomato: 2 Piece\n\nChef's notes:\nSimmer gently."}
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
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: false })),
		);
	});

	it('opens native sharing on mobile and offers edit and delete actions to the owner', async () => {
		const user = userEvent.setup();
		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { configurable: true, value: share });
		window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
		const { onDelete } = renderActions();

		await user.click(screen.getByRole('button', { name: 'Share recipe' }));
		expect(share).toHaveBeenCalledWith({
			title: 'Tomato soup',
			text: "Tomato soup\n\nIngredients:\n- Tomato: 2 Piece\n\nChef's notes:\nSimmer gently.",
			url: window.location.href,
		});

		await user.click(screen.getByRole('button', { name: 'Recipe options' }));
		expect(screen.getByRole('link', { name: 'Edit recipe' })).toHaveAttribute(
			'href',
			'/recipes/recipe-1/edit',
		);
		await user.click(screen.getByRole('menuitem', { name: 'Delete recipe' }));
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it('copies all recipe details on desktop even when native sharing is available', async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { configurable: true, value: share });
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
		renderActions(false);

		await userEvent.setup().click(screen.getByRole('button', { name: 'Share recipe' }));

		expect(writeText).toHaveBeenCalledWith(
			"Tomato soup\n\nIngredients:\n- Tomato: 2 Piece\n\nChef's notes:\nSimmer gently.",
		);
		expect(share).not.toHaveBeenCalled();
		expect(toast.success).toHaveBeenCalledWith('Recipe details copied');
		expect(screen.queryByRole('button', { name: 'Recipe options' })).not.toBeInTheDocument();
	});
});
