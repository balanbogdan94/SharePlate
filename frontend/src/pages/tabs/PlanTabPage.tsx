import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanCurrentView } from '@/pages/tabs/plan/PlanCurrentView';
import { PlanEmptyState, PlanNoActiveState } from '@/pages/tabs/plan/PlanEmptyState';
import { PlanOtherView } from '@/pages/tabs/plan/PlanOtherView';
import { usePlanTab } from '@/pages/usePlanTab';

const tabTriggerClassName =
	'min-h-9 px-3 py-1.5 text-xs sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm rounded-full data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm data-[state=inactive]:text-stone-500 dark:data-[state=active]:bg-sp-surface-active dark:data-[state=active]:text-sp-primary dark:data-[state=inactive]:text-sp-text-tertiary';

export function PlanTabPage() {
	const navigate = useNavigate();
	const onCreate = () => void navigate({ to: '/plans/create-plan' });
	const {
		segment,
		setSegment,
		planStatus,
		visibleCurrentPlan,
		groupedPlans,
		expandedOtherPlanId,
		otherPlanDetails,
		otherPlanLoading,
		otherPlanError,
		expandedOtherDayDate,
		onTogglePlan,
		expandedDayDate,
		toggleDay,
		toggleOtherDay,
		recipeMap,
		today,
		exportPropsFor,
		otherPlanExportId,
	} = usePlanTab();
	const { noPlans, noActive, showFab, isError, isLoading, error } = planStatus;

	return (
		<section className="relative flex h-full flex-col overflow-hidden p-3 pt-4">
			{isError && (
				<Alert variant="destructive">
					<AlertTitle>Could not load plans</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{isLoading && (
				<p className="text-sm text-stone-500 dark:text-sp-text-secondary">Loading plans...</p>
			)}
			{!isLoading && !isError && noPlans && (
				<div className="flex flex-1 items-center justify-center overflow-y-auto">
					<PlanEmptyState onCreate={onCreate} />
				</div>
			)}
			{!isLoading && !isError && !noPlans && (
				<Tabs
					value={segment}
					onValueChange={(value) => setSegment(value as 'current' | 'other')}
					className="flex min-h-0 flex-1 flex-col gap-4"
				>
					<TabsList className="grid w-full shrink-0 grid-cols-2 rounded-full border border-stone-200 bg-stone-100 p-1 dark:border-sp-border dark:bg-sp-surface">
						<TabsTrigger value="current" className={tabTriggerClassName}>
							Current Plan
						</TabsTrigger>
						<TabsTrigger value="other" className={tabTriggerClassName}>
							Other Plans
						</TabsTrigger>
					</TabsList>
					<TabsContent value="current" className="mt-0 flex-1 overflow-y-auto">
						{noActive && <PlanNoActiveState />}
						{visibleCurrentPlan && (
							<PlanCurrentView
								plan={visibleCurrentPlan}
								expandedDayDate={expandedDayDate}
								onToggleDay={toggleDay}
								recipeMap={recipeMap}
								exportProps={exportPropsFor(visibleCurrentPlan.id)}
							/>
						)}
					</TabsContent>
					<TabsContent value="other" className="mt-0 flex-1 overflow-y-auto">
						<PlanOtherView
							futurePlans={groupedPlans.future}
							pastPlans={groupedPlans.past}
							expandedOtherPlanId={expandedOtherPlanId}
							details={otherPlanDetails}
							detailsLoading={otherPlanLoading}
							detailsError={otherPlanError}
							expandedOtherDayDate={expandedOtherDayDate}
							onTogglePlan={onTogglePlan}
							onToggleDay={toggleOtherDay}
							recipeMap={recipeMap}
							today={today}
							exportProps={exportPropsFor(otherPlanExportId)}
						/>
					</TabsContent>
				</Tabs>
			)}
			{showFab && (
				<button type="button" aria-label="Create plan" onClick={onCreate} className="sp-fab-button">
					<Plus className="sp-fab-icon" />
				</button>
			)}
		</section>
	);
}
