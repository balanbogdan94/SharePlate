import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type CollapsibleSectionProps = {
	title: string;
	badge?: string;
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
};

export function CollapsibleSection({
	title,
	badge,
	open,
	onToggle,
	children,
}: CollapsibleSectionProps) {
	return (
		<div className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-xs duration-500 dark:border-sp-border dark:bg-sp-surface">
			<button
				type="button"
				aria-expanded={open}
				onClick={onToggle}
				className="flex w-full items-center gap-3 px-4 py-4 text-left"
			>
				<span className="flex-1 text-base font-bold text-stone-900 dark:text-sp-text-primary">
					{title}
				</span>
				{badge && (
					<span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500 dark:bg-sp-surface-active dark:text-sp-text-tertiary">
						{badge}
					</span>
				)}
				<ChevronDown
					className={cn(
						'h-5 w-5 shrink-0 text-stone-400 transition-transform duration-300 dark:text-sp-icon-secondary',
						open && 'rotate-180',
					)}
				/>
			</button>
			<div
				className={cn(
					'grid transition-[grid-template-rows] duration-300 ease-out',
					open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				)}
			>
				<div className="overflow-hidden">
					<div className="border-t border-stone-100 px-4 pb-5 pt-3 dark:border-sp-separator">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
