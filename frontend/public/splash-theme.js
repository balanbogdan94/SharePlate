// Applies the saved theme before first paint so the splash never flashes the wrong colors.
(function () {
	var theme = null;
	try {
		var stored = JSON.parse(window.localStorage.getItem('shareplate.user.settings') || '{}');
		if (stored.theme === 'dark' || stored.theme === 'light') theme = stored.theme;
	} catch (error) {
		theme = null;
	}
	if (!theme) {
		theme =
			window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';
	}
	var isDark = theme === 'dark';
	document.documentElement.classList.toggle('dark', isDark);
	var meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', isDark ? '#0b0b0c' : '#fafaf9');
})();
