import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router';
import { apiFetch } from '@/lib/api';
import { useFeedback } from '@/lib/feedback/useFeedback';
import type { FormState, IngredientPayload, RecipeDetail } from '@/pages/tabs/home/types';

function serializeIngredients(ingredients: IngredientPayload[]): string {
	return JSON.stringify(ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })));
}

type MutationsConfig = {
	form: FormState;
	imageFile: File | null;
	ingredients: IngredientPayload[];
	recipeId?: string;
	initialData?: RecipeDetail;
	onReset: () => void;
};

export function useRecipeMutations({
	form,
	imageFile,
	ingredients,
	recipeId,
	initialData,
	onReset,
}: MutationsConfig) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const router = useRouter();
	const canGoBack = useCanGoBack();
	const { notifySuccess, notifyError } = useFeedback();

	const createMutation = useMutation({
		mutationFn: async () => {
			const fd = new FormData();
			fd.append('Title', form.title);
			fd.append('Notes', form.notes ?? '');
			if (imageFile) fd.append('Image', imageFile, imageFile.name);
			fd.append('Ingredients', serializeIngredients(ingredients));
			return apiFetch('/recipes', { method: 'POST', body: fd });
		},
		onSuccess: async () => {
			notifySuccess({
				titleKey: 'recipe.create.success',
				bodyKey: 'recipe.create.successBody',
			});
			onReset();
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] });
			if (canGoBack) {
				router.history.back();
				return;
			}
			await navigate({ to: '/recipes' });
		},
		onError: () => {
			notifyError({
				titleKey: 'recipe.create.error',
				bodyKey: 'recipe.create.errorBody',
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: async () => {
			if (!recipeId) throw new Error('Missing recipe id.');
			const fd = new FormData();
			fd.append('Title', form.title);
			fd.append('Notes', form.notes ?? '');
			fd.append('RemoveImage', String(Boolean(initialData?.imageUrl) && !form.imageUrl));
			if (imageFile) fd.append('Image', imageFile, imageFile.name);
			fd.append('Ingredients', serializeIngredients(ingredients));
			return apiFetch(`/recipes/${recipeId}`, { method: 'PUT', body: fd });
		},
		onSuccess: async () => {
			notifySuccess({
				titleKey: 'recipe.update.success',
				bodyKey: 'recipe.update.successBody',
			});
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'my'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', recipeId] });
			if (canGoBack) {
				router.history.back();
				return;
			}
			await navigate({ to: '/recipes' });
		},
		onError: () => {
			notifyError({
				titleKey: 'recipe.update.error',
				bodyKey: 'recipe.update.errorBody',
			});
		},
	});

	return { createMutation, updateMutation };
}
