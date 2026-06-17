import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useI18n } from '@/i18n/I18nContext';
import { useCurrentUser, useUpdateAvatar } from '@/lib/useCurrentUser';
import { getNameFromToken } from '@/lib/jwt';
import { useAuth } from '@/auth/AuthContext';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfileAvatar() {
	const { t } = useI18n();
	const auth = useAuth();
	const currentUser = useCurrentUser();
	const updateAvatar = useUpdateAvatar();
	const inputRef = useRef<HTMLInputElement>(null);

	const name = currentUser.data?.name ?? getNameFromToken(auth.tokens?.accessToken ?? '') ?? '';
	const photoUrl = currentUser.data?.profilePictureUrl ?? '';
	const isBusy = updateAvatar.isPending;

	const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		event.target.value = '';
		if (file && ACCEPTED_TYPES.includes(file.type)) {
			updateAvatar.mutate({ file });
		}
	};

	return (
		<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
			<div className="flex min-h-[68px] items-center gap-4 px-4 py-3">
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={isBusy}
					aria-label={t('profile.changePhoto')}
					className="group relative h-12 w-12 shrink-0 rounded-full disabled:opacity-60"
				>
					<Avatar
						name={name}
						photoUrl={photoUrl}
						className="h-12 w-12"
						fallbackClassName="bg-green-500 text-lg text-white"
					/>
					<span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white shadow dark:bg-stone-700">
						<Camera className="h-3 w-3" />
					</span>
				</button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-stone-900 dark:text-stone-100">{name}</p>
					<div className="mt-1 flex gap-3">
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							disabled={isBusy}
							className="text-sm font-medium text-green-600 disabled:opacity-60 dark:text-green-400"
						>
							{t('profile.changePhoto')}
						</button>
						{photoUrl && (
							<button
								type="button"
								onClick={() => updateAvatar.mutate({ remove: true })}
								disabled={isBusy}
								className="text-sm font-medium text-red-500 disabled:opacity-60"
							>
								{t('profile.removePhoto')}
							</button>
						)}
					</div>
				</div>
				<input
					ref={inputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={handleFile}
					className="hidden"
				/>
			</div>
			{updateAvatar.isError && (
				<p className="px-4 pb-3 text-sm text-red-500">{t('profile.photoError')}</p>
			)}
		</div>
	);
}
