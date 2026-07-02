import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { RecipeDetail } from '@/pages/tabs/home/types';
import type { PlanDetails } from '@/pages/tabs/plan/types';
import {
	buildEditableReminderText,
	buildReminderExportPayload,
	buildShortcutUrl,
	type EditableReminderItem,
	extractRecipeIdsFromPlan,
	getEditableReminderValidationMessage,
	toEditableReminderItems,
} from '@/pages/tabs/plan/remindersExport';

export type ExportPhase = 'idle' | 'preparing' | 'reviewing' | 'openingShortcut' | 'error';

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

function withoutPlanDraft(current: Record<string, EditableReminderItem[]>, planId: string) {
	const next = { ...current };
	delete next[planId];
	return next;
}

async function buildPlanDraftItems(plan: PlanDetails): Promise<EditableReminderItem[]> {
	const recipeIds = extractRecipeIdsFromPlan(plan);
	if (recipeIds.length === 0) throw new Error('No recipes found in this plan.');
	const settledRecipes = await Promise.allSettled(
		recipeIds.map((recipeId) => apiFetch<RecipeDetail>(`/recipes/${recipeId}`)),
	);
	if (settledRecipes.some((r) => r.status === 'rejected')) {
		throw new Error('Could not fetch all recipe ingredients.');
	}
	const recipes = settledRecipes
		.filter((r): r is PromiseFulfilledResult<RecipeDetail> => r.status === 'fulfilled')
		.map((r) => r.value);
	const payload = buildReminderExportPayload(recipes);
	if (!payload.text.trim()) throw new Error('No ingredients found for this plan.');
	return toEditableReminderItems(payload.ingredients);
}

export function usePlanExport() {
	const [exportingPlanId, setExportingPlanId] = useState<string | null>(null);
	const [exportErrorByPlanId, setExportErrorByPlanId] = useState<Record<string, string | null>>({});
	const [exportPhaseByPlanId, setExportPhaseByPlanId] = useState<Record<string, ExportPhase>>({});
	const [draftItemsByPlanId, setDraftItemsByPlanId] = useState<
		Record<string, EditableReminderItem[]>
	>({});
	const preparePlanIngredients = useCallback(async (plan: PlanDetails) => {
		setExportErrorByPlanId((current) => ({ ...current, [plan.id]: null }));
		setExportPhaseByPlanId((current) => ({ ...current, [plan.id]: 'preparing' }));
		setExportingPlanId(plan.id);
		try {
			const draftItems = await buildPlanDraftItems(plan);
			setDraftItemsByPlanId((current) => ({
				...current,
				[plan.id]: draftItems,
			}));
			setExportPhaseByPlanId((current) => ({ ...current, [plan.id]: 'reviewing' }));
		} catch (error) {
			setExportErrorByPlanId((current) => ({
				...current,
				[plan.id]: toErrorMessage(error, 'Could not prepare ingredients for reminders.'),
			}));
			setExportPhaseByPlanId((current) => ({ ...current, [plan.id]: 'error' }));
		} finally {
			setExportingPlanId((current) => (current === plan.id ? null : current));
		}
	}, []);
	const updateDraftQuantity = useCallback((planId: string, itemId: string, quantity: string) => {
		setDraftItemsByPlanId((current) => ({
			...current,
			[planId]: (current[planId] ?? []).map((item) =>
				item.id === itemId ? { ...item, quantity } : item,
			),
		}));
	}, []);
	const deleteDraftItem = useCallback((planId: string, itemId: string) => {
		setDraftItemsByPlanId((current) => ({
			...current,
			[planId]: (current[planId] ?? []).filter((item) => item.id !== itemId),
		}));
	}, []);
	const cancelDraft = useCallback((planId: string) => {
		setDraftItemsByPlanId((current) => withoutPlanDraft(current, planId));
		setExportErrorByPlanId((current) => ({ ...current, [planId]: null }));
		setExportPhaseByPlanId((current) => ({ ...current, [planId]: 'idle' }));
	}, []);
	const sendDraftToShortcuts = useCallback(
		(planId: string) => {
			const items = draftItemsByPlanId[planId] ?? [];
			const validationMessage = getEditableReminderValidationMessage(items);
			if (validationMessage) {
				setExportErrorByPlanId((current) => ({ ...current, [planId]: validationMessage }));
				return;
			}
			setExportErrorByPlanId((current) => ({ ...current, [planId]: null }));
			if (!supportsAppleShortcutsBridge()) {
				setExportErrorByPlanId((current) => ({
					...current,
					[planId]: 'Shortcuts bridge is unavailable. Copy or share this list instead.',
				}));
				return;
			}
			setExportPhaseByPlanId((current) => ({ ...current, [planId]: 'openingShortcut' }));
			window.open(buildShortcutUrl(buildEditableReminderText(items)), '_self');
		},
		[draftItemsByPlanId],
	);
	return {
		exportingPlanId,
		exportErrorByPlanId,
		exportPhaseByPlanId,
		draftItemsByPlanId,
		preparePlanIngredients,
		updateDraftQuantity,
		deleteDraftItem,
		cancelDraft,
		sendDraftToShortcuts,
	};
}
