import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePlanData } from '@/pages/usePlanData';
import { usePlanExport } from '@/pages/usePlanExport';
import { formatDateInput } from '@/pages/tabs/plan/planUtils';

export function usePlanTab() {
	const navigate = useNavigate();
	const today = useMemo(() => formatDateInput(new Date()), []);
	const [manualSegment, setManualSegment] = useState<'current' | 'other' | null>(null);
	const [expandedDayDates, setExpandedDayDates] = useState<Set<string> | null>(null);
	const [manualExpandedOtherPlanId, setManualExpandedOtherPlanId] = useState<string | null>(null);
	const [expandedOtherDayDates, setExpandedOtherDayDates] = useState<Set<string> | null>(null);
	const exportState = usePlanExport();
	const planData = usePlanData({ today, manualSegment, manualExpandedOtherPlanId });
	const toggleDay = useCallback((date: string, defaultDate: string | null) => {
		setExpandedDayDates((current) => {
			const next = new Set(current ?? (defaultDate ? [defaultDate] : []));
			if (next.has(date)) next.delete(date);
			else next.add(date);
			return next;
		});
	}, []);
	const toggleOtherDay = useCallback(
		(date: string, defaultDate: string | null) => {
			setExpandedOtherDayDates((current) => {
				const next = new Set(current ?? (defaultDate ? [defaultDate] : []));
				if (next.has(date)) next.delete(date);
				else next.add(date);
				return next;
			});
		},
		[],
	);
	const handleToggleOtherPlan = useCallback(
		(planId: string) => {
			const isExpanded = planData.expandedOtherPlanId === planId;
			setManualExpandedOtherPlanId((c) => (c === planId ? null : planId));
			setExpandedOtherDayDates(null);
			if (isExpanded && planData.expandedOtherPlanId) void navigate({ to: '/plans', search: {} });
			else if (!isExpanded) void navigate({ to: '/plans', search: { expand: planId } });
		},
		[planData.expandedOtherPlanId, navigate],
	);
	const exportPropsFor = useCallback(
		(planId: string) => ({
			planId,
			isExporting: exportState.exportingPlanId === planId,
			phase: exportState.exportPhaseByPlanId[planId] ?? 'idle',
			draftItems: exportState.draftItemsByPlanId[planId] ?? [],
			errorMessage: exportState.exportErrorByPlanId[planId] ?? null,
			onExport: async () => {
				if (planData.expandedPlanData?.id === planId)
					await exportState.preparePlanIngredients(planData.expandedPlanData);
				else if (planData.expandedOtherPlanData?.id === planId)
					await exportState.preparePlanIngredients(planData.expandedOtherPlanData);
			},
			onUpdateQuantity: (itemId: string, quantity: string) =>
				exportState.updateDraftQuantity(planId, itemId, quantity),
			onDeleteDraft: (itemId: string) => exportState.deleteDraftItem(planId, itemId),
			onCancelDraft: () => exportState.cancelDraft(planId),
			onSendDraft: () => exportState.sendDraftToShortcuts(planId),
		}),
		[exportState, planData.expandedPlanData, planData.expandedOtherPlanData],
	);
	return {
		segment: planData.segment,
		setSegment: setManualSegment,
		planStatus: planData.planStatus,
		visibleCurrentPlan: planData.visibleCurrentPlan,
		groupedPlans: planData.groupedPlans,
		expandedOtherPlanId: planData.expandedOtherPlanId,
		otherPlanDetails: planData.otherPlanDetails,
		otherPlanLoading: planData.otherPlanLoading,
		otherPlanError: planData.otherPlanError,
		expandedOtherDayDates,
		onTogglePlan: handleToggleOtherPlan,
		expandedDayDates,
		toggleDay,
		toggleOtherDay,
		recipeMap: planData.recipeMap,
		exportPropsFor,
		otherPlanExportId: planData.expandedOtherPlanId ?? '',
		today,
	};
}
