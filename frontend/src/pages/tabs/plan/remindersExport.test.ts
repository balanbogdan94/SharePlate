import { describe, expect, it } from 'vitest';
import type { PlanDetails } from '@/pages/tabs/plan/types';
import type { RecipeDetail } from '@/pages/tabs/home/types';
import {
	aggregateIngredients,
	buildReminderExportPayload,
	buildShortcutUrl,
	extractRecipeIdsFromPlan,
	formatReminderLines,
} from '@/pages/tabs/plan/remindersExport';

function createRecipe(
	id: string,
	ingredients: Array<{ name: string; quantity: number; unitId: 'Gram' | 'Piece' }>,
): RecipeDetail {
	return {
		id,
		title: `Recipe ${id}`,
		notes: '',
		imageUrl: '',
		authorId: 'author-1',
		authorName: 'Author',
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		ingredients: ingredients.map((ingredient, index) => ({
			id: `${id}-ingredient-${index}`,
			ingredientId: `${id}-ing-${index}`,
			ingredientName: ingredient.name,
			quantity: ingredient.quantity,
			unitId: ingredient.unitId,
		})),
	};
}

function createPlanDetails(): PlanDetails {
	return {
		id: 'plan-1',
		startDate: '2026-05-05',
		endDate: '2026-05-11',
		createdAt: '2026-05-01T00:00:00Z',
		updatedAt: '2026-05-01T00:00:00Z',
		days: [
			{
				date: '2026-05-05',
				categories: {
					Unnamed: ['recipe-1'],
					Morning: [],
					Breakfast: ['recipe-2'],
					Lunch: ['recipe-1'],
					Dinner: [],
				},
			},
		],
	};
}

describe('remindersExport', () => {
	it('extracts unique recipe ids from plan categories', () => {
		const recipeIds = extractRecipeIdsFromPlan(createPlanDetails());
		expect(recipeIds).toEqual(['recipe-1', 'recipe-2']);
	});

	it('merges same ingredient and unit and keeps different units separate', () => {
		const recipes = [
			createRecipe('recipe-1', [
				{ name: 'Tomato', quantity: 2, unitId: 'Piece' },
				{ name: 'Flour', quantity: 100, unitId: 'Gram' },
			]),
			createRecipe('recipe-2', [
				{ name: ' tomato ', quantity: 3, unitId: 'Piece' },
				{ name: 'Flour', quantity: 1, unitId: 'Piece' },
			]),
		];

		const aggregated = aggregateIngredients(recipes);

		expect(aggregated).toHaveLength(3);
		expect(aggregated[0]).toMatchObject({ name: 'Flour', quantity: 100, unitId: 'Gram' });
		expect(aggregated[1]).toMatchObject({ name: 'Flour', quantity: 1, unitId: 'Piece' });
		expect(aggregated[2]).toMatchObject({ name: 'Tomato', quantity: 5, unitId: 'Piece' });
	});

	it('formats reminder lines deterministically', () => {
		const lines = formatReminderLines([
			{ name: 'Tomato', normalizedName: 'tomato', quantity: 5, unitId: 'Piece' },
			{ name: 'Flour', normalizedName: 'flour', quantity: 100, unitId: 'Gram' },
		]);
		expect(lines).toEqual(['Tomato — 5 Piece', 'Flour — 100 Gram']);
	});

	it('builds reminder payload text', () => {
		const payload = buildReminderExportPayload([
			createRecipe('recipe-1', [{ name: 'Apple', quantity: 1, unitId: 'Piece' }]),
		]);
		expect(payload.lines).toEqual(['Apple — 1 Piece']);
		expect(payload.text).toBe('Apple — 1 Piece');
	});

	it('builds encoded shortcuts URL', () => {
		const url = buildShortcutUrl('Tomato — 5 Piece\nFlour — 100 Gram');
		expect(url).toContain('shortcuts://run-shortcut?');
		expect(url).toContain('name=SharePlate+Add+To+Reminders');
		expect(url).toContain('input=text');
		expect(url).toContain('text=Tomato+%E2%80%94+5+Piece%0AFlour+%E2%80%94+100+Gram');
	});
});
