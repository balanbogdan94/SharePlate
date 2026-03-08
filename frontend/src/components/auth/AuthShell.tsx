import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

type AuthShellProps = {
	title: string;
	description: string;
	children: ReactNode;
	footer: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
	const { t } = useI18n();

	return (
		<main className='safe-x safe-y relative min-h-screen min-h-[100dvh] overflow-hidden bg-stone-100 px-4 py-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6 sm:py-8'>
			<div className='pointer-events-none absolute inset-0'>
				<div className='absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-500/15' />
				<div className='absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/15' />
				<div className='absolute left-1/3 top-1/3 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/15' />
			</div>

			<div className='relative mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-5xl items-center sm:min-h-[calc(100dvh-4rem)]'>
				<div className='grid w-full gap-4 sm:gap-6 lg:grid-cols-2'>
					<section className='hidden rounded-3xl border border-white/70 bg-gradient-to-br from-amber-100 via-orange-50 to-stone-50 p-10 shadow-xl dark:border-stone-700/70 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 lg:flex lg:flex-col lg:justify-between'>
						<div>
							<p className='mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400'>
								{t('app.brand')}
							</p>
							<h1 className='max-w-sm text-4xl font-semibold leading-tight text-stone-900 dark:text-stone-100'>
								{t('app.tagline')}
							</h1>
							<p className='mt-4 max-w-md text-base text-stone-600 dark:text-stone-300'>
								{t('app.subtitle')}
							</p>
						</div>
						<div className='rounded-2xl border border-stone-200/80 bg-white/80 p-5 backdrop-blur-sm dark:border-stone-700/70 dark:bg-stone-900/70'>
							<p className='text-sm text-stone-700 dark:text-stone-200'>
								{t('app.promo')}
							</p>
						</div>
					</section>

					<Card className='w-full rounded-3xl border-white/70 bg-white/90 shadow-2xl backdrop-blur-sm dark:border-stone-700/70 dark:bg-stone-900/85'>
						<CardHeader className='p-5 pb-3 sm:p-6 sm:pb-4'>
							<CardTitle className='text-3xl text-stone-900 dark:text-stone-100'>
								{title}
							</CardTitle>
							<CardDescription className='text-stone-600 dark:text-stone-300'>
								{description}
							</CardDescription>
						</CardHeader>
						<CardContent className='p-5 pt-0 sm:p-6 sm:pt-0'>
							<div className='space-y-4'>
								{children}
								{footer}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
