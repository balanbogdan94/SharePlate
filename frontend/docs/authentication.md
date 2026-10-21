# Authentication callback

SharePlate uses MSAL Browser v5 with a standalone redirect bridge at
`/redirect.html`. The callback loads only the MSAL bridge, not React, the router,
session provisioning, or the service worker.

The bridge broadcasts popup/hidden-iframe responses to the requesting page. For
full-page sign-in, it preserves the response in MSAL's temporary storage and
returns to the original page, where `MsalProvider` completes authentication.
Existing return URLs, including their query strings and fragments, remain in use.

## Entra registration and rollout

Before deploying this change, add the following **Single-page application**
redirect URIs to the frontend app registration in Microsoft Entra:

- `http://localhost:5173/redirect.html` for the default development server.
- `https://<frontend-host>/redirect.html` for each deployed frontend.
- The equivalent exact origin and port for any parallel development server.

Keep the existing app-root redirect URIs registered: sign-out still returns to
the app root, not the bridge. Do not remove existing registrations until other
deployed versions have been retired.

Set `VITE_ENTRA_REDIRECT_URI` to the full bridge URL in `.env.local` and in the
GitHub repository variable used by the frontend deployment build. Vite embeds
this value at build time, so changing a runtime setting alone has no effect.
Existing origin-only values are also supported: MSAL always uses
`/redirect.html` at that origin for authentication and `/` for post-logout
navigation.

For a custom local port:

```sh
cd frontend && VITE_ENTRA_REDIRECT_URI=http://localhost:5175/redirect.html npm run dev -- --port 5175 --strictPort
```

The callback must be served without `Cross-Origin-Opener-Policy` headers. Azure
Static Web Apps serves it with `Cache-Control: no-store` and excludes it from
SPA navigation fallback. The service worker also bypasses the callback,
including URLs with response query parameters. Its runtime cache version is
bumped to discard older navigation entries.

See Microsoft's [redirect bridge setup](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge).

## Verification

```sh
cd frontend && npm run test -- src/auth/redirect.test.ts src/auth/msal.test.ts src/auth/AuthContext.test.tsx src/router.test.ts serviceWorker.test.ts
cd frontend && npm run lint
cd frontend && npm run build
```

Confirm the build emits both `index.html` and `redirect.html`. After the Entra
registration is updated, verify sign-in from a deep link, sign-out to the app
root, and token renewal with an expired refresh token on mobile Safari and an
installed PWA. Check that the callback loads no app entry bundle and that auth
responses are not stored in service-worker caches.

This fixes missing bridge responses; it does not bypass browser restrictions on
third-party cookies, change the token cache/renewal policy, or remove the
session-provisioning request from startup.
