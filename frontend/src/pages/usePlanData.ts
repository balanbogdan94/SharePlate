import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { apiFetch } from '@/lib/api';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';
import {
	addDays,
	isPlanActiveOnDate,
	isFuturePlan,
	toErrorMessage,
} from '@/pages/tabs/plan/planUtils';

type SearchParams = { expand?: string };

type CoreParams = {
	today: string;
	manualSegment: 'current' | 'other' | null;
	manualExpandedOtherPlanId: string | null;
};

function usePlanCore({ today, manualSegment, manualExpandedOtherPlanId }: CoreParams) {
	const search = useSearch({ from: '/app-layout/plans' }) as SearchParams;
	const pastCutoff = useMemo(() => addDays(today, -30), [today]);
	const plansQuery = useQuery({
		queryKey: ['plans'],
		queryFn: () => apiFetch<PlanListItem[]>('/plans'),
	});
	const recipesQuery = useQuery({
		queryKey: ['recipes', 'house'],
		queryFn: () => apiFetch<RecipeSummary[]>('/recipes/house'),
	});
	const plans = useMemo(
		() => (plansQuery.data ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate)),
		[plansQuery.data],
	);
	const currentPlan = useMemo(
		() => plans.find((p) => isPlanActiveOnDate(p, today)) ?? null,
		[plans, today],
	);
	const segment = useMemo(() => {
		if (manualSegment) return manualSegment;
		if (search.expand && plans.some((p) => p.id === search.expand && !isPlanActiveOnDate(p, today)))
			return 'other';
		return 'current';
	}, [manualSegment, plans, search.expand, today]);
	const groupedPlans = useMemo(
		() => ({
			future: plans.filter((p) => isFuturePlan(p, today)),
			past: plans.filter((p) => p.endDate < today && p.endDate >= pastCutoff),
		}),
		[pastCutoff, plans, today],
	);
	const expandedOtherPlanId = useMemo(() => {
		const all = [...groupedPlans.future, ...groupedPlans.past];
		if (search.expand && all.some((p) => p.id === search.expand)) return search.expand;
		if (manualExpandedOtherPlanId && all.some((p) => p.id === manualExpandedOtherPlanId))
			return manualExpandedOtherPlanId;
		return null;
	}, [groupedPlans.future, groupedPlans.past, manualExpandedOtherPlanId, search.expand]);
	return {
		plansQuery,
		recipesQuery,
		plans,
		currentPlan,
		segment,
		groupedPlans,
		expandedOtherPlanId,
	};
}

export type PlanDataParams = CoreParams;

export function usePlanData(params: PlanDataParams) {
	const core = usePlanCore(params);
	const expandedPlanQuery = useQuery({
		queryKey: ['plans', 'detail', core.currentPlan?.id ?? null],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${core.currentPlan?.id}`),
		enabled: Boolean(core.currentPlan?.id),
	});
	const expandedOtherPlanQuery = useQuery({
		queryKey: ['plans', 'detail', 'other', core.expandedOtherPlanId],
		queryFn: () => apiFetch<PlanDetails>(`/plans/${core.expandedOtherPlanId}`),
		enabled: Boolean(core.expandedOtherPlanId),
	});
	const recipeMap = useMemo(() => {
		const m = new Map<string, RecipeSummary>();
		for (const r of core.recipesQuery.data ?? []) m.set(r.id, r);
		return m;
	}, [core.recipesQuery.data]);
	const visibleCurrentPlan = useMemo(
		() =>
			core.plans.length > 0 &&
			core.segment === 'current' &&
			core.currentPlan &&
			expandedPlanQuery.data
				? expandedPlanQuery.data
				: null,
		[core.currentPlan, core.plans.length, core.segment, expandedPlanQuery.data],
	);
	const planStatus = useMemo(
		() => ({
			noPlans: core.plans.length === 0 && !core.plansQuery.isLoading && !core.plansQuery.isError,
			noActive:
				core.plans.length > 0 &&
				!core.plansQuery.isLoading &&
				!core.plansQuery.isError &&
				!core.currentPlan &&
				core.segment === 'current',
			showOtherPlans: core.plans.length > 0 && core.segment === 'other',
			showFab: core.plans.length > 0,
			isError: core.plansQuery.isError,
			isLoading: core.plansQuery.isLoading,
			error: toErrorMessage(core.plansQuery.error, 'Please try again.'),
		}),
		[
			core.currentPlan,
			core.plans.length,
			core.plansQuery.error,
			core.plansQuery.isError,
			core.plansQuery.isLoading,
			core.segment,
		],
	);
	return {
		segment: core.segment,
		planStatus,
		visibleCurrentPlan,
		groupedPlans: core.groupedPlans,
		expandedOtherPlanId: core.expandedOtherPlanId,
		otherPlanDetails: expandedOtherPlanQuery.data,
		otherPlanLoading: expandedOtherPlanQuery.isLoading,
		otherPlanError: expandedOtherPlanQuery.error,
		expandedPlanData: expandedPlanQuery.data,
		expandedOtherPlanData: expandedOtherPlanQuery.data,
		recipeMap,
		today: params.today,
	};
}
