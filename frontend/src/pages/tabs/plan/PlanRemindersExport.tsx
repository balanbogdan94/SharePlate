import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ExportPhase } from '@/pages/usePlanExport';
import type { EditableReminderItem } from '@/pages/tabs/plan/remindersExport';
import { PlanRemindersReviewModal } from '@/pages/tabs/plan/PlanRemindersReviewModal';
import { SendIcon } from 'lucide-react';

type PlanRemindersExportProps = {
	planId: string;
	onExport: () => Promise<void>;
	isExporting: boolean;
	phase: ExportPhase;
	draftItems: EditableReminderItem[];
	errorMessage: string | null;
	onUpdateQuantity: (itemId: string, quantity: string) => void;
	onDeleteDraft: (itemId: string) => void;
	onCancelDraft: () => void;
	onSendDraft: () => void;
	compact?: boolean;
	subtle?: boolean;
};

export function PlanRemindersExport(props: PlanRemindersExportProps) {
	const {
		onExport,
		isExporting,
		errorMessage,
		draftItems,
		phase,
		compact = false,
		subtle = false,
	} = props;
	const showReview = draftItems.length > 0 || phase === 'reviewing' || phase === 'openingShortcut';
	return (
		<div className="space-y-2">
			<Button
				type="button"
				aria-label="Export to Reminders"
				onClick={onExport}
				disabled={isExporting}
				className={`${subtle ? 'h-8 w-8 bg-transparent text-stone-500 hover:bg-stone-100 dark:text-sp-text-secondary dark:hover:bg-sp-surface-active' : `${compact ? 'h-9 w-9' : 'h-10 w-10'} bg-green-600 text-white hover:bg-green-700 dark:bg-sp-primary dark:text-sp-text-on-primary dark:hover:bg-sp-primary-hover`} rounded-full p-0 shadow-none transition active:scale-95`}
			>
				<SendIcon className={subtle ? 'h-3.5 w-3.5' : compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
			</Button>
			{phase === 'preparing' && (
				<p className="text-xs text-stone-500 dark:text-sp-text-secondary">
					Preparing ingredient list...
				</p>
			)}
			{errorMessage && !showReview && (
				<Alert variant="destructive">
					<AlertTitle>Could not export reminders</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}
			{showReview && <PlanRemindersReviewModal {...props} />}
		</div>
	);
}
