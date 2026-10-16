# Recipe notes

Chef's Notes uses a mobile-first visual editor in both the add and edit forms.
The toolbar provides bulleted/numbered lists and indent/outdent, with a maximum
of three list levels. Enter creates a paragraph/list item; Enter on an empty
item exits the list; Shift+Enter adds a line break. Undo/redo uses the standard
keyboard shortcuts.

Complete HTTP/HTTPS URLs are linked automatically, without a link dialog or
hidden destinations. Editing the URL updates its destination. Pasted named links
become `name (URL)`; pasted formatting is limited to paragraphs, line breaks,
lists and URLs. Deeper lists are flattened with a notification, preserving text.

The editor grows with its content up to half the screen, including its toolbar.
When the software keyboard is detected, it uses the visible viewport instead
and keeps the caret visible. Controls are at least 44×44 CSS pixels and the
editable text is 16px to avoid iOS input zoom. Validate on real iOS Safari and
Android Chrome: desktop viewport emulation does not reproduce software keyboards.

## Data and compatibility

`notesDocument` is optional and contains `{ version: 1, content: <Tiptap JSON> }`.
The accepted schema is defined in `src/lib/recipeNotes.ts`. Multipart mutations
send it as a JSON string in `NotesDocument`; API responses expose an object.
The backend validates it and derives `notes`, the plain-text representation used
for sharing. No HTML is stored or injected into the page.

Legacy recipes/drafts contain only `notes`. They are imported literally into
paragraphs and line breaks, without interpreting HTML or Markdown. Existing
rows do not need a content migration. Drafts include the document once opened
in the new editor. A legacy client that saves plain text without a document
intentionally removes formatting.

The backend migration must be deployed before this frontend: an old backend
does not understand the document field and cannot preserve its formatting.

## Validation

From the repository root:

```sh
cd frontend && npm test -- src/lib/recipeNotes.test.ts src/components/recipe-notes src/pages/useAddRecipeForm.test.tsx src/pages/useRecipeMutations.test.tsx
cd frontend && npm run lint
cd frontend && npm run build
```

Check add/save/read/edit, draft restoration, mixed lists, a fourth list level
via typing and paste, URL edits, long URLs, text deletion, and keyboard
open/close on narrow screens. The normal development server uses the existing
authentication flow; no preview-specific authentication bypass is provided.

For a parallel worktree, use a separate port and the development API proxy:

```sh
cd frontend && VITE_API_BASE_URL=/api DEV_API_TARGET=http://localhost:5212 VITE_ENTRA_REDIRECT_URI=http://localhost:5175 npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Start the updated backend on port 5212 first. Do not replace an existing server
or apply migrations to a shared/remote database without permission.
