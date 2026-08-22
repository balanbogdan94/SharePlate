import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { unlockAudio } from '@/lib/feedback/sound';
import { useDraft, readDraftOnce } from '@/lib/useDraft';
import type {
	FormState,
	IngredientPayload,
	RecipeDetail,
	Unit,
	UnitType,
} from '@/pages/tabs/home/types';
import type { IngredientDraft } from './AddRecipeIngredientModal';
import { useRecipeMutations } from './useRecipeMutations';

const defaultRecipeForm: FormState = { title: '', notes: '', imageUrl: '' };
type RecipeDraft = { form: FormState; ingredients: IngredientPayload[] };

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
	const draftKey = recipeId ? `shareplate.draft.recipe.${recipeId}` : 'shareplate.draft.recipe.new';
	const { write: writeDraft, clear: clearDraft } = useDraft(draftKey);
	const savedDraft = useMemo(() => readDraftOnce<RecipeDraft>(draftKey), [draftKey]);

	const [form, setForm] = useState<FormState>(() => savedDraft?.form ?? toInitForm(initialData));
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [ingredients, setIngredients] = useState<IngredientPayload[]>(
		() => savedDraft?.ingredients ?? toInitIngredients(initialData),
	);
	const [ingredientsError, setIngredientsError] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [draft, setDraft] = useState<IngredientDraft>({ name: '', quantity: '', unit: 'Piece' });

	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();

	const { data: units } = useQuery({
		queryKey: ['units'],
		queryFn: () => apiFetch<Unit[]>('/units'),
	});
	const defaultUnit = useMemo<UnitType>(() => units?.[0]?.id ?? 'Piece', [units]);

	useEffect(() => {
		writeDraft({ form, ingredients });
	}, [form, ingredients, writeDraft]);

	useEffect(() => {
		if (!form.imageUrl.startsWith('data:')) return;
		void fetch(form.imageUrl)
			.then((r) => r.blob())
			.then((blob) => setImageFile(new File([blob], 'image.jpg', { type: blob.type })));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const resetForm = useCallback(() => {
		setForm(defaultRecipeForm);
		setImageFile(null);
		setIngredients([]);
		setIngredientsError(null);
		clearDraft();
	}, [clearDraft]);

	const discard = useCallback(async () => {
		clearDraft();
		if (canGoBack) {
			router.history.back();
			return;
		}
		await navigate({ to: '/recipes' });
	}, [clearDraft, canGoBack, router, navigate]);
	const { createMutation, updateMutation } = useRecipeMutations({
		form,
		imageFile,
		ingredients,
		recipeId,
		initialData,
		onReset: resetForm,
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
		unlockAudio();
		if (ingredients.length === 0) {
			setIngredientsError('Add at least one ingredient.');
			return;
		}
		if (isEditing) {
			updateMutation.reset();
			updateMutation.mutate();
			return;
		}
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
		form,
		setForm,
		imageFile,
		setImageFile,
		ingredients,
		ingredientsError,
		isModalOpen,
		draft,
		setDraft,
		closeModal,
		units,
		defaultUnit,
		isSaveDisabled,
		isDraftValid,
		submitError,
		isPending,
		isEditing,
		openModal,
		addIngredient,
		removeIngredient,
		handleSubmit,
		discard,
	};
}
