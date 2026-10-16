import { Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import { UndoRedo } from '@tiptap/extensions';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { findNotesUrls, isNotesUrl, MAX_LIST_DEPTH } from '@/lib/recipeNotes';

function isList(node: ProseMirrorNode) {
	return node.type.name === 'bulletList' || node.type.name === 'orderedList';
}

export function documentListDepth(node: ProseMirrorNode, depth = 0): number {
	const current = depth + (isList(node) ? 1 : 0);
	let deepest = current;
	node.forEach((child) => {
		deepest = Math.max(deepest, documentListDepth(child, current));
	});
	return deepest;
}

function flattenItem(item: ProseMirrorNode): ProseMirrorNode[] {
	const result: ProseMirrorNode[] = [];
	let paragraphs: ProseMirrorNode[] = [];
	const flush = () => {
		if (paragraphs.length) result.push(item.type.create(item.attrs, paragraphs));
		paragraphs = [];
	};
	item.forEach((child) => {
		if (isList(child)) {
			flush();
			child.forEach((nestedItem) => result.push(...flattenItem(nestedItem)));
		} else {
			paragraphs.push(child);
		}
	});
	flush();
	return result;
}

function normalizePastedNode(node: ProseMirrorNode, depth: number): ProseMirrorNode[] {
	if (node.isText) {
		const href: unknown = node.marks.find((mark) => mark.type.name === 'link')?.attrs.href;
		const text = node.text ?? '';
		const visible =
			typeof href === 'string' && isNotesUrl(href) && href !== text ? `${text} (${href})` : text;
		return [node.type.schema.text(visible)];
	}
	const current = depth + (isList(node) ? 1 : 0);
	const children: ProseMirrorNode[] = [];
	if (isList(node) && current > MAX_LIST_DEPTH) {
		node.forEach((item) => {
			for (const flattened of flattenItem(item)) {
				children.push(...normalizePastedNode(flattened, depth));
			}
		});
		return children;
	}
	node.forEach((child) => {
		if (isList(node) && current === MAX_LIST_DEPTH) {
			for (const item of flattenItem(child)) children.push(...normalizePastedNode(item, current));
		} else {
			children.push(...normalizePastedNode(child, current));
		}
	});
	return [node.copy(Fragment.fromArray(children))];
}

function normalizePastedSlice(slice: Slice, depth: number): Slice {
	const nodes: ProseMirrorNode[] = [];
	slice.content.forEach((node) => nodes.push(...normalizePastedNode(node, depth)));
	const fragment = Fragment.fromArray(nodes);
	const open = Slice.maxOpen(fragment);
	return new Slice(
		fragment,
		Math.min(slice.openStart, open.openStart),
		Math.min(slice.openEnd, open.openEnd),
	);
}

function urlMarksTransaction(doc: ProseMirrorNode, tr: import('@tiptap/pm/state').Transaction) {
	const link = doc.type.schema.marks.link;
	doc.descendants((node, pos) => {
		if (node.type.name !== 'paragraph') return true;
		const text = node.textBetween(0, node.content.size, '', '\n');
		const expected = findNotesUrls(text).map((match) => ({
			...match,
			from: pos + 1 + match.from,
			to: pos + 1 + match.to,
		}));
		const actual: { from: number; to: number; href: string }[] = [];
		node.forEach((child, offset) => {
			const mark = child.marks.find((candidate) => candidate.type === link);
			if (!mark) return;
			const from = pos + 1 + offset;
			const previous = actual.at(-1);
			if (previous?.to === from && previous.href === mark.attrs.href) previous.to += child.nodeSize;
			else actual.push({ from, to: from + child.nodeSize, href: mark.attrs.href });
		});
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			tr.removeMark(pos + 1, pos + 1 + node.content.size, link);
			for (const match of expected)
				tr.addMark(match.from, match.to, link.create({ href: match.href }));
		}
		return false;
	});
	return tr;
}

export function notesExtensions(onSimplifiedPaste: () => void) {
	const rules = Extension.create({
		name: 'recipeNotesRules',
		addKeyboardShortcuts() {
			return {
				'Mod-]': () => this.editor.commands.sinkListItem('listItem'),
				'Mod-[': () => this.editor.commands.liftListItem('listItem'),
			};
		},
		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: new PluginKey('recipeNotesRules'),
					filterTransaction: (transaction) =>
						!transaction.docChanged || documentListDepth(transaction.doc) <= MAX_LIST_DEPTH,
					appendTransaction: (transactions, _oldState, state) => {
						if (!transactions.some((transaction) => transaction.docChanged)) return null;
						const tr = urlMarksTransaction(state.doc, state.tr);
						return tr.docChanged ? tr : null;
					},
					props: {
						transformPasted(slice, view) {
							let contextDepth = 0;
							for (let level = 0; level <= view.state.selection.$from.depth; level++) {
								if (isList(view.state.selection.$from.node(level))) contextDepth++;
							}
							const pastedDepth = Math.max(
								0,
								...Array.from({ length: slice.content.childCount }, (_, index) =>
									documentListDepth(slice.content.child(index)),
								),
							);
							const baseDepth = Math.max(0, contextDepth - (slice.openStart > 0 ? 1 : 0));
							if (pastedDepth + baseDepth > MAX_LIST_DEPTH) onSimplifiedPaste();
							return normalizePastedSlice(slice, baseDepth);
						},
					},
				}),
			];
		},
	});
	return [
		Document,
		Paragraph,
		Text,
		HardBreak,
		BulletList,
		OrderedList,
		ListItem,
		UndoRedo,
		Link.configure({
			autolink: false,
			linkOnPaste: false,
			openOnClick: false,
			isAllowedUri: isNotesUrl,
			HTMLAttributes: { target: null, rel: null, class: null },
		}),
		rules,
	];
}
