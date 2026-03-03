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
- `npm run preview` - preview production build locally

## Environment

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` defaults to `/api`.

## Notes

Backend route grouping currently appears inconsistent for some endpoints (`/api/users` vs potentially `/api/api/users`), so confirm final API route shape before wiring feature-specific clients.
