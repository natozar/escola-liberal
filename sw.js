// Escola Liberal PWA — Service Worker v118
// Estratégia: Network-first (navigation + Vite bundles) + Stale-While-Revalidate (other assets) + Cache-first (fonts)
const SW_VERSION = 'v155';
const CACHE_NAME = 'escola-liberal-v155';
const STATIC_CACHE = 'escola-static-v155';
const FONT_CACHE = 'escola-fonts-v1';

// Core assets — cached on install (only stable filenames that exist in dist root)
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
  './i18n.js',
  './cookie-consent.js',
  './supabase-client.js',
  './stripe-billing.js',
  './lessons/index.json',
  './cert.html',
  './institucional.html',
  './manifest.json',
  './blog-marketing.css',
  './blog-marketing.js'
];

// Lazy-loaded: lesson data — cached on first use
const LAZY_ASSETS = ['./lessons.json', './lessons/index.json'].concat(
  Array.from({length:162},(_,i)=>'./lessons/mod-'+i+'.json')
);

// ========== INSTALL ==========
self.addEventListener('install', e => {
  console.log('[SW] Instalando', SW_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME).then(c =>
      // Cache core assets individually — don't fail entire install if one 404s
      Promise.allSettled(CORE_ASSETS.map(url =>
        c.add(url).catch(err => console.warn('[SW] Skip cache:', url, err.message))
      ))
    )
  );
  // NAO chamar self.skipWaiting() aqui!
  // SW novo deve ficar em "waiting" ate o usuario clicar "Atualizar".
  // O skipWaiting so roda quando o app envia postMessage({type:'SKIP_WAITING'}).
});

// ========== MESSAGES ==========
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING recebido, ativando nova versão');
    self.skipWaiting();
  }
  if (e.data.type === 'GET_VERSION') {
    e.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION, cache: CACHE_NAME });
  }
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

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip external APIs (never cache)
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

  // 3. Vite hashed bundles (/assets/build/app-HASH.js|css): Network-first
  //    CRITICAL: After SW update, old cache is purged. These files MUST come from network first.
  //    Hashed filenames are immutable — once cached, they never change.
  if (url.pathname.includes('/assets/build/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then(r => r || new Response('', { status: 408, statusText: 'Offline' })))
    );
    return;
  }

  // 4. All other app assets: Stale-While-Revalidate (fast + fresh)
  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(res => {
        if (res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      });
      return cached || fetchPromise;
    }).catch(() => {
      if (request.destination === 'image') {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="#1e293b" width="200" height="150"/><text fill="#64748b" x="100" y="80" text-anchor="middle" font-size="14">Offline</text></svg>', {
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      }
    })
  );
});
