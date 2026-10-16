import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api';
import { notesFromPlainText } from '@/lib/recipeNotes';
import { useRecipeMutations } from './useRecipeMutations';

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
	return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
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
};

describe('formatted notes API payloads', () => {
	beforeEach(() => {
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
});
