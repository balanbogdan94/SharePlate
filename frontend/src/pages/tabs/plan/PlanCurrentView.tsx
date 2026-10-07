import { PlanOptions } from './PlanOptions';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { ExportPhase } from '@/pages/usePlanExport';
import type { EditableReminderItem } from '@/pages/tabs/plan/remindersExport';
import type { PlanDetails } from '@/pages/tabs/plan/types';
import { formatDisplayDate } from '@/pages/tabs/plan/planUtils';
import { PlanDaySection } from '@/pages/tabs/plan/PlanDaySection';
import { PlanRemindersExport } from '@/pages/tabs/plan/PlanRemindersExport';

type ExportProps = {
	planId: string;
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

type Props = {
	plan: PlanDetails;
	expandedDayDates: ReadonlySet<string> | null;
	onToggleDay: (date: string, defaultDate: string | null) => void;
	recipeMap: Map<string, RecipeSummary>;
	exportProps: ExportProps;
};

export function PlanCurrentView({
	plan,
	expandedDayDates,
	onToggleDay,
	recipeMap,
	exportProps,
}: Props) {
	const defaultExpandedDayDate = plan.days[0]?.date ?? null;

	return (
		<div className="animate-in fade-in flex flex-col gap-4 duration-500">
			<div className="flex items-center justify-between gap-2 px-1 py-0.5">
				<div className="flex min-w-0 items-center">
					<p className="truncate text-sm font-semibold text-stone-500 dark:text-sp-text-secondary">
						{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
					</p>
					<PlanOptions plan={plan} />
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<PlanRemindersExport
						planDateLabel={`${formatDisplayDate(plan.startDate)} – ${formatDisplayDate(plan.endDate)}`}
						planId={exportProps.planId}
						onExport={exportProps.onExport}
						isExporting={exportProps.isExporting}
						phase={exportProps.phase}
						draftItems={exportProps.draftItems}
						errorMessage={exportProps.errorMessage}
						onUpdateQuantity={exportProps.onUpdateQuantity}
						onDeleteDraft={exportProps.onDeleteDraft}
						onCancelDraft={exportProps.onCancelDraft}
						onSendDraft={exportProps.onSendDraft}
						compact
						subtle
					/>
				</div>
			</div>
			<div className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-4 shadow-xs dark:divide-sp-separator dark:border-sp-border dark:bg-sp-surface">
				{plan.days.map((day) => (
					<PlanDaySection
						key={day.date}
						day={day}
						isExpanded={
							expandedDayDates ? expandedDayDates.has(day.date) : day.date === defaultExpandedDayDate
						}
						onToggle={() => onToggleDay(day.date, defaultExpandedDayDate)}
						recipeMap={recipeMap}
						planId={plan.id}
					/>
				))}
			</div>
		</div>
	);
}
