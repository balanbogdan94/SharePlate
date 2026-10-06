import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ExportPhase } from '@/pages/usePlanExport';
import type { EditableReminderItem } from '@/pages/tabs/plan/remindersExport';
import { PlanRemindersReviewModal } from '@/pages/tabs/plan/PlanRemindersReviewModal';
import { LoaderCircle, ShoppingBasket } from 'lucide-react';

type PlanRemindersExportProps = {
	planId: string;
	planDateLabel?: string;
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
				aria-label="Shopping list"
				onClick={onExport}
				disabled={isExporting}
				className={`${subtle ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-sp-surface-active dark:text-sp-text-primary dark:hover:bg-sp-surface-hover' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-sp-primary-subtle dark:text-sp-primary dark:hover:bg-sp-surface-active'} ${compact ? 'h-9' : 'h-10'} gap-1.5 rounded-full px-3 text-xs font-semibold shadow-none transition active:scale-95`}
			>
				{isExporting ? (
					<LoaderCircle className="h-4 w-4 animate-spin" />
				) : (
					<ShoppingBasket className="h-4 w-4" />
				)}
				Shopping list
			</Button>
			{phase === 'preparing' && (
				<p className="text-xs text-stone-500 dark:text-sp-text-secondary">
					Preparing ingredient list...
				</p>
			)}
			{errorMessage && !showReview && (
				<Alert variant="destructive">
					<AlertTitle>Could not prepare shopping list</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
					<button
						type="button"
						onClick={() => void onExport()}
						className="mt-2 text-sm font-semibold underline"
					>
						Retry
					</button>
				</Alert>
			)}
			{showReview && <PlanRemindersReviewModal {...props} />}
		</div>
	);
}
