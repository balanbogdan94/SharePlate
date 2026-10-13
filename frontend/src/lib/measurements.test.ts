import { describe, expect, it } from 'vitest';
import {
	formatMeasurement,
	formatQuantity,
	getUnitOptionLabel,
	isUnitType,
	parseQuantity,
} from './measurements';
import type { UnitType } from '@/pages/tabs/home/types';
import {
	buildEditableReminderText,
	formatReminderLines,
	getEditableReminderValidationMessage,
} from '@/pages/tabs/plan/remindersExport';

const units: UnitType[] = [
	'Kilogram',
	'Gram',
	'Liter',
	'Milliliter',
	'Piece',
	'Portion',
	'Teaspoon',
	'Tablespoon',
	'Can',
	'Cup',
	'Pinch',
	'Clove',
	'Bunch',
	'Slice',
	'Package',
];

describe('measurements', () => {
	it.each(units)('supports fractional %s in both languages', (unit) => {
		expect(isUnitType(unit)).toBe(true);
		for (const language of ['en', 'ro'] as const) {
			expect(getUnitOptionLabel(unit, language)).toBeTruthy();
			expect(formatMeasurement(0.5, unit, language)).toContain(language === 'ro' ? '0,5' : '0.5');
			const item = { id: unit, name: 'Ingredient', quantity: '0,5', unitId: unit };
			expect(getEditableReminderValidationMessage([item], language)).toBeNull();
			expect(buildEditableReminderText([item], language)).not.toContain('undefined');
		}
	});
	it.each(['0,5', '0.5', ',5', '.5', ' 0.5 '])('parses %s', (text) =>
		expect(parseQuantity(text)).toBe(0.5),
	);
	it.each([
		'',
		'0',
		'-1',
		'0.0009',
		'NaN',
		'Infinity',
		'1/2',
		'1 000',
		'1,000.5',
		'1.2.3',
		'1e3',
		'0x10',
	])('rejects %s', (text) => expect(parseQuantity(text)).toBeNull());
	it('preserves decimal precision and removes arithmetic artifacts', () => {
		expect(parseQuantity('0,001')).toBe(0.001);
		expect(formatQuantity(0.001, 'ro')).toBe('0,001');
		expect(formatQuantity(0.125, 'en')).toBe('0.125');
		expect(formatQuantity(0.123456789, 'ro')).toBe('0,123456789');
		expect(formatQuantity(0.1 + 0.2, 'ro')).toBe('0,3');
		expect(formatQuantity(1000.5, 'en')).toBe('1000.5');
		expect(() => formatQuantity(0, 'en')).toThrow();
	});
	it('uses localized singulars and plurals and explicit volume definitions', () => {
		expect(formatMeasurement(1, 'Can', 'ro')).toBe('1 conservă');
		expect(formatMeasurement(2, 'Clove', 'ro')).toBe('2 căței');
		expect(getUnitOptionLabel('Cup', 'ro')).toContain('250 ml');
		expect(getUnitOptionLabel('Teaspoon', 'en')).toContain('5 ml');
		expect(getUnitOptionLabel('Tablespoon', 'en')).toContain('15 ml');
		expect(isUnitType('toString')).toBe(false);
	});
	it('exports localized numbers rather than unvalidated input text', () => {
		expect(
			buildEditableReminderText(
				[{ id: '1', name: 'Oil', quantity: '00,125', unitId: 'Liter' }],
				'ro',
			),
		).toBe('Oil — 0,125 L');
		expect(
			formatReminderLines([
				{ name: 'Salt', normalizedName: 'salt', quantity: 0.001, unitId: 'Gram' },
			]),
		).toEqual(['Salt — 0.001 g']);
		expect(() =>
			buildEditableReminderText([{ id: '1', name: 'Oil', quantity: '1/2', unitId: 'Liter' }]),
		).toThrow();
	});
});
