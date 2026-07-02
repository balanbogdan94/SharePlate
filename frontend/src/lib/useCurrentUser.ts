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
		queryFn: () => apiFetch<CurrentUser>('/users/me'),
		enabled: auth.isAuthenticated,
		staleTime: 5 * 60 * 1000,
	});
}

type UpdateAvatarInput = { file: File };

export function useUpdateAvatar() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: UpdateAvatarInput) => {
			const fd = new FormData();
			fd.append('RemovePhoto', 'false');
			fd.append('Photo', input.file, input.file.name);
			return apiFetch<CurrentUser>('/users/me/avatar', { method: 'PUT', body: fd });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
			void queryClient.invalidateQueries({ queryKey: ['house'] });
			void queryClient.invalidateQueries({ queryKey: ['recipes'] });
		},
	});
}
