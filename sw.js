/* بالقرآن نحيا — Service Worker v6.2 */
const CACHE_NAME = 'quran-pwa-v6.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon.png',
  './icon-96.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('quran-pwa-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => null);
        return cached || network.then(res => res || new Response('', {status: 503, statusText: 'Offline'}));
      })
    );
    return;
  }

  // Runtime cache for any external resource referenced in future versions.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => new Response('', {status: 503, statusText: 'Offline'})))
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      const existing = list.find(c => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow('./');
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
