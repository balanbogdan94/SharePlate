import { instantiate, INTENT_PERCEPTUAL, TYPE_RGB_8, type LittleCms } from 'lcms-wasm';
import sharp from 'sharp';

type Box = { type: string; start: number; end: number };
let colourEngine: Promise<LittleCms> | undefined;
let displayP3Profile: Promise<Buffer> | undefined;

function boxes(content: Buffer, start: number, end: number): Box[] {
	const result: Box[] = [];
	while (start < end) {
		if (start + 8 > end) throw new Error('Truncated HEIF box.');
		let length = content.readUInt32BE(start);
		let header = 8;
		if (length === 1) {
			if (start + 16 > end) throw new Error('Truncated extended HEIF box.');
			const extendedLength = content.readBigUInt64BE(start + 8);
			if (extendedLength > BigInt(Number.MAX_SAFE_INTEGER))
				throw new Error('Invalid HEIF box size.');
			length = Number(extendedLength);
			header = 16;
		} else if (length === 0) {
			length = end - start;
		}
		if (length < header || length > end - start)
			throw new Error('Invalid HEIF box size.');
		result.push({
			type: content.toString('ascii', start + 4, start + 8),
			start: start + header,
			end: start + length,
		});
		start += length;
	}
	return result;
}

function nclxProfile(content: Buffer): 'p3' | undefined {
	const meta = boxes(content, 0, content.length).find(box => box.type === 'meta');
	if (!meta) throw new Error('HEIF metadata is missing.');
	const children = boxes(content, meta.start + 4, meta.end);
	const primary = children.find(box => box.type === 'pitm');
	const properties = children.find(box => box.type === 'iprp');
	if (!primary || !properties) throw new Error('HEIF primary image properties are missing.');
	const version = content.readUInt8(primary.start);
	if (version > 1 || primary.end - primary.start < (version === 0 ? 6 : 8))
		throw new Error('Invalid HEIF primary image identifier.');
	const primaryId = version === 0
		? content.readUInt16BE(primary.start + 4)
		: content.readUInt32BE(primary.start + 4);
	const propertyBoxes = boxes(content, properties.start, properties.end);
	const container = propertyBoxes.find(box => box.type === 'ipco');
	if (!container) throw new Error('HEIF property container is missing.');
	const items = boxes(content, container.start, container.end);
	for (const associations of propertyBoxes.filter(box => box.type === 'ipma')) {
		if (associations.end - associations.start < 8)
			throw new Error('Truncated HEIF property associations.');
		const version = content.readUInt8(associations.start);
		if (version > 1) throw new Error('Unsupported HEIF property association version.');
		const wide = (content.readUInt32BE(associations.start) & 1) !== 0;
		const count = content.readUInt32BE(associations.start + 4);
		let offset = associations.start + 8;
		for (let entry = 0; entry < count; entry++) {
			const idSize = version === 0 ? 2 : 4;
			if (offset + idSize + 1 > associations.end)
				throw new Error('Truncated HEIF property association.');
			const id = idSize === 2 ? content.readUInt16BE(offset) : content.readUInt32BE(offset);
			offset += idSize;
			const propertyCount = content.readUInt8(offset++);
			for (let property = 0; property < propertyCount; property++) {
				const size = wide ? 2 : 1;
				if (offset + size > associations.end)
					throw new Error('Truncated HEIF property index.');
				const index = wide ? content.readUInt16BE(offset) & 0x7fff : content.readUInt8(offset) & 0x7f;
				offset += size;
				if (id !== primaryId || index === 0) continue;
				const item = items[index - 1];
				if (!item) throw new Error('Invalid HEIF property index.');
				if (item.type !== 'colr') continue;
				if (item.end - item.start < 4)
					throw new Error('Truncated HEIF colour property.');
				const type = content.toString('ascii', item.start, item.start + 4);
				if (type !== 'nclx') throw new Error(`Unsupported HEIF colour property: ${type}.`);
				if (item.end - item.start < 11)
					throw new Error('Truncated HEIF NCLX profile.');
				const primaries = content.readUInt16BE(item.start + 4);
				const transfer = content.readUInt16BE(item.start + 6);
				if ((primaries === 1 || primaries === 2) && (transfer === 13 || transfer === 2))
					return undefined;
				if (primaries === 12 && transfer === 13) return 'p3';
				throw new Error(`Unsupported HEIF NCLX profile: primaries=${primaries}, transfer=${transfer}.`);
			}
		}
	}
	return undefined;
}

async function p3Profile(): Promise<Buffer> {
	displayP3Profile ??= (async () => {
		const image = await sharp({
			create: { width: 1, height: 1, channels: 3, background: 'black' },
		}).withIccProfile('p3').png().toBuffer();
		const { icc } = await sharp(image).metadata();
		if (!icc) throw new Error('Display P3 ICC profile is unavailable.');
		return icc;
	})();
	return displayP3Profile;
}

export async function normaliseHeicColour(
	content: Buffer,
	icc: Buffer | undefined,
	pixels: Uint8ClampedArray,
): Promise<void> {
	const profile = icc ?? (nclxProfile(content) === 'p3' ? await p3Profile() : undefined);
	if (!profile) return;
	colourEngine ??= instantiate();
	const cms = await colourEngine;
	const source = cms.cmsOpenProfileFromMem(profile, profile.length);
	if (!source) throw new Error('Invalid HEIC ICC profile.');
	let destination = 0;
	let transform = 0;
	try {
		if (cms.cmsGetColorSpaceASCII(source) !== 'RGB')
			throw new Error('HEIC ICC profile must describe RGB pixels.');
		destination = cms.cmsCreate_sRGBProfile();
		if (!destination) throw new Error('Could not create the sRGB ICC profile.');
		transform = cms.cmsCreateTransform(
			source, TYPE_RGB_8, destination, TYPE_RGB_8, INTENT_PERCEPTUAL, 0,
		);
		if (!transform) throw new Error('Could not transform the HEIC ICC profile to sRGB.');
		// The wrapper sizes buffers by colour channels only; keep alpha outside LCMS.
		const rgb = new Uint8Array(Math.min(65_536, pixels.length / 4) * 3);
		for (let offset = 0; offset < pixels.length; offset += 65_536 * 4) {
			const count = Math.min(65_536, (pixels.length - offset) / 4);
			const chunk = rgb.subarray(0, count * 3);
			for (let pixel = 0; pixel < count; pixel++) {
				chunk[pixel * 3] = pixels[offset + pixel * 4]!;
				chunk[pixel * 3 + 1] = pixels[offset + pixel * 4 + 1]!;
				chunk[pixel * 3 + 2] = pixels[offset + pixel * 4 + 2]!;
			}
			const converted = cms.cmsDoTransform(transform, chunk, count);
			if (converted.length !== chunk.length)
				throw new Error('HEIC colour conversion returned an invalid pixel count.');
			for (let pixel = 0; pixel < count; pixel++) {
				pixels[offset + pixel * 4] = converted[pixel * 3]!;
				pixels[offset + pixel * 4 + 1] = converted[pixel * 3 + 1]!;
				pixels[offset + pixel * 4 + 2] = converted[pixel * 3 + 2]!;
			}
		}
	} finally {
		if (transform) cms.cmsDeleteTransform(transform);
		if (destination) cms.cmsCloseProfile(destination);
		cms.cmsCloseProfile(source);
	}
}
