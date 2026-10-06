import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { PlanOptions } from './PlanOptions';
import type { PlanListItem } from './types';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const plan: PlanListItem = {
	id: 'plan-1',
	startDate: '2026-10-06',
	endDate: '2026-10-12',
	createdAt: '2026-10-01T00:00:00Z',
	updatedAt: '2026-10-01T00:00:00Z',
};

function renderOptions(canEdit = true) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	client.setQueryData(['plans'], [plan]);
	client.setQueryData(['plans', 'detail', plan.id], plan);
	render(
		<QueryClientProvider client={client}>
			<PlanOptions plan={plan} canEdit={canEdit} />
		</QueryClientProvider>,
	);
	return client;
}

async function openConfirmation(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: 'Plan options' }));
	await user.click(screen.getByRole('menuitem', { name: 'Delete plan' }));
}

beforeEach(() => {
	navigate.mockReset();
	vi.mocked(apiFetch).mockReset();
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true })),
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
});
afterEach(() => vi.unstubAllGlobals());

describe('Plan options', () => {
	it('opens plan actions and navigates to edit', async () => {
		const user = userEvent.setup();
		renderOptions();
		await user.click(screen.getByRole('button', { name: 'Plan options' }));
		expect(screen.getByRole('menu', { name: 'Plan options' })).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		await user.click(screen.getByRole('menuitem', { name: 'Edit plan' }));
		expect(navigate).toHaveBeenCalledWith({
			to: '/plans/$planId/edit',
			params: { planId: plan.id },
		});
	});

	it('keeps past plans without an edit action', async () => {
		renderOptions(false);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Plan options' }));
		expect(screen.queryByRole('menuitem', { name: 'Edit plan' })).not.toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Delete plan' })).toBeInTheDocument();
	});

	it('does not delete before confirmation and allows cancellation', async () => {
		const user = userEvent.setup();
		renderOptions();
		await openConfirmation(user);
		expect(screen.getByRole('dialog', { name: 'Delete this plan?' })).toBeInTheDocument();
		expect(apiFetch).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole('button', { name: 'Plan options' })).toHaveFocus());
		expect(apiFetch).not.toHaveBeenCalled();
	});

	it('removes the deleted plan from cache and clears its detail and expanded URL', async () => {
		const user = userEvent.setup();
		vi.mocked(apiFetch).mockResolvedValue(undefined);
		const client = renderOptions();
		await openConfirmation(user);
		await user.click(screen.getByRole('button', { name: 'Delete plan' }));
		await waitFor(() =>
			expect(apiFetch).toHaveBeenCalledWith('/plans/plan-1', { method: 'DELETE' }),
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(client.getQueryData(['plans'])).toEqual([]);
		expect(client.getQueryData(['plans', 'detail', plan.id])).toBeUndefined();
		expect(navigate).toHaveBeenCalledWith({ to: '/plans', search: {} });
	});

	it('surfaces errors and allows retry without losing the plan', async () => {
		const user = userEvent.setup();
		vi.mocked(apiFetch)
			.mockRejectedValueOnce(new Error('Permission denied'))
			.mockResolvedValueOnce(undefined);
		const client = renderOptions();
		await openConfirmation(user);
		await user.click(screen.getByRole('button', { name: 'Delete plan' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied');
		expect(client.getQueryData(['plans'])).toEqual([plan]);
		await user.click(screen.getByRole('button', { name: 'Delete plan' }));
		await waitFor(() => expect(client.getQueryData(['plans'])).toEqual([]));
	});

	it('prevents repeat deletion and dismissal while the request is pending', async () => {
		const user = userEvent.setup();
		vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
		renderOptions();
		await openConfirmation(user);
		await user.click(screen.getByRole('button', { name: 'Delete plan' }));
		expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Close delete confirmation' })).toBeDisabled();
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(apiFetch).toHaveBeenCalledTimes(1);
	});

	it('supports keyboard navigation and restores trigger focus on Escape', async () => {
		const user = userEvent.setup();
		renderOptions();
		const trigger = screen.getByRole('button', { name: 'Plan options' });
		trigger.focus();
		await user.keyboard('{ArrowDown}');
		expect(await screen.findByRole('menuitem', { name: 'Edit plan' })).toHaveFocus();
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitem', { name: 'Delete plan' })).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('dismisses on an outside pointer interaction', async () => {
		renderOptions();
		await userEvent.setup().click(screen.getByRole('button', { name: 'Plan options' }));
		fireEvent.pointerDown(document.body);
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
		expect(apiFetch).not.toHaveBeenCalled();
	});
});
