import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { AddRecipeIngredientModal } from './AddRecipeIngredientModal';
import { useAddRecipeForm } from './useAddRecipeForm';

vi.mock('@/lib/api', () => ({
	apiFetch: vi.fn().mockResolvedValue([
		{ id: 'Piece', name: 'Piece', symbol: 'pcs', category: 'count' },
		{ id: 'Gram', name: 'Gram', symbol: 'g', category: 'weight' },
	]),
}));
vi.mock('@tanstack/react-router', () => ({
	useCanGoBack: () => false,
	useNavigate: () => vi.fn(),
	useRouter: () => ({ history: { back: vi.fn() } }),
}));
vi.mock('./useRecipeMutations', () => ({
	useRecipeMutations: () => ({
		createMutation: { isPending: false, isError: false },
		updateMutation: { isPending: false, isError: false },
	}),
}));

const recipeSubmit = vi.fn();
function IngredientFormHarness() {
	const s = useAddRecipeForm({});
	return (
		<>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					recipeSubmit();
				}}
			>
				<button type="button" onClick={s.openModal}>
					Add Ingredient
				</button>
				<button type="submit">Save Recipe</button>
				<ul aria-label="Confirmed ingredients">
					{s.ingredients.map((row, index) => (
						<li key={index}>{row.name}</li>
					))}
				</ul>
			</form>
			<AddRecipeIngredientModal
				isOpen={s.isModalOpen}
				draft={s.draft}
				batch={s.ingredientBatch}
				units={s.units}
				isDraftValid={s.isDraftValid}
				hasUnaddedInput={s.hasUnaddedIngredient}
				error={s.ingredientDraftError}
				isDiscardConfirmationOpen={s.isDiscardConfirmationOpen}
				onComplete={s.completeIngredientBatch}
				onRequestDismiss={s.requestDismissModal}
				onCancelDiscard={s.cancelDiscardIngredientBatch}
				onDiscard={s.discardIngredientBatch}
				onAdd={s.addIngredient}
				onChange={s.setDraft}
			/>
		</>
	);
}
function renderForm() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MeasurementProviders>
				<IngredientFormHarness />
			</MeasurementProviders>
		</QueryClientProvider>,
	);
}
async function fillIngredient(user: ReturnType<typeof userEvent.setup>, name = 'Tomato') {
	await user.type(screen.getByRole('textbox', { name: 'Ingredient name' }), name);
	await user.type(screen.getByRole('textbox', { name: 'Ingredient quantity' }), '0,5');
	await user.selectOptions(screen.getByRole('combobox'), 'Gram');
}
function cancelDialog(dialog: HTMLElement) {
	fireEvent(dialog, new Event('cancel', { cancelable: true }));
}
beforeEach(() => {
	sessionStorage.clear();
	localStorage.clear();
	recipeSubmit.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('continuous ingredient entry', () => {
	it('adds three rows without closing, resets/refocuses inputs and commits exactly once', async () => {
		const user = userEvent.setup();
		renderForm();
		const opener = screen.getByRole('button', { name: 'Add Ingredient' });
		await user.click(opener);
		const name = screen.getByRole('textbox', { name: 'Ingredient name' });
		expect(name).toHaveFocus();
		for (const ingredient of ['Tomato', 'Tomato', 'Carrot']) {
			await fillIngredient(user, ingredient);
			await user.click(screen.getByRole('button', { name: 'Add' }));
			expect(screen.getByRole('dialog', { name: 'Add ingredients' })).toBeInTheDocument();
			expect(name).toHaveValue('');
			expect(name).toHaveFocus();
			expect(screen.getByRole('textbox', { name: 'Ingredient quantity' })).toHaveValue('');
			expect(screen.getByRole('combobox')).toHaveValue('Gram');
			expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
		}
		await user.dblClick(screen.getByRole('button', { name: 'Add' }));
		expect(screen.getByRole('status')).toHaveTextContent('In batch: Carrot');
		expect(screen.getByRole('status')).toHaveTextContent('3 ingredients in this batch');
		expect(screen.queryAllByRole('listitem')).toHaveLength(0);
		await user.click(screen.getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(opener).toHaveFocus();
		expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
			'Tomato',
			'Tomato',
			'Carrot',
		]);
		await user.click(opener);
		expect(screen.getByRole('combobox')).toHaveValue('Piece');
		expect(screen.getByRole('status')).toBeEmptyDOMElement();
		expect(recipeSubmit).not.toHaveBeenCalled();
	});

	it.each(['X', 'backdrop', 'Escape'])(
		'confirms %s dismissal and preserves the batch on cancellation',
		async (method) => {
			const user = userEvent.setup();
			renderForm();
			await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
			await fillIngredient(user);
			await user.click(screen.getByRole('button', { name: 'Add' }));
			await user.type(screen.getByRole('textbox', { name: 'Ingredient name' }), 'Unfinished');
			const sheet = screen.getByRole('dialog', { name: 'Add ingredients' });
			if (method === 'X')
				await user.click(screen.getByRole('button', { name: 'Discard ingredient batch' }));
			else if (method === 'backdrop') fireEvent.click(sheet);
			else await user.keyboard('{Escape}');
			const confirmation = screen.getByRole('alertdialog', { name: 'Discard this batch?' });
			expect(confirmation).toHaveTextContent('Discard the ingredient added in this session?');
			expect(confirmation).toHaveTextContent('The unfinished ingredient will be discarded.');
			expect(screen.getByRole('button', { name: 'Continue adding' })).toHaveFocus();
			if (method === 'Escape') await user.keyboard('{Escape}');
			else cancelDialog(confirmation);
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
			expect(screen.getByRole('textbox', { name: 'Ingredient name' })).toHaveValue('Unfinished');
			expect(screen.getByRole('status')).toHaveTextContent('1 ingredient in this batch');
			await user.click(screen.getByRole('button', { name: 'Close' }));
			await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
			expect(screen.getByRole('textbox', { name: 'Ingredient name' })).toHaveValue('Unfinished');
			expect(screen.getByRole('combobox')).toHaveValue('Gram');
		},
	);

	it('discards only the new batch and its draft, leaving confirmed ingredients untouched', async () => {
		const user = userEvent.setup();
		renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		await fillIngredient(user, 'Existing');
		await user.click(screen.getByRole('button', { name: 'Add' }));
		await user.click(screen.getByRole('button', { name: 'Close' }));
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		for (const name of ['Carrot', 'Onion', 'Garlic']) {
			await fillIngredient(user, name);
			await user.click(screen.getByRole('button', { name: 'Add' }));
		}
		await user.click(screen.getByRole('button', { name: 'Discard ingredient batch' }));
		const confirmation = screen.getByRole('alertdialog');
		expect(confirmation).toHaveTextContent('Discard the 3 ingredients added in this session?');
		await user.click(within(confirmation).getByRole('button', { name: 'Discard batch' }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual(['Existing']);
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		expect(screen.getByRole('textbox', { name: 'Ingredient name' })).toHaveValue('');
		expect(screen.getByRole('combobox')).toHaveValue('Piece');
	});

	it('dismisses unit-only input directly but confirms a draft without a zero-ingredient warning', async () => {
		const user = userEvent.setup();
		renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		await user.selectOptions(screen.getByRole('combobox'), 'Gram');
		cancelDialog(screen.getByRole('dialog'));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		await user.type(screen.getByRole('textbox', { name: 'Ingredient quantity' }), '2');
		cancelDialog(screen.getByRole('dialog'));
		const confirmation = screen.getByRole('alertdialog');
		expect(confirmation).toHaveTextContent('The unfinished ingredient will be discarded.');
		expect(confirmation).not.toHaveTextContent('0 ingredients');
		await user.click(within(confirmation).getByRole('button', { name: 'Continue adding' }));
		expect(screen.getByRole('textbox', { name: 'Ingredient quantity' })).toHaveFocus();
	});

	it('uses Enter for a valid row without recipe submission, repeats or IME/select interference', async () => {
		const user = userEvent.setup();
		renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		await fillIngredient(user);
		const name = screen.getByRole('textbox', { name: 'Ingredient name' });
		fireEvent.keyDown(name, { key: 'Enter', isComposing: true });
		fireEvent.keyDown(name, { key: 'Enter', repeat: true });
		fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
		expect(screen.getByRole('status')).toBeEmptyDOMElement();
		await user.click(name);
		await user.keyboard('{Enter}{Enter}');
		expect(screen.getByRole('status')).toHaveTextContent('1 ingredient in this batch');
		expect(recipeSubmit).not.toHaveBeenCalled();
		await fillIngredient(user, 'Onion');
		await user.click(screen.getByRole('textbox', { name: 'Ingredient quantity' }));
		await user.keyboard('{Enter}');
		expect(screen.getByRole('status')).toHaveTextContent('2 ingredients in this batch');
		expect(recipeSubmit).not.toHaveBeenCalled();
	});

	it('recovers the batch visibly after remount without recovering unfinished input', async () => {
		const user = userEvent.setup();
		const first = renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		await fillIngredient(user);
		await user.click(screen.getByRole('button', { name: 'Add' }));
		await user.type(screen.getByRole('textbox', { name: 'Ingredient name' }), 'Unfinished');
		first.unmount();
		renderForm();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('In batch: Tomato');
		expect(screen.getByRole('textbox', { name: 'Ingredient name' })).toHaveValue('');
		expect(screen.getByRole('textbox', { name: 'Ingredient name' })).toHaveFocus();
		expect(screen.getByRole('combobox')).toHaveValue('Gram');
	});

	it('tracks the visual viewport and detaches its listeners on closure', async () => {
		const viewport = Object.assign(new EventTarget(), { height: 320, offsetTop: 140 });
		const remove = vi.spyOn(viewport, 'removeEventListener');
		vi.stubGlobal('visualViewport', viewport);
		const user = userEvent.setup();
		renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		const sheet = screen.getByRole('dialog');
		expect(sheet).toHaveStyle({ height: '320px', top: '140px' });
		Object.assign(viewport, { height: 400, offsetTop: 50 });
		viewport.dispatchEvent(new Event('resize'));
		expect(sheet).toHaveStyle({ height: '400px', top: '50px' });
		await user.click(screen.getByRole('button', { name: 'Close' }));
		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
		expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
	});

	it('localizes the batch flow and discard confirmation in Romanian', async () => {
		localStorage.setItem('shareplate.user.settings', JSON.stringify({ language: 'ro' }));
		const user = userEvent.setup();
		renderForm();
		await user.click(screen.getByRole('button', { name: 'Add Ingredient' }));
		expect(screen.getByRole('dialog', { name: 'Adaugă ingrediente' })).toBeInTheDocument();
		await user.type(screen.getByRole('textbox', { name: 'Numele ingredientului' }), 'Roșii');
		await user.type(screen.getByRole('textbox', { name: 'Cantitatea ingredientului' }), '200');
		await user.selectOptions(screen.getByRole('combobox'), 'Gram');
		await user.click(screen.getByRole('button', { name: 'Adaugă' }));
		expect(screen.getByRole('status')).toHaveTextContent('În lot: Roșii');
		await user.click(screen.getByRole('button', { name: 'Renunță la lotul de ingrediente' }));
		expect(screen.getByRole('alertdialog', { name: 'Renunți la acest lot?' })).toHaveTextContent(
			'Ingredientele confirmate anterior vor fi păstrate.',
		);
	});
});
