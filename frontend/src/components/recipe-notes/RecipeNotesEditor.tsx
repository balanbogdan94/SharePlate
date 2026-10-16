import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { sinkListItem } from '@tiptap/pm/schema-list';
import { IndentDecrease, IndentIncrease, List, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/i18n/I18nContext';
import {
	MAX_LIST_DEPTH,
	notesFromPlainText,
	notesToPlainText,
	parseNotesDocument,
	type NotesDocument,
} from '@/lib/recipeNotes';
import { documentListDepth, notesExtensions } from './notesExtensions';
import { useNotesViewport } from './useNotesViewport';
import './recipe-notes.css';

type Props = {
	notes: string;
	document?: NotesDocument | null;
	onChange: (document: NotesDocument, text: string) => void;
	onError: (message: string | null) => void;
};

function canIndent(editor: Editor): boolean {
	let allowed = false;
	sinkListItem(editor.schema.nodes.listItem)(editor.state, (tr) => {
		allowed = documentListDepth(tr.doc) <= MAX_LIST_DEPTH;
	});
	return allowed;
}

function currentList(editor: Editor): string | null {
	const { $from } = editor.state.selection;
	for (let depth = $from.depth; depth > 0; depth--) {
		const type = $from.node(depth).type.name;
		if (type === 'bulletList' || type === 'orderedList') return type;
	}
	return null;
}

function NotesToolbar({ editor }: { editor: Editor }) {
	const { t } = useI18n();
	const state = useEditorState({
		editor,
		selector: ({ editor: current }) => ({
			bullet: currentList(current) === 'bulletList',
			ordered: currentList(current) === 'orderedList',
			indent: canIndent(current),
			outdent: current.can().liftListItem('listItem'),
		}),
	});
	const actions = [
		{
			label: t('notes.bullets'),
			Icon: List,
			active: state.bullet,
			disabled: false,
			run: () =>
				editor.chain().focus(undefined, { scrollIntoView: false }).toggleBulletList().run(),
		},
		{
			label: t('notes.numbered'),
			Icon: ListOrdered,
			active: state.ordered,
			disabled: false,
			run: () =>
				editor.chain().focus(undefined, { scrollIntoView: false }).toggleOrderedList().run(),
		},
		{
			label: t('notes.indent'),
			Icon: IndentIncrease,
			disabled: !state.indent,
			run: () =>
				editor.chain().focus(undefined, { scrollIntoView: false }).sinkListItem('listItem').run(),
		},
		{
			label: t('notes.outdent'),
			Icon: IndentDecrease,
			disabled: !state.outdent,
			run: () =>
				editor.chain().focus(undefined, { scrollIntoView: false }).liftListItem('listItem').run(),
		},
	];
	return (
		<div role="group" aria-label={t('notes.formatting')} className="notes-toolbar">
			{actions.map(({ label, Icon, active, disabled, run }) => (
				<button
					key={label}
					type="button"
					aria-label={label}
					title={label}
					aria-pressed={active}
					disabled={disabled}
					onPointerDown={(event) => event.preventDefault()}
					onClick={run}
					className="notes-tool"
				>
					<Icon aria-hidden="true" size={20} strokeWidth={1.8} />
				</button>
			))}
		</div>
	);
}

function EditableNotes({
	value,
	onChange,
	onError,
}: {
	value: NotesDocument;
	onChange: Props['onChange'];
	onError: Props['onError'];
}) {
	const { t } = useI18n();
	const container = useRef<HTMLDivElement>(null);
	const extensions = useMemo(
		() => notesExtensions(() => toast.info(t('notes.pasteSimplified'))),
		[t],
	);
	const publish = (current: Editor) => {
		try {
			const document = parseNotesDocument({ version: 1, content: current.getJSON() });
			onChange(document, notesToPlainText(document));
			onError(null);
		} catch {
			onError(t('notes.invalidDocument'));
		}
	};
	const editor = useEditor({
		extensions,
		content: value.content,
		editorProps: {
			attributes: {
				id: 'recipe-notes',
				role: 'textbox',
				'aria-multiline': 'true',
				'aria-label': t('notes.label'),
				'data-placeholder': t('notes.placeholder'),
				class: 'notes-prose notes-editable',
			},
		},
		onCreate: ({ editor: current }) => publish(current),
		onUpdate: ({ editor: current }) => publish(current),
	});
	useNotesViewport(container);
	useEffect(() => {
		if (!editor) return;
		const current = parseNotesDocument({ version: 1, content: editor.getJSON() });
		if (JSON.stringify(current) !== JSON.stringify(value)) {
			editor.commands.setContent(value.content, { emitUpdate: false });
		}
	}, [editor, value]);
	return (
		<div ref={container} className="notes-editor">
			{editor && <NotesToolbar editor={editor} />}
			<EditorContent editor={editor} className="notes-editor-scroll" />
		</div>
	);
}

export function RecipeNotesEditor({ notes, document, onChange, onError }: Props) {
	const { t } = useI18n();
	const resolved = useMemo(() => {
		try {
			return {
				value: document ? parseNotesDocument(document) : notesFromPlainText(notes),
				error: null,
			};
		} catch {
			return { value: null, error: t('notes.invalidDocument') };
		}
	}, [document, notes, t]);
	useEffect(() => {
		onError(resolved.error);
	}, [onError, resolved.error]);
	return (
		<div>
			<label
				htmlFor="recipe-notes"
				className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-sp-text-tertiary"
			>
				{t('notes.label')}
			</label>
			{resolved.value ? (
				<EditableNotes value={resolved.value} onChange={onChange} onError={onError} />
			) : (
				<Alert variant="destructive">
					<AlertDescription>{resolved.error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
