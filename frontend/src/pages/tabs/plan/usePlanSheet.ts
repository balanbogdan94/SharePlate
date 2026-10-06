import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';

export function usePlanSheet(onClose: () => void, closeDisabled = false) {
	const ref = useRef<HTMLDialogElement>(null);
	const [closing, setClosing] = useState(false);
	useEffect(() => {
		const dialog = ref.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	useEffect(() => {
		if (!closing) return;
		const timeout = window.setTimeout(onClose, 200);
		return () => window.clearTimeout(timeout);
	}, [closing, onClose]);
	const closeModal = () => {
		if (closing || closeDisabled) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose();
		else setClosing(true);
	};
	const dialogProps = {
		ref,
		onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
			event.preventDefault();
			closeModal();
		},
		onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				closeModal();
			}
		},
		onClick: (event: MouseEvent<HTMLDialogElement>) => {
			if (event.target === event.currentTarget) closeModal();
		},
		className: `fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-[2rem] border-0 bg-stone-100 p-0 text-stone-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:bg-sp-background dark:text-sp-text-primary sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-[2rem] ${closing ? 'pointer-events-none motion-safe:animate-out motion-safe:slide-out-to-bottom-full motion-safe:fade-out motion-safe:duration-200 motion-safe:ease-in sm:motion-safe:slide-out-to-bottom-8' : 'motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:fade-in motion-safe:duration-300 motion-safe:ease-out sm:motion-safe:slide-in-from-bottom-8'}`,
	};
	return { dialogProps, closeModal };
}
