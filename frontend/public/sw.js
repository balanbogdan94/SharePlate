const STATIC_CACHE = 'shareplate-static-v1';
const RUNTIME_CACHE = 'shareplate-runtime-v1';

const APP_SHELL = [
	'/',
	'/index.html',
	'/manifest.webmanifest',
	'/offline.html',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/icons/icon-maskable-512.png',
	'/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') {
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(request);
					return cached || caches.match('/offline.html');
				}),
		);
		return;
	}

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) {
		return;
	}

	if (
		!['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)
	) {
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			const fetched = fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() => cached);

			return cached || fetched;
		}),
	);
});
