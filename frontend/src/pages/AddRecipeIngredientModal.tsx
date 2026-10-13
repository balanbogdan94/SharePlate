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
	defaultUnit: UnitType;
	onChange: (draft: IngredientDraft) => void;
};

function IngredientFields({ draft, units, defaultUnit, onChange }: IngredientFieldsProps) {
	const { language, t } = useI18n();
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
				<p className="text-xs font-medium text-stone-500 dark:text-sp-text-tertiary">Ingredient</p>
				<Input
					id="ingredient-name"
					aria-label="Ingredient name"
					value={draft.name}
					onChange={(e) => onChange({ ...draft, name: e.target.value })}
					placeholder="e.g. Cherry tomatoes"
					className="mt-1 h-11 rounded-xl bg-white dark:bg-sp-surface"
				/>
			</div>
			<div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-[minmax(5rem,0.65fr)_minmax(0,1.65fr)]">
				<div className="block">
					<p className="text-xs font-medium text-stone-500 dark:text-sp-text-tertiary">Quantity</p>
					<Input
						id="ingredient-qty"
						aria-label="Ingredient quantity"
						value={draft.quantity}
						onChange={(e) => onChange({ ...draft, quantity: e.target.value })}
						inputMode="decimal"
						aria-invalid={invalidQuantity}
						aria-describedby="ingredient-quantity-help"
						placeholder="2"
						className="mt-1 h-11 rounded-xl bg-white dark:bg-sp-surface"
					/>
				</div>
				<label htmlFor="ingredient-unit" className="block">
					<span className="block text-xs font-medium text-stone-500 dark:text-sp-text-tertiary">
						Unit
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
							<option value={defaultUnit}>{getUnitOptionLabel(defaultUnit, language)}</option>
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

type ModalProps = {
	isOpen: boolean;
	draft: IngredientDraft;
	units: Unit[] | undefined;
	defaultUnit: UnitType;
	isDraftValid: boolean;
	onClose: () => void;
	onAdd: () => void;
	onChange: (draft: IngredientDraft) => void;
};

export function AddRecipeIngredientModal({
	isOpen,
	draft,
	units,
	defaultUnit,
	isDraftValid,
	onClose,
	onAdd,
	onChange,
}: ModalProps) {
	const containerCls = isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0';
	const panelCls = isOpen ? 'translate-y-0' : 'translate-y-8';
	return (
		<div
			className={`fixed inset-0 z-40 transition-all duration-300 ${containerCls}`}
			aria-hidden={!isOpen}
		>
			<button
				type="button"
				aria-label="Close modal"
				className="absolute inset-0 w-full bg-stone-900/30 backdrop-blur-[3px]"
				onClick={onClose}
			/>
			<div
				className={`absolute bottom-0 left-0 right-0 mx-auto w-full max-w-2xl rounded-t-[28px] border border-stone-200/70 bg-white/85 px-4 pb-8 pt-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-sp-border dark:bg-black/70 ${panelCls}`}
			>
				<div className="relative mb-4 grid grid-cols-3 items-center text-sm font-semibold">
					<button
						type="button"
						onClick={onClose}
						className="justify-self-start text-stone-500 transition hover:text-stone-700 dark:text-sp-text-secondary dark:hover:text-sp-text-primary"
					>
						Cancel
					</button>
					<p className="justify-self-center text-base font-semibold text-stone-900 dark:text-sp-text-primary">
						New Ingredient
					</p>
					<button
						type="button"
						onClick={onAdd}
						disabled={!isDraftValid}
						className={`justify-self-end font-bold transition ${isDraftValid ? 'text-green-600 hover:text-green-700 dark:text-sp-primary dark:hover:text-sp-primary-hover' : 'pointer-events-none text-stone-400 dark:text-sp-text-disabled'}`}
					>
						Add
					</button>
				</div>
				<IngredientFields
					draft={draft}
					units={units}
					defaultUnit={defaultUnit}
					onChange={onChange}
				/>
			</div>
		</div>
	);
}
