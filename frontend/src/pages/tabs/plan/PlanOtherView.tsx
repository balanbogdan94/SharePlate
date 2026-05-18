import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, PenLine } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';
import { formatDisplayDate, isFuturePlan, toErrorMessage } from '@/pages/tabs/plan/planUtils';
import { PlanDaySection } from '@/pages/tabs/plan/PlanDaySection';
import { PlanRemindersExport } from '@/pages/tabs/plan/PlanRemindersExport';

type ExportProps = {
	isExporting: boolean;
	errorMessage: string | null;
	fallbackText: string | null;
	onExport: () => Promise<void>;
};

type ExpandedProps = {
	plan: PlanListItem;
	details: PlanDetails | undefined;
	detailsLoading: boolean;
	detailsError: unknown;
	expandedDayDate: string | null;
	onToggleDay: (date: string) => void;
	recipeMap: Map<string, RecipeSummary>;
	today: string;
	exportProps: ExportProps;
};

function ExpandedPlanContent({ plan, details, detailsLoading, detailsError, expandedDayDate, onToggleDay, recipeMap, today, exportProps }: ExpandedProps) {
	const navigate = useNavigate();
	const activeDayDate = details ? (expandedDayDate ?? details.days[0]?.date ?? null) : null;

	return (
		<div className='space-y-2 pb-4'>
			{detailsLoading && <p className='text-sm text-[#98a0aa]'>Loading plan...</p>}
			{Boolean(detailsError) && (
				<Alert variant='destructive'>
					<AlertTitle>Could not load plan details</AlertTitle>
					<AlertDescription>{toErrorMessage(detailsError, 'Please try again.')}</AlertDescription>
				</Alert>
			)}
			{details && (
				<>
					<div className='flex items-center justify-between'>
						<PlanRemindersExport planId={details.id} onExport={exportProps.onExport} isExporting={exportProps.isExporting} errorMessage={exportProps.errorMessage} fallbackText={exportProps.fallbackText} />
						{isFuturePlan(plan, today) && (
							<button type='button' aria-label='Edit plan' onClick={() => void navigate({ to: '/plans/$planId/edit', params: { planId: plan.id } })} className='flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#7ce485]'>
								<PenLine className='h-4 w-4' />
							</button>
						)}
					</div>
					{details.days.map((day) => (
						<PlanDaySection key={day.date} day={day} isExpanded={activeDayDate === day.date} onToggle={() => onToggleDay(day.date)} recipeMap={recipeMap} planId={plan.id} />
					))}
				</>
			)}
		</div>
	);
}

type AccordionProps = ExpandedProps & {
	isExpanded: boolean;
	onToggle: () => void;
};

function OtherPlanAccordion({ plan, isExpanded, onToggle, ...rest }: AccordionProps) {
	return (
		<div className='border-b border-white/10 last:border-0'>
			<button type='button' onClick={onToggle} className='flex w-full items-center justify-between py-4 text-left'>
				<p className='text-lg font-bold text-[#7ce485]'>
					{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
				</p>
				{isExpanded ? <ChevronUp className='h-5 w-5 shrink-0 text-[#8a9098]' /> : <ChevronDown className='h-5 w-5 shrink-0 text-[#8a9098]' />}
			</button>
			{isExpanded && <ExpandedPlanContent plan={plan} {...rest} />}
		</div>
	);
}

type Props = {
	futurePlans: PlanListItem[];
	pastPlans: PlanListItem[];
	expandedOtherPlanId: string | null;
	details: PlanDetails | undefined;
	detailsLoading: boolean;
	detailsError: unknown;
	expandedOtherDayDate: string | null;
	onTogglePlan: (planId: string) => void;
	onToggleDay: (date: string) => void;
	recipeMap: Map<string, RecipeSummary>;
	today: string;
	exportProps: ExportProps;
};

export function PlanOtherView({ futurePlans, pastPlans, expandedOtherPlanId, details, detailsLoading, detailsError, expandedOtherDayDate, onTogglePlan, onToggleDay, recipeMap, today, exportProps }: Props) {
	const makeAccordion = (plan: PlanListItem) => (
		<OtherPlanAccordion key={plan.id} plan={plan} isExpanded={expandedOtherPlanId === plan.id} onToggle={() => onTogglePlan(plan.id)} today={today} details={expandedOtherPlanId === plan.id ? details : undefined} detailsLoading={expandedOtherPlanId === plan.id ? detailsLoading : false} detailsError={expandedOtherPlanId === plan.id ? detailsError : null} expandedDayDate={expandedOtherPlanId === plan.id ? expandedOtherDayDate : null} onToggleDay={onToggleDay} recipeMap={recipeMap} exportProps={exportProps} />
	);

	return (
		<div className='space-y-6'>
			{futurePlans.length > 0 && (
				<div>
					<p className='mb-2 text-2xl font-extrabold text-white'>Future plans</p>
					{futurePlans.map(makeAccordion)}
				</div>
			)}
			{pastPlans.length > 0 && (
				<div>
					<p className='mb-2 text-2xl font-extrabold text-white'>Past plans</p>
					{pastPlans.map(makeAccordion)}
				</div>
			)}
			{futurePlans.length === 0 && pastPlans.length === 0 && (
				<p className='text-sm text-[#98a0aa]'>No other plans yet.</p>
			)}
		</div>
	);
}
