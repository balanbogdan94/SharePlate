import type { RecipeDetail, RecipeIngredient, UnitType } from '@/pages/tabs/home/types';
import { CATEGORY_TYPES, type PlanDetails } from '@/pages/tabs/plan/types';
import type { Language } from '@/settings/UserSettingsContext';
import { translations } from '@/i18n/translations';
import {
	formatMeasurement,
	formatQuantity,
	getUnitLabel,
	parseQuantity,
	isUnitType,
} from '@/lib/measurements';

export type AggregatedIngredient = {
	name: string;
	normalizedName: string;
	unitId: UnitType;
	quantity: number;
};

export type ReminderExportPayload = {
	ingredients: AggregatedIngredient[];
	lines: string[];
	text: string;
};

export type EditableReminderItem = {
	id: string;
	name: string;
	quantity: string;
	unitId: UnitType;
};

const SHORTCUT_NAME = 'SharePlate Add To Reminders';

export function formatIngredientUnit(
	unitId: UnitType,
	language: Language = 'en',
	quantity?: number,
): string {
	return getUnitLabel(unitId, language, quantity);
}

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

export function buildPlanReminderExportPayload(
	plan: PlanDetails,
	recipes: RecipeDetail[],
	language: Language = 'en',
) {
	const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
	const occurrences = plan.days.flatMap((day) =>
		CATEGORY_TYPES.flatMap((category) =>
			day.categories[category].map((id) => {
				const recipe = recipeMap.get(id);
				if (!recipe) throw new Error('Could not fetch all recipe ingredients.');
				return recipe;
			}),
		),
	);
	return buildReminderExportPayload(occurrences, language);
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

export function formatReminderLines(
	ingredients: AggregatedIngredient[],
	language: Language = 'en',
): string[] {
	return ingredients.map(
		(ingredient) =>
			`${ingredient.name} — ${formatMeasurement(ingredient.quantity, ingredient.unitId, language)}`,
	);
}

export function buildShortcutUrl(text: string, shortcutName = SHORTCUT_NAME): string {
	const params = new URLSearchParams({
		name: shortcutName,
		input: 'text',
		text,
	});
	return `shortcuts://run-shortcut?${params.toString().replace(/\+/gu, '%20')}`;
}

export function buildReminderExportPayload(
	recipes: RecipeDetail[],
	language: Language = 'en',
): ReminderExportPayload {
	const ingredients = aggregateIngredients(recipes);
	const lines = formatReminderLines(ingredients, language);
	return {
		ingredients,
		lines,
		text: lines.join('\n'),
	};
}

export function toEditableReminderItems(
	ingredients: AggregatedIngredient[],
	language: Language = 'en',
): EditableReminderItem[] {
	return ingredients.map((ingredient, index) => ({
		id: `${ingredient.normalizedName}-${ingredient.unitId}-${index}`,
		name: ingredient.name,
		quantity: formatQuantity(ingredient.quantity, language),
		unitId: ingredient.unitId,
	}));
}

function formatEditableReminderItem(item: EditableReminderItem, language: Language): string {
	const quantity = parseQuantity(item.quantity);
	if (quantity === null) throw new Error(translations[language]['measurements.invalidQuantity']);
	return `${item.name.trim()} — ${formatMeasurement(quantity, item.unitId, language)}`;
}

export function buildEditableReminderText(
	items: EditableReminderItem[],
	language: Language = 'en',
): string {
	return items.map((item) => formatEditableReminderItem(item, language)).join('\n');
}

export function getEditableReminderValidationMessage(
	items: EditableReminderItem[],
	language: Language = 'en',
): string | null {
	if (items.length === 0) {
		return translations[language]['measurements.emptyList'];
	}
	if (items.some((item) => parseQuantity(item.quantity) === null)) {
		return translations[language]['measurements.invalidQuantity'];
	}
	if (items.some((item) => !isUnitType(item.unitId)))
		return translations[language]['measurements.invalidUnit'];
	return null;
}
