import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notesFromPlainText } from '@/lib/recipeNotes';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { useAddRecipeForm } from './useAddRecipeForm';
import { useRecipeMutations } from './useRecipeMutations';
import type { IngredientDraft } from './RecipeIngredientFields';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn().mockResolvedValue([]) }));
vi.mock('@tanstack/react-router', () => ({
	useCanGoBack: () => false,
	useNavigate: () => vi.fn(),
	useRouter: () => ({ history: { back: vi.fn() } }),
}));
vi.mock('./useRecipeMutations', () => ({
	useRecipeMutations: vi.fn(() => ({
		createMutation: { isPending: false, isError: false },
		updateMutation: { isPending: false, isError: false },
	})),
}));
function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			<MeasurementProviders>{children}</MeasurementProviders>
		</QueryClientProvider>
	);
}
const key = 'shareplate.draft.recipe.new';
beforeEach(() => {
	sessionStorage.clear();
	localStorage.clear();
});

describe('notes drafts', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	const tomato: IngredientDraft = { name: ' Tomato ', quantity: '200', unit: 'Gram' };
	const stagedTomato = { name: 'Tomato', quantity: 200, unit: 'Gram' };

	describe('ingredient batches', () => {
		it('stages consecutive rows, including intentional duplicates, with reset fields and retained unit', () => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			for (let index = 0; index < 3; index++) {
				act(() => result.current.setDraft(tomato));
				act(() => result.current.addIngredient());
				expect(result.current.isModalOpen).toBe(true);
				expect(result.current.draft).toEqual({ name: '', quantity: '', unit: 'Gram' });
				expect(result.current.ingredientBatch).toHaveLength(index + 1);
			}
			expect(result.current.ingredients).toEqual([]);
			expect(result.current.ingredientBatch).toEqual(Array(3).fill(stagedTomato));
			act(() => result.current.completeIngredientBatch());
			act(() => result.current.completeIngredientBatch());
			expect(result.current.ingredients).toEqual(Array(3).fill(stagedTomato));
			expect(result.current.ingredientBatch).toEqual([]);
			expect(result.current.isModalOpen).toBe(false);
			act(() => result.current.openModal());
			expect(result.current.draft).toEqual({ name: '', quantity: '', unit: 'Piece' });
		});

		it('cannot duplicate the last row with immediate repeat activation', () => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => {
				result.current.addIngredient();
				result.current.addIngredient();
			});
			expect(result.current.ingredientBatch).toEqual([stagedTomato]);
			expect(result.current.isDraftValid).toBe(false);
		});

		it.each([
			{ ...tomato, name: 'x' },
			{ ...tomato, quantity: '1/2' },
			{ ...tomato, quantity: '0.0001' },
		])('retains invalid input and surfaces an in-sheet error: %j', (draft) => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft(draft));
			act(() => result.current.addIngredient());
			expect(result.current.ingredientBatch).toEqual([]);
			expect(result.current.draft).toEqual(draft);
			expect(result.current.ingredientDraftError).toBeTruthy();
			expect(result.current.ingredientsError).toBeNull();
			expect(result.current.isModalOpen).toBe(true);
			act(() => result.current.setDraft(tomato));
			expect(result.current.ingredientDraftError).toBeNull();
		});

		it('commits in order and keeps unadded input only in memory when explicitly closed', () => {
			const { result, unmount } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => result.current.addIngredient());
			act(() => result.current.completeIngredientBatch());
			act(() => result.current.openModal());
			const onion: IngredientDraft = { name: 'Onion', quantity: '1', unit: 'Piece' };
			act(() => result.current.setDraft(onion));
			act(() => result.current.addIngredient());
			act(() => result.current.setDraft({ ...tomato, name: 'Unfinished' }));
			act(() => result.current.completeIngredientBatch());
			expect(result.current.ingredients.map((row) => row.name)).toEqual(['Tomato', 'Onion']);
			expect(result.current.hasUnaddedIngredient).toBe(true);
			act(() => result.current.openModal());
			expect(result.current.draft.name).toBe('Unfinished');
			expect(result.current.draft.unit).toBe('Gram');
			expect(result.current.ingredientBatch).toEqual([]);
			expect(sessionStorage.getItem(key)).not.toContain('Unfinished');
			unmount();
			const restored = renderHook(() => useAddRecipeForm({}), { wrapper });
			expect(restored.result.current.ingredients.map((row) => row.name)).toEqual([
				'Tomato',
				'Onion',
			]);
			expect(restored.result.current.isModalOpen).toBe(false);
			expect(restored.result.current.draft.name).toBe('');
		});

		it('confirms discard, leaves everything unchanged on cancel, and only removes the current batch', () => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => result.current.addIngredient());
			act(() => result.current.completeIngredientBatch());
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => result.current.addIngredient());
			act(() => result.current.setDraft({ ...tomato, name: 'Unfinished' }));
			act(() => result.current.requestDismissModal());
			expect(result.current.isDiscardConfirmationOpen).toBe(true);
			act(() => result.current.addIngredient());
			expect(result.current.ingredientBatch).toHaveLength(1);
			act(() => result.current.cancelDiscardIngredientBatch());
			expect(result.current.isModalOpen).toBe(true);
			expect(result.current.ingredientBatch).toEqual([stagedTomato]);
			expect(result.current.draft.name).toBe('Unfinished');
			act(() => result.current.requestDismissModal());
			act(() => result.current.discardIngredientBatch());
			expect(result.current.ingredients).toEqual([stagedTomato]);
			expect(result.current.ingredientBatch).toEqual([]);
			expect(result.current.isModalOpen).toBe(false);
			expect(result.current.isDiscardConfirmationOpen).toBe(false);
			expect(JSON.parse(sessionStorage.getItem(key) ?? '{}').ingredientBatch).toBeUndefined();
			act(() => result.current.openModal());
			expect(result.current.draft).toEqual({ name: '', quantity: '', unit: 'Piece' });
		});

		it('dismisses an empty session without confirmation, but confirms unadded input', () => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft({ name: '', quantity: '', unit: 'Gram' }));
			act(() => result.current.requestDismissModal());
			expect(result.current.isModalOpen).toBe(false);
			expect(result.current.isDiscardConfirmationOpen).toBe(false);
			act(() => result.current.openModal());
			act(() => result.current.setDraft({ name: '', quantity: '2', unit: 'Gram' }));
			act(() => result.current.requestDismissModal());
			expect(result.current.isModalOpen).toBe(true);
			expect(result.current.isDiscardConfirmationOpen).toBe(true);
			act(() => result.current.discardIngredientBatch());
			expect(result.current.hasUnaddedIngredient).toBe(false);
		});

		it.each(['complete', 'discard'] as const)(
			'recovers a provisional batch and can %s it',
			(action) => {
				const first = renderHook(() => useAddRecipeForm({ recipeId: 'recipe-1' }), { wrapper });
				act(() => first.result.current.openModal());
				act(() => first.result.current.setDraft(tomato));
				act(() => first.result.current.addIngredient());
				act(() => first.result.current.setDraft({ ...tomato, name: 'Unfinished' }));
				first.unmount();
				const restored = renderHook(() => useAddRecipeForm({ recipeId: 'recipe-1' }), { wrapper });
				expect(restored.result.current.isModalOpen).toBe(true);
				expect(restored.result.current.ingredientBatch).toEqual([stagedTomato]);
				expect(restored.result.current.ingredients).toEqual([]);
				expect(restored.result.current.draft).toEqual({ name: '', quantity: '', unit: 'Gram' });
				act(() => {
					if (action === 'complete') restored.result.current.completeIngredientBatch();
					else restored.result.current.discardIngredientBatch();
				});
				expect(restored.result.current.ingredients).toEqual(
					action === 'complete' ? [stagedTomato] : [],
				);
				restored.unmount();
				const final = renderHook(() => useAddRecipeForm({ recipeId: 'recipe-1' }), { wrapper });
				expect(final.result.current.isModalOpen).toBe(false);
				expect(final.result.current.ingredientBatch).toEqual([]);
			},
		);

		it('isolates create/edit keys and reads legacy drafts without a batch', () => {
			sessionStorage.setItem(
				key,
				JSON.stringify({
					form: { title: 'Old recipe', notes: '', imageUrl: '' },
					ingredients: [stagedTomato],
				}),
			);
			const create = renderHook(() => useAddRecipeForm({}), { wrapper });
			expect(create.result.current.ingredients).toEqual([stagedTomato]);
			expect(create.result.current.isModalOpen).toBe(false);
			const edit = renderHook(() => useAddRecipeForm({ recipeId: 'different' }), { wrapper });
			expect(edit.result.current.ingredients).toEqual([]);
			act(() => edit.result.current.openModal());
			act(() => edit.result.current.setDraft(tomato));
			act(() => edit.result.current.addIngredient());
			expect(JSON.parse(sessionStorage.getItem(key) ?? '{}').ingredientBatch).toBeUndefined();
			expect(
				JSON.parse(sessionStorage.getItem('shareplate.draft.recipe.different') ?? '{}')
					.ingredientBatch,
			).toEqual([stagedTomato]);
		});

		it('clears all provisional state through recipe reset and recipe discard', async () => {
			const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => result.current.addIngredient());
			const config = vi.mocked(useRecipeMutations).mock.calls.at(-1)?.[0];
			if (!config) throw new Error('Missing recipe mutation configuration.');
			act(() => config.onReset());
			expect(result.current.ingredientBatch).toEqual([]);
			expect(result.current.isModalOpen).toBe(false);
			expect(sessionStorage.getItem(key)).not.toContain('ingredientBatch');
			act(() => result.current.openModal());
			act(() => result.current.setDraft(tomato));
			act(() => result.current.addIngredient());
			await act(() => result.current.discard());
			expect(sessionStorage.getItem(key)).toBeNull();
		});
	});
	it('restores an old text-only draft without interpreting its content', () => {
		sessionStorage.setItem(
			key,
			JSON.stringify({
				form: { title: 'Soup', notes: 'First\n\n<b>literal</b>', imageUrl: '' },
				ingredients: [],
			}),
		);
		const { result } = renderHook(() => useAddRecipeForm({}), { wrapper });
		expect(result.current.form.notes).toBe('First\n\n<b>literal</b>');
		expect(result.current.form.notesDocument).toBeUndefined();
	});
	it('persists and restores the formatted document with the rest of the form', async () => {
		const document = notesFromPlainText('First\n\nhttps://example.com');
		const first = renderHook(() => useAddRecipeForm({}), { wrapper });
		act(() =>
			first.result.current.setForm((form) => ({
				...form,
				notes: 'First\n\nhttps://example.com',
				notesDocument: document,
			})),
		);
		await waitFor(() =>
			expect(JSON.parse(sessionStorage.getItem(key) ?? '{}').form.notesDocument).toEqual(document),
		);
		first.unmount();
		const restored = renderHook(() => useAddRecipeForm({}), { wrapper });
		expect(restored.result.current.form.notesDocument).toEqual(document);
	});
});
