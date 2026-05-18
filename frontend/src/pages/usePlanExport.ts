import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { RecipeDetail } from '@/pages/tabs/home/types';
import type { PlanDetails } from '@/pages/tabs/plan/types';
import {
	buildReminderExportPayload,
	buildShortcutUrl,
	extractRecipeIdsFromPlan,
} from '@/pages/tabs/plan/remindersExport';

function supportsAppleShortcutsBridge(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}
	return /iPad|iPhone|iPod|Macintosh/iu.test(navigator.userAgent);
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return fallback;
}

export function usePlanExport() {
	const [exportingPlanId, setExportingPlanId] = useState<string | null>(null);
	const [exportErrorByPlanId, setExportErrorByPlanId] = useState<Record<string, string | null>>({});
	const [fallbackTextByPlanId, setFallbackTextByPlanId] = useState<Record<string, string>>({});

	const exportPlanIngredients = useCallback(async (plan: PlanDetails) => {
		setExportErrorByPlanId((current) => ({ ...current, [plan.id]: null }));
		setFallbackTextByPlanId((current) => {
			if (!current[plan.id]) return current;
			const next = { ...current };
			delete next[plan.id];
			return next;
		});
		setExportingPlanId(plan.id);
		try {
			const recipeIds = extractRecipeIdsFromPlan(plan);
			if (recipeIds.length === 0) throw new Error('No recipes found in this plan.');
			const settledRecipes = await Promise.allSettled(
				recipeIds.map((recipeId) => apiFetch<RecipeDetail>(`/api/recipes/${recipeId}`)),
			);
			if (settledRecipes.some((r) => r.status === 'rejected')) {
				throw new Error('Could not fetch all recipe ingredients.');
			}
			const recipes = settledRecipes
				.filter((r): r is PromiseFulfilledResult<RecipeDetail> => r.status === 'fulfilled')
				.map((r) => r.value);
			const payload = buildReminderExportPayload(recipes);
			if (!payload.text.trim()) throw new Error('No ingredients found for this plan.');
			if (supportsAppleShortcutsBridge()) {
				window.open(buildShortcutUrl(payload.text), '_self');
				return;
			}
			setFallbackTextByPlanId((current) => ({ ...current, [plan.id]: payload.text }));
		} catch (error) {
			setExportErrorByPlanId((current) => ({
				...current,
				[plan.id]: toErrorMessage(error, 'Could not export ingredients to reminders.'),
			}));
		} finally {
			setExportingPlanId((current) => (current === plan.id ? null : current));
		}
	}, []);

	return { exportingPlanId, exportErrorByPlanId, fallbackTextByPlanId, exportPlanIngredients };
}
