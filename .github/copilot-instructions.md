# GitHub Copilot instructions for SharePlate

This repo contains `frontend/`, `backend/`, and `infra/`.

## Working scope

- For frontend tasks, work inside `frontend/**`.
- Treat `backend/**` and `infra/**` as out of scope unless explicitly requested.

## Frontend guidance

Use this file as the canonical frontend guide:

`frontend/docs/ai-frontend-guide.md`

## Command execution from repo root

When checks are needed for frontend changes, run from repo root:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Frontend validation cadence

- During interactive UI refinement, do not run `tsc`, ESLint, lint, or build after every small change or chat turn.
- For visual-only adjustments (spacing, colors, icons, positioning, and animations), use hot reload and browser checks.
- Batch lint and build at the end of a coherent feature or refinement batch, before a commit or PR, or when the user explicitly requests them.
- For changes to logic, types, dependencies, or API contracts, run the smallest relevant tests and checks as needed.
- Documentation-only and instruction-only changes do not require code checks.
