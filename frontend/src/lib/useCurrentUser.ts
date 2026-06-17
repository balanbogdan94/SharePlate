import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';

export type CurrentUser = {
	id: string;
	name: string;
	email: string;
	profilePictureUrl: string;
	createdAt: string;
	updatedAt: string;
};

export const currentUserQueryKey = ['currentUser'] as const;

export function useCurrentUser() {
	const auth = useAuth();
	return useQuery({
		queryKey: currentUserQueryKey,
		queryFn: () => apiFetch<CurrentUser>('/api/users/me'),
		enabled: auth.isAuthenticated,
		staleTime: 5 * 60 * 1000,
	});
}

type UpdateAvatarInput = { file?: File | null; remove?: boolean };

export function useUpdateAvatar() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: UpdateAvatarInput) => {
			const fd = new FormData();
			if (input.remove) {
				fd.append('RemovePhoto', 'true');
			} else if (input.file) {
				fd.append('Photo', input.file, input.file.name);
			}
			return apiFetch<CurrentUser>('/api/users/me/avatar', { method: 'PUT', body: fd });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
			void queryClient.invalidateQueries({ queryKey: ['house'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes'] });
		},
	});
}
