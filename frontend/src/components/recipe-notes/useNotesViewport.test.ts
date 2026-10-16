import { act, renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notesExtensions } from './notesExtensions';
import { useNotesViewport } from './useNotesViewport';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('notes visual viewport sizing', () => {
	it('distinguishes keyboard height changes from screen-width changes and cleans up', () => {
		vi.useFakeTimers();
		const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
		vi.stubGlobal('visualViewport', viewport);
		vi.stubGlobal('innerHeight', 844);
		vi.stubGlobal('innerWidth', 390);
		const container = document.createElement('div');
		const body = document.createElement('div');
		body.className = 'notes-editor-scroll';
		container.append(body);
		document.body.append(container);
		const editor = new Editor({ element: body, extensions: notesExtensions(vi.fn()) });
		editor.view.dom.tabIndex = 0;
		vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ top: 0, bottom: 28, left: 0, right: 0 });
		const hook = renderHook(() => useNotesViewport({ current: container }, editor));
		act(() => {
			vi.runAllTimers();
		});
		expect(container.style.getPropertyValue('--notes-editor-limit')).toBe('422px');
		act(() => {
			editor.view.dom.focus();
			viewport.height = 544;
			viewport.dispatchEvent(new Event('resize'));
			vi.runAllTimers();
		});
		expect(container.dataset.keyboardOpen).toBe('true');
		expect(container.style.getPropertyValue('--notes-editor-limit')).toBe('520px');
		act(() => {
			vi.stubGlobal('innerHeight', 568);
			vi.stubGlobal('innerWidth', 320);
			viewport.height = 568;
			window.dispatchEvent(new Event('resize'));
			vi.runAllTimers();
		});
		expect(container.dataset.keyboardOpen).toBe('false');
		expect(container.style.getPropertyValue('--notes-editor-limit')).toBe('284px');
		hook.unmount();
		expect(container.dataset.keyboardOpen).toBeUndefined();
		editor.destroy();
		container.remove();
	});
});
