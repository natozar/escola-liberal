// Incrementar versão sempre que os assets mudarem para forçar atualização do cache
const CACHE_NAME = 'escola-liberal-v8';
const ASSETS = [
  './',
  './index.html',
  './app.html',
  './app.css',
  './app.js',
  './i18n.js',
  './lessons.json',
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
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@400&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
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
  e.respondWith(
    caches.match(request).then(r => {
      if (r) return r;
      return fetch(request).then(res => {
        if (res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      });
    }).catch(() => {
      if (request.destination === 'image') {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="#1e293b" width="200" height="150"/><text fill="#64748b" x="100" y="80" text-anchor="middle" font-size="14">Offline</text></svg>', {
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      }
    })
  );
});