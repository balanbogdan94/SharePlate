import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePlanData } from '@/pages/usePlanData';
import { usePlanExport } from '@/pages/usePlanExport';
import { formatDateInput } from '@/pages/tabs/plan/planUtils';

export function usePlanTab() {
	const navigate = useNavigate();
	const today = useMemo(() => formatDateInput(new Date()), []);
	const [manualSegment, setManualSegment] = useState<'current' | 'other' | null>(null);
	const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);
	const [manualExpandedOtherPlanId, setManualExpandedOtherPlanId] = useState<string | null>(null);
	const [expandedOtherDayDate, setExpandedOtherDayDate] = useState<string | null>(null);
	const { exportingPlanId, exportErrorByPlanId, fallbackTextByPlanId, exportPlanIngredients } = usePlanExport();
	const { segment, planStatus, visibleCurrentPlan, groupedPlans, expandedOtherPlanId, otherPlanDetails, otherPlanLoading, otherPlanError, expandedPlanData, expandedOtherPlanData, recipeMap } = usePlanData({ today, manualSegment, manualExpandedOtherPlanId });
	const toggleDay = useCallback((d: string) => setExpandedDayDate((c) => (c === d ? null : d)), []);
	const toggleOtherDay = useCallback((d: string) => setExpandedOtherDayDate((c) => (c === d ? null : d)), []);
	const handleToggleOtherPlan = useCallback((planId: string) => {
		const isExpanded = expandedOtherPlanId === planId;
		setManualExpandedOtherPlanId((c) => (c === planId ? null : planId));
		setExpandedOtherDayDate(null);
		if (isExpanded && expandedOtherPlanId) void navigate({ to: '/plans', search: {} });
		else if (!isExpanded) void navigate({ to: '/plans', search: { expand: planId } });
	}, [expandedOtherPlanId, navigate]);
	const exportPropsFor = useCallback((planId: string) => ({
		planId,
		isExporting: exportingPlanId === planId,
		errorMessage: exportErrorByPlanId[planId] ?? null,
		fallbackText: fallbackTextByPlanId[planId] ?? null,
		onExport: async () => {
			if (expandedPlanData?.id === planId) await exportPlanIngredients(expandedPlanData);
			else if (expandedOtherPlanData?.id === planId) await exportPlanIngredients(expandedOtherPlanData);
		},
	}), [expandedPlanData, expandedOtherPlanData, exportErrorByPlanId, exportingPlanId, exportPlanIngredients, fallbackTextByPlanId]);
	return { segment, setSegment: setManualSegment, planStatus, visibleCurrentPlan, groupedPlans, expandedOtherPlanId, otherPlanDetails, otherPlanLoading, otherPlanError, expandedOtherDayDate, onTogglePlan: handleToggleOtherPlan, expandedDayDate, toggleDay, toggleOtherDay, recipeMap, exportPropsFor, otherPlanExportId: expandedOtherPlanId ?? '', today };
}
