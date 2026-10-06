import { CalendarRange, ChevronDown, ChevronUp } from 'lucide-react';
import { PlanOptions } from './PlanOptions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { ExportPhase } from '@/pages/usePlanExport';
import type { EditableReminderItem } from '@/pages/tabs/plan/remindersExport';
import type { PlanDetails, PlanListItem } from '@/pages/tabs/plan/types';
import { formatDisplayDate, isFuturePlan, toErrorMessage } from '@/pages/tabs/plan/planUtils';
import { PlanDaySection } from '@/pages/tabs/plan/PlanDaySection';
import { PlanRemindersExport } from '@/pages/tabs/plan/PlanRemindersExport';

type ExportProps = {
	isExporting: boolean;
	phase: ExportPhase;
	draftItems: EditableReminderItem[];
	errorMessage: string | null;
	onExport: () => Promise<void>;
	onUpdateQuantity: (itemId: string, quantity: string) => void;
	onDeleteDraft: (itemId: string) => void;
	onCancelDraft: () => void;
	onSendDraft: () => void;
};

type ExpandedProps = {
	plan: PlanListItem;
	details: PlanDetails | undefined;
	detailsLoading: boolean;
	detailsError: unknown;
	expandedDayDates: ReadonlySet<string> | null;
	onToggleDay: (date: string, defaultDate: string | null) => void;
	recipeMap: Map<string, RecipeSummary>;
	today: string;
	exportProps: ExportProps;
};

function ExpandedPlanContent({
	plan,
	details,
	detailsLoading,
	detailsError,
	expandedDayDates,
	onToggleDay,
	recipeMap,
	today,
	exportProps,
}: ExpandedProps) {
	const defaultExpandedDayDate = details?.days[0]?.date ?? null;

	return (
		<div className="space-y-3 pb-4">
			{detailsLoading && (
				<p className="text-sm text-stone-500 dark:text-sp-text-secondary">Loading plan...</p>
			)}
			{Boolean(detailsError) && (
				<Alert variant="destructive">
					<AlertTitle>Could not load plan details</AlertTitle>
					<AlertDescription>{toErrorMessage(detailsError, 'Please try again.')}</AlertDescription>
				</Alert>
			)}
			{details && (
				<>
					<div className="flex items-center justify-between gap-2">
						<PlanRemindersExport
							planDateLabel={`${formatDisplayDate(plan.startDate)} – ${formatDisplayDate(plan.endDate)}`}
							planId={details.id}
							onExport={exportProps.onExport}
							isExporting={exportProps.isExporting}
							phase={exportProps.phase}
							draftItems={exportProps.draftItems}
							errorMessage={exportProps.errorMessage}
							onUpdateQuantity={exportProps.onUpdateQuantity}
							onDeleteDraft={exportProps.onDeleteDraft}
							onCancelDraft={exportProps.onCancelDraft}
							onSendDraft={exportProps.onSendDraft}
						/>
						<PlanOptions plan={plan} canEdit={isFuturePlan(plan, today)} />
					</div>
					<div className="divide-y divide-stone-100 dark:divide-sp-separator">
						{details.days.map((day) => (
							<PlanDaySection
								key={day.date}
								day={day}
								isExpanded={
									expandedDayDates
										? expandedDayDates.has(day.date)
										: day.date === defaultExpandedDayDate
								}
								onToggle={() => onToggleDay(day.date, defaultExpandedDayDate)}
								recipeMap={recipeMap}
								planId={plan.id}
							/>
						))}
					</div>
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
		<div>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={isExpanded}
				className="flex w-full items-center justify-between py-4 text-left"
			>
				<p className="text-base font-bold text-stone-900 dark:text-sp-text-primary">
					{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
				</p>
				{isExpanded ? (
					<ChevronUp className="h-5 w-5 shrink-0 text-stone-400 dark:text-sp-icon-secondary" />
				) : (
					<ChevronDown className="h-5 w-5 shrink-0 text-stone-400 dark:text-sp-icon-secondary" />
				)}
			</button>
			{isExpanded && <ExpandedPlanContent plan={plan} {...rest} />}
		</div>
	);
}

function PlanOtherEmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
			<div className="relative">
				<div className="absolute inset-0 -z-10 rounded-full bg-green-400/30 blur-2xl dark:bg-green-500/20" />
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-sp-primary-subtle">
					<CalendarRange className="h-6 w-6 text-green-600 dark:text-sp-primary" />
				</div>
			</div>
			<div className="space-y-1">
				<h2 className="text-base font-bold text-stone-900 dark:text-sp-text-primary">
					No other plans yet
				</h2>
				<p className="max-w-[16rem] text-sm text-stone-500 dark:text-sp-text-secondary">
					Plans outside this week will show up here once you create them.
				</p>
			</div>
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
	expandedOtherDayDates: ReadonlySet<string> | null;
	onTogglePlan: (planId: string) => void;
	onToggleDay: (date: string, defaultDate: string | null) => void;
	recipeMap: Map<string, RecipeSummary>;
	today: string;
	exportProps: ExportProps;
};

export function PlanOtherView({
	futurePlans,
	pastPlans,
	expandedOtherPlanId,
	details,
	detailsLoading,
	detailsError,
	expandedOtherDayDates,
	onTogglePlan,
	onToggleDay,
	recipeMap,
	today,
	exportProps,
}: Props) {
	const makeAccordion = (plan: PlanListItem) => (
		<OtherPlanAccordion
			key={plan.id}
			plan={plan}
			isExpanded={expandedOtherPlanId === plan.id}
			onToggle={() => onTogglePlan(plan.id)}
			today={today}
			details={expandedOtherPlanId === plan.id ? details : undefined}
			detailsLoading={expandedOtherPlanId === plan.id ? detailsLoading : false}
			detailsError={expandedOtherPlanId === plan.id ? detailsError : null}
			expandedDayDates={expandedOtherPlanId === plan.id ? expandedOtherDayDates : null}
			onToggleDay={onToggleDay}
			recipeMap={recipeMap}
			exportProps={exportProps}
		/>
	);

	if (futurePlans.length === 0 && pastPlans.length === 0) {
		return <PlanOtherEmptyState />;
	}

	return (
		<div className="animate-in fade-in flex flex-col gap-6 duration-500">
			{futurePlans.length > 0 && (
				<div>
					<p className="mb-2 text-lg font-extrabold text-stone-900 dark:text-sp-text-primary">
						Future plans
					</p>
					<div className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-4 shadow-sm dark:divide-sp-separator dark:border-sp-border dark:bg-sp-surface">
						{futurePlans.map(makeAccordion)}
					</div>
				</div>
			)}
			{pastPlans.length > 0 && (
				<div>
					<p className="mb-2 text-lg font-extrabold text-stone-900 dark:text-sp-text-primary">
						Past plans
					</p>
					<div className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-4 shadow-sm dark:divide-sp-separator dark:border-sp-border dark:bg-sp-surface">
						{pastPlans.map(makeAccordion)}
					</div>
				</div>
			)}
		</div>
	);
}
