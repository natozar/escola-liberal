// Escola Liberal PWA — Service Worker v25
// Estratégia: Network-first (navegação) + Stale-While-Revalidate (assets) + Cache-first (fonts)
const SW_VERSION = 'v63';
const CACHE_NAME = 'escola-liberal-v63';
const STATIC_CACHE = 'escola-static-v63';
const FONT_CACHE = 'escola-fonts-v1';

// Core assets — cached on install
// CORE_ASSETS: pre-cached on install.
// NOTE: Vite bundles app.js/app.css into hashed filenames (assets/build/app-HASH.js).
// Those are cached via stale-while-revalidate on first fetch, not pre-cached here.
// Only list files with STABLE names that exist in the dist root.
const CORE_ASSETS = [
  './',
  './index.html',
  './app.html',
  './auth.html',
  './perfil.html',
  './offline.html',
  './termos.html',
  './privacidade.html',
  './contato.html',
  './blog.html',
  './manifest.json',
  './i18n.js',
  './cookie-consent.js',
  './supabase-client.js',
  './stripe-billing.js',
  './assets/icons/favicon.ico',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './lessons/index.json'
];

// Lazy-loaded: lesson data — cached on first use
const LAZY_ASSETS = ['./lessons.json', './lessons/index.json'].concat(
  Array.from({length:66},(_,i)=>'./lessons/mod-'+i+'.json')
);

// ========== INSTALL ==========
self.addEventListener('install', e => {
  console.log('[SW] Instalando', SW_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS))
  );
  // FASE 1 (TEMPORARIO): skipWaiting incondicional para forcar update
  // em TODOS os dispositivos que ja tem PWA instalada.
  // FASE 2 (proximo deploy): remover esta linha e deixar user controlar via banner.
  // TODO: Remover self.skipWaiting() no proximo commit apos confirmar que todos atualizaram.
  self.skipWaiting();
});

// ========== MESSAGES ==========
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING recebido, ativando nova versão');
    self.skipWaiting();
  }
  // Respond to version check requests
  if (e.data.type === 'GET_VERSION') {
    e.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION, cache: CACHE_NAME });
  }
  // Force update check
  if (e.data.type === 'CHECK_UPDATE') {
    self.registration.update().then(() => {
      e.source.postMessage({ type: 'UPDATE_CHECKED', version: SW_VERSION });
    }).catch(() => {
      e.source.postMessage({ type: 'UPDATE_CHECK_FAILED' });
    });
  }
});

// ========== ACTIVATE ==========
self.addEventListener('activate', e => {
  console.log('[SW] Ativando', SW_VERSION);
  const keepCaches = [CACHE_NAME, STATIC_CACHE, FONT_CACHE];
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !keepCaches.includes(k)).map(k => {
        console.log('[SW] Removendo cache antigo:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      // Notify all open tabs that SW was updated
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'SW_UPDATED',
          version: SW_VERSION,
          cache: CACHE_NAME
        }));
      });
    })
  );
  self.clients.claim();
});

// ========== FETCH ==========
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase, Stripe, Google Auth, Analytics requests (never cache)
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('stripe') ||
      url.hostname.includes('accounts.google') ||
      url.hostname.includes('googleapis.com/oauth') ||
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
        .catch(() => caches.match(request).then(r => r || caches.match('./offline.html').then(o => o || new Response('<h1>Offline</h1>', {headers:{'Content-Type':'text/html'}}))))
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
        // Offline fallback
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="#1e293b" width="200" height="150"/><text fill="#64748b" x="100" y="80" text-anchor="middle" font-size="14">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        // Must return Response, not undefined (iOS Safari requirement)
        return new Response('', { status: 408, statusText: 'Offline' });
      });
      // cached can be undefined on iOS — must always resolve to Response
      if (cached) return cached;
      return fetchPromise.then(r => r || new Response('', { status: 408 }));
    })
  );
});
