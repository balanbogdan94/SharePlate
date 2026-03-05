import type { ReactNode } from 'react';
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
	return (
		<main className='relative min-h-screen overflow-hidden bg-stone-100 px-6 py-12 text-stone-900'>
			<div className='pointer-events-none absolute inset-0'>
				<div className='absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-amber-300/35 blur-3xl' />
				<div className='absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl' />
				<div className='absolute left-1/3 top-1/3 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl' />
			</div>

			<div className='relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center'>
				<div className='grid w-full gap-6 lg:grid-cols-2'>
					<section className='hidden rounded-3xl border border-white/70 bg-gradient-to-br from-amber-100 via-orange-50 to-stone-50 p-10 shadow-xl lg:flex lg:flex-col lg:justify-between'>
						<div>
							<p className='mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500'>
								SharePlate
							</p>
							<h1 className='max-w-sm text-4xl font-semibold leading-tight text-stone-900'>
								Cook together. Plan together. Eat better.
							</h1>
							<p className='mt-4 max-w-md text-base text-stone-600'>
								One place for your recipes, grocery lists, and meal planning with
								your household.
							</p>
						</div>
						<div className='rounded-2xl border border-stone-200/80 bg-white/80 p-5 backdrop-blur-sm'>
							<p className='text-sm text-stone-700'>
								Fast signup, secure auth, and instant collaboration.
							</p>
						</div>
					</section>

					<Card className='w-full rounded-3xl border-white/70 bg-white/90 shadow-2xl backdrop-blur-sm'>
						<CardHeader>
							<CardTitle className='text-3xl text-stone-900'>{title}</CardTitle>
							<CardDescription className='text-stone-600'>
								{description}
							</CardDescription>
						</CardHeader>
						<CardContent>
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
