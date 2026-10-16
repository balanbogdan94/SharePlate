import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notesFromPlainText, notesToPlainText, parseNotesDocument } from '@/lib/recipeNotes';
import { documentListDepth, notesExtensions } from './notesExtensions';

const editors: Editor[] = [];
function createEditor(text = '') {
	const simplified = vi.fn();
	const editor = new Editor({
		extensions: notesExtensions(simplified),
		content: notesFromPlainText(text).content,
	});
	editors.push(editor);
	return { editor, simplified };
}
function document(editor: Editor) {
	return parseNotesDocument({ version: 1, content: editor.getJSON() });
}
function deepList(level: number): string {
	return `<ul><li><p>level ${level}</p>${level < 5 ? deepList(level + 1) : ''}<p>after ${level}</p></li></ul>`;
}
beforeEach(() => {
	vi.stubGlobal('ClipboardEvent', class extends Event {});
});
afterEach(() => {
	editors.splice(0).forEach((editor) => editor.destroy());
	vi.unstubAllGlobals();
});

describe('notes editor rules', () => {
	it('detects URLs and updates/removes the link when its visible text changes', () => {
		const { editor } = createEditor();
		editor.commands.insertContent('https://example.com/one ');
		expect(editor.getHTML()).toContain('href="https://example.com/one"');
		editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
		editor.commands.insertContent('https://example.com/two ');
		expect(editor.getHTML()).toContain('href="https://example.com/two"');
		expect(editor.getHTML()).not.toContain('/one');
		editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
		editor.commands.insertContent('not a URL');
		expect(editor.getHTML()).not.toContain('<a');
	});

	it('expands pasted named links and strips unsupported formatting', () => {
		const { editor } = createEditor();
		editor.view.pasteHTML('<p><strong>See</strong> <a href="https://example.com">source</a></p>');
		expect(notesToPlainText(document(editor))).toBe('See source (https://example.com)');
		expect(editor.getHTML()).not.toContain('<strong>');
		expect(editor.getHTML()).toContain('href="https://example.com"');
		expect(editor.getHTML()).not.toContain('>source</a>');
	});

	it('preserves all pasted text in order and flattens lists beyond three levels', () => {
		const { editor, simplified } = createEditor();
		editor.view.pasteHTML(deepList(1));
		expect(simplified).toHaveBeenCalledOnce();
		expect(documentListDepth(editor.state.doc)).toBe(3);
		const text = editor.state.doc.textContent;
		expect(text).toBe('level 1level 2level 3level 4level 5after 5after 4after 3after 2after 1');
	});

	it('rejects any command that would create a fourth list level', () => {
		const { editor } = createEditor();
		editor.view.pasteHTML(
			'<ul><li><p>A</p><ul><li><p>B</p><ul><li><p>C</p></li><li><p>D</p></li></ul></li></ul></li></ul>',
		);
		let position = 0;
		editor.state.doc.descendants((node, pos) => {
			if (node.isText && node.text === 'D') position = pos;
		});
		editor.commands.setTextSelection(position);
		const before = editor.getJSON();
		editor.commands.sinkListItem('listItem');
		expect(editor.getJSON()).toEqual(before);
	});

	it.each(['', ' data-pm-slice="0 0 []"'])(
		'accepts pasted nested lists while already editing the third level (%s)',
		(sliceMetadata) => {
			const { editor, simplified } = createEditor();
			editor.view.pasteHTML(
				'<ul><li><p>A</p><ul><li><p>B</p><ul><li><p>C</p></li></ul></li></ul></li></ul>',
			);
			let position = 0;
			editor.state.doc.descendants((node, pos) => {
				if (node.isText && node.text === 'C') position = pos + 1;
			});
			editor.commands.setTextSelection(position);
			editor.view.pasteHTML(`<div${sliceMetadata}>${deepList(1)}</div>`);
			expect(simplified).toHaveBeenCalled();
			expect(documentListDepth(editor.state.doc)).toBeLessThanOrEqual(3);
			expect(editor.state.doc.textContent).toContain('level 5');
		},
	);

	it('supports normal Enter, soft breaks, undo and redo', () => {
		const { editor } = createEditor('First');
		editor.commands.setTextSelection(6);
		editor.commands.setHardBreak();
		editor.commands.insertContent('Second');
		expect(notesToPlainText(document(editor))).toBe('First\nSecond');
		editor.commands.undo();
		expect(editor.state.doc.textContent).not.toContain('Second');
		editor.commands.redo();
		expect(editor.state.doc.textContent).toContain('Second');
	});
});
