import { useI18n } from '@/i18n/I18nContext';

export function SecondTabPage() {
	const { t } = useI18n();

	return (
		<section className='flex h-full items-center justify-center rounded-2xl border border-stone-200/70 bg-white/40 dark:border-stone-700/70 dark:bg-stone-900/40'>
			<p className='text-sm font-medium text-stone-600 dark:text-stone-300'>
				{t('tabs.secondDummy')}
			</p>
		</section>
	);
}
