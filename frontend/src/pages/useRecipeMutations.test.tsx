import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { notesFromPlainText } from '@/lib/recipeNotes';
import { useRecipeMutations } from './useRecipeMutations';
import { useAddRecipeForm } from './useAddRecipeForm';
import { MeasurementProviders } from '@/test/MeasurementProviders';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/feedback/useFeedback', () => ({
	useFeedback: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({
	useCanGoBack: () => false,
	useNavigate: () => vi.fn().mockResolvedValue(undefined),
	useRouter: () => ({ history: { back: vi.fn() } }),
}));
function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			<MeasurementProviders>{children}</MeasurementProviders>
		</QueryClientProvider>
	);
}
const document = notesFromPlainText('First\n\nhttps://example.com');
const config = {
	form: {
		title: 'Soup',
		notes: 'First\n\nhttps://example.com',
		notesDocument: document,
		imageUrl: '',
	},
	imageFile: null,
	ingredients: [{ name: 'Tomato', quantity: 2, unit: 'Piece' as const }],
	onReset: vi.fn(),
	onSaved: vi.fn(),
};

describe('formatted notes API payloads', () => {
	beforeEach(() => {
		sessionStorage.clear();
		localStorage.clear();
		vi.clearAllMocks();
		vi.mocked(apiFetch).mockReset().mockResolvedValue({});
	});
	it.each(['create', 'update'] as const)('sends the document and text on %s', async (kind) => {
		const { result } = renderHook(() => useRecipeMutations({ ...config, recipeId: 'recipe-1' }), {
			wrapper,
		});
		await act(async () => {
			await result.current[kind === 'create' ? 'createMutation' : 'updateMutation'].mutateAsync();
		});
		const [path, init] = vi.mocked(apiFetch).mock.calls[0];
		expect(path).toBe(kind === 'create' ? '/recipes' : '/recipes/recipe-1');
		expect(init?.method).toBe(kind === 'create' ? 'POST' : 'PUT');
		const body = init?.body;
		expect(body).toBeInstanceOf(FormData);
		if (!(body instanceof FormData)) throw new Error('Expected multipart form data.');
		expect(JSON.parse(String(body.get('NotesDocument')))).toEqual(document);
		expect(body.get('Notes')).toBe(config.form.notes);
		expect(JSON.parse(String(body.get('Ingredients')))).toEqual(config.ingredients);
		expect(config.onSaved).toHaveBeenCalledOnce();
	});
	it('keeps legacy plain-text submission compatible when a document is absent', async () => {
		const { result } = renderHook(
			() =>
				useRecipeMutations({
					...config,
					form: { ...config.form, notesDocument: undefined },
				}),
			{ wrapper },
		);
		await act(async () => {
			await result.current.createMutation.mutateAsync();
		});
		const body = vi.mocked(apiFetch).mock.calls[0][1]?.body;
		if (!(body instanceof FormData)) throw new Error('Expected multipart form data.');
		expect(body.has('NotesDocument')).toBe(false);
		expect(body.get('Notes')).toBe(config.form.notes);
	});
	it.each(['create', 'update'] as const)(
		'only submits confirmed rows and clears saved batch data on %s',
		async (kind) => {
			vi.mocked(apiFetch).mockResolvedValue({}).mockResolvedValueOnce([]);
			const recipeId = kind === 'update' ? 'recipe-1' : undefined;
			const { result } = renderHook(() => useAddRecipeForm({ recipeId }), { wrapper });
			act(() => result.current.setForm((form) => ({ ...form, title: 'Soup' })));
			act(() => result.current.openModal());
			act(() => result.current.setDraft({ name: 'Tomato', quantity: '2', unit: 'Piece' }));
			act(() => result.current.addIngredient());
			const form = render(
				<form aria-label="Recipe" onSubmit={(event) => result.current.handleSubmit(event)} />,
			).getByRole('form', { name: 'Recipe' });
			const submit = () => {
				fireEvent.submit(form);
			};
			act(submit);
			expect(vi.mocked(apiFetch).mock.calls.some(([, init]) => init?.method)).toBe(false);
			expect(result.current.isSaveDisabled).toBe(true);
			act(() => result.current.completeIngredientBatch());
			act(() => result.current.openModal());
			act(() => result.current.setDraft({ name: 'Onion', quantity: '1', unit: 'Piece' }));
			act(() => result.current.addIngredient());
			act(() => result.current.discardIngredientBatch());
			act(submit);
			await waitFor(() => {
				const call = vi.mocked(apiFetch).mock.calls.find(([, init]) => init?.method);
				expect(call).toBeDefined();
				const body = call?.[1]?.body;
				if (!(body instanceof FormData)) throw new Error('Expected multipart form data.');
				expect(JSON.parse(String(body.get('Ingredients')))).toEqual(config.ingredients);
			});
			const storageKey = `shareplate.draft.recipe.${recipeId ?? 'new'}`;
			await waitFor(() =>
				expect(
					JSON.parse(sessionStorage.getItem(storageKey) ?? '{}').ingredientBatch,
				).toBeUndefined(),
			);
		},
	);
});
