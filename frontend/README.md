# SharePlate Frontend

React SPA scaffolded with Vite + TypeScript.

## Stack

- React
- TypeScript
- TanStack Query
- Tailwind CSS
- shadcn/ui

## Scripts

- `npm run dev` - start development server
- `npm run build` - type-check and create production build
- `npm run lint` - run standard lint rules
- `npm run lint:strict` - run strict lint profile (max lines, no comments, a11y, complexity)
- `npm run lint:changed` - run strict lint only for changed frontend source files
- `npm run format` - format files with Prettier
- `npm run format:changed` - format changed files only
- `npm run format:check` - check formatting for changed files only
- `npm run format:check:all` - check formatting across all frontend files
- `npm run test` - run frontend tests with Vitest
- `npm run test:watch` - run tests in watch mode
- `npm run deps:check` - run dependency hygiene checks (unused dependencies/exports)
- `npm run preview` - preview production build locally

## Environment

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` must be either a root-relative path (for example `/api`) or an absolute `http/https` URL.

## Notes

Backend route grouping currently appears inconsistent for some endpoints (`/api/users` vs potentially `/api/api/users`), so confirm final API route shape before wiring feature-specific clients.
