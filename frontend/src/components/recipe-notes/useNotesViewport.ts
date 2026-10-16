import { useEffect, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

export function useNotesViewport(
	container: RefObject<HTMLDivElement | null>,
	editor: Editor | null,
) {
	useEffect(() => {
		const element = container.current;
		if (!element || !editor) return;
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
				if (!focused || !keyboardOpen) return;
				const rect = element.getBoundingClientRect();
				const scroller = element.closest('main');
				if (scroller && rect.top < Math.max(top, shellTop)) {
					scroller.scrollTop += rect.top - Math.max(top, shellTop) - 8;
				} else if (scroller && rect.bottom > top + height - 8) {
					scroller.scrollTop += rect.bottom - (top + height - 8);
				}
				const { from } = editor.state.selection;
				const caret = editor.view.coordsAtPos(from);
				const body = element.querySelector('.notes-editor-scroll');
				if (!body) return;
				const bounds = body.getBoundingClientRect();
				if (caret.bottom > bounds.bottom - 12) body.scrollTop += caret.bottom - bounds.bottom + 12;
				if (caret.top < bounds.top + 12) body.scrollTop -= bounds.top + 12 - caret.top;
			});
		};
		update();
		viewport?.addEventListener('resize', update);
		viewport?.addEventListener('scroll', update);
		window.addEventListener('resize', update);
		element.addEventListener('focusin', update);
		element.addEventListener('focusout', update);
		editor.on('selectionUpdate', update);
		editor.on('update', update);
		return () => {
			cancelAnimationFrame(frame);
			viewport?.removeEventListener('resize', update);
			viewport?.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
			element.removeEventListener('focusin', update);
			element.removeEventListener('focusout', update);
			editor.off('selectionUpdate', update);
			editor.off('update', update);
			delete element.dataset.keyboardOpen;
		};
	}, [container, editor]);
}
