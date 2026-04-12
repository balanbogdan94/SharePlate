# Plan: SharePlate Frontend Professional Refactor

Refactor the frontend from a working prototype into a professionally-structured React 19 app. Replace the AI guide with a VS Code custom agent, remove `scripts/` for lint-staged + Husky, adopt feature-based architecture, add Zustand + React Hook Form + Zod, improve error handling, and build full test coverage (unit + E2E).

---

## Phase 1: Tooling & DX Foundation

_No dependencies — start here_

1. **Delete `frontend/scripts/`** entirely
2. **Install Husky + lint-staged** — pre-commit hook runs `STRICT_LINT=1 eslint --fix` + `prettier --write` on staged `.ts/.tsx` files automatically
3. **Clean up `package.json` scripts** — drop `lint:changed`, `lint:strict`, `format:changed`; add `prepare: husky`
4. Keep strict ESLint rules and `STRICT_LINT` env var as-is — Husky just automates the trigger

## Phase 2: Custom Frontend Agent

_Parallel with Phase 1_

5. **Create `frontend/.agent.md`** — a VS Code custom agent scoped to `frontend/**` with: tech stack context (React 19, TanStack Router/Query, Zustand, RHF+Zod, Tailwind, shadcn), architecture rules (feature folders, strict lint, i18n, dark mode, a11y), code patterns referencing actual codebase conventions, quality gates (`lint`, `build`, `test`)
6. **Delete `frontend/docs/ai-frontend-guide.md`** and the `docs/` folder
7. **Update `.github/copilot-instructions.md`** and `AGENTS.md` — remove references to the old guide, point to the new agent

## Phase 3: Folder Structure Migration

_Depends on Phase 1 (clean tooling first)_

8. **Create `features/` folder structure:**
   - `features/auth/` — `{components, hooks, pages, store.ts, types.ts, schemas.ts}`
   - `features/recipes/` — `{components, hooks, pages, types.ts, schemas.ts}`
   - `features/house/` — `{components, hooks, pages, types.ts, schemas.ts}`
   - `features/plans/` — `{components, hooks, pages, types.ts, schemas.ts, utils.ts}`
   - `features/settings/` — `{store.ts, types.ts}`

9. **Move files one feature at a time** — auth first (LoginPage, RegisterPage, AuthShell, AuthContext), then recipes (HomeTabPage content, AddRecipePage, RecipeDetailsPage, RecipeCard, CreateRecipeForm, ImagePickerField), then house, then plans
10. **Extract TanStack Query hooks from pages into `features/*/hooks/`** — e.g. `useRecipes.ts`, `useCreateRecipe.ts`, etc. (inline `useQuery`/`useMutation` calls move to reusable hooks)
11. **Extract duplicated date utilities** from CreatePlanPage/PlanTabPage to `features/plans/utils.ts`
12. **Update `frontend/src/router.tsx`** — fix all imports to new feature paths

## Phase 4: State Management (Zustand)

_Depends on Phase 3 (files must be in feature folders)_

13. **Install `zustand`**
14. **Create `features/auth/store.ts`** — Zustand store with persist middleware, replacing AuthContext + storage.ts. State: `user`, tokens, `isAuthenticated`. Actions: `login`, `logout`, `refreshAuth`, `bootstrap`
15. **Create `features/settings/store.ts`** — Zustand store with persist, replacing UserSettingsContext. State: `theme`, `language`
16. **Update `frontend/src/lib/api.ts`** — read auth token from Zustand store directly (no Context dependency)
17. **Delete old Context files** and update all consumers (`useAuth()` → `useAuthStore()`, `useUserSettings()` → `useSettingsStore()`)
18. **Remove Context providers from `frontend/src/main.tsx`**

## Phase 5: Form Management (React Hook Form + Zod)

_Depends on Phase 3 (pages in feature folders)_

19. **Install `react-hook-form` + `@hookform/resolvers`**
20. **Create Zod schemas** per feature: `loginSchema`, `registerSchema`, `createRecipeSchema` (with `useFieldArray` for ingredients), `createPlanSchema`, `joinHouseSchema`
21. **Refactor all forms** — replace 8+ `useState` calls in AddRecipePage with `useForm()` + `useFieldArray()`, similarly for CreatePlanPage, LoginPage, RegisterPage, HouseTabPage join form
22. **Create `components/ui/form-field.tsx`** — reusable wrapper connecting RHF to shadcn Input + Label + error display

## Phase 6: Error Handling

_Depends on Phase 4 (store migration done)_

23. **Create `components/ErrorBoundary.tsx`** — global error boundary with fallback UI, retry button, i18n + dark mode aware
24. **Install `sonner`** — toast library (pairs with shadcn); add `<Toaster />` in App.tsx
25. **Enhance `apiFetch`** — parse structured backend errors, return typed error objects
26. **Add toast notifications** to all mutation hooks (success + error)

## Phase 7: Testing

_Depends on Phase 5 + 6 (features complete)_

27. **Expand MSW handlers** — mock all backend endpoints (auth, recipes, house, plans, ingredients, units)
28. **Write feature tests** (Vitest + Testing Library): auth flows, recipe CRUD, house management, plan creation, settings persistence
29. **Install Playwright** — configure `playwright.config.ts`, add `test:e2e` script
30. **Write E2E tests** for critical flows: login → create recipe → view details; register → join house; create meal plan

## Phase 8: PWA Improvements

_Parallel with Phase 7_

31. **Install `vite-plugin-pwa`** — replace manual `public/sw.js` with Workbox-generated service worker
32. **Configure caching strategies** — NetworkFirst for API, CacheFirst for static assets, offline fallback
33. **Delete `public/sw.js` and `pwa/registerServiceWorker.ts`** — vite-plugin-pwa handles registration

---

## Relevant files (key modifications)

- `frontend/scripts/` — DELETE
- `frontend/docs/` — DELETE
- `frontend/.agent.md` — CREATE
- `frontend/.husky/pre-commit` — CREATE
- `frontend/package.json` — update scripts, deps, lint-staged config
- `frontend/src/router.tsx` — update all route imports
- `frontend/src/main.tsx` — remove Context providers, remove SW registration
- `frontend/src/App.tsx` — add ErrorBoundary, add Toaster
- `frontend/src/lib/api.ts` — Zustand token access, enhanced error parsing
- `frontend/src/auth/` — MIGRATE to `features/auth/`, then DELETE
- `frontend/src/settings/` — MIGRATE to `features/settings/`, then DELETE
- `frontend/src/pages/` — MIGRATE to `features/*/pages/`, then DELETE
- `frontend/src/components/auth/` — MIGRATE to `features/auth/components/`
- `frontend/src/pages/tabs/home/` — MIGRATE to `features/recipes/components/`

## Verification

1. **Phase 1:** `git commit` triggers lint-staged; `cd frontend && npm run lint` passes
2. **Phase 3:** `cd frontend && npm run build` succeeds; all routes render in dev
3. **Phase 4:** Login/logout works; settings persist across reload
4. **Phase 5:** All forms submit; Zod validation shows inline errors
5. **Phase 6:** API errors show toasts; component crashes show boundary
6. **Phase 7:** `cd frontend && npm test` passes; `cd frontend && npm run test:e2e` passes
7. **Phase 8:** App installs as PWA; cached pages work offline
8. **Final:** `cd frontend && npm run lint && npm run build && npm test`

## Decisions

- **i18n stays as Context** — lightweight, works fine; not worth migrating to Zustand
- **shadcn components stay in `components/ui/`** — shared across features
- **`lib/` stays project-wide** — api.ts, env.ts, utils.ts aren't feature-specific
- **Strict lint rules kept** — 200-line max, complexity limits, no-comments (user confirmed)
- **Scope: frontend only** — backend and infra untouched
