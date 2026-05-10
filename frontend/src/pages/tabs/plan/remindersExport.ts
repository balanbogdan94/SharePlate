import type { RecipeDetail, RecipeIngredient } from '@/pages/tabs/home/types';
import { CATEGORY_TYPES, type PlanDetails } from '@/pages/tabs/plan/types';

export type AggregatedIngredient = {
	name: string;
	normalizedName: string;
	unitId: string;
	quantity: number;
};

export type ReminderExportPayload = {
	ingredients: AggregatedIngredient[];
	lines: string[];
	text: string;
};

const SHORTCUT_NAME = 'SharePlate Add To Reminders';

function normalizeIngredientName(name: string): string {
	return name.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function buildIngredientKey(ingredient: RecipeIngredient): string {
	return `${normalizeIngredientName(ingredient.ingredientName)}::${ingredient.unitId}`;
}

function sortIngredients(items: AggregatedIngredient[]): AggregatedIngredient[] {
	return items.slice().sort((left, right) => {
		const nameCompare = left.normalizedName.localeCompare(right.normalizedName);
		if (nameCompare !== 0) {
			return nameCompare;
		}
		return left.unitId.localeCompare(right.unitId);
	});
}

function formatQuantity(quantity: number): string {
	return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}

export function extractRecipeIdsFromPlan(plan: PlanDetails): string[] {
	const ids = new Set<string>();
	for (const day of plan.days) {
		for (const category of CATEGORY_TYPES) {
			for (const recipeId of day.categories[category] ?? []) {
				ids.add(recipeId);
			}
		}
	}
	return [...ids];
}

export function aggregateIngredients(recipes: RecipeDetail[]): AggregatedIngredient[] {
	const aggregated = new Map<string, AggregatedIngredient>();
	for (const recipe of recipes) {
		for (const ingredient of recipe.ingredients) {
			const key = buildIngredientKey(ingredient);
			const existing = aggregated.get(key);
			if (existing) {
				existing.quantity += ingredient.quantity;
				continue;
			}
			aggregated.set(key, {
				name: ingredient.ingredientName.trim().replace(/\s+/gu, ' '),
				normalizedName: normalizeIngredientName(ingredient.ingredientName),
				unitId: ingredient.unitId,
				quantity: ingredient.quantity,
			});
		}
	}
	return sortIngredients([...aggregated.values()]);
}

export function formatReminderLines(ingredients: AggregatedIngredient[]): string[] {
	return ingredients.map((ingredient) => `${ingredient.name} — ${formatQuantity(ingredient.quantity)} ${ingredient.unitId}`);
}

export function buildShortcutUrl(text: string, shortcutName = SHORTCUT_NAME): string {
	const params = new URLSearchParams({
		name: shortcutName,
		input: 'text',
		text,
	});
	return `shortcuts://run-shortcut?${params.toString()}`;
}

export function buildReminderExportPayload(recipes: RecipeDetail[]): ReminderExportPayload {
	const ingredients = aggregateIngredients(recipes);
	const lines = formatReminderLines(ingredients);
	return {
		ingredients,
		lines,
		text: lines.join('\n'),
	};
}
