# Recipe and profile image conversion engine

This is the conversion code intended for the future Azure Function, not a local
conversion feature in SharePlate and not browser-side processing.

The module takes image bytes and returns WebP bytes. Where the source comes from
and where outputs are saved are deliberately outside this first slice. There is
no Azure SDK, PostgreSQL, trigger, HTTP endpoint, CLI or frontend dependency.

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

```ts
import { encode, inspect, widthsFor } from './conversion.js';

const info = await inspect(original);
const variants = [];
for (const width of widthsFor(info.width)) {
  variants.push(await encode(original, width));
}
```

In the future Function, `original` will be downloaded from Blob Storage and
`variants` will be uploaded there. Unit tests call the same code with synthetic
images. No second implementation will be needed for Azure.

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

These are conversion APIs only. Selecting recipe variants and displaying the
generated avatar in the frontend are integration work outside this module.

## Run the tests

Requires Node.js 24.

```sh
cd functions/image-processing
npm ci
npm test
```

`npm test` builds TypeScript and runs Node's built-in test runner. No Azure
credentials, Functions Core Tools, Docker or database are needed.

Tests check real WebP decoding, dimensions, representative byte targets,
no-upscale behavior, square profile crops, invalid inputs, EXIF orientation, transparency, AVIF and
HEIC decoding, input limits and rejection of animated WebP/APNG and HEIF/AVIF
sequence brands. The HEIC fixture is a generated 80x120 red image, encoded using
macOS `sips`. Two-frame AVIF/APNG fixtures use FFmpeg's generated `testsrc`
pattern. None of the fixtures contains a user photograph; these tools are not
required to run the tests.

## Phone formats

The supported-format list uses sharp's detected format names, not file
extensions. In particular, sharp reports both AVIF and HEIC/HEIF as `heif`.
AVIF is decoded by sharp. HEVC-compressed HEIC/HEIF is decoded using
`heic-decode` (libheif WebAssembly), then its pixels are passed to sharp;
no system HEVC codec or custom libvips build is required.

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

sharp is Apache-2.0 and heic-decode is ISC. libvips, libheif and bundled codecs
have their own licenses.
Retain the installed package notices when distributing native binaries.
See [sharp](https://sharp.pixelplumbing.com/) and
[native installation requirements](https://sharp.pixelplumbing.com/install/).
