# Production error logging

SharePlate uses the Application Insights browser SDK and an explicit Microsoft
OpenTelemetry SDK in the API. Both export to the existing Application Insights
resource / Log Analytics workspace. Backend `ILogger` records go directly to
`AppTraces` or `AppExceptions`; no console-log diagnostic setting is needed.

The App Service automatic agent must be disabled. It retained query strings in
a synthetic production probe and does not provide the required ASP.NET Core
sampling/redaction controls. The API rejects simultaneous agent + SDK startup.
The [infrastructure module](../../infra/bicep/modules/appService.bicep) and
[backend deployment workflow](../../.github/workflows/deploy-backend.yml) both
configure the SDK and disable the agent.

## Configuration and rollout

Remote telemetry is intentionally disabled by default in local development,
tests, and unconfigured preview builds. Error boundaries still surface safe
diagnostics in the console. To configure a production frontend build:

```text
VITE_TELEMETRY_ENABLED=true
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING=<existing Application Insights connection string>
VITE_BUILD_VERSION=<commit SHA>
```

Set the GitHub repository variable
`VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` to the connection string of the
existing Application Insights resource. The frontend CD workflow sets the enable
flag and commit SHA; these values must be supplied **at build time**, not through
Static Web Apps runtime settings. An enabled build with missing/invalid telemetry
configuration fails before deployment.

The browser connection string identifies an ingestion destination; it is public
in the bundle and is not an authentication secret or protection against ingestion
abuse. Never include application secrets in it.

The backend requires `Telemetry__Enabled=true` and the existing
`APPLICATIONINSIGHTS_CONNECTION_STRING`. Deployment checks that the latter exists,
then disables the agent immediately before uploading the API package. This
restarts the previous application and creates a short monitoring gap during the
initial migration. Coordinate this rollout; do not publish the SDK-enabled API
while the agent is still active. Infrastructure/configuration changes have not
been applied merely by editing these files.

Before modifying settings, the backend workflow snapshots the currently deployed
API ZIP through the authenticated SCM/Kudu endpoint, the three telemetry settings
(including which were absent), and the app's running/stopped state. Deployments
are serialized to keep that snapshot associated with the correct rollout.
If configuration or package deployment fails, rollback stops the API, deploys the
previous ZIP without restarting, restores its telemetry settings and only then
restores its previous running state. It never enables the old agent while the new
SDK binaries are running.

Snapshot download/validation failure stops the rollout before any settings change.
The snapshot must contain an existing `SharePlate.API.dll`; a first-ever deployment
without a prior API needs an explicitly coordinated bootstrap. Snapshot files
have restricted runner permissions, are never uploaded as artifacts and are
removed by the workflow's cleanup step. The Azure identity needs access to the
SCM endpoint; a blocked endpoint/authentication failure also stops the rollout.

Rollback failure is surfaced explicitly and does not intentionally restart the
API with a partially restored package/configuration. Inspect it before intervening.
This recovery restores application binaries and the changed telemetry settings,
not database migrations or other infrastructure. Runner loss or forced
cancellation can still require manual recovery; this is not an atomic slot swap
and does not upgrade the existing B1 App Service plan.

Verify after deployment:

1. The agent is disabled, the API is healthy and both cloud roles appear.
2. A synthetic browser -> API request has one W3C trace ID in `AppDependencies`,
   `AppRequests`, and its application error log/exception.
3. An unexpected API failure returns generic HTTP 500 ProblemDetails with a
   32-character `traceId`, without internals; expected 4xx behavior is unchanged.
4. Synthetic query/body/identity/SAS markers do not appear in exported payloads.
5. Check the actual number of events for a small synthetic batch and verify
   `ItemCount == 1`; do not infer global sampling configuration from a single row.
6. The existing 5xx alert, threshold, and recipients remain unchanged.

No Azure configuration is changed by running local tests. The tests use the real
SDKs with intercepted transports to verify payloads before network export.

## Collection and privacy

- No sampling initially: browser sampling is 100%, backend uses `AlwaysOnSampler`
  and does not sample logs based on parent traces. There is no fixed per-page
  request limit in the browser.
- No click tracking, page-view analytics, user/session IDs, user context, request
  or response headers/bodies, SQL text, query strings, URL fragments, resource
  IDs, recipe content, image data, token contents or MSAL objects in payloads.
- Unknown path segments and route parameters become `*`. Backend dependency
  URLs are deliberately replaced by `https://shareplate.invalid/dependency`;
  database dependencies are named `PostgreSQL`. Actual request destinations are
  not changed.
- Browser fetch tracking/correlation is limited to SharePlate's API, not Entra,
  storage, the redirect bridge, local image data, or telemetry ingestion.
- Browser SDK statistics and remote configuration are disabled. Backend Live
  Metrics, performance/usage metrics and SDK offline storage are disabled. A
  sanitized SDK resource-metadata marker may still appear in `AppMetrics`.
- Backend processors sanitize span tags and logs; an Azure exporter policy
  handles immutable exception events and strips unwanted envelope metadata
  **before transport**. Automatic dependency exception envelopes are excluded
  to avoid duplicating the final application exception; dependency failure
  status remains available. Unknown/malformed exporter payloads fail closed
  and produce the safe `telemetry.privacy.failed` warning.
- Error messages are stable diagnostic codes, not original messages. Browser
  stack frames retain bundle filenames, line numbers and validated columns;
  dependency timestamps retain the actual request start time. Backend exception
  stacks are explicitly carried into the exporter envelope as method names,
  without local filesystem paths, and retain the original exception type.
  Hidden source maps
  are not added or publicly deployed by this change.

Network requests inherently expose transport metadata such as the client IP to
Azure. Keep Application Insights IP masking enabled. Payload filtering is not a
promise of absolute anonymity, and remote delivery is not guaranteed: offline
clients, browser blocking, ingestion outages, or Azure quotas can prevent it.

## Ownership and UX

TanStack Query/Mutation caches report final failures after existing retries.
Local toast/form handlers remain in place. Provisioning, login/logout and
imperative plan export report at their own final boundaries. A React Error
Boundary and TanStack Router fallback provide a localized reload action for
unexpected render crashes.

The same error object is not reported twice across these boundaries and global
handlers. Recovered 401 requests, expected 400/401/403/404/409/422 responses, normal
MSAL interaction/cancellation and `AbortError` are not Error exceptions. A final
429 and service-worker registration failure are Warnings. HTTP attempts remain
separate dependency records, including failed attempts.

`BadHttpRequestException` with a 4xx status (including Development JSON/query
binding failures and payload-too-large responses) preserves that status and
returns generic ProblemDetails without an `api.unhandled` Error diagnostic.

Telemetry initialization/reporting failures produce safe console diagnostics
without breaking the app or triggering reporting loops. Module-load failures
before SDK initialization and errors inside the standalone MSAL bridge are not
remotely instrumented; the callback remains bridge-only as documented in
[authentication](./authentication.md).

## KQL

Use workspace table names in Log Analytics (`App*`). Application Insights'
resource-scoped query interface also exposes the legacy lowercase aliases.

Recent exceptions:

```kql
AppExceptions
| where TimeGenerated > ago(1h)
| project TimeGenerated, AppRoleName, OperationId, ExceptionType, OuterMessage,
    Properties
| order by TimeGenerated desc
```

Follow a trace across browser and API:

```kql
let traceId = "<32-character trace ID>";
union withsource=Table AppRequests, AppDependencies, AppExceptions, AppTraces
| where TimeGenerated > ago(1h)
| where OperationId == traceId or tostring(Properties.serverTraceId) == traceId
| order by TimeGenerated asc
```

Find failed requests and dependencies:

```kql
union withsource=Table AppRequests, AppDependencies
| where TimeGenerated > ago(1h) and Success == false
| project TimeGenerated, Table, AppRoleName, OperationId, Name, ResultCode
```

Log volume, with actual Azure pricing used separately:

```kql
union withsource=Table AppRequests, AppDependencies, AppExceptions, AppTraces, AppMetrics
| where TimeGenerated > ago(7d)
| summarize Rows=count(), IngestedGB=sum(_BilledSize)/1000000000.0 by Table
```

Reevaluate sampling only after measuring volume. Sampling success-shaped traffic
without dropping errors requires a deliberate follow-up design, not an arbitrary
cap that silently cuts off diagnostics.

## Validation

From the repository root:

```sh
cd frontend && npm run test -- src/lib/api.test.ts src/lib/telemetryPolicy.test.ts src/lib/telemetryStack.test.ts src/lib/telemetry.test.ts src/lib/telemetryExport.test.ts src/components/layout/AppErrorBoundary.test.tsx src/auth/AuthContext.test.tsx src/router.test.ts src/pages/tabs/PlanTabPage.remindersExport.test.tsx serviceWorker.test.ts
cd frontend && npm run lint
cd frontend && npm run build
dotnet test backend/SharePlate.Tests/SharePlate.Tests.csproj --filter 'FullyQualifiedName~Telemetry'
az bicep build --file infra/bicep/resources.bicep --stdout
node --test .github/scripts/backend-rollback.test.mjs
```
