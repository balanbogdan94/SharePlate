import type { KeyboardEvent, RefObject } from 'react';
import { Input } from '@/components/ui/input';
import type { Unit, UnitType } from '@/pages/tabs/home/types';
import { useI18n } from '@/i18n/I18nContext';
import {
	getUnitOptionLabel,
	isUnitType,
	parseQuantity,
	UNIT_GROUP_ORDER,
	UNIT_GROUPS,
} from '@/lib/measurements';

export type IngredientDraft = {
	name: string;
	quantity: string;
	unit: UnitType;
};

type IngredientFieldsProps = {
	draft: IngredientDraft;
	units: Unit[] | undefined;
	onChange: (draft: IngredientDraft) => void;
	nameRef: RefObject<HTMLInputElement | null>;
	onAdd: () => void;
	isDraftValid: boolean;
};

export function RecipeIngredientFields({
	draft,
	units,
	onChange,
	nameRef,
	onAdd,
	isDraftValid,
}: IngredientFieldsProps) {
	const { language, t } = useI18n();
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
		event.preventDefault();
		event.stopPropagation();
		if (isDraftValid && !event.repeat) onAdd();
	};
	const invalidQuantity = Boolean(draft.quantity.trim()) && parseQuantity(draft.quantity) === null;
	const unitGroup = UNIT_GROUPS[draft.unit];
	const unitHint =
		draft.unit === 'Pinch'
			? t('measurements.pinchHint')
			: unitGroup === 'packaging'
				? t('measurements.packageHint')
				: unitGroup === 'count'
					? t('measurements.countHint')
					: null;
	if (units?.some((unit) => !isUnitType(unit.id))) throw new Error(t('measurements.invalidUnit'));
	return (
		<div className="space-y-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3 shadow-xs dark:border-sp-border dark:bg-black/30">
			<div className="block">
				<label
					htmlFor="ingredient-name"
					className="text-xs font-medium text-stone-500 dark:text-sp-text-tertiary"
				>
					{t('ingredientEntry.name')}
				</label>
				<Input
					ref={nameRef}
					id="ingredient-name"
					aria-label={t('ingredientEntry.nameLabel')}
					value={draft.name}
					onChange={(e) => onChange({ ...draft, name: e.target.value })}
					onKeyDown={onKeyDown}
					autoComplete="off"
					placeholder={t('ingredientEntry.placeholder')}
					className="mt-1 h-11 rounded-xl bg-white dark:bg-sp-surface"
				/>
			</div>
			<div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-[minmax(5rem,0.65fr)_minmax(0,1.65fr)]">
				<div className="block">
					<label
						htmlFor="ingredient-qty"
						className="text-xs font-medium text-stone-500 dark:text-sp-text-tertiary"
					>
						{t('ingredientEntry.quantity')}
					</label>
					<Input
						id="ingredient-qty"
						aria-label={t('ingredientEntry.quantityLabel')}
						value={draft.quantity}
						onChange={(e) => onChange({ ...draft, quantity: e.target.value })}
						inputMode="decimal"
						onKeyDown={onKeyDown}
						aria-invalid={invalidQuantity}
						aria-describedby="ingredient-quantity-help"
						placeholder="2"
						className="mt-1 h-11 rounded-xl bg-white dark:bg-sp-surface"
					/>
				</div>
				<label htmlFor="ingredient-unit" className="block">
					<span className="block text-xs font-medium text-stone-500 dark:text-sp-text-tertiary">
						{t('ingredientEntry.unit')}
					</span>
					<select
						id="ingredient-unit"
						value={draft.unit}
						aria-describedby={unitHint ? 'ingredient-unit-help' : undefined}
						onChange={(e) => {
							if (!isUnitType(e.target.value)) throw new Error(t('measurements.invalidUnit'));
							onChange({ ...draft, unit: e.target.value });
						}}
						className="mt-1 h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-stone-800 shadow-xs dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-primary"
					>
						{units ? (
							UNIT_GROUP_ORDER.map((group) => {
								const options = units.filter((unit) => UNIT_GROUPS[unit.id] === group);
								return options.length ? (
									<optgroup key={group} label={t(`measurements.group.${group}`)}>
										{options.map((unit) => (
											<option key={unit.id} value={unit.id}>
												{getUnitOptionLabel(unit.id, language)}
											</option>
										))}
									</optgroup>
								) : null;
							})
						) : (
							<option value={draft.unit}>{getUnitOptionLabel(draft.unit, language)}</option>
						)}
					</select>
				</label>
			</div>
			<p
				id="ingredient-quantity-help"
				role={invalidQuantity ? 'alert' : undefined}
				className={`text-xs ${invalidQuantity ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-sp-text-secondary'}`}
			>
				{t(invalidQuantity ? 'measurements.invalidQuantity' : 'measurements.decimalHint')}
			</p>
			{unitHint && (
				<p id="ingredient-unit-help" className="text-xs text-stone-500 dark:text-sp-text-secondary">
					{unitHint}
				</p>
			)}
		</div>
	);
}
