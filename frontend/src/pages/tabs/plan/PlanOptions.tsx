import { useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { EllipsisVertical, LoaderCircle, PenLine, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { PlanListItem } from './types';
import { formatDisplayDate, toErrorMessage } from './planUtils';
import { usePlanSheet } from './usePlanSheet';

type Props = { plan: PlanListItem; canEdit?: boolean };

function PlanDeleteConfirmation({ plan, onClose }: { plan: PlanListItem; onClose: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const deletion = useMutation({
		mutationFn: () => apiFetch<void>(`/plans/${plan.id}`, { method: 'DELETE' }),
		onSuccess: async () => {
			queryClient.setQueryData<PlanListItem[]>(['plans'], (current) =>
				current?.filter((item) => item.id !== plan.id),
			);
			queryClient.removeQueries({
				predicate: (query) => query.queryKey[0] === 'plans' && query.queryKey.includes(plan.id),
			});
			onClose();
			toast.success('Plan deleted');
			await queryClient.invalidateQueries({ queryKey: ['plans'] });
			await navigate({ to: '/plans', search: {} });
		},
	});
	const { dialogProps, closeModal } = usePlanSheet(onClose, deletion.isPending);
	return (
		<dialog {...dialogProps} aria-labelledby={`plan-delete-${plan.id}`}>
			<div className="flex max-h-[90dvh] flex-col sm:max-h-[85dvh]">
				<div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-stone-300 dark:bg-sp-border sm:hidden" />
				<header className="flex shrink-0 items-start gap-3 px-5 pb-5 pt-5">
					<div className="flex-1">
						<h2 id={`plan-delete-${plan.id}`} className="text-2xl font-bold tracking-tight">
							Delete this plan?
						</h2>
						<p className="mt-1 text-sm text-stone-500 dark:text-sp-text-secondary">
							{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
						</p>
					</div>
					<button
						type="button"
						aria-label="Close delete confirmation"
						disabled={deletion.isPending}
						onClick={closeModal}
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200/70 text-stone-500 hover:bg-stone-200 disabled:opacity-50 dark:bg-sp-surface-active dark:text-sp-text-secondary"
					>
						<X className="h-5 w-5" />
					</button>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
					<div className="rounded-2xl bg-white p-5 dark:bg-sp-surface">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
							<Trash2 className="h-6 w-6" />
						</div>
						<p className="text-sm leading-relaxed text-stone-500 dark:text-sp-text-secondary">
							This removes the plan and its meal schedule. Your recipes will not be deleted. This
							action cannot be undone.
						</p>
					</div>
					{deletion.isError && (
						<p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
							Could not delete the plan. {toErrorMessage(deletion.error, 'Please try again.')}
						</p>
					)}
				</div>
				<footer className="flex shrink-0 gap-3 border-t border-stone-200/80 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-sp-border">
					<Button
						type="button"
						disabled={deletion.isPending}
						onClick={closeModal}
						className="h-12 flex-1 rounded-xl bg-white font-semibold text-stone-700 hover:bg-stone-200 dark:bg-sp-surface dark:text-sp-text-primary dark:hover:bg-sp-surface-active"
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={deletion.isPending}
						onClick={() => deletion.mutate()}
						className="h-12 flex-1 gap-2 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700"
					>
						{deletion.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
						{deletion.isPending ? 'Deleting...' : 'Delete plan'}
					</Button>
				</footer>
			</div>
		</dialog>
	);
}

export function PlanOptions({ plan, canEdit = true }: Props) {
	const navigate = useNavigate();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	return (
		<>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						ref={triggerRef}
						type="button"
						aria-label="Plan options"
						className="flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-stone-500 shadow-none transition hover:text-stone-900 active:scale-95 dark:text-sp-text-secondary dark:hover:text-sp-text-primary"
					>
						<EllipsisVertical className="h-5 w-5" />
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						aria-label="Plan options"
						align="start"
						sideOffset={6}
						collisionPadding={12}
						onCloseAutoFocus={(event) => {
							if (confirmOpen) event.preventDefault();
						}}
						className="z-50 min-w-48 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-1.5 text-stone-900 shadow-xl backdrop-blur-xl motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:zoom-in-95 motion-safe:duration-150 dark:border-sp-border dark:bg-sp-surface-elevated dark:text-sp-text-primary"
					>
						{canEdit && (
							<>
								<DropdownMenu.Item
									onSelect={() =>
										void navigate({ to: '/plans/$planId/edit', params: { planId: plan.id } })
									}
									className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none data-[highlighted]:bg-stone-100 dark:data-[highlighted]:bg-sp-surface-active"
								>
									<PenLine className="h-4 w-4" />
									Edit plan
								</DropdownMenu.Item>
								<DropdownMenu.Separator className="my-1 h-px bg-stone-200 dark:bg-sp-separator" />
							</>
						)}
						<DropdownMenu.Item
							onSelect={() => setConfirmOpen(true)}
							className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
						>
							<Trash2 className="h-4 w-4" />
							Delete plan
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
			{confirmOpen && (
				<PlanDeleteConfirmation
					plan={plan}
					onClose={() => {
						setConfirmOpen(false);
						requestAnimationFrame(() => triggerRef.current?.focus());
					}}
				/>
			)}
		</>
	);
}
