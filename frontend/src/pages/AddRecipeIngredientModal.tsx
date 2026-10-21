import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nContext';
import { formatMeasurement } from '@/lib/measurements';
import type { IngredientPayload, Unit } from '@/pages/tabs/home/types';
import { RecipeIngredientFields, type IngredientDraft } from './RecipeIngredientFields';

type ModalProps = {
	isOpen: boolean;
	draft: IngredientDraft;
	batch: IngredientPayload[];
	units: Unit[] | undefined;
	isDraftValid: boolean;
	hasUnaddedInput: boolean;
	error: string | null;
	isDiscardConfirmationOpen: boolean;
	onComplete: () => void;
	onRequestDismiss: () => void;
	onCancelDiscard: () => void;
	onDiscard: () => void;
	onAdd: () => void;
	onChange: (draft: IngredientDraft) => void;
};

function DiscardIngredientBatchDialog({
	count,
	hasUnaddedInput,
	onContinue,
	onDiscard,
}: {
	count: number;
	hasUnaddedInput: boolean;
	onContinue: () => void;
	onDiscard: () => void;
}) {
	const { t } = useI18n();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const continueRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const dialog = dialogRef.current;
		const previousFocus = document.activeElement;
		dialog?.showModal();
		continueRef.current?.focus({ preventScroll: true });
		return () => {
			dialog?.close();
			if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
		};
	}, []);
	return (
		<dialog
			ref={dialogRef}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="discard-ingredient-title"
			aria-describedby="discard-ingredient-description"
			onCancel={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onContinue();
			}}
			onKeyDown={(event) => {
				if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
				event.preventDefault();
				event.stopPropagation();
				onContinue();
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) onContinue();
			}}
			className="fixed left-1/2 top-[calc(var(--ingredient-viewport-top,0px)+var(--ingredient-viewport-height,100dvh)/2)] m-0 max-h-[calc(var(--ingredient-viewport-height,100dvh)-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl backdrop:bg-black/40 dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-primary"
		>
			<h3 id="discard-ingredient-title" className="text-lg font-bold">
				{t('ingredientEntry.discardTitle')}
			</h3>
			<div id="discard-ingredient-description" className="mt-2 space-y-2 text-sm">
				{count > 0 && (
					<p>
						{t(count === 1 ? 'ingredientEntry.discardOne' : 'ingredientEntry.discardMany').replace(
							'{count}',
							String(count),
						)}
					</p>
				)}
				{hasUnaddedInput && <p>{t('ingredientEntry.discardUnadded')}</p>}
				<p>{t('ingredientEntry.previousKept')}</p>
			</div>
			<div className="mt-5 flex flex-col gap-2">
				<Button ref={continueRef} type="button" onClick={onContinue} className="min-h-11">
					{t('ingredientEntry.continue')}
				</Button>
				<Button type="button" variant="destructive" onClick={onDiscard} className="min-h-11">
					{t('ingredientEntry.discard')}
				</Button>
			</div>
		</dialog>
	);
}

export function AddRecipeIngredientModal({
	isOpen,
	draft,
	batch,
	units,
	isDraftValid,
	hasUnaddedInput,
	error,
	isDiscardConfirmationOpen,
	onComplete,
	onRequestDismiss,
	onCancelDiscard,
	onDiscard,
	onAdd,
	onChange,
}: ModalProps) {
	const { language, t } = useI18n();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const nameRef = useRef<HTMLInputElement>(null);
	const latest = batch.at(-1);
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!isOpen || !dialog) return;
		const previousFocus = document.activeElement;
		const viewport = window.visualViewport;
		const updateViewport = () => {
			const height = `${viewport?.height ?? window.innerHeight}px`;
			const top = `${viewport?.offsetTop ?? 0}px`;
			dialog.style.height = height;
			dialog.style.top = top;
			dialog.style.setProperty('--ingredient-viewport-height', height);
			dialog.style.setProperty('--ingredient-viewport-top', top);
		};
		updateViewport();
		dialog.showModal();
		nameRef.current?.focus({ preventScroll: true });
		viewport?.addEventListener('resize', updateViewport);
		viewport?.addEventListener('scroll', updateViewport);
		window.addEventListener('resize', updateViewport);
		return () => {
			viewport?.removeEventListener('resize', updateViewport);
			viewport?.removeEventListener('scroll', updateViewport);
			window.removeEventListener('resize', updateViewport);
			dialog.close();
			if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
		};
	}, [isOpen]);
	const add = () => {
		if (!isDraftValid) return;
		onAdd();
		nameRef.current?.focus();
	};
	return (
		<dialog
			ref={dialogRef}
			aria-modal="true"
			aria-labelledby="ingredient-sheet-title"
			aria-describedby="ingredient-sheet-description"
			onCancel={(event) => {
				event.preventDefault();
				onRequestDismiss();
			}}
			onKeyDown={(event) => {
				if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
				event.preventDefault();
				event.stopPropagation();
				onRequestDismiss();
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) onRequestDismiss();
			}}
			className="fixed inset-x-0 top-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-stone-900 backdrop:bg-stone-900/30 backdrop:backdrop-blur-[3px] open:flex open:items-end open:justify-center dark:text-sp-text-primary"
		>
			<div className="flex max-h-full w-full max-w-2xl flex-col rounded-t-[28px] border border-stone-200/70 bg-white px-4 pt-3 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-200 dark:border-sp-border dark:bg-sp-background">
				<header className="flex shrink-0 items-center justify-between gap-3">
					<h2 id="ingredient-sheet-title" className="text-lg font-bold">
						{t('ingredientEntry.title')}
					</h2>
					<button
						type="button"
						aria-label={t('ingredientEntry.dismiss')}
						onClick={onRequestDismiss}
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-2 dark:text-sp-text-secondary dark:hover:bg-sp-surface"
					>
						<X className="h-5 w-5" />
					</button>
				</header>
				<div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain py-3">
					<p
						id="ingredient-sheet-description"
						className="text-xs text-stone-500 dark:text-sp-text-secondary"
					>
						{t('ingredientEntry.description')}
					</p>
					<RecipeIngredientFields
						draft={draft}
						units={units}
						onChange={onChange}
						nameRef={nameRef}
						onAdd={add}
						isDraftValid={isDraftValid}
					/>
					{error && (
						<p role="alert" className="text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					)}
					{hasUnaddedInput && (
						<p className="text-xs text-stone-500 dark:text-sp-text-secondary">
							{t('ingredientEntry.unadded')}
						</p>
					)}
					<div role="status" aria-live="polite" aria-atomic="true" className="text-sm">
						{latest && (
							<div className="rounded-xl bg-green-50 p-3 text-green-800 dark:bg-sp-primary/10 dark:text-sp-primary">
								<p className="break-words">
									{t('ingredientEntry.latest')} {latest.name} —{' '}
									{formatMeasurement(latest.quantity, latest.unit, language)}
								</p>
								<p className="mt-1 text-xs font-semibold">
									{t(
										batch.length === 1 ? 'ingredientEntry.countOne' : 'ingredientEntry.countMany',
									).replace('{count}', String(batch.length))}
								</p>
							</div>
						)}
					</div>
				</div>
				<footer className="flex shrink-0 gap-3 border-t border-stone-200/70 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-sp-border">
					<Button
						type="button"
						onClick={add}
						disabled={!isDraftValid}
						className="h-11 flex-1 rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 dark:bg-sp-primary dark:text-sp-text-on-primary"
					>
						{t('ingredientEntry.add')}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onComplete}
						className="h-11 flex-1 rounded-xl font-bold"
					>
						{t('ingredientEntry.close')}
					</Button>
				</footer>
			</div>
			{isOpen && isDiscardConfirmationOpen && (
				<DiscardIngredientBatchDialog
					count={batch.length}
					hasUnaddedInput={hasUnaddedInput}
					onContinue={onCancelDiscard}
					onDiscard={onDiscard}
				/>
			)}
		</dialog>
	);
}
