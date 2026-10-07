import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

function EmptyRecipesIllustration() {
	return (
		<svg viewBox="0 0 200 160" className="h-36 w-36" aria-hidden="true" fill="none">
			<ellipse
				cx="100"
				cy="140"
				rx="54"
				ry="7"
				fill="currentColor"
				className="text-stone-900/5 dark:text-black/40"
			/>

			<g className="text-green-500 dark:text-sp-primary" strokeLinecap="round">
				<path d="M48 78 Q48 122 100 122 Q152 122 152 78" stroke="currentColor" strokeWidth="7" />
				<ellipse cx="100" cy="78" rx="52" ry="16" stroke="currentColor" strokeWidth="7" />
			</g>

			<ellipse
				cx="100"
				cy="80"
				rx="34"
				ry="9"
				stroke="currentColor"
				strokeWidth="3"
				strokeDasharray="3 8"
				strokeLinecap="round"
				opacity="0.55"
				className="text-stone-400 dark:text-sp-text-tertiary"
			/>

			<circle
				cx="150"
				cy="36"
				r="17"
				fill="currentColor"
				className="text-green-500 dark:text-sp-primary"
			/>
			<path
				d="M150 29v14M143 36h14"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				className="text-white dark:text-sp-text-on-primary"
			/>

			<g fill="currentColor" opacity="0.7" className="text-green-300 dark:text-emerald-400">
				<path d="M26 46l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
				<path d="M170 100l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
			</g>
		</svg>
	);
}

export function RecipesEmptyState() {
	return (
		<div className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-4 rounded-3xl border border-stone-200 bg-white px-6 py-10 text-center shadow-xs duration-500 dark:border-sp-border dark:bg-sp-surface">
			<div className="relative">
				<div className="absolute inset-0 -z-10 rounded-full bg-green-400/30 blur-2xl dark:bg-green-500/20" />
				<EmptyRecipesIllustration />
			</div>
			<div className="space-y-1.5">
				<h2 className="text-lg font-bold text-stone-900 dark:text-sp-text-primary">
					Your recipe box is empty
				</h2>
				<p className="max-w-88 text-sm text-stone-500 dark:text-sp-text-secondary">
					Save your favorite dishes here so your household can cook from them together.
				</p>
			</div>
			<Link
				to="/recipes/add"
				className="inline-flex h-11 items-center gap-2 rounded-full bg-green-600 px-5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-green-700 active:scale-95 dark:bg-sp-primary dark:text-sp-text-on-primary dark:hover:bg-sp-primary-hover"
			>
				<Plus className="h-4 w-4" />
				Add your first recipe
			</Link>
		</div>
	);
}
