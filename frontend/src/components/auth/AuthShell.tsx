import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nContext';

type AuthShellProps = {
	title: string;
	description: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
	const { t } = useI18n();
	const brand = t('app.brand');

	return (
		<main className="safe-x safe-y relative flex min-h-[100dvh] flex-col overflow-hidden bg-stone-50 text-stone-900 dark:bg-sp-background dark:text-sp-text-primary">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -left-16 -top-24 h-80 w-80 animate-aurora rounded-full bg-green-400/30 blur-3xl dark:bg-green-500/20" />
				<div className="absolute -right-20 top-1/3 h-72 w-72 animate-aurora-slow rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/15" />
				<div className="absolute -bottom-24 left-1/4 h-96 w-96 animate-aurora rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/15" />
			</div>

			<div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-8">
				<div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 text-center duration-700">
					<div className="relative">
						<div className="absolute inset-0 -z-10 rounded-[28%] bg-green-400/40 blur-2xl dark:bg-green-500/25" />
						<div className="h-24 w-24 overflow-hidden rounded-[28%] ring-1 ring-white/60 shadow-[0_12px_30px_rgba(16,64,32,0.25)] dark:ring-white/10 dark:shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
							<img src="/icons/icon-512.png" alt="" className="h-full w-full object-cover" />
						</div>
					</div>
					<p className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-2xl font-extrabold uppercase tracking-wide text-transparent dark:from-sp-primary dark:to-emerald-300">
						{brand}
					</p>
				</div>

				<div className="animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl duration-700 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] sm:p-7">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/50 to-transparent dark:from-white/10" />
					<div className="relative space-y-1.5 text-center">
						<h1 className="text-2xl font-bold text-stone-900 dark:text-sp-text-primary">{title}</h1>
						<p className="text-sm text-stone-600 dark:text-sp-text-secondary">{description}</p>
					</div>
					<div className="relative mt-6 space-y-4">
						{children}
						{footer ? footer : null}
					</div>
				</div>

				<p className="text-center text-xs leading-relaxed text-stone-500 dark:text-sp-text-tertiary">
					{t('app.subtitle')}
				</p>
			</div>
		</main>
	);
}
