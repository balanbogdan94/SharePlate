import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ExportPhase } from '@/pages/usePlanExport';
import {
	buildEditableReminderText,
	type EditableReminderItem,
	getEditableReminderValidationMessage,
} from '@/pages/tabs/plan/remindersExport';
import { Trash2 } from 'lucide-react';

type Props = {
	planId: string;
	phase: ExportPhase;
	draftItems: EditableReminderItem[];
	errorMessage: string | null;
	onUpdateQuantity: (itemId: string, quantity: string) => void;
	onDeleteDraft: (itemId: string) => void;
	onCancelDraft: () => void;
	onSendDraft: () => void;
};

type RowProps = Pick<Props, 'draftItems' | 'onUpdateQuantity' | 'onDeleteDraft'>;
type HeaderProps = Pick<Props, 'onCancelDraft' | 'onSendDraft'> & { actionDisabled: boolean };
type ActionProps = {
	actionDisabled: boolean;
	hasShare: boolean;
	onCopy: () => Promise<void>;
	onShare: () => Promise<void>;
};

function canShareText(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

async function copyToClipboard(text: string): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
		throw new Error('Clipboard is not available.');
	}
	await navigator.clipboard.writeText(text);
}

function statusForPhase(phase: ExportPhase, count: number): string | null {
	if (phase === 'preparing') return 'Preparing ingredient list...';
	if (phase === 'openingShortcut')
		return 'Opening Shortcuts... approve the prompt to create reminders.';
	if (phase === 'reviewing') return `${count} ${count === 1 ? 'ingredient' : 'ingredients'} ready.`;
	return null;
}

function ReviewHeader({ actionDisabled, onCancelDraft, onSendDraft }: HeaderProps) {
	return (
		<div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#7ce485]">
			<button type="button" onClick={onCancelDraft} className="transition hover:text-[#8df091]">
				Cancel
			</button>
			<p className="text-base font-semibold text-white">Review Ingredients</p>
			<button
				type="button"
				onClick={onSendDraft}
				disabled={actionDisabled}
				className={`transition hover:text-[#8df091] ${actionDisabled ? 'pointer-events-none text-[#59606a]' : ''}`}
			>
				Send
			</button>
		</div>
	);
}

function ReviewRows({ draftItems, onUpdateQuantity, onDeleteDraft }: RowProps) {
	return (
		<div className="max-h-[56dvh] space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-2.5">
			{draftItems.map((item) => (
				<div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#24262d] px-3 py-3">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold text-white">{item.name}</p>
						<p className="text-xs text-[#98a0aa]">{item.unitId}</p>
					</div>
					<input
						aria-label={`Quantity for ${item.name}`}
						inputMode="decimal"
						value={item.quantity}
						onChange={(event) => onUpdateQuantity(item.id, event.target.value)}
						className="h-10 w-20 rounded-xl border border-white/10 bg-[#101217] px-2 text-center text-sm font-semibold text-white"
					/>
					<button
						type="button"
						aria-label={`Remove ${item.name || 'ingredient'}`}
						onClick={() => onDeleteDraft(item.id)}
						className="flex h-9 w-9 items-center justify-center rounded-full bg-[#343740] text-[#ff9fbc]"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			))}
		</div>
	);
}

function ReviewActions({ actionDisabled, hasShare, onCopy, onShare }: ActionProps) {
	return (
		<div className="mt-3 flex gap-2">
			<Button
				type="button"
				onClick={() => void onCopy()}
				disabled={actionDisabled}
				className="h-11 flex-1 rounded-full bg-[#2f3338] px-3 text-xs font-bold text-[#9cc7ff] hover:bg-[#3a3f45]"
			>
				Copy
			</Button>
			{hasShare && (
				<Button
					type="button"
					onClick={() => void onShare()}
					disabled={actionDisabled}
					className="h-11 flex-1 rounded-full bg-[#2f3338] px-3 text-xs font-bold text-[#ff9fbc] hover:bg-[#3a3f45]"
				>
					Share
				</Button>
			)}
		</div>
	);
}

export function PlanRemindersReviewModal(props: Props) {
	const [status, setStatus] = useState<string | null>(null);
	const hasShare = useMemo(() => canShareText(), []);
	const validationMessage = getEditableReminderValidationMessage(props.draftItems);
	const reviewedText = buildEditableReminderText(props.draftItems);
	const visibleError = props.errorMessage ?? validationMessage;
	const actionDisabled = Boolean(validationMessage);
	const modalOpen = props.draftItems.length > 0 || props.phase === 'openingShortcut';
	const containerCls = modalOpen
		? 'pointer-events-auto opacity-100'
		: 'pointer-events-none opacity-0';
	const panelCls = modalOpen ? 'translate-y-0' : 'translate-y-8';
	const onCopy = async () => {
		if (validationMessage) return setStatus(validationMessage);
		try {
			await copyToClipboard(reviewedText);
			setStatus('Ingredient list copied.');
		} catch (error) {
			setStatus(
				error instanceof Error && error.message.trim()
					? error.message
					: 'Could not copy ingredient list.',
			);
		}
	};
	const onShare = async () => {
		if (!hasShare || validationMessage) return;
		try {
			await navigator.share({ title: 'SharePlate Ingredients', text: reviewedText });
			setStatus('Share sheet opened.');
		} catch {
			setStatus('Share cancelled.');
		}
	};
	return (
		<div
			className={`fixed inset-0 z-40 transition-all duration-200 ${containerCls}`}
			aria-hidden={!modalOpen}
			data-testid={`reminders-review-${props.planId}`}
		>
			<button
				type="button"
				aria-label="Close reminders review"
				className="absolute inset-0 w-full bg-black/70 backdrop-blur-sm"
				onClick={props.onCancelDraft}
			/>
			<div
				className={`absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-2xl rounded-t-[28px] border border-white/10 bg-[#1a1b20] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(0,0,0,0.65)] transition-transform duration-200 sm:bottom-3 sm:rounded-[2rem] ${panelCls}`}
			>
				<ReviewHeader
					actionDisabled={actionDisabled}
					onCancelDraft={props.onCancelDraft}
					onSendDraft={props.onSendDraft}
				/>
				<ReviewRows
					draftItems={props.draftItems}
					onUpdateQuantity={props.onUpdateQuantity}
					onDeleteDraft={props.onDeleteDraft}
				/>
				{statusForPhase(props.phase, props.draftItems.length) && (
					<p className="mt-3 text-xs text-[#98a0aa]">
						{statusForPhase(props.phase, props.draftItems.length)}
					</p>
				)}
				{visibleError && (
					<p className="mt-3 text-xs font-semibold text-[#ff9fbc]">{visibleError}</p>
				)}
				<ReviewActions
					actionDisabled={actionDisabled}
					hasShare={hasShare}
					onCopy={onCopy}
					onShare={onShare}
				/>
				{status && <p className="mt-2 text-xs text-[#98a0aa]">{status}</p>}
			</div>
		</div>
	);
}
