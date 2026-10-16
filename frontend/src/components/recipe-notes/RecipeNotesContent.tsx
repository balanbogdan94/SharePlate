import { Fragment, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/i18n/I18nContext';
import {
	notesToPlainText,
	parseNotesDocument,
	type NotesBlock,
	type NotesDocument,
	type NotesInline,
} from '@/lib/recipeNotes';
import './recipe-notes.css';

function inlineContent(inline: NotesInline, index: number): ReactNode {
	if (inline.type === 'hardBreak') return <br key={index} />;
	const href = inline.marks?.[0]?.attrs.href;
	return href ? (
		<a key={index} href={href} target="_blank" rel="noopener noreferrer">
			{inline.text}
		</a>
	) : (
		<Fragment key={index}>{inline.text}</Fragment>
	);
}

function blockContent(block: NotesBlock, index: number): ReactNode {
	if (block.type === 'paragraph') {
		return <p key={index}>{block.content?.length ? block.content.map(inlineContent) : <br />}</p>;
	}
	const items = block.content.map((item, itemIndex) => (
		<li key={itemIndex}>{item.content.map(blockContent)}</li>
	));
	return block.type === 'orderedList' ? (
		<ol key={index} start={block.attrs?.start ?? 1}>
			{items}
		</ol>
	) : (
		<ul key={index}>{items}</ul>
	);
}

export function RecipeNotesContent({
	notes,
	document,
}: {
	notes: string;
	document?: NotesDocument | null;
}) {
	const { t } = useI18n();
	if (!document) {
		return <p className="notes-plain">{notes.trim() || t('notes.empty')}</p>;
	}
	let parsed: NotesDocument;
	try {
		parsed = parseNotesDocument(document);
	} catch {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t('notes.invalidDocument')}</AlertDescription>
			</Alert>
		);
	}
	return notesToPlainText(parsed).trim() ? (
		<div className="notes-prose notes-reading">{parsed.content.content.map(blockContent)}</div>
	) : (
		<p className="notes-plain">{t('notes.empty')}</p>
	);
}
