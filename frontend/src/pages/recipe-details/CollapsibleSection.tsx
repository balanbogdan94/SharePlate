import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type CollapsibleSectionProps = {
	title: string;
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
};

export function CollapsibleSection({ title, open, onToggle, children }: CollapsibleSectionProps) {
	return (
		<div className="border-t border-stone-200 dark:border-sp-separator">
			<button
				type="button"
				aria-expanded={open}
				onClick={onToggle}
				className="flex w-full items-center justify-between py-4 text-left"
			>
				<span className="text-lg font-bold text-stone-900 dark:text-sp-text-primary">{title}</span>
				<ChevronDown
					className={cn(
						'h-5 w-5 text-stone-500 transition-transform duration-200 dark:text-sp-icon-secondary',
						open && 'rotate-180',
					)}
				/>
			</button>
			{open && <div className="pb-4">{children}</div>}
		</div>
	);
}
