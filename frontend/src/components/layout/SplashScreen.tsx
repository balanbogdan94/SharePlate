import { useI18n } from '@/i18n/I18nContext';

export function SplashScreen() {
	const { t } = useI18n();
	const brand = t('app.brand');

	return (
		<main className="sp-splash" role="status" aria-busy="true" aria-label={brand}>
			<div className="sp-splash__bg" aria-hidden="true">
				<div className="sp-splash__blob sp-splash__blob--green" />
				<div className="sp-splash__blob sp-splash__blob--sky" />
				<div className="sp-splash__blob sp-splash__blob--emerald" />
			</div>
			<div className="sp-splash__logo">
				<img src="/icons/icon-512.png" alt="" />
			</div>
			<p className="sp-splash__brand">{brand}</p>
		</main>
	);
}
