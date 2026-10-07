import { useState } from 'react';
import { usePlanSheet } from './usePlanSheet';
import {
	ArrowLeft,
	Check,
	ChevronRight,
	Copy,
	ListChecks,
	Minus,
	Share,
	ShoppingBasket,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportPhase } from '@/pages/usePlanExport';
import {
	buildEditableReminderText,
	formatIngredientUnit,
	type EditableReminderItem,
	getEditableReminderValidationMessage,
} from '@/pages/tabs/plan/remindersExport';

type Props = {
	planId: string;
	planDateLabel?: string;
	phase: ExportPhase;
	draftItems: EditableReminderItem[];
	errorMessage: string | null;
	onUpdateQuantity: (itemId: string, quantity: string) => void;
	onDeleteDraft: (itemId: string) => void;
	onCancelDraft: () => void;
	onSendDraft: () => void;
};

function ReviewRows({
	draftItems,
	onUpdateQuantity,
	onDeleteDraft,
}: Pick<Props, 'draftItems' | 'onUpdateQuantity' | 'onDeleteDraft'>) {
	return (
		<div className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-sp-separator dark:bg-sp-surface">
			{draftItems.map((item) => (
				<div key={item.id} className="flex min-h-16 items-center gap-2 py-2 pl-4 pr-2">
					<p className="min-w-0 flex-1 wrap-break-word text-[15px] font-medium">{item.name}</p>
					<div className="flex shrink-0 items-center gap-1">
						<input
							aria-label={`Quantity for ${item.name}`}
							inputMode="decimal"
							value={item.quantity}
							onChange={(event) => onUpdateQuantity(item.id, event.target.value)}
							className="h-11 w-16 rounded-lg bg-transparent px-1 text-right text-[16px] tabular-nums outline-hidden focus:bg-stone-100 focus:ring-2 focus:ring-green-600 dark:focus:bg-sp-surface-active dark:focus:ring-sp-primary"
						/>
						<span className="text-sm text-stone-500 dark:text-sp-text-secondary">
							{formatIngredientUnit(item.unitId)}
						</span>
					</div>
					<button
						type="button"
						aria-label={`Remove ${item.name}`}
						onClick={() => onDeleteDraft(item.id)}
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-sp-surface-active"
					>
						<Minus className="h-4 w-4" />
					</button>
				</div>
			))}
		</div>
	);
}

function ShortcutInstructions({
	phase,
	onSendDraft,
	disabled,
}: Pick<Props, 'phase' | 'onSendDraft'> & { disabled: boolean }) {
	return (
		<div className="space-y-5">
			<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-sp-primary-subtle dark:text-sp-primary">
				<ListChecks className="h-7 w-7" />
			</div>
			<div>
				<h3 className="text-xl font-semibold">Your list, in Apple Reminders</h3>
				<p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-sp-text-secondary">
					An Apple Shortcut creates one reminder for each ingredient. This works on iPhone, iPad and
					Mac with Shortcuts installed.
				</p>
			</div>
			<ol className="list-decimal space-y-3 rounded-2xl bg-white p-5 pl-10 text-sm leading-relaxed dark:bg-sp-surface">
				<li>
					Create a shortcut named <strong>SharePlate Add To Reminders</strong>.
				</li>
				<li>Split the shortcut input by new lines.</li>
				<li>Repeat with each line and add a new reminder to your preferred list.</li>
			</ol>
			<p className="text-xs leading-relaxed text-stone-500 dark:text-sp-text-secondary">
				Already set up? Open your shortcut below and approve any prompts. SharePlate cannot confirm
				whether reminders were created.
			</p>
			<Button
				type="button"
				disabled={disabled}
				onClick={onSendDraft}
				className="h-12 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 dark:bg-sp-primary dark:text-sp-text-on-primary"
			>
				Open Shortcut
			</Button>
			{phase === 'openingShortcut' && (
				<p role="status" className="text-sm text-stone-500 dark:text-sp-text-secondary">
					Opening Shortcuts. If nothing happens, check that your shortcut is installed, or go back
					to Copy / Share.
				</p>
			)}
		</div>
	);
}

export function PlanRemindersReviewModal(props: Props) {
	const { dialogProps, closeModal } = usePlanSheet(props.onCancelDraft);
	const [shortcutView, setShortcutView] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const hasShare = typeof navigator.share === 'function';
	const validationMessage = getEditableReminderValidationMessage(props.draftItems);
	const disabled = Boolean(validationMessage) || busy;
	const text = `Shopping list${props.planDateLabel ? ` · ${props.planDateLabel}` : ''}\n\n${buildEditableReminderText(props.draftItems)}`;
	const runAction = async (action: 'copy' | 'share') => {
		setStatus(null);
		setActionError(null);
		setBusy(true);
		try {
			if (action === 'copy') {
				if (!navigator.clipboard?.writeText)
					throw new Error('Clipboard is unavailable. Try sharing this list instead.');
				await navigator.clipboard.writeText(text);
				setStatus('List copied');
			} else {
				await navigator.share({ title: 'SharePlate shopping list', text });
			}
		} catch (error) {
			const cancelled =
				action === 'share' &&
				typeof error === 'object' &&
				error !== null &&
				'name' in error &&
				error.name === 'AbortError';
			if (!cancelled) {
				setActionError(
					error instanceof Error && error.message.trim()
						? error.message
						: 'Could not export your list. Please try again.',
				);
			}
		} finally {
			setBusy(false);
		}
	};
	return (
		<dialog
			{...dialogProps}
			aria-labelledby={`shopping-list-title-${props.planId}`}
			data-testid={`reminders-review-${props.planId}`}
		>
			<div className="flex max-h-[90dvh] flex-col sm:max-h-[85dvh]">
				<div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-stone-300 dark:bg-sp-border sm:hidden" />
				<header className="flex shrink-0 items-start gap-3 px-5 pb-5 pt-5">
					{shortcutView && (
						<button
							type="button"
							aria-label="Back to shopping list"
							onClick={() => setShortcutView(false)}
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-sp-surface"
						>
							<ArrowLeft className="h-5 w-5" />
						</button>
					)}
					<div className="flex-1">
						<h2
							id={`shopping-list-title-${props.planId}`}
							className="text-2xl font-bold tracking-tight"
						>
							{shortcutView ? 'Apple Reminders' : 'Shopping list'}
						</h2>
						<p className="mt-1 text-sm text-stone-500 dark:text-sp-text-secondary">
							{props.planDateLabel && `${props.planDateLabel} · `}
							{props.draftItems.length}{' '}
							{props.draftItems.length === 1 ? 'ingredient' : 'ingredients'}
						</p>
					</div>
					<button
						type="button"
						aria-label="Close shopping list"
						onClick={closeModal}
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200/70 text-stone-500 hover:bg-stone-200 dark:bg-sp-surface-active dark:text-sp-text-secondary"
					>
						<X className="h-5 w-5" />
					</button>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
					{shortcutView ? (
						<ShortcutInstructions
							phase={props.phase}
							onSendDraft={props.onSendDraft}
							disabled={disabled}
						/>
					) : (
						<>
							{props.draftItems.length ? (
								<ReviewRows {...props} />
							) : (
								<div className="rounded-2xl bg-white p-8 text-center dark:bg-sp-surface">
									<ShoppingBasket className="mx-auto mb-3 h-8 w-8 text-stone-400" />
									<p className="font-semibold">Your shopping list is empty</p>
									<p className="mt-1 text-sm text-stone-500 dark:text-sp-text-secondary">
										Close and reopen the list to start again.
									</p>
								</div>
							)}
							<p className="px-1 py-3 text-xs leading-relaxed text-stone-500 dark:text-sp-text-secondary">
								Tap a quantity to adjust it. Remove ingredients you already have. Changes only apply
								to this list.
							</p>
							<button
								type="button"
								onClick={() => setShortcutView(true)}
								className="mt-3 flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left dark:bg-sp-surface"
							>
								<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-sp-primary-subtle dark:text-sp-primary">
									<ListChecks className="h-5 w-5" />
								</span>
								<span className="flex-1">
									<span className="block text-sm font-medium">Apple Reminders</span>
									<span className="mt-0.5 block text-xs text-stone-500 dark:text-sp-text-secondary">
										Requires an Apple Shortcut
									</span>
								</span>
								<ChevronRight className="h-4 w-4 text-stone-400" />
							</button>
						</>
					)}
					{(props.errorMessage ||
						actionError ||
						(props.draftItems.length > 0 && validationMessage)) && (
						<p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
							{props.errorMessage || actionError || validationMessage}
						</p>
					)}
				</div>
				{!shortcutView && (
					<footer className="shrink-0 border-t border-stone-200/80 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-sp-border">
						<div className="flex gap-3">
							<Button
								type="button"
								disabled={disabled}
								onClick={() => void runAction('copy')}
								className={`h-12 flex-1 gap-2 rounded-xl font-semibold ${hasShare ? 'bg-white text-stone-700 hover:bg-stone-200 dark:bg-sp-surface dark:text-sp-text-primary dark:hover:bg-sp-surface-active' : 'bg-green-600 text-white hover:bg-green-700 dark:bg-sp-primary dark:text-sp-text-on-primary'}`}
							>
								<Copy className="h-4 w-4" />
								Copy
							</Button>
							{hasShare && (
								<Button
									type="button"
									disabled={disabled}
									onClick={() => void runAction('share')}
									className="h-12 flex-2 gap-2 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 dark:bg-sp-primary dark:text-sp-text-on-primary dark:hover:bg-sp-primary-hover"
								>
									<Share className="h-4 w-4" />
									Share list
								</Button>
							)}
						</div>
						{status && (
							<p
								role="status"
								className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-700 dark:text-sp-primary"
							>
								<Check className="h-3.5 w-3.5" />
								{status}
							</p>
						)}
					</footer>
				)}
			</div>
		</dialog>
	);
}
