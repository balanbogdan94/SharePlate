import { z } from 'zod';

export const MAX_LIST_DEPTH = 3;

export function isNotesUrl(value: string): boolean {
	if (
		!/^https?:\/\//iu.test(value) ||
		/[\s\\<>]/u.test(value) ||
		[...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
	)
		return false;
	try {
		const url = new URL(value);
		return Boolean(url.hostname) && !url.username && !url.password;
	} catch {
		return false;
	}
}

const linkSchema = z.object({
	type: z.literal('link'),
	attrs: z.object({ href: z.string().refine(isNotesUrl) }),
});
const inlineSchema = z.discriminatedUnion('type', [
	z
		.object({
			type: z.literal('text'),
			text: z.string().min(1),
			marks: z.array(linkSchema).max(1).optional(),
		})
		.refine((node) => !node.marks?.length || node.marks[0].attrs.href === node.text),
	z.object({ type: z.literal('hardBreak') }),
]);
const paragraphSchema = z.object({
	type: z.literal('paragraph'),
	content: z.array(inlineSchema).optional(),
});

export type NotesInline = z.infer<typeof inlineSchema>;
export type NotesParagraph = z.infer<typeof paragraphSchema>;
export type NotesListItem = {
	type: 'listItem';
	content: [NotesParagraph, ...(NotesParagraph | NotesList)[]];
};
export type NotesList = {
	type: 'bulletList' | 'orderedList';
	attrs?: { start?: number };
	content: NotesListItem[];
};
export type NotesBlock = NotesParagraph | NotesList;
export type NotesDocument = {
	version: 1;
	content: { type: 'doc'; content: NotesBlock[] };
};

const listSchema: z.ZodType<NotesList> = z.lazy(() =>
	z.object({
		type: z.enum(['bulletList', 'orderedList']),
		attrs: z.object({ start: z.number().int().min(1).max(2147483647).optional() }).optional(),
		content: z
			.array(
				z.object({
					type: z.literal('listItem'),
					content: z.tuple([paragraphSchema], z.union([paragraphSchema, listSchema])),
				}),
			)
			.min(1),
	}),
);
const documentSchema: z.ZodType<NotesDocument> = z.object({
	version: z.literal(1),
	content: z.object({
		type: z.literal('doc'),
		content: z.array(z.union([paragraphSchema, listSchema])).min(1),
	}),
});

export function listDepth(blocks: NotesBlock[]): number {
	return Math.max(
		0,
		...blocks.map((block) =>
			block.type === 'paragraph'
				? 0
				: 1 + Math.max(0, ...block.content.map((item) => listDepth(item.content))),
		),
	);
}

export function parseNotesDocument(value: unknown): NotesDocument {
	const document = documentSchema.parse(value);
	if (listDepth(document.content.content) > MAX_LIST_DEPTH) {
		throw new Error('Notes support at most three list levels.');
	}
	return document;
}

export function findNotesUrls(text: string) {
	const matches: { from: number; to: number; href: string }[] = [];
	for (const match of text.matchAll(/https?:\/\/[^\s<>"]+/giu)) {
		let href = match[0].replace(/[.,!?;:]+$/u, '');
		for (const [open, close] of [
			['(', ')'],
			['[', ']'],
			['{', '}'],
		]) {
			while (href.endsWith(close) && href.split(close).length > href.split(open).length) {
				href = href.slice(0, -1);
			}
		}
		if (isNotesUrl(href)) matches.push({ from: match.index, to: match.index + href.length, href });
	}
	return matches;
}

function textInlines(text: string): NotesInline[] {
	const content: NotesInline[] = [];
	let offset = 0;
	for (const match of findNotesUrls(text)) {
		if (match.from > offset) content.push({ type: 'text', text: text.slice(offset, match.from) });
		content.push({
			type: 'text',
			text: match.href,
			marks: [{ type: 'link', attrs: { href: match.href } }],
		});
		offset = match.to;
	}
	if (offset < text.length) content.push({ type: 'text', text: text.slice(offset) });
	return content;
}

export function notesFromPlainText(text: string): NotesDocument {
	return {
		version: 1,
		content: {
			type: 'doc',
			content: text
				.replace(/\r\n?/gu, '\n')
				.split('\n\n')
				.map((paragraph) => ({
					type: 'paragraph',
					content: paragraph
						.split('\n')
						.flatMap((line, index): NotesInline[] => [
							...(index ? [{ type: 'hardBreak' as const }] : []),
							...textInlines(line),
						]),
				})),
		},
	};
}

function paragraphText(paragraph: NotesParagraph): string {
	return (paragraph.content ?? [])
		.map((inline) => {
			if (inline.type === 'hardBreak') return '\n';
			const href = inline.marks?.[0]?.attrs.href;
			return href && href !== inline.text ? `${inline.text} (${href})` : inline.text;
		})
		.join('');
}

function blockText(block: NotesBlock, depth: number): string {
	if (block.type === 'paragraph') return paragraphText(block);
	const indent = '  '.repeat(depth);
	return block.content
		.map((item, index) => {
			const marker = block.type === 'orderedList' ? `${(block.attrs?.start ?? 1) + index}.` : '-';
			return item.content
				.map((child, childIndex) => {
					if (child.type !== 'paragraph') return blockText(child, depth + 1);
					const prefix = childIndex === 0 ? `${indent}${marker} ` : `\n${indent}  `;
					return prefix + paragraphText(child).replace(/\n/gu, `\n${indent}  `);
				})
				.join('\n');
		})
		.join('\n');
}

export function notesToPlainText(document: NotesDocument): string {
	return document.content.content.map((block) => blockText(block, 0)).join('\n\n');
}
