// Escola Liberal PWA — Service Worker v17
// Estratégia: Network-first (navegação) + Stale-While-Revalidate (assets) + Cache-first (fonts)
const CACHE_NAME = 'escola-liberal-v17';
const STATIC_CACHE = 'escola-static-v17';
const FONT_CACHE = 'escola-fonts-v1';

// Core assets — cached on install
const CORE_ASSETS = [
  './',
  './index.html',
  './app.html',
  './app.css',
  './app.js',
  './i18n.js',
  './cookie-consent.js',
  './supabase-client.js',
  './stripe-billing.js',
  './auth.html',
  './perfil.html',
  './offline.html',
  './termos.html',
  './privacidade.html',
  './contato.html',
  './manifest.json',
  './assets/icons/favicon.ico',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Lazy-loaded: lessons.json (345KB) — only cached on first use
const LAZY_ASSETS = ['./lessons.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  const keepCaches = ['escola-liberal-v17', 'escola-static-v17', FONT_CACHE];
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !keepCaches.includes(k)).map(k => caches.delete(k)))
    ).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase, Stripe, Analytics requests (never cache)
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('stripe') ||
      url.hostname.includes('google-analytics') ||
      url.hostname.includes('googletagmanager') ||
      url.hostname.includes('analytics.google')) return;

  // 1. Navigation: Network-first with offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // 2. Google Fonts: Cache-first (fonts rarely change)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(res => {
            if (res.status === 200) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 3. App assets: Stale-While-Revalidate (fast + fresh)
  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(res => {
        if (res.status === 200) {
          const cacheName = LAZY_ASSETS.some(a => request.url.includes(a)) ? STATIC_CACHE : CACHE_NAME;
          caches.open(cacheName).then(c => c.put(request, res.clone()));
        }
        return res;
      }).catch(() => {
        // Offline SVG fallback for images
        if (request.destination === 'image') {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="#1e293b" width="200" height="150"/><text fill="#64748b" x="100" y="80" text-anchor="middle" font-size="14">Offline</text></svg>', {
            headers: { 'Content-T