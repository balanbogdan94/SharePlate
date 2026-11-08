# Recipe and profile image processing

This directory contains the reusable conversion engine (PR1) and the minimal
Event Grid worker (PR2). It is not browser-side processing.

The engine takes image bytes and returns WebP bytes. The worker downloads an
original from Blob Storage, produces **one** WebP, uploads it, and replaces the
existing URL directly in PostgreSQL. There are no jobs, migrations, manifests,
status/retry endpoints, polling, or new backend/frontend contracts.

## The three steps

1. `inspect(original)` validates static JPEG (including `.jpg`), PNG, WebP,
   AVIF and HEIC/HEIF bytes and returns the oriented width. The original must
   be at most 100 MiB, with at most 60 million decoded pixels. Animated images
   and image sequences are rejected, not flattened into a single frame.
2. `widthsFor(info.width)` chooses actual recipe widths from
   320/800/1280, without enlarging small originals.
3. `encode(original, width)` returns
   `{ content: Buffer, width, height }` for a static WebP variant. It validates
   the input limits, format and absence of animation even without `inspect`.
   All three entry points (`inspect`, `encode`, `encodeAvatar`) preserve
   validation error codes and report decoder failures as
   `InvalidImage('invalid_decode')`, retaining the original error in `cause`.

```ts
import { encode, inspect, widthsFor } from './conversion.js';

const info = await inspect(original);
const variants = [];
for (const width of widthsFor(info.width)) {
  variants.push(await encode(original, width));
}
```

The example demonstrates the engine's variant API. The PR2 worker deliberately
does not generate that set: it calls `encode(original, 1280)` once for a recipe
or `encodeAvatar(original)` once for an avatar. Unit tests use synthetic images.

## Application sizes

Recipe images preserve their aspect ratio. The three target widths are 320px
for list thumbnails, 800px for the mobile detail image, and 1280px for the detail
image on higher-density screens. Small originals use their actual width instead
of being enlarged; duplicate variants are not generated.

Profile photos use one separate 192x192px, centre-cropped WebP variant:

```ts
import { encodeAvatar } from './conversion.js';

const avatar = await encodeAvatar(original);
```

The current profile UI displays the avatar at 48 CSS pixels, requiring 144 image
pixels at DPR 3. A 192px variant also covers the smaller author/member avatars.
Smaller originals are cropped to a square no larger than their shortest side,
never enlarged. Cropping is geometric, not face detection; the original's centre
is retained. Format validation, animation rejection, orientation handling and
metadata removal are shared with recipe conversion.

The engine still exposes these conversion APIs. The worker selects just the
largest recipe size, without upscaling, and replaces the URL already displayed
by the application. Selecting multiple variants in the frontend is out of scope.

## PR2 worker flow

`dist/function.js` registers `optimizeImage` using the Azure Functions Node v4
programming model. It accepts Event Grid schema `Microsoft.Storage.BlobCreated`
events with `data.url`; CloudEvents schema is not configured by this code.

1. Accept only GUID names with an optional extension, root-level originals in the configured
   account/container. Reject URLs with credentials, query strings, or fragments.
2. Find the exact URL in `"Recipes"."ImageUrl"` and
   `"Users"."ProfilePictureUrl"`. Both kinds currently share the API's container,
   default `recipe-images`; there is no assumption of a `user-images` container.
3. If BlobCreated arrives before the API saves the URL, retry the DB lookup after
   250/1000/2000 ms. After four unsuccessful reads, fail explicitly.
4. Convert using PR1 and upload a root-level `image/webp` blob named
   `optimized-v1-<recipe|avatar>-<sha256-of-original-url>.webp`. This prefix is
   reserved for worker outputs; their BlobCreated events are ignored before DB
   access, preventing a conversion loop. Naming is deterministic for immutable
   GUID originals, so concurrent delivery/replay converges on the same output.
5. Use parameterized compare-and-swap SQL, for example:

   ```sql
   UPDATE "Recipes"
   SET "ImageUrl"=$1, "UpdatedAt"=now()
   WHERE "Id"=$2 AND "ImageUrl"=$3;
   ```

   The avatar equivalent updates `"Users"."ProfilePictureUrl"`. A newer URL,
   an emptied URL, or a deleted record cannot be overwritten or resurrected.

The original stays visible until both upload and SQL succeed. The worker never
deletes originals or outputs, including on lookup errors, stale references, or
SQL failure after upload. Root-level results remain compatible with the current
API deletion logic. A completed duplicate is recognized through the current
optimized URL without downloading/converting again.

If a single original is referenced as both a recipe and an avatar, processing
fails explicitly rather than choosing an incorrect crop. Multiple references
of the same kind share one output and are each updated conditionally.

### Failure and operational retry

Failures are logged as `image_worker_failed` with a safe error code and rethrown;
there is no success-shaped fallback or application retry endpoint. Raw SDK/DB
exception text, URLs, tokens, and connection strings are not logged.

The three local lookup delays are bounded. Event Grid delivery retry, its maximum
attempts/TTL, and dead-lettering must be configured separately in PR3. An operator
can replay the original event after fixing a transient problem; the output name
stays the same and the SQL condition still protects newer edits. Missing references
after deletion or A-to-B replacement may be indistinguishable from an unsaved
URL on a late/replayed event; they fail after the bounded lookup rather than
deleting blobs based on that absence. Permanently invalid images need operator
inspection, not infinite manual replay.

## Worker configuration

All values are environment settings. Do not commit credentials or
`local.settings.json`. The worker does not create Azure resources or containers.

| Setting | Purpose |
| --- | --- |
| `IMAGE_STORAGE_ACCOUNT_URL` | Production HTTPS Blob service URL, without SAS/container path |
| `IMAGE_CONTAINER_NAME` | Same container as the API; default `recipe-images` |
| `PGHOST`, `PGDATABASE`, `PGUSER` | PostgreSQL host/database and worker's managed identity role |
| `PGPORT` | Optional, default `5432` |
| `AZURE_CLIENT_ID` | Optional client ID for a user-assigned managed identity |
| `IMAGE_WORKER_LOCAL=true` | Explicit local-only mode; rejected on Azure App Service/Functions |
| `IMAGE_STORAGE_CONNECTION_STRING` | Local Azurite connection string, with an explicit loopback HTTP `BlobEndpoint` |
| `PGPASSWORD` | Local PostgreSQL password; not used for production authentication |

Production uses `ManagedIdentityCredential` for Blob Storage and a fresh Entra
token when PostgreSQL opens a connection, with TLS certificate verification
enabled. There is no production password fallback or disabled-TLS option.
The PostgreSQL token scope is
`https://ossrdbms-aad.database.windows.net/.default`.

PR3 must provide Function host settings/storage, the Event Grid subscription,
network access and identity grants. The worker needs Blob read/write access to
the existing container and DB `SELECT` on `"Recipes"`/`"Users"` plus column-level
`UPDATE` on `"ImageUrl"`/`"ProfilePictureUrl"` and `"UpdatedAt"` respectively.
Identity principal creation and these grants are Portal/deployment work, not
performed here. Keep the original upload's immutable GUID naming; overwriting
an original in place is not supported.

## Run the tests

Requires Node.js 24.

```sh
cd functions/image-processing
npm ci
npm test
```

`npm test` builds TypeScript and runs the engine, worker and configuration unit
tests with Node's built-in test runner. No Azure credentials, Functions Core
Tools, Docker or database are needed. Build removes only this package's `dist`
directory, and runners select the active test files explicitly, so stale tests
from another branch are not executed.
Unit tests also capture the Function's Event Grid registration and verify that
failure logging/rethrowing excludes raw SDK/DB error details.

Tests check real WebP decoding, dimensions, representative byte targets,
no-upscale behavior, square profile crops, invalid inputs, EXIF orientation, transparency, AVIF and
HEIC decoding, input limits and rejection of animated WebP/APNG and HEIF/AVIF
sequence brands. The HEIC fixture is a generated 80x120 red image, encoded using
macOS `sips`. Two-frame AVIF/APNG fixtures use FFmpeg's generated `testsrc`
pattern. None of the fixtures contains a user photograph; these tools are not
required to run the tests.
The Display P3 HEIC fixture starts as an 80x120 sRGB colour patch
`[170, 120, 80]`, converted to Display P3 by sharp and encoded by `sips`.
Its NCLX-only counterpart uses the same encoded pixels but expresses Display P3
using primaries 12 and transfer 13 instead of an ICC profile. Tests compare
decoded output colours against the original sRGB patch, not only profile tags.

### Isolated integration tests

Requires Docker running, the repository's .NET SDK, and `dotnet ef`. If backend
NuGet assets are missing in a new worktree, restore them first:

```sh
dotnet restore backend/SharePlate.API/SharePlate.API.csproj
cd functions/image-processing
npm run test:integration
```

The test creates uniquely named PostgreSQL 17 and Azurite containers with random
credentials and random ports bound only to `127.0.0.1`, without host volumes.
It generates SQL from the **existing EF migrations**, disables backend telemetry,
overrides backend DB/storage settings to those isolated services, and applies
the script to the temporary DB. There is no fake image-job schema and no shared
database connection. Docker may download the images on the first run.

The integration suite checks recipe/avatar WebP bytes and dimensions, the shared
container, parameterized SQL, delayed DB save, concurrent duplicates, A-to-B
replacement/deletion, a real PostgreSQL permission failure after upload followed
by replay, DB read failure, missing references/source and corrupt images.
It also checks originals whose uploaded filename has no extension.
It invokes the worker with representative Event Grid payloads; Azurite does not
deliver Event Grid events. Containers, their automatically created anonymous
volumes, and temporary SQL are removed on normal test completion, including
assertion failures. Cleanup verifies that the exact volumes belonging to this
run no longer exist; it never prunes unrelated Docker resources.

Local tests validate conversion and Blob/PostgreSQL behavior, **not** Azure
deployment, real Event Grid delivery/dead-lettering, Functions host loading,
managed identity grants, production TLS connectivity, or Azure memory/cost.
Those remain unvalidated until the user's manual Portal work in PR3.

## Phone formats

The supported-format list uses sharp's detected format names, not file
extensions. In particular, sharp reports both AVIF and HEIC/HEIF as `heif`.
AVIF is decoded by sharp. HEVC-compressed HEIC/HEIF is decoded using
`heic-decode` (libheif WebAssembly), then its pixels are passed to sharp;
no system HEVC codec or custom libvips build is required.
Before passing HEIC pixels to sharp, LittleCMS converts the source RGB ICC
profile to sRGB. ICC-free NCLX Display P3 (primaries 12, transfer 13) is also
converted; sRGB or unspecified NCLX primaries/transfer values use sRGB.
The profile applies to the primary image, not an unrelated tile/thumbnail.
Conversion preserves alpha and limits WASM scratch memory to small pixel chunks.
The output strips profiles and EXIF only after colour conversion.

Other ICC-free HEIC colour encodings, including HDR PQ/HLG transfer functions,
are explicitly rejected with `invalid_decode` and an explanatory cause rather
than silently relabelled sRGB. Tone mapping those inputs is not implemented.

Camera RAW/DNG, including Apple ProRAW, and TIFF are not supported. Support
does not imply every phone image fits the limits: photographs above 60 MP
or files above 100 MiB are rejected. Larger limits also increase memory and
processing requirements. HEIC decoding performs synchronous CPU work inside
its async API; future server integration should account for concurrency.

## Quality and limits

The encoder tries quality 82/78/74/70 and keeps 2,000 bytes of headroom under the
60,000-byte target up to 800px, 200,000 up to 1280px, and 450,000 above that.
It does not reduce quality below 70 to force every input into a target.
Inspect `output.content.length` for actual bytes.

These are targets for representative images, not guarantees for every photo.
Local tests do not establish Azure memory/cost, browser transfer sizes or
perceived quality on real photographs. Those validations belong to later slices.

## Licenses

sharp is Apache-2.0, heic-decode is ISC, and lcms-wasm/LittleCMS are MIT.
libvips, libheif and bundled codecs
have their own licenses.
Retain the installed package notices when distributing native binaries.
See [sharp](https://sharp.pixelplumbing.com/) and
[native installation requirements](https://sharp.pixelplumbing.com/install/).
