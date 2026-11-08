export function registerServiceWorker() {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/sw.js')
			.catch((error: unknown) => reportFailure(error, 'pwa.registration.failed', true));
	});
}
import { reportFailure } from '@/lib/telemetry';
