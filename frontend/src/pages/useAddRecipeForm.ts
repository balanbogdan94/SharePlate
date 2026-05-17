import { type FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { FormState, IngredientPayload, RecipeDetail, Unit, UnitType } from '@/pages/tabs/home/types';
import type { IngredientDraft } from './AddRecipeIngredientModal';
import { useRecipeMutations } from './useRecipeMutations';

const defaultRecipeForm: FormState = { title: '', notes: '', imageUrl: '' };

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	return fallback;
}

function toInitForm(data?: RecipeDetail): FormState {
	return data
		? { title: data.title, notes: data.notes ?? '', imageUrl: data.imageUrl ?? '' }
		: defaultRecipeForm;
}

function toInitIngredients(data?: RecipeDetail): IngredientPayload[] {
	return (
		data?.ingredients.map((i) => ({
			name: i.ingredientName,
			quantity: i.quantity,
			unit: i.unitId,
		})) ?? []
	);
}

type HookProps = { recipeId?: string; initialData?: RecipeDetail };

export function useAddRecipeForm({ recipeId, initialData }: HookProps) {
	const isEditing = Boolean(recipeId);
	const [form, setForm] = useState<FormState>(() => toInitForm(initialData));
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [ingredients, setIngredients] = useState<IngredientPayload[]>(() =>
		toInitIngredients(initialData),
	);
	const [ingredientsError, setIngredientsError] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [draft, setDraft] = useState<IngredientDraft>({ name: '', quantity: '', unit: 'Piece' });
	const { data: units } = useQuery({
		queryKey: ['units'],
		queryFn: () => apiFetch<Unit[]>('/api/units'),
	});
	const defaultUnit = useMemo<UnitType>(() => units?.[0]?.id ?? 'Piece', [units]);
	const resetForm = () => {
		setForm(defaultRecipeForm);
		setImageFile(null);
		setIngredients([]);
		setIngredientsError(null);
	};
	const { createMutation, updateMutation } = useRecipeMutations({
		form, imageFile, ingredients, recipeId, initialData, onReset: resetForm,
	});
	const openModal = () => {
		setDraft({ name: '', quantity: '', unit: defaultUnit });
		setIsModalOpen(true);
	};
	const closeModal = () => setIsModalOpen(false);
	const addIngredient = () => {
		const name = draft.name.trim();
		const qty = Number(draft.quantity);
		if (name.length < 2 || !Number.isFinite(qty) || qty <= 0) return;
		setIngredients((prev) => [...prev, { name, quantity: qty, unit: draft.unit }]);
		setIngredientsError(null);
		setIsModalOpen(false);
	};
	const removeIngredient = (index: number) => {
		setIngredients((prev) => {
			const next = prev.filter((_, i) => i !== index);
			if (next.length === 0) setIngredientsError('Add at least one ingredient.');
			return next;
		});
	};
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (ingredients.length === 0) { setIngredientsError('Add at least one ingredient.'); return; }
		if (isEditing) { updateMutation.reset(); updateMutation.mutate(); return; }
		createMutation.reset();
		createMutation.mutate();
	};
	const isPending = createMutation.isPending || updateMutation.isPending;
	const isSaveDisabled = isPending || !form.title.trim() || ingredients.length === 0;
	const submitError = createMutation.isError
		? toErrorMessage(createMutation.error, 'Could not create recipe.')
		: updateMutation.isError
			? toErrorMessage(updateMutation.error, 'Could not update recipe.')
			: null;
	const isDraftValid =
		draft.name.trim().length >= 2 &&
		Number.isFinite(Number(draft.quantity)) &&
		Number(draft.quantity) > 0;
	return {
		form, setForm, imageFile, setImageFile,
		ingredients, ingredientsError,
		isModalOpen, draft, setDraft, closeModal,
		units, defaultUnit,
		isSaveDisabled, isDraftValid, submitError,
		isPending, isEditing,
		openModal, addIngredient, removeIngredient, handleSubmit,
	};
}
