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
		<div className='space-y-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3 shadow-sm dark:border-stone-700/70 dark:bg-stone-950/70'>
			<div className='block'>
				<p className='text-xs font-medium text-stone-500 dark:text-stone-400'>Ingredient</p>
				<Input
					id='ingredient-name'
					aria-label='Ingredient name'
					value={draft.name}
					onChange={(e) => onChange({ ...draft, name: e.target.value })}
					placeholder='e.g. Cherry tomatoes'
					className='mt-1'
				/>
			</div>
			<div className='grid grid-cols-[1fr,1.1fr] gap-3'>
				<div className='block'>
					<p className='text-xs font-medium text-stone-500 dark:text-stone-400'>Quantity</p>
					<Input
						id='ingredient-qty'
						aria-label='Ingredient quantity'
						value={draft.quantity}
						onChange={(e) => onChange({ ...draft, quantity: e.target.value })}
						inputMode='decimal'
						placeholder='2'
						className='mt-1'
					/>
				</div>
				<label htmlFor='ingredient-unit' className='block'>
					<span className='text-xs font-medium text-stone-500 dark:text-stone-400'>Unit</span>
					<select
						id='ingredient-unit'
						value={draft.unit}
						onChange={(e) => onChange({ ...draft, unit: e.target.value as UnitType })}
						className='mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-800 shadow-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100'>
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
			aria-hidden={!isOpen}>
			<button
				type='button'
				aria-label='Close modal'
				className='absolute inset-0 w-full bg-stone-900/30 backdrop-blur-[3px]'
				onClick={onClose}
			/>
			<div
				className={`absolute bottom-0 left-0 right-0 mx-auto w-full max-w-2xl rounded-t-[28px] border border-stone-200/70 bg-white/85 px-4 pb-8 pt-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-stone-700/70 dark:bg-stone-900/80 ${panelCls}`}>
				<div className='mb-4 flex items-center justify-between text-sm font-semibold text-sky-600'>
					<button type='button' onClick={onClose} className='transition hover:text-sky-700'>
						Cancel
					</button>
					<p className='text-base font-semibold text-stone-900 dark:text-stone-100'>
						New Ingredient
					</p>
					<button
						type='button'
						onClick={onAdd}
						disabled={!isDraftValid}
						className={`transition hover:text-sky-700 ${!isDraftValid ? 'pointer-events-none text-stone-300 dark:text-stone-600' : ''}`}>
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
