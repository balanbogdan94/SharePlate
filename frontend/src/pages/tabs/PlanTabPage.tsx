import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanCurrentView } from '@/pages/tabs/plan/PlanCurrentView';
import { PlanEmptyState, PlanNoActiveState } from '@/pages/tabs/plan/PlanEmptyState';
import { PlanOtherView } from '@/pages/tabs/plan/PlanOtherView';
import { usePlanTab } from '@/pages/usePlanTab';

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
		<section className="relative flex h-full flex-col overflow-hidden p-3">
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
					className="relative space-y-4 sm:space-y-5"
				>
					<TabsList className="grid w-full grid-cols-2 rounded-full border">
						<TabsTrigger
							value="current"
							className="data-[state=active]:bg-[#2b2f35] data-[state=active]:text-[#7ce485] data-[state=active]:shadow-none data-[state=inactive]:text-[#808791]"
						>
							Current Plan
						</TabsTrigger>
						<TabsTrigger
							value="other"
							className="data-[state=active]:bg-[#2b2f35] data-[state=active]:text-[#7ce485] data-[state=active]:shadow-none data-[state=inactive]:text-[#808791]"
						>
							Other Plans
						</TabsTrigger>
					</TabsList>
					<TabsContent value="current">
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
					<TabsContent value="other">
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
