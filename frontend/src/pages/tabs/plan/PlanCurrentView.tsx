import { useNavigate } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
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
	expandedDayDate: string | null;
	onToggleDay: (date: string) => void;
	recipeMap: Map<string, RecipeSummary>;
	exportProps: ExportProps;
};

export function PlanCurrentView({
	plan,
	expandedDayDate,
	onToggleDay,
	recipeMap,
	exportProps,
}: Props) {
	const navigate = useNavigate();
	const activeExpandedDayDate = expandedDayDate ?? plan.days[0]?.date ?? null;

	return (
		<div className="animate-in fade-in flex flex-col gap-4 duration-500">
			<div className="flex items-center justify-between gap-2 px-1 py-0.5">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-stone-500 dark:text-sp-text-secondary">
						{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<button
						type="button"
						aria-label="Edit plan"
						onClick={() =>
							void navigate({ to: '/plans/$planId/edit', params: { planId: plan.id } })
						}
						className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-stone-500 transition hover:bg-stone-100 active:scale-95 dark:text-sp-text-secondary dark:hover:bg-sp-surface-active"
					>
						<PenLine className="h-3.5 w-3.5" />
					</button>
					<PlanRemindersExport
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
			<div className="divide-y divide-stone-100 rounded-3xl border border-stone-200 bg-white px-4 shadow-sm dark:divide-sp-separator dark:border-sp-border dark:bg-sp-surface">
				{plan.days.map((day) => (
					<PlanDaySection
						key={day.date}
						day={day}
						isExpanded={activeExpandedDayDate === day.date}
						onToggle={() => onToggleDay(day.date)}
						recipeMap={recipeMap}
						planId={plan.id}
					/>
				))}
			</div>
		</div>
	);
}
