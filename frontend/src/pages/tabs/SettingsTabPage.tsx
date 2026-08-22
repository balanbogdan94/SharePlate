import { Globe, Moon, Volume2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { type Language, type Theme, useUserSettings } from '@/settings/UserSettingsContext';

type SegmentedOption<T> = { value: T; label: string };

function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
}: {
	value: T;
	options: SegmentedOption<T>[];
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex rounded-lg bg-stone-200/80 p-0.5 dark:bg-stone-700/70">
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => onChange(opt.value)}
					className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
						value === opt.value
							? 'bg-white text-stone-900 shadow-sm dark:bg-stone-500 dark:text-white'
							: 'text-stone-500 dark:text-stone-400'
					}`}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

export function SettingsTabPage() {
	const { t } = useI18n();
	const { theme, setTheme, language, setLanguage, soundEnabled, setSoundEnabled } =
		useUserSettings();
	const onOff: SegmentedOption<'on' | 'off'>[] = [
		{ value: 'on', label: t('settings.on') },
		{ value: 'off', label: t('settings.off') },
	];

	return (
		<div className="space-y-6 pb-8 pt-2">
			<h1 className="text-[2rem] font-bold tracking-tight text-stone-900 dark:text-stone-50">
				{t('settings.title')}
			</h1>

			<div className="space-y-1.5">
				<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
					{t('shell.theme')}
				</p>
				<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
					<div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-indigo-500">
							<Moon className="h-4 w-4 text-white" />
						</div>
						<span className="flex-1 text-base text-stone-900 dark:text-stone-100">
							{t('shell.theme')}
						</span>
						<SegmentedControl<Theme>
							value={theme}
							options={[
								{ value: 'light', label: t('shell.theme.light') },
								{ value: 'dark', label: t('shell.theme.dark') },
							]}
							onChange={setTheme}
						/>
					</div>
				</div>
			</div>

			<div className="space-y-1.5">
				<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
					{t('shell.language')}
				</p>
				<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
					<div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-green-500">
							<Globe className="h-4 w-4 text-white" />
						</div>
						<span className="flex-1 text-base text-stone-900 dark:text-stone-100">
							{t('shell.language')}
						</span>
						<SegmentedControl<Language>
							value={language}
							options={[
								{ value: 'en', label: t('shell.language.en') },
								{ value: 'ro', label: t('shell.language.ro') },
							]}
							onChange={setLanguage}
						/>
					</div>
				</div>
			</div>

			<div className="space-y-1.5">
				<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
					{t('settings.notifications')}
				</p>
				<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
					<div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-amber-500">
							<Volume2 className="h-4 w-4 text-white" />
						</div>
						<span className="flex-1 text-base text-stone-900 dark:text-stone-100">
							{t('settings.sound')}
						</span>
						<SegmentedControl<'on' | 'off'>
							value={soundEnabled ? 'on' : 'off'}
							options={onOff}
							onChange={(v) => setSoundEnabled(v === 'on')}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
