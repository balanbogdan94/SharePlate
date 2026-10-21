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
import type { IngredientDraft } from './RecipeIngredientFields';
import { useRecipeMutations } from './useRecipeMutations';
import { useI18n } from '@/i18n/I18nContext';
import { isUnitType, parseQuantity, MIN_QUANTITY } from '@/lib/measurements';

const defaultRecipeForm: FormState = { title: '', notes: '', imageUrl: '' };
type RecipeDraft = {
	form: FormState;
	ingredients: IngredientPayload[];
	ingredientBatch?: IngredientPayload[];
};
type IngredientState = {
	ingredients: IngredientPayload[];
	batch: IngredientPayload[];
	draft: IngredientDraft;
	isOpen: boolean;
	confirmDiscard: boolean;
	error: string | null;
};

function hasUnaddedInput(draft: IngredientDraft) {
	return Boolean(draft.name.trim() || draft.quantity.trim());
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	return fallback;
}

function toInitForm(data?: RecipeDetail): FormState {
	return data
		? {
				title: data.title,
				notes: data.notes ?? '',
				notesDocument: data.notesDocument,
				imageUrl: data.imageUrl ?? '',
			}
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
	const { t } = useI18n();
	const isEditing = Boolean(recipeId);
	const draftKey = recipeId ? `shareplate.draft.recipe.${recipeId}` : 'shareplate.draft.recipe.new';
	const { write: writeDraft, clear: clearDraft } = useDraft(draftKey);
	const savedDraft = useMemo(() => readDraftOnce<RecipeDraft>(draftKey), [draftKey]);

	const [form, setForm] = useState<FormState>(() => savedDraft?.form ?? toInitForm(initialData));
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [ingredientState, setIngredientState] = useState<IngredientState>(() => ({
		ingredients: savedDraft?.ingredients ?? toInitIngredients(initialData),
		batch: savedDraft?.ingredientBatch ?? [],
		draft: { name: '', quantity: '', unit: savedDraft?.ingredientBatch?.at(-1)?.unit ?? 'Piece' },
		isOpen: Boolean(savedDraft?.ingredientBatch?.length),
		confirmDiscard: false,
		error: null,
	}));
	const { ingredients, batch: ingredientBatch, draft, isOpen: isModalOpen } = ingredientState;
	const [ingredientsError, setIngredientsError] = useState<string | null>(null);
	const [notesError, setNotesError] = useState<string | null>(null);

	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();

	const { data: units } = useQuery({
		queryKey: ['units'],
		queryFn: () => apiFetch<Unit[]>('/units'),
	});
	const defaultUnit = useMemo<UnitType>(() => units?.[0]?.id ?? 'Piece', [units]);

	useEffect(() => {
		writeDraft({
			form,
			ingredients,
			...(ingredientBatch.length ? { ingredientBatch } : {}),
		});
	}, [form, ingredients, ingredientBatch, writeDraft]);

	useEffect(() => {
		if (!form.imageUrl.startsWith('data:')) return;
		void fetch(form.imageUrl)
			.then((r) => r.blob())
			.then((blob) => setImageFile(new File([blob], 'image.jpg', { type: blob.type })));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const resetForm = useCallback(() => {
		setForm(defaultRecipeForm);
		setImageFile(null);
		setIngredientState({
			ingredients: [],
			batch: [],
			draft: { name: '', quantity: '', unit: defaultUnit },
			isOpen: false,
			confirmDiscard: false,
			error: null,
		});
		setIngredientsError(null);
		clearDraft();
	}, [clearDraft, defaultUnit]);

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
		onSaved: clearDraft,
	});
	const openModal = () => {
		setIngredientState((previous) => ({
			...previous,
			draft:
				hasUnaddedInput(previous.draft) || previous.batch.length
					? previous.draft
					: { name: '', quantity: '', unit: defaultUnit },
			isOpen: true,
			confirmDiscard: false,
			error: null,
		}));
	};
	const setDraft = (value: IngredientDraft) =>
		setIngredientState((previous) => ({ ...previous, draft: value, error: null }));
	const completeIngredientBatch = () => {
		setIngredientState((previous) => ({
			...previous,
			ingredients: [...previous.ingredients, ...previous.batch],
			batch: [],
			isOpen: false,
			confirmDiscard: false,
			error: null,
		}));
		setIngredientsError(null);
	};
	const requestDismissModal = () =>
		setIngredientState((previous) => ({
			...previous,
			confirmDiscard: Boolean(previous.batch.length || hasUnaddedInput(previous.draft)),
			isOpen: Boolean(previous.batch.length || hasUnaddedInput(previous.draft)),
		}));
	const cancelDiscardIngredientBatch = () =>
		setIngredientState((previous) => ({ ...previous, confirmDiscard: false }));
	const discardIngredientBatch = () =>
		setIngredientState((previous) => ({
			...previous,
			batch: [],
			draft: { name: '', quantity: '', unit: defaultUnit },
			isOpen: false,
			confirmDiscard: false,
			error: null,
		}));
	const addIngredient = () => {
		setIngredientState((previous) => {
			if (!previous.isOpen || previous.confirmDiscard) return previous;
			const name = previous.draft.name.trim();
			const quantity = parseQuantity(previous.draft.quantity);
			if (quantity === null || !isUnitType(previous.draft.unit)) {
				return {
					...previous,
					error: t(quantity === null ? 'measurements.invalidQuantity' : 'measurements.invalidUnit'),
				};
			}
			if (name.length < 2) {
				return { ...previous, error: t('ingredientEntry.invalidName') };
			}
			return {
				...previous,
				batch: [...previous.batch, { name, quantity, unit: previous.draft.unit }],
				draft: { ...previous.draft, name: '', quantity: '' },
				error: null,
			};
		});
	};
	const removeIngredient = (index: number) => {
		setIngredientState((previous) => ({
			...previous,
			ingredients: previous.ingredients.filter((_, i) => i !== index),
		}));
		if (ingredients.length === 1) setIngredientsError('Add at least one ingredient.');
	};
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isModalOpen || notesError) return;
		unlockAudio();
		if (ingredients.length === 0) {
			setIngredientsError('Add at least one ingredient.');
			return;
		}
		if (
			ingredients.some(
				(item) =>
					!Number.isFinite(item.quantity) || item.quantity < MIN_QUANTITY || !isUnitType(item.unit),
			)
		) {
			setIngredientsError(t('measurements.invalidQuantity'));
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
	const isSaveDisabled =
		isPending ||
		isModalOpen ||
		!form.title.trim() ||
		ingredients.length === 0 ||
		Boolean(notesError);
	const submitError =
		notesError ??
		(createMutation.isError
			? toErrorMessage(createMutation.error, 'Could not create recipe.')
			: updateMutation.isError
				? toErrorMessage(updateMutation.error, 'Could not update recipe.')
				: null);
	const isDraftValid =
		draft.name.trim().length >= 2 &&
		parseQuantity(draft.quantity) !== null &&
		isUnitType(draft.unit);
	return {
		form,
		setForm,
		setNotesError,
		imageFile,
		setImageFile,
		ingredients,
		ingredientsError,
		isModalOpen,
		ingredientBatch,
		ingredientDraftError: ingredientState.error,
		isDiscardConfirmationOpen: ingredientState.confirmDiscard,
		hasUnaddedIngredient: hasUnaddedInput(draft),
		draft,
		setDraft,
		completeIngredientBatch,
		requestDismissModal,
		cancelDiscardIngredientBatch,
		discardIngredientBatch,
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
