import { act, renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notesExtensions } from './notesExtensions';
import { useNotesViewport } from './useNotesViewport';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
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
		const hook = renderHook(() => useNotesViewport({ current: container }));
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

	it('preserves manual scrolling while typing with the keyboard open', () => {
		vi.useFakeTimers();
		vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
		const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
		vi.stubGlobal('visualViewport', viewport);
		vi.stubGlobal('innerHeight', 844);
		vi.stubGlobal('innerWidth', 390);
		const main = document.createElement('main');
		const container = document.createElement('div');
		const body = document.createElement('div');
		body.className = 'notes-editor-scroll';
		container.append(body);
		main.append(container);
		document.body.append(main);
		const editor = new Editor({ element: body, extensions: notesExtensions(vi.fn()) });
		editor.view.dom.tabIndex = 0;
		vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -100, 320, 420));
		vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -43, 320, 363));
		vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({
			top: 60,
			bottom: 88,
			left: 0,
			right: 0,
		});
		const hook = renderHook(() => useNotesViewport({ current: container }));
		act(() => {
			editor.view.dom.focus();
			viewport.height = 544;
			viewport.dispatchEvent(new Event('resize'));
			vi.runAllTimers();
		});
		expect(container.dataset.keyboardOpen).toBe('true');
		main.scrollTop = 700;
		body.scrollTop = 1200;
		for (const character of 'typing') {
			act(() => {
				editor.commands.insertContent(character);
				vi.runAllTimers();
			});
			expect(main.scrollTop).toBe(700);
			expect(body.scrollTop).toBe(1200);
		}
		act(() => {
			viewport.offsetTop = 20;
			viewport.dispatchEvent(new Event('scroll'));
			vi.runAllTimers();
		});
		expect(main.scrollTop).toBe(700);
		expect(body.scrollTop).toBe(1200);
		hook.unmount();
		editor.destroy();
		main.remove();
	});
});
