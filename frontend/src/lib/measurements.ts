import type { UnitType } from '@/pages/tabs/home/types';
import type { Language } from '@/settings/UserSettingsContext';

export const MIN_QUANTITY = 0.001;

export const UNIT_GROUP_ORDER = ['weight', 'volume', 'kitchen', 'count', 'packaging'] as const;
type UnitGroup = (typeof UNIT_GROUP_ORDER)[number];
export const UNIT_GROUPS = {
	Kilogram: 'weight',
	Gram: 'weight',
	Liter: 'volume',
	Milliliter: 'volume',
	Teaspoon: 'kitchen',
	Tablespoon: 'kitchen',
	Cup: 'kitchen',
	Pinch: 'kitchen',
	Piece: 'count',
	Portion: 'count',
	Clove: 'count',
	Bunch: 'count',
	Slice: 'count',
	Can: 'packaging',
	Package: 'packaging',
} satisfies Record<UnitType, UnitGroup>;

type Labels = { option: string; singular: string; plural: string };
const labels = {
	en: {
		Kilogram: ['Kilogram (kg)', 'kg', 'kg'],
		Gram: ['Gram (g)', 'g', 'g'],
		Liter: ['Liter (L)', 'L', 'L'],
		Milliliter: ['Milliliter (ml)', 'ml', 'ml'],
		Piece: ['Piece', 'pcs', 'pcs'],
		Portion: ['Portion', 'portion', 'portions'],
		Teaspoon: ['Teaspoon (5 ml)', 'teaspoon', 'teaspoons'],
		Tablespoon: ['Tablespoon (15 ml)', 'tablespoon', 'tablespoons'],
		Can: ['Can', 'can', 'cans'],
		Cup: ['Measuring cup (250 ml)', 'measuring cup', 'measuring cups'],
		Pinch: ['Pinch', 'pinch', 'pinches'],
		Clove: ['Clove', 'clove', 'cloves'],
		Bunch: ['Bunch', 'bunch', 'bunches'],
		Slice: ['Slice', 'slice', 'slices'],
		Package: ['Package', 'package', 'packages'],
	},
	ro: {
		Kilogram: ['Kilogram (kg)', 'kg', 'kg'],
		Gram: ['Gram (g)', 'g', 'g'],
		Liter: ['Litru (L)', 'L', 'L'],
		Milliliter: ['Mililitru (ml)', 'ml', 'ml'],
		Piece: ['Bucată', 'bucată', 'bucăți'],
		Portion: ['Porție', 'porție', 'porții'],
		Teaspoon: ['Linguriță (5 ml)', 'linguriță', 'lingurițe'],
		Tablespoon: ['Lingură (15 ml)', 'lingură', 'linguri'],
		Can: ['Conservă', 'conservă', 'conserve'],
		Cup: ['Cană de măsurare (250 ml)', 'cană de măsurare', 'căni de măsurare'],
		Pinch: ['Praf', 'praf', 'prafuri'],
		Clove: ['Cățel', 'cățel', 'căței'],
		Bunch: ['Legătură', 'legătură', 'legături'],
		Slice: ['Felie', 'felie', 'felii'],
		Package: ['Pachet', 'pachet', 'pachete'],
	},
} satisfies Record<Language, Record<UnitType, [string, string, string]>>;

export function isUnitType(value: string): value is UnitType {
	return Object.hasOwn(labels.en, value);
}

function getLabels(unit: UnitType, language: Language): Labels {
	if (!isUnitType(unit)) throw new RangeError(`Unsupported measurement unit: ${unit}`);
	const [option, singular, plural] = labels[language][unit];
	return { option, singular, plural };
}

export function parseQuantity(value: string): number | null {
	const text = value.trim();
	if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/u.test(text)) return null;
	const quantity = Number(text.replace(',', '.'));
	return Number.isFinite(quantity) && quantity >= MIN_QUANTITY ? quantity : null;
}

export function formatQuantity(value: number, language: Language = 'en'): string {
	if (!Number.isFinite(value) || value < MIN_QUANTITY) {
		throw new RangeError('Quantity must be finite and at least 0.001.');
	}
	return new Intl.NumberFormat(language, {
		useGrouping: false,
		maximumSignificantDigits: 15,
	}).format(value);
}

export function getUnitLabel(unit: UnitType, language: Language = 'en', quantity?: number): string {
	const value = getLabels(unit, language);
	return quantity === 1 ? value.singular : value.plural;
}

export function getUnitOptionLabel(unit: UnitType, language: Language): string {
	return getLabels(unit, language).option;
}

export function formatMeasurement(quantity: number, unit: UnitType, language: Language): string {
	return `${formatQuantity(quantity, language)} ${getUnitLabel(unit, language, quantity)}`;
}
