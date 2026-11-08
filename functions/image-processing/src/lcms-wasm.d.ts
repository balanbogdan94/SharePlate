declare module 'lcms-wasm' {
	export const TYPE_RGB_8: number;
	export const INTENT_PERCEPTUAL: number;

	export interface LittleCms {
		cmsOpenProfileFromMem(profile: Uint8Array, length: number): number;
		cmsCreate_sRGBProfile(): number;
		cmsGetColorSpaceASCII(profile: number): string;
		cmsCreateTransform(
			inputProfile: number,
			inputFormat: number,
			outputProfile: number,
			outputFormat: number,
			intent: number,
			flags: number,
		): number;
		cmsDoTransform(
			transform: number,
			pixels: Uint8Array,
			count: number,
		): Uint8Array;
		cmsDeleteTransform(transform: number): void;
		cmsCloseProfile(profile: number): void;
	}

	export function instantiate(): Promise<LittleCms>;
}
