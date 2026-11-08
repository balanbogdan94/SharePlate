import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import decodeHeic from 'heic-decode';
import { encode, encodeAvatar, inspect, InvalidImage, widthsFor } from './conversion.js';
import { normaliseHeicColour } from './heic-colour.js';

async function fixture(format: 'jpeg' | 'png' | 'webp' | 'avif', width = 2400, height = 1600): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 3;
    pixels[offset] = Math.round(x * 255 / width);
    pixels[offset + 1] = Math.round(y * 255 / height);
    pixels[offset + 2] = (Math.floor(x / 64) + Math.floor(y / 64)) % 2 ? 110 : 150;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).toFormat(format).toBuffer();
}

for (const format of ['jpeg', 'png', 'webp', 'avif'] as const) {
  test(`${format}: produces recipe WebP variants within representative byte targets`, async () => {
    const content = await fixture(format);
    const info = await inspect(content);
    assert.deepEqual(info, { width: 2400 });
    assert.deepEqual(widthsFor(info.width), [320, 800, 1280]);
    for (const width of widthsFor(info.width)) {
      const output = await encode(content, width);
      const metadata = await sharp(output.content).metadata();
      assert.equal(metadata.format, 'webp');
      assert.equal(output.width, width);
      assert.equal(metadata.width, width);
      assert.equal(output.height, metadata.height);
      assert.ok(Math.abs(output.height - width * 1600 / 2400) <= 1);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.pages ?? 1, 1);
      const target = width <= 800 ? 60_000 : 200_000;
      assert.ok(output.content.length <= target, `${width}px: ${output.content.length} bytes exceeds ${target}`);
    }
  });
}

test('small originals and requested variants are not enlarged', async () => {
  assert.deepEqual(widthsFor(100), [100]);
  assert.deepEqual(widthsFor(500), [320, 500]);
  assert.deepEqual(widthsFor(640), [320, 640]);
  assert.deepEqual(widthsFor(800), [320, 800]);
  assert.deepEqual(widthsFor(1000), [320, 800, 1000]);
  assert.deepEqual(widthsFor(1280), [320, 800, 1280]);
  assert.deepEqual(widthsFor(2048), [320, 800, 1280]);
  const content = await fixture('png', 100, 80);
  const output = await encode(content, 320);
  assert.equal(output.width, 100);
  assert.equal(output.height, 80);
});

test('profile photos use a 192px square centre crop for landscape and portrait originals', async () => {
  const centre = await sharp({ create: { width: 200, height: 200, channels: 3, background: 'green' } }).png().toBuffer();
  for (const [width, height] of [[400, 200], [200, 400]] as const) {
    const content = await sharp({ create: { width, height, channels: 3, background: 'red' } })
      .composite([{ input: centre, left: (width - 200) / 2, top: (height - 200) / 2 }])
      .png().toBuffer();
    const output = await encodeAvatar(content);
    assert.deepEqual({ width: output.width, height: output.height }, { width: 192, height: 192 });
    const metadata = await sharp(output.content).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 192);
    assert.equal(metadata.height, 192);
    assert.equal(metadata.pages ?? 1, 1);
    const stats = await sharp(output.content).stats();
    assert.ok(stats.channels[0]!.mean < 20 && stats.channels[1]!.mean > 110 && stats.channels[2]!.mean < 20,
      'the centre crop should retain the green square, not the red edges');
    assert.ok(output.content.length <= 60_000);
  }
});

test('small profile photos stay square without enlarging either dimension', async () => {
  for (const [width, height] of [[100, 60], [20, 40], [80, 80]] as const) {
    const content = await fixture('png', width, height);
    const output = await encodeAvatar(content);
    const size = Math.min(width, height);
    assert.deepEqual({ width: output.width, height: output.height }, { width: size, height: size });
    const metadata = await sharp(output.content).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
  }
});

test('invalid sizes, corrupt data and unsupported image formats are rejected', async () => {
  await assert.rejects(inspect(Buffer.alloc(0)), error => error instanceof InvalidImage && error.message === 'invalid_size');
  await assert.rejects(encodeAvatar(Buffer.alloc(0)), error => error instanceof InvalidImage && error.message === 'invalid_size');
  await assert.rejects(inspect(Buffer.alloc(100 * 1024 * 1024 + 1)),
    error => error instanceof InvalidImage && error.message === 'invalid_size');
  await assert.rejects(inspect(Buffer.from('not an image')), InvalidImage);
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).gif().toBuffer();
  await assert.rejects(inspect(gif), error => error instanceof InvalidImage && error.message === 'invalid_format');
  const tiff = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).tiff().toBuffer();
  await assert.rejects(inspect(tiff), error => error instanceof InvalidImage && error.message === 'invalid_format');
});

const entryPoints = [
  { name: 'inspect', run: inspect },
  { name: 'encode', run: (content: Buffer) => encode(content, 40) },
  { name: 'encodeAvatar', run: encodeAvatar },
];

for (const { name, run } of entryPoints) {
  test(`${name}: corrupt metadata and pixel data use InvalidImage with the original cause`, async () => {
    const jpeg = await sharp({ create: { width: 80, height: 60, channels: 3, background: 'green' } }).jpeg().toBuffer();
    const truncated = jpeg.subarray(0, jpeg.length - 20);
    assert.equal((await sharp(truncated).metadata()).width, 80);
    for (const content of [Buffer.from('not an image'), truncated]) {
      await assert.rejects(run(content), error =>
        error instanceof InvalidImage && error.message === 'invalid_decode' && error.cause instanceof Error);
    }
  });

  test(`${name}: validation errors retain their original codes without being wrapped`, async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).gif().toBuffer();
    for (const [content, code] of [[Buffer.alloc(0), 'invalid_size'], [gif, 'invalid_format']] as const) {
      await assert.rejects(run(content), error =>
        error instanceof InvalidImage && error.message === code && error.cause === undefined);
    }
  });
}

test('valid images above 5 MiB and exactly at the 100 MiB limit are accepted', async () => {
  const original = await fixture('jpeg', 80, 60);
  for (const mebibytes of [6, 100]) {
    const content = Buffer.alloc(mebibytes * 1024 * 1024);
    original.copy(content);
    assert.deepEqual(await inspect(content), { width: 80 });
    const output = await encode(content, 40);
    assert.equal((await sharp(output.content).metadata()).width, 40);
  }
});

test('invalid conversion dimensions cannot reach the encoder', async () => {
  for (const width of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])
    assert.throws(() => widthsFor(width), InvalidImage);
  await assert.rejects(encode(Buffer.alloc(0), 0), InvalidImage);
});

test('48 MP phone photos and images at the 60 MP limit are accepted', async () => {
  for (const width of [8000, 10000]) {
    const content = await sharp({ create: { width, height: 6000, channels: 3, background: 'green' } }).png().toBuffer();
    assert.deepEqual(await inspect(content), { width });
  }
});

test('a small compressed input cannot bypass the decoded pixel limit', async () => {
  const content = Buffer.from(await fixture('png', 80, 80));
  content.writeUInt32BE(10000, 16);
  content.writeUInt32BE(6001, 20);
  content.writeUInt32BE(crc32(content.subarray(12, 29)), 29);
  await assert.rejects(inspect(content), error =>
    error instanceof InvalidImage && error.cause instanceof Error && /pixel limit/i.test(error.cause.message));
});

test('APNG is rejected even when the native loader reports only one frame', async () => {
  const source = await fixture('png', 80, 80);
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8);
  chunk.write('acTL', 4);
  chunk.writeUInt32BE(2, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 16)), 16);
  const headerEnd = 8 + source.readUInt32BE(8) + 12;
  const animated = Buffer.concat([source.subarray(0, headerEnd), chunk, source.subarray(headerEnd)]);
  await assert.rejects(inspect(animated), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
  await assert.rejects(encode(animated, 40), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
});

test('EXIF orientation is applied before selecting widths and metadata is removed', async () => {
  const content = await sharp({ create: { width: 80, height: 120, channels: 3, background: 'green' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const info = await inspect(content);
  assert.equal(info.width, 120);
  const output = await encode(content, widthsFor(info.width)[0]!);
  const metadata = await sharp(output.content).metadata();
  assert.equal(metadata.width, 120);
  assert.equal(metadata.height, 80);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  const avatar = await encodeAvatar(content);
  const avatarMetadata = await sharp(avatar.content).metadata();
  assert.equal(avatarMetadata.width, 80);
  assert.equal(avatarMetadata.height, 80);
  assert.equal(avatarMetadata.orientation, undefined);
  assert.equal(avatarMetadata.exif, undefined);
});

test('transparent PNG keeps its alpha channel in WebP', async () => {
  const content = await sharp({ create: { width: 100, height: 80, channels: 4,
    background: { r: 20, g: 70, b: 10, alpha: 0.5 } } }).png().toBuffer();
  for (const output of [await encode(content, 100), await encodeAvatar(content)]) {
    const { data, info: decoded } = await sharp(output.content).raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.channels, 4);
    assert.ok(Math.abs(data[3]! - 128) <= 1);
  }
});

test('animated WebP is rejected rather than flattened', async () => {
  const frames = await Promise.all(['red', 'green'].map(background =>
    sharp({ create: { width: 80, height: 80, channels: 4, background } }).png().toBuffer()));
  const content = await sharp(frames, { join: { animated: true } }).webp({ loop: 0, delay: [100, 200] }).toBuffer();
  await assert.rejects(inspect(content), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
  await assert.rejects(encode(content, 64), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
  await assert.rejects(encodeAvatar(content), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
});

test('HEIC/HEIF bytes are decoded into a static WebP without native HEVC support', async () => {
  const content = await readFile(new URL('../src/fixtures/phone.heic', import.meta.url));
  assert.deepEqual(await inspect(content), { width: 80 });
  const output = await encode(content, 40);
  assert.deepEqual({ width: output.width, height: output.height }, { width: 40, height: 60 });
  const metadata = await sharp(output.content).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.pages ?? 1, 1);
  const { data } = await sharp(output.content).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0]! > 200 && data[1]! < 30 && data[2]! < 30, 'decoded image should remain red');
  const avatar = await encodeAvatar(content);
  assert.deepEqual({ width: avatar.width, height: avatar.height }, { width: 80, height: 80 });
  const avatarMetadata = await sharp(avatar.content).metadata();
  assert.equal(avatarMetadata.format, 'webp');
  assert.equal(avatarMetadata.width, 80);
  assert.equal(avatarMetadata.height, 80);
});

for (const file of ['phone-p3.heic', 'phone-p3-nclx.heic']) {
  test(`${file}: recipe and avatar pixels are converted from Display P3 to sRGB before metadata removal`, async () => {
    const content = await readFile(new URL(`../src/fixtures/${file}`, import.meta.url));
    const metadata = await sharp(content).metadata();
    assert.equal(metadata.hasProfile, file === 'phone-p3.heic');
    const decoded = await decodeHeic({ buffer: content });
    const expected = [170, 120, 80];
    assert.ok(Math.abs(decoded.data[0]! - expected[0]!) > 5, 'fixture must distinguish P3 pixels from sRGB');
    assert.deepEqual(await inspect(content), { width: 80 });
    for (const output of [await encode(content, 40), await encodeAvatar(content)]) {
      const stats = await sharp(output.content).stats();
      for (let channel = 0; channel < 3; channel++) {
        assert.ok(Math.abs(stats.channels[channel]!.mean - expected[channel]!) <= 4,
          `${file}: channel ${channel} should be close to ${expected[channel]}, got ${stats.channels[channel]!.mean}`);
      }
      const resultMetadata = await sharp(output.content).metadata();
      assert.equal(resultMetadata.icc, undefined);
      assert.equal(resultMetadata.exif, undefined);
    }
  });
}

test('HEIC colour conversion preserves alpha and handles multiple bounded chunks', async () => {
  const content = await readFile(new URL('../src/fixtures/phone-p3.heic', import.meta.url));
  const { icc } = await sharp(content).metadata();
  assert.ok(icc);
  const pixels = new Uint8ClampedArray(70_000 * 4);
  for (let offset = 0; offset < pixels.length; offset += 4)
    pixels.set([162, 122, 86, (offset / 4) % 256], offset);
  await normaliseHeicColour(content, icc, pixels);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    assert.ok(Math.abs(pixels[offset]! - 170) <= 2);
    assert.ok(Math.abs(pixels[offset + 1]! - 120) <= 2);
    assert.ok(Math.abs(pixels[offset + 2]! - 80) <= 2);
    assert.equal(pixels[offset + 3], (offset / 4) % 256);
  }
});

test('HEIC colour conversion rejects invalid ICC data instead of assuming sRGB', async () => {
  const content = await readFile(new URL('../src/fixtures/phone-p3.heic', import.meta.url));
  const pixels = new Uint8ClampedArray([162, 122, 86, 255]);
  await assert.rejects(normaliseHeicColour(content, Buffer.from('not an ICC profile'), pixels),
    /Invalid HEIC ICC profile/);
  assert.deepEqual(Array.from(pixels), [162, 122, 86, 255]);
});

test('HEIC colour conversion ignores colour properties not associated with the primary image', async () => {
  const content = Buffer.from(await readFile(new URL('../src/fixtures/phone-p3-nclx.heic', import.meta.url)));
  const nclx = content.indexOf('nclx');
  const ipma = content.indexOf('ipma');
  assert.ok(nclx >= 0 && ipma >= 0);
  assert.equal(content[ipma + 15]! & 0x7f, 1);
  content[ipma + 15] = 0;
  content.writeUInt16BE(16, nclx + 6);
  const pixels = new Uint8ClampedArray([162, 122, 86, 255]);
  await normaliseHeicColour(content, undefined, pixels);
  assert.deepEqual(Array.from(pixels), [162, 122, 86, 255]);
});

test('unsupported HEIC transfer functions are rejected explicitly rather than labelled sRGB', async () => {
  const original = await readFile(new URL('../src/fixtures/phone-p3-nclx.heic', import.meta.url));
  const content = Buffer.from(original);
  const nclx = content.indexOf('nclx');
  assert.ok(nclx >= 0);
  content.writeUInt16BE(16, nclx + 6);
  for (const { run } of entryPoints) {
    await assert.rejects(run(content), error =>
      error instanceof InvalidImage && error.message === 'invalid_decode'
      && error.cause instanceof Error && /Unsupported HEIF NCLX profile/.test(error.cause.message));
  }
});

test('HEIF and AVIF sequence brands are rejected even without a reported frame count', async () => {
  const original = await fixture('avif', 80, 60);
  for (const brand of ['avis', 'msf1', 'hevc', 'hevx']) {
    const content = Buffer.from(original);
    content.write(brand, 8, 4, 'ascii');
    await assert.rejects(inspect(content), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
    await assert.rejects(encode(content, 40), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
  }
  const compatibleSequence = Buffer.from(original);
  compatibleSequence.write('avis', 16, 4, 'ascii');
  await assert.rejects(inspect(compatibleSequence), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
});

test('real two-frame AVIF and APNG files are rejected', async () => {
  for (const format of ['avif', 'apng']) {
    const content = await readFile(new URL(`../src/fixtures/animated.${format}`, import.meta.url));
    await assert.rejects(inspect(content), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
    await assert.rejects(encode(content, 16), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
    await assert.rejects(encodeAvatar(content), error => error instanceof InvalidImage && error.message === 'unsupported_animation');
  }
});
