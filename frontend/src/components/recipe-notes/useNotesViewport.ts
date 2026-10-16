import { useEffect, type RefObject } from 'react';

export function useNotesViewport(container: RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		const element = container.current;
		if (!element) return;
		const viewport = window.visualViewport;
		let baselineHeight = window.innerHeight;
		let baselineWidth = window.innerWidth;
		let frame = 0;
		const update = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const height = viewport?.height ?? window.innerHeight;
				const top = viewport?.offsetTop ?? 0;
				const focused = element.contains(document.activeElement);
				if (!focused || baselineWidth !== window.innerWidth) baselineHeight = window.innerHeight;
				baselineWidth = window.innerWidth;
				const keyboardOpen = focused && baselineHeight - height > 120;
				element.dataset.keyboardOpen = String(keyboardOpen);
				const shellTop = document.querySelector('header')?.getBoundingClientRect().bottom ?? top;
				const available = Math.max(96, height - Math.max(0, shellTop - top) - 24);
				const limit = keyboardOpen ? available : Math.min(available, height / 2);
				element.style.setProperty('--notes-editor-limit', `${Math.floor(limit)}px`);
			});
		};
		update();
		viewport?.addEventListener('resize', update);
		viewport?.addEventListener('scroll', update);
		window.addEventListener('resize', update);
		element.addEventListener('focusin', update);
		element.addEventListener('focusout', update);
		return () => {
			cancelAnimationFrame(frame);
			viewport?.removeEventListener('resize', update);
			viewport?.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
			element.removeEventListener('focusin', update);
			element.removeEventListener('focusout', update);
			delete element.dataset.keyboardOpen;
		};
	}, [container]);
}
