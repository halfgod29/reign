// Service worker for the installed app. The build (scripts/pwa.ts) fills in the version and the
// list of built files. Everything on that list is stored on install and served from the cache, so
// after the first visit the game opens without downloading its 5 MB again. The page itself is
// asked for online first, so a new build shows up on the next launch.
// /api, /ws and anything not on the list go straight to the network.

const VERSION = __REIGN_VERSION__;
const FILES = __REIGN_FILES__;
const CACHE = `reign-${VERSION}`;
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

// No skipWaiting: an open game keeps the version it started with, and the new one takes over
// once every window is closed. Old versions are dropped then.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k.startsWith('reign-') && k !== CACHE).map((k) => caches.delete(k))
				)
			)
	);
});

const known = new Set(FILES);

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return;

	if (req.mode === 'navigate') {
		event.respondWith(fetch(req).catch(() => caches.match(SHELL)));
		return;
	}
	if (!known.has(url.pathname)) return;
	event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(req)));
});
