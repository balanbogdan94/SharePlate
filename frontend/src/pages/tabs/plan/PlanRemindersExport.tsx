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
};

export function PlanRemindersExport(props: PlanRemindersExportProps) {
	const { onExport, isExporting, errorMessage, draftItems, phase } = props;
	const showReview = draftItems.length > 0 || phase === 'reviewing' || phase === 'openingShortcut';
	return (
		<div className="space-y-2">
			<Button
				type="button"
				aria-label="Export to Reminders"
				onClick={onExport}
				disabled={isExporting}
				className="h-10 w-10 rounded-full bg-[#2f3338] px-4 text-sm font-bold text-[#7ce485] hover:bg-[#3a3f45] sm:text-base"
			>
				<SendIcon className="h-1 w-1" />
			</Button>
			{phase === 'preparing' && (
				<p className="text-xs text-[#98a0aa]">Preparing ingredient list...</p>
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
