import { ChevronRight, Home, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { apiFetch } from '@/lib/api';
import { getInitials, getNameFromToken } from '@/lib/jwt';

export function ProfilePage() {
	const { t } = useI18n();
	const auth = useAuth();
	const navigate = useNavigate();
	const name = getNameFromToken(auth.tokens?.accessToken ?? '') ?? '';
	const initials = getInitials(name);

	const handleLogout = async () => {
		const refreshToken = auth.tokens?.refreshToken;
		if (refreshToken) {
			await apiFetch<void>('/auth/logout', {
				method: 'POST',
				body: JSON.stringify({ refreshToken }),
			}).catch(() => undefined);
		}
		auth.logout();
		await navigate({ to: '/login' });
	};

	return (
		<div className="space-y-6 pb-8 pt-2">
			<h1 className="text-[2rem] font-bold tracking-tight text-stone-900 dark:text-stone-50">
				{t('shell.profile')}
			</h1>

			<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
				<div className="flex min-h-[68px] items-center gap-4 px-4 py-3">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
						{initials}
					</div>
					<p className="truncate font-semibold text-stone-900 dark:text-stone-100">{name}</p>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
				<Link
					to="/house"
					className="flex min-h-[52px] items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800"
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-blue-500">
						<Home className="h-4 w-4 text-white" />
					</div>
					<span className="flex-1 text-base text-stone-900 dark:text-stone-100">
						{t('tabs.house')}
					</span>
					<ChevronRight className="h-4 w-4 text-stone-400 dark:text-stone-500" />
				</Link>

				<div className="ml-[3.25rem] h-px bg-stone-200 dark:bg-stone-700/60" />

				<Link
					to="/settings"
					className="flex min-h-[52px] items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800"
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-stone-500">
						<Settings className="h-4 w-4 text-white" />
					</div>
					<span className="flex-1 text-base text-stone-900 dark:text-stone-100">
						{t('shell.settings')}
					</span>
					<ChevronRight className="h-4 w-4 text-stone-400 dark:text-stone-500" />
				</Link>
			</div>

			<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
				<button
					type="button"
					onClick={handleLogout}
					className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800"
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-500">
						<LogOut className="h-4 w-4 text-white" />
					</div>
					<span className="text-base font-medium text-red-500">{t('shell.logout')}</span>
				</button>
			</div>
		</div>
	);
}
