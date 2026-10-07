import { Input } from '@/components/ui/input';
import type { Unit, UnitType } from '@/pages/tabs/home/types';

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
			<div className="grid grid-cols-[1fr_1.1fr] gap-3">
				<div className="block">
					<p className="text-xs font-medium text-stone-500 dark:text-sp-text-tertiary">Quantity</p>
					<Input
						id="ingredient-qty"
						aria-label="Ingredient quantity"
						value={draft.quantity}
						onChange={(e) => onChange({ ...draft, quantity: e.target.value })}
						inputMode="decimal"
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
						onChange={(e) => onChange({ ...draft, unit: e.target.value as UnitType })}
						className="mt-1 h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-stone-800 shadow-xs dark:border-sp-border dark:bg-sp-surface dark:text-sp-text-primary"
					>
						{units?.map((unit) => (
							<option key={unit.id} value={unit.id}>
								{unit.name}
							</option>
						)) ?? <option value={defaultUnit}>{defaultUnit}</option>}
					</select>
				</label>
			</div>
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
