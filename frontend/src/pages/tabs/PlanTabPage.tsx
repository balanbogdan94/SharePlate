import { useNavigate } from '@tanstack/react-router';
import { CalendarRange, Plus, Sparkles, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanCurrentView } from '@/pages/tabs/plan/PlanCurrentView';
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
		<section className="relative h-full overflow-hidden p-3">
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
				{isError && (
					<Alert variant="destructive">
						<AlertTitle>Could not load plans</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{isLoading && <p className="text-sm text-[#98a0aa]">Loading plans...</p>}
				{noPlans && (
					<div className="space-y-5 rounded-2xl p-4">
						<div className="flex flex-col items-center py-4 text-center">
							<CalendarRange className="mb-4 h-12 w-12 text-[#7ce485]/60" />
							<h2 className="text-[1.75rem] font-extrabold text-white">No plans yet</h2>
							<p className="mt-2 text-sm text-[#afb5be]">
								Use the + button to create your first household meal plan and start organising your
								week.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-2xl border border-l-2 border-white/10 border-l-[#9cc7ff] bg-[#1a1c22] p-3">
								<Sparkles className="mb-2 h-5 w-5 text-[#9cc7ff]" />
								<p className="text-base font-extrabold text-white">Smart Suggester</p>
								<p className="mt-1 text-sm text-[#afb5be]">
									AI-curated meals based on your pantry.
								</p>
							</div>
							<div className="rounded-2xl border border-l-2 border-white/10 border-l-[#ff9fbc] bg-[#1a1c22] p-3">
								<Users className="mb-2 h-5 w-5 text-[#ff9fbc]" />
								<p className="text-base font-extrabold text-white">Family Sync</p>
								<p className="mt-1 text-sm text-[#afb5be]">Real-time updates for every member.</p>
							</div>
						</div>
					</div>
				)}
				<TabsContent value="current">
					{noActive && (
						<div className="flex flex-col items-center py-8 text-center">
							<CalendarRange className="mb-4 h-10 w-10 text-[#7ce485]/60" />
							<h2 className="text-[1.75rem] font-extrabold text-white">No active plan today</h2>
							<p className="mt-2 text-sm text-[#afb5be]">
								Tap + to create a plan and start organising your week.
							</p>
						</div>
					)}
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
			{showFab && (
				<button type="button" aria-label="Create plan" onClick={onCreate} className="sp-fab-button">
					<Plus className="sp-fab-icon" />
				</button>
			)}
		</section>
	);
}
