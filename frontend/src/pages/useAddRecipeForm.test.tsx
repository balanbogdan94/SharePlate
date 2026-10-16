import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notesFromPlainText } from '@/lib/recipeNotes';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { useAddRecipeForm } from './useAddRecipeForm';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn().mockResolvedValue([]) }));
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
function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			<MeasurementProviders>{children}</MeasurementProviders>
		</QueryClientProvider>
	);
}
const key = 'shareplate.draft.recipe.new';

describe('notes drafts', () => {
	beforeEach(() => {
		sessionStorage.clear();
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
