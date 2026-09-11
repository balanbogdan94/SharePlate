import { CalendarRange, Plus } from 'lucide-react';

function PlanEmptyIllustration() {
	return (
		<svg viewBox="0 0 200 160" className="h-36 w-36" aria-hidden="true" fill="none">
			<ellipse cx="100" cy="142" rx="50" ry="7" fill="currentColor" className="text-stone-900/5 dark:text-black/40" />

			<g className="text-green-500 dark:text-sp-primary" strokeLinecap="round">
				<rect x="50" y="50" width="100" height="82" rx="16" stroke="currentColor" strokeWidth="7" />
				<path d="M50 76h100" stroke="currentColor" strokeWidth="6" />
				<path d="M76 40v14M124 40v14" stroke="currentColor" strokeWidth="7" />
			</g>

			<g
				stroke="currentColor"
				strokeWidth="3"
				strokeDasharray="3 7"
				strokeLinecap="round"
				opacity="0.55"
				className="text-stone-400 dark:text-sp-text-tertiary"
			>
				<path d="M66 98h68" />
				<path d="M66 114h48" />
			</g>

			<circle cx="148" cy="52" r="17" fill="currentColor" className="text-green-500 dark:text-sp-primary" />
			<path
				d="M148 45v14M141 52h14"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				className="text-white dark:text-sp-text-on-primary"
			/>

			<g fill="currentColor" opacity="0.7" className="text-green-300 dark:text-emerald-400">
				<path d="M28 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
				<path d="M170 100l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
			</g>
		</svg>
	);
}

type PlanEmptyStateProps = {
	onCreate: () => void;
};

export function PlanEmptyState({ onCreate }: PlanEmptyStateProps) {
	return (
		<div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 rounded-3xl border border-stone-200 bg-white px-6 py-10 text-center shadow-sm duration-500 dark:border-sp-border dark:bg-sp-surface">
			<div className="relative">
				<div className="absolute inset-0 -z-10 rounded-full bg-green-400/30 blur-2xl dark:bg-green-500/20" />
				<PlanEmptyIllustration />
			</div>
			<div className="space-y-1.5">
				<h2 className="text-lg font-bold text-stone-900 dark:text-sp-text-primary">No plans yet</h2>
				<p className="max-w-[22rem] text-sm text-stone-500 dark:text-sp-text-secondary">
					Create your first household meal plan and start organising your week together.
				</p>
			</div>
			<button
				type="button"
				onClick={onCreate}
				className="inline-flex h-11 items-center gap-2 rounded-full bg-green-600 px-5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-green-700 active:scale-95 dark:bg-sp-primary dark:text-sp-text-on-primary dark:hover:bg-sp-primary-hover"
			>
				<Plus className="h-4 w-4" />
				Create your first plan
			</button>
		</div>
	);
}

export function PlanNoActiveState() {
	return (
		<div className="flex flex-col items-center gap-2 py-10 text-center">
			<CalendarRange className="h-10 w-10 text-green-500/70 dark:text-sp-primary" />
			<h2 className="text-lg font-bold text-stone-900 dark:text-sp-text-primary">No active plan today</h2>
			<p className="max-w-xs text-sm text-stone-500 dark:text-sp-text-secondary">
				Tap + to create a plan and start organising your week.
			</p>
		</div>
	);
}
