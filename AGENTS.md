# SharePlate agent instructions

This repository is a monorepo with:
- `frontend/` (React + TypeScript + Vite)
- `backend/` (.NET)
- `infra/` (infrastructure)

## Scope routing

- For frontend requests, keep changes in `frontend/**`.
- Do not edit `backend/**` or `infra/**` unless the user explicitly asks.

## Frontend source of truth

For frontend tasks, follow:

`frontend/docs/ai-frontend-guide.md`

If this file conflicts with ad-hoc prompts, prefer the file and call out the conflict.

## Repo-root command style

Run frontend commands from repository root:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Frontend validation cadence

Follow the [frontend validation cadence](.github/copilot-instructions.md#frontend-validation-cadence): use browser checks for small visual refinements and batch lint/build instead of running them after every change or chat turn.
