export function registerServiceWorker() {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {
			// Keep the app functional even if registration fails.
		});
	});
}
