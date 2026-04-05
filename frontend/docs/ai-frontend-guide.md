# SharePlate frontend AI guide

Use this guide for all changes in `frontend/**`.

## 1. Boundaries and intent

- Scope: `frontend/**` only.
- Do not change `backend/**` or `infra/**` unless asked.
- Prefer minimal, surgical edits that follow existing patterns.

## 2. Stack and architecture

- React 19 + TypeScript + Vite.
- Routing: TanStack Router (`frontend/src/router.tsx`).
- Data/mutations: TanStack Query.
- API client: `apiFetch` from `frontend/src/lib/api.ts`.
- UI: Tailwind CSS + shared shadcn/ui components in `frontend/src/components/ui`.

## 3. File and import conventions

- Use `@/` imports for `frontend/src/*` paths.
- Put shared utilities in `frontend/src/lib`.
- Keep page-level code in `frontend/src/pages`.
- Reuse existing types from nearby `types.ts` files when available.

## 4. Data access rules

- Use `apiFetch` for HTTP calls; do not introduce ad-hoc fetch wrappers.
- Use `useQuery` for reads and `useMutation` for writes.
- Invalidate relevant query keys after successful mutations.
- Surface meaningful errors to UI (alerts/messages) instead of silent failures.

## 5. Routing/auth rules

- Register or update routes in `frontend/src/router.tsx`.
- Keep auth-aware navigation patterns consistent with existing `beforeLoad` redirects.

## 6. UI and styling rules

- Prefer shared components from `frontend/src/components/ui` before adding new primitives.
- Keep Tailwind class style consistent with nearby code.
- Preserve dark-mode behavior (`dark:` classes) where existing screens already support it.
- Keep forms accessible: labels, button states, and clear loading/error states.

## 7. Type safety and quality

- Avoid `any` and unsafe casts.
- Add types/guards instead of weakening type checks.
- Follow current ESLint rules and existing naming/style patterns.

## 8. Definition of done (frontend)

From repository root:

1. `cd frontend && npm run lint`
2. `cd frontend && npm run build`
3. `cd frontend && npm run test`
4. `cd frontend && npm run lint:changed`

A change is complete when:

- It stays within agreed scope.
- It follows existing frontend patterns.
- It compiles, lints, and handles loading/error states appropriately.
- It keeps strict changed-file lint constraints (200-line max, no code comments, strict a11y/complexity rules).

## 9. Strict lint policy summary

- New or modified frontend source files must pass strict lint.
- Strict lint includes:
  - max 200 lines per file
  - no code comments except tooling-required directives
  - jsx-a11y rules
  - strict complexity/depth/function-size limits

## 10. Rule exceptions policy

If a strict rule exception is needed, follow:

`frontend/docs/lint-rule-exceptions-policy.md`

## 11. Prompt starter (optional)

Use this when asking an AI agent to implement frontend work:

`Implement this in frontend only. Follow frontend/docs/ai-frontend-guide.md. Reuse existing TanStack Router, TanStack Query, apiFetch, and shadcn/tailwind patterns already in the repo. Run checks from repo root using cd frontend && npm run lint && npm run build && npm run test && npm run lint:changed.`
