# Backend

## Recipe notes API

Recipe create/update requests remain multipart. `Notes` is the existing plain-text
field; optional `NotesDocument` is a JSON **string form field** containing:

```json
{"version":1,"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Prepare ingredients"}]}]}}
```

When supplied, the document is authoritative: the server validates and normalizes
it, stores it as nullable PostgreSQL `text`, and derives `Notes`. Summary and detail
responses, including create/update responses, return `notesDocument` as a JSON
**object**, not an encoded string. Legacy rows return `null`. Omitting the form
field, passing null, or sending an empty string intentionally clears formatting
and stores `Notes` exactly as supplied, with no trimming or HTML conversion.
Whitespace-only JSON and the literal JSON `null` are invalid documents.

Supported document nodes:

- A nonempty `doc` containing paragraphs, bullet lists, or ordered lists.
- Paragraphs containing optional text/hard-break nodes; an empty paragraph is valid.
  Paragraph attributes are not supported.
- Nonempty lists containing list items. Items start with a paragraph and may
  contain additional paragraphs and nested lists, up to three total list levels.
  Ordered lists optionally accept `attrs.start`, a positive 32-bit integer.
- Nonempty text optionally containing one link mark. No other marks or nodes.

Links require absolute `http://` or `https://` URLs with a hostname and no
credentials, whitespace, control characters, backslashes, or angle brackets.
Link text must exactly equal `href`: hidden or named link destinations are
rejected. Clients can represent pasted named links as unmarked `name (` plus a
URL-visible link plus unmarked `)`. Optional link `target`, `rel`, and `class`
attributes may be null or strings without control characters/angle brackets;
the server strips them and stores only `href`.

The server rejects invalid JSON, duplicate/unknown fields, unsupported versions,
schema violations, and unsafe links with HTTP 400 `application/problem+json`,
with messages under `errors.NotesDocument`; it never falls back to plain text.
Limits are 1 MiB of UTF-8 input JSON, 25,000 nodes, and JSON depth 32. These bounds
apply to formatted input, not the legacy plain-text field. Invalid persisted
JSON surfaces as an error rather than silently losing formatting.

Plain projection joins top-level blocks with blank lines, hard breaks with
newlines, and list items with newlines. Lists use `- ` / `N. ` markers and two
spaces per nesting level. Additional item paragraphs use blank lines and two
continuation spaces beyond the current nesting indent. URL-visible links appear
once. No projection trimming is performed.

The `AddRecipeNotesDocument` EF migration only adds the nullable column; it does
not rewrite existing notes. Normal API startup applies migrations.

## Validation

From the repository root:

```sh
dotnet build backend/SharePlate.sln
dotnet test backend/SharePlate.sln
```

Focused xUnit tests cover the domain schema/projection, real multipart recipe
endpoints with SQLite persistence and test-only authentication/storage, and the
generated PostgreSQL migration operations/SQL without requiring a live database.
