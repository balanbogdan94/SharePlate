import { useMemo, useState } from 'react';

const STORAGE_KEY = 'shareplate.ios-install-dismissed-at';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14;

function isIosDevice(userAgent: string): boolean {
	const iosByAgent = /iphone|ipad|ipod/i.test(userAgent);
	const iosByTouchMac =
		navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
	return iosByAgent || iosByTouchMac;
}

function isSafari(userAgent: string): boolean {
	return (
		/safari/i.test(userAgent) &&
		!/crios|fxios|edgios|opios|mercury/i.test(userAgent)
	);
}

function isStandaloneMode(): boolean {
	const nav = window.navigator as Navigator & { standalone?: boolean };
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		nav.standalone === true
	);
}

export function IosInstallPrompt() {
	const [dismissed, setDismissed] = useState(() => {
		const value = window.localStorage.getItem(STORAGE_KEY);
		if (!value) {
			return false;
		}

		const dismissedAt = Number(value);
		return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_MS;
	});

	const shouldShow = useMemo(() => {
		if (dismissed) {
			return false;
		}

		const userAgent = navigator.userAgent;
		return isIosDevice(userAgent) && isSafari(userAgent) && !isStandaloneMode();
	}, [dismissed]);

	if (!shouldShow) {
		return null;
	}

	const onDismiss = () => {
		window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
		setDismissed(true);
	};

	return (
		<div className='safe-bottom fixed bottom-[5.25rem] left-1/2 z-30 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-stone-700 dark:bg-stone-900/95'>
			<p className='text-sm font-semibold text-stone-900 dark:text-stone-100'>
				Install SharePlate
			</p>
			<p className='mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300'>
				Open Safari menu, tap <strong>Add to Home Screen</strong>, then launch it
				 like a native app.
			</p>
			<button
				type='button'
				onClick={onDismiss}
				className='mt-3 min-h-10 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900'>
				Not now
			</button>
		</div>
	);
}
