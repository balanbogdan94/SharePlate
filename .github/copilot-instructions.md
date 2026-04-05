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

