import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';
import { normaliseHeicColour } from './heic-colour.js';

export type ImageInfo = { width: number };
export type EncodedImage = { content: Buffer; width: number; height: number };

export class InvalidImage extends Error {}

const maxInputBytes = 100 * 1024 * 1024;
const maxInputPixels = 60_000_000;
const recipeWidths = [320, 800, 1280];
const avatarSize = 192;
const decodeOptions = {
	limitInputPixels: maxInputPixels,
	failOn: 'warning' as const,
};

const supportedFormats = ['jpeg', 'png', 'webp', 'heif'];
const animatedHeifBrands = ['avis', 'msf1', 'hevc', 'hevx'];

export function widthsFor(width: number): number[] {
	if (!Number.isSafeInteger(width) || width <= 0)
		throw new InvalidImage('invalid_dimensions');
	return [
		...new Set([
			...recipeWidths.filter((candidate) => candidate <= width),
			Math.min(width, recipeWidths.at(-1)!),
		]),
	].sort((a, b) => a - b);
}

async function openImage(
	content: Buffer,
): Promise<{ image: Sharp; width: number; height: number }> {
	if (content.length === 0 || content.length > maxInputBytes)
		throw new InvalidImage('invalid_size');

	if (content.length >= 8 && content.toString('ascii', 4, 8) === 'ftyp') {
		const boxLength = content.readUInt32BE(0);
		if (boxLength < 16 || boxLength > content.length)
			throw new InvalidImage('invalid_decode');
		// Detect sequences before loaders can reject or silently flatten them.
		for (let offset = 8; offset + 4 <= boxLength; offset += 4) {
			if (
				offset !== 12 &&
				animatedHeifBrands.includes(
					content.toString('ascii', offset, offset + 4),
				)
			)
				throw new InvalidImage('unsupported_animation');
		}
	}

	const image = sharp(content, decodeOptions);
	const metadata = await image.metadata();
	if (
		!metadata.width ||
		!metadata.height ||
		!supportedFormats.includes(metadata.format ?? '')
	)
		throw new InvalidImage('invalid_format');
	if ((metadata.pages ?? 1) > 1)
		throw new InvalidImage('unsupported_animation');
	if (metadata.width * metadata.height > maxInputPixels)
		throw new InvalidImage('invalid_dimensions');

	if (metadata.format === 'png') {
		// PNG loaders can expose only the first frame of an APNG.
		for (let offset = 8; offset + 12 <= content.length; ) {
			const length = content.readUInt32BE(offset);
			if (length > content.length - offset - 12)
				throw new InvalidImage('invalid_decode');
			if (
				content.toString('ascii', offset + 4, offset + 8) === 'acTL' &&
				length >= 8 &&
				content.readUInt32BE(offset + 8) > 1
			)
				throw new InvalidImage('unsupported_animation');
			offset += length + 12;
		}
	}

	if (metadata.format === 'heif') {
		if (metadata.compression === 'hevc') {
			const decoded = await decodeHeic({ buffer: content });
			if (decoded.width * decoded.height > maxInputPixels)
				throw new InvalidImage('invalid_dimensions');
			await normaliseHeicColour(content, metadata.icc, decoded.data);
			// libheif applies HEIF rotation/mirroring while decoding.
			return {
				image: sharp(
					Buffer.from(
						decoded.data.buffer,
						decoded.data.byteOffset,
						decoded.data.byteLength,
					),
					{
						...decodeOptions,
						raw: { width: decoded.width, height: decoded.height, channels: 4 },
					},
				),
				width: decoded.width,
				height: decoded.height,
			};
		}
	}

	const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
	return {
		image: image.autoOrient(),
		width: rotated ? metadata.height : metadata.width,
		height: rotated ? metadata.width : metadata.height,
	};
}

async function withImageErrors<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof InvalidImage) throw error;
		if (error instanceof Error)
			throw new InvalidImage('invalid_decode', { cause: error });
		throw error;
	}
}

export function inspect(content: Buffer): Promise<ImageInfo> {
	return withImageErrors(async () => {
		const { image, width } = await openImage(content);
		await image.stats();
		return { width };
	});
}

async function encodeImage(
	content: Buffer,
	width: number,
	square = false,
): Promise<EncodedImage> {
	if (!Number.isSafeInteger(width) || width <= 0)
		throw new InvalidImage('invalid_dimensions');
	const { image, width: inputWidth, height: inputHeight } = await openImage(content);
	const targetWidth = square ? Math.min(width, inputWidth, inputHeight) : width;

	const budget =
		(width <= 800 ? 60_000 : width <= 1280 ? 200_000 : 450_000) - 2000;
	let result: EncodedImage | undefined;
	for (const quality of [82, 78, 74, 70]) {
		const { data, info } = await image
			.clone()
			.resize({
				width: targetWidth,
				height: square ? targetWidth : undefined,
				fit: 'cover',
				position: 'centre',
				withoutEnlargement: true,
			})
			.toColourspace('srgb')
			.webp({ quality, effort: 4 })
			.toBuffer({ resolveWithObject: true });

		result = { content: data, width: info.width, height: info.height };
		if (data.length <= budget) break;
	}
	if (!result) throw new Error('No WebP output was generated.');
	return result;
}

export function encode(content: Buffer, width: number): Promise<EncodedImage> {
	return withImageErrors(() => encodeImage(content, width));
}

export function encodeAvatar(content: Buffer): Promise<EncodedImage> {
	return withImageErrors(() => encodeImage(content, avatarSize, true));
}
