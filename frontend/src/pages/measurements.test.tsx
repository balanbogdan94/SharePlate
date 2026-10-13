import { act, render, renderHook, screen, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { IngredientsList } from './recipe-details/IngredientsList';
import { AddRecipeIngredientModal } from './AddRecipeIngredientModal';
import { useAddRecipeForm } from './useAddRecipeForm';
import type { UnitType } from './tabs/home/types';

const units: UnitType[] = [
	'Kilogram',
	'Gram',
	'Liter',
	'Milliliter',
	'Piece',
	'Portion',
	'Teaspoon',
	'Tablespoon',
	'Can',
	'Cup',
	'Pinch',
	'Clove',
	'Bunch',
	'Slice',
	'Package',
];
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
	useRouter: () => ({ history: { back: vi.fn() } }),
	useCanGoBack: () => false,
}));
vi.mock('@/lib/api', () => ({ apiFetch: async () => [] }));
vi.mock('./useRecipeMutations', () => ({
	useRecipeMutations: () => ({ createMutation: {}, updateMutation: {} }),
}));
beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('measurement UI', () => {
	it.each(units)('adds a comma-decimal %s as a numeric API ingredient', (unit) => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: { children: ReactNode }) => (
			<MeasurementProviders>
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			</MeasurementProviders>
		);
		const { result, unmount } = renderHook(() => useAddRecipeForm({ recipeId: unit }), { wrapper });
		act(() => result.current.setDraft({ name: 'Ingredient', quantity: '0,5', unit }));
		expect(result.current.isDraftValid).toBe(true);
		act(() => result.current.addIngredient());
		expect(result.current.ingredients).toEqual([{ name: 'Ingredient', quantity: 0.5, unit }]);
		unmount();
		client.clear();
	});
	it.each(['en', 'ro'] as const)('renders all units and small quantities in %s', (language) => {
		window.localStorage.setItem('shareplate.user.settings', JSON.stringify({ language }));
		render(
			<IngredientsList
				ingredients={units.map((unitId, index) => ({
					id: String(index),
					ingredientId: String(index),
					ingredientName: `Ingredient ${index}`,
					quantity: index === 0 ? 0.001 : 0.125,
					unitId,
				}))}
			/>,
			{ wrapper: MeasurementProviders },
		);
		expect(screen.getByText(language === 'ro' ? '0,001 kg' : '0.001 kg')).toBeInTheDocument();
		expect(
			screen.getByText(language === 'ro' ? '0,125 linguri' : '0.125 tablespoons'),
		).toBeInTheDocument();
		expect(screen.queryByText(/undefined|Tablespoon/u)).not.toBeInTheDocument();
	});
	it('shows defined culinary volumes and an explicit invalid quantity error', () => {
		render(
			<AddRecipeIngredientModal
				isOpen
				draft={{ name: 'Salt', quantity: '0,0001', unit: 'Teaspoon' }}
				units={units.map((id) => ({ id, name: id, symbol: id, category: '' }))}
				defaultUnit="Piece"
				isDraftValid={false}
				onClose={vi.fn()}
				onAdd={vi.fn()}
				onChange={vi.fn()}
			/>,
			{ wrapper: MeasurementProviders },
		);
		expect(screen.getByRole('option', { name: 'Teaspoon (5 ml)' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Tablespoon (15 ml)' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Measuring cup (250 ml)' })).toBeInTheDocument();
		expect(screen.getAllByRole('group')).toHaveLength(5);
		for (const [name, count] of [
			['Weight', 2],
			['Volume', 2],
			['Kitchen measures', 4],
			['Pieces & portions', 5],
			['Packaging', 2],
		] as const) {
			expect(within(screen.getByRole('group', { name })).getAllByRole('option')).toHaveLength(
				count,
			);
		}
		expect(screen.getByRole('alert')).toHaveTextContent('0.001');
		expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
	});
});
