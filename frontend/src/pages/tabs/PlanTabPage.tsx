import { useNavigate } from '@tanstack/react-router';
import { Plus, Sparkles, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PlanCurrentView } from '@/pages/tabs/plan/PlanCurrentView';
import { PlanOtherView } from '@/pages/tabs/plan/PlanOtherView';
import { usePlanTab } from '@/pages/usePlanTab';

export function PlanTabPage() {
	const navigate = useNavigate();
	const onCreate = () => void navigate({ to: '/plans/create-plan' });
	const { segment, setSegment, planStatus, visibleCurrentPlan, groupedPlans, expandedOtherPlanId, otherPlanDetails, otherPlanLoading, otherPlanError, expandedOtherDayDate, onTogglePlan, expandedDayDate, toggleDay, toggleOtherDay, recipeMap, today, exportPropsFor, otherPlanExportId } = usePlanTab();
	const { noPlans, noActive, showOtherPlans, showFab, isError, isLoading, error } = planStatus;

	return (
		<section className='relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(38,52,84,0.26),_rgba(8,10,14,1)_45%)] p-3 pb-24 text-[#f5f5f5] sm:rounded-[2rem] sm:p-5 sm:pb-28'>
			<div className='absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#6fdb68]/10 blur-3xl sm:top-24 sm:h-52 sm:w-52' />
			<div className='relative space-y-4 sm:space-y-5'>
				<div className='grid grid-cols-2 rounded-full border border-white/10 bg-[#1d2025] p-1'>
					<button type='button' onClick={() => setSegment('current')} className={`min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-3 sm:text-base ${segment === 'current' ? 'bg-[#2b2f35] text-[#7ce485]' : 'text-[#808791]'}`}>Current Plan</button>
					<button type='button' onClick={() => setSegment('other')} className={`min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 sm:py-3 sm:text-base ${segment === 'other' ? 'bg-[#2b2f35] text-[#7ce485]' : 'text-[#808791]'}`}>Other Plans</button>
				</div>
				{isError && <Alert variant='destructive'><AlertTitle>Could not load plans</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
				{isLoading && <p className='text-sm text-[#98a0aa]'>Loading plans...</p>}
				{noPlans && (
					<div className='space-y-5 rounded-2xl border border-white/10 bg-[#14161c]/80 p-4'>
						<div className='text-center'><h2 className='mt-2 text-[1.75rem] font-extrabold text-white'>No plans yet</h2><p className='mt-2 text-sm text-[#afb5be]'>Start your culinary journey by creating a shared household meal plan.</p></div>
						<Button type='button' onClick={onCreate} className='h-12 w-full rounded-full bg-[#2f3338] text-base font-extrabold text-[#7ce485] hover:bg-[#3a3f45]'><Plus className='mr-2 h-5 w-5' />Create Plan</Button>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='rounded-2xl border border-l-2 border-white/10 border-l-[#9cc7ff] bg-[#1a1c22] p-3'><Sparkles className='mb-2 h-5 w-5 text-[#9cc7ff]' /><p className='text-base font-extrabold text-white'>Smart Suggester</p><p className='mt-1 text-sm text-[#afb5be]'>AI-curated meals based on your pantry.</p></div>
							<div className='rounded-2xl border border-l-2 border-white/10 border-l-[#ff9fbc] bg-[#1a1c22] p-3'><Users className='mb-2 h-5 w-5 text-[#ff9fbc]' /><p className='text-base font-extrabold text-white'>Family Sync</p><p className='mt-1 text-sm text-[#afb5be]'>Real-time updates for every member.</p></div>
						</div>
					</div>
				)}
				{noActive && (
					<div className='space-y-5 rounded-2xl border border-white/10 bg-[#14161c]/80 p-4'>
						<div className='text-center'><h2 className='mt-2 text-[1.75rem] font-extrabold text-white'>No active plan today</h2><p className='mt-2 text-sm text-[#afb5be]'>Create a plan now to start your week.</p></div>
						<Button type='button' onClick={onCreate} className='h-12 w-full rounded-full bg-[#2f3338] text-base font-extrabold text-[#7ce485] hover:bg-[#3a3f45]'><Plus className='mr-2 h-5 w-5' />Create Plan</Button>
					</div>
				)}
				{visibleCurrentPlan && <PlanCurrentView plan={visibleCurrentPlan} expandedDayDate={expandedDayDate} onToggleDay={toggleDay} recipeMap={recipeMap} exportProps={exportPropsFor(visibleCurrentPlan.id)} />}
				{showOtherPlans && <PlanOtherView futurePlans={groupedPlans.future} pastPlans={groupedPlans.past} expandedOtherPlanId={expandedOtherPlanId} details={otherPlanDetails} detailsLoading={otherPlanLoading} detailsError={otherPlanError} expandedOtherDayDate={expandedOtherDayDate} onTogglePlan={onTogglePlan} onToggleDay={toggleOtherDay} recipeMap={recipeMap} today={today} exportProps={exportPropsFor(otherPlanExportId)} />}
			</div>
			{showFab && (
				<button type='button' aria-label='Create plan' onClick={onCreate} className='fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6fdb68] text-[#05240f] shadow-[0_18px_30px_rgba(111,219,104,0.35)] sm:bottom-32 sm:right-8 sm:h-14 sm:w-14'>
					<Plus className='h-6 w-6 sm:h-7 sm:w-7' />
				</button>
			)}
		</section>
	);
}
