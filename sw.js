const CACHE_NAME = 'iran-tracker-v8';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/config.js',
    './js/data.js',
    './js/map.js',
    './js/feed.js',
    './js/app.js',
    './manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Install — cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — serve API calls network-only, static assets network-first with cache fallback
self.addEventListener('fetch', event => {
    // Skip non-GET
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // NEVER cache API / data requests — always go to network
    const isAPI = url.includes('api.gdeltproject.org')
        || url.includes('allorigins.win')
        || url.includes('feeds.bbci.co.uk')
        || url.includes('aljazeera.com/xml')
        || url.includes('theguardian.com')
        || url.includes('france24.com');

    if (isAPI) {
        // Network only — no caching at all for live data
        event.respondWith(
            fetch(event.request).catch(() => new Response('{}', {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }))
        );
        return;
    }

    // Static assets: network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
