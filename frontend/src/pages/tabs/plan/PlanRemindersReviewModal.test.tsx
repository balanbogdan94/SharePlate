import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanRemindersReviewModal } from './PlanRemindersReviewModal';
import type { EditableReminderItem } from './remindersExport';

const items: EditableReminderItem[] = [
	{ id: 'tomato', name: 'Tomato', quantity: '600', unitId: 'Gram' },
	{ id: 'eggs', name: 'Eggs', quantity: '6', unitId: 'Piece' },
];

function renderModal(draftItems = items) {
	const onCancelDraft = vi.fn();
	const { unmount } = render(
		<PlanRemindersReviewModal
			planId="plan"
			planDateLabel="Oct 6 – Oct 12"
			phase="reviewing"
			draftItems={draftItems}
			errorMessage={null}
			onUpdateQuantity={vi.fn()}
			onDeleteDraft={vi.fn()}
			onCancelDraft={onCancelDraft}
			onSendDraft={vi.fn()}
		/>,
	);
	return { onCancelDraft, unmount };
}

beforeEach(() => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false })),
	);
	Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.setAttribute('open', '');
		},
	});
	Object.defineProperty(HTMLDialogElement.prototype, 'close', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.removeAttribute('open');
		},
	});
	Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('shopping list review', () => {
	it('copies the reviewed list including the plan dates and readable units', async () => {
		const user = userEvent.setup();
		renderModal();
		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(await navigator.clipboard.readText()).toBe(
			'Shopping list · Oct 6 – Oct 12\n\nTomato — 600 g\nEggs — 6 pcs',
		);
		expect(screen.getByRole('status')).toHaveTextContent('List copied');
		expect(screen.queryByRole('button', { name: 'Share list' })).not.toBeInTheDocument();
	});

	it('shares the same reviewed text as Copy', async () => {
		const user = userEvent.setup();
		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { configurable: true, value: share });
		renderModal();
		await user.click(screen.getByRole('button', { name: 'Copy' }));
		const copiedText = await navigator.clipboard.readText();
		await user.click(screen.getByRole('button', { name: 'Share list' }));
		expect(share).toHaveBeenCalledWith({ title: 'SharePlate shopping list', text: copiedText });
	});

	it('does not treat share cancellation as an error', async () => {
		const user = userEvent.setup();
		Object.defineProperty(navigator, 'share', {
			configurable: true,
			value: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
		});
		renderModal();
		await user.click(screen.getByRole('button', { name: 'Share list' }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled());
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('surfaces real share errors and keeps Copy available', async () => {
		const user = userEvent.setup();
		Object.defineProperty(navigator, 'share', {
			configurable: true,
			value: vi.fn().mockRejectedValue(new Error('Share unavailable')),
		});
		renderModal();
		await user.click(screen.getByRole('button', { name: 'Share list' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Share unavailable');
		expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
	});

	it('surfaces clipboard failures', async () => {
		const user = userEvent.setup();
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Copy denied'));
		renderModal();
		await user.click(screen.getByRole('button', { name: 'Copy' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Copy denied');
	});

	it('keeps the empty list open with export disabled', () => {
		renderModal([]);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Your shopping list is empty')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
	});

	it('disables export for invalid quantities', () => {
		renderModal([{ ...items[0], quantity: '0' }]);
		expect(screen.getByRole('alert')).toHaveTextContent('greater than zero');
		expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
	});

	it.each(['cancel', 'escape', 'button', 'backdrop'])(
		'animates dismissal via %s before removing the draft',
		(method) => {
			vi.useFakeTimers();
			const { onCancelDraft } = renderModal();
			const dialog = screen.getByRole('dialog');
			if (method === 'cancel') {
				const event = new Event('cancel', { cancelable: true });
				fireEvent(dialog, event);
				expect(event.defaultPrevented).toBe(true);
			}
			if (method === 'escape') fireEvent.keyDown(dialog, { key: 'Escape' });
			if (method === 'button')
				fireEvent.click(screen.getByRole('button', { name: 'Close shopping list' }));
			if (method === 'backdrop') fireEvent.click(dialog);
			expect(dialog).toHaveClass('motion-safe:animate-out', 'motion-safe:slide-out-to-bottom-full');
			expect(onCancelDraft).not.toHaveBeenCalled();
			act(() => vi.advanceTimersByTime(199));
			expect(onCancelDraft).not.toHaveBeenCalled();
			act(() => vi.advanceTimersByTime(1));
			expect(onCancelDraft).toHaveBeenCalledTimes(1);
		},
	);

	it('closes immediately when reduced motion is enabled', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const { onCancelDraft } = renderModal();
		fireEvent.click(screen.getByRole('button', { name: 'Close shopping list' }));
		expect(onCancelDraft).toHaveBeenCalledTimes(1);
	});

	it('cancels pending dismissal when the component unmounts', () => {
		vi.useFakeTimers();
		const { onCancelDraft, unmount } = renderModal();
		fireEvent.click(screen.getByRole('button', { name: 'Close shopping list' }));
		unmount();
		act(() => vi.advanceTimersByTime(200));
		expect(onCancelDraft).not.toHaveBeenCalled();
	});
});
