/* ═══════════════════════════════════════════════
   بالقرآن نحيا — Service Worker v5
   HTML  → Network-First  (دايماً أحدث نسخة)
   Assets → Cache-First   (سريع + أوفلاين)
═══════════════════════════════════════════════ */

const CACHE_NAME = 'quran-pwa-v5';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-96.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js'
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // الملفات المحلية أولاً (لازم تنجح)
      await cache.addAll(['./index.html','./manifest.json','./icon-96.png','./icon-192.png','./icon-512.png','./icon-maskable.png']);
      // CDN — best-effort
      await Promise.allSettled(
        ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
         'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js',
         'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js',
         'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js',
         'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js']
        .map(url => fetch(url,{mode:'cors',credentials:'omit'})
          .then(r=>{ if(r.ok) return cache.put(url,r); }).catch(()=>{}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // ① HTML — Network-First: دايماً احدث نسخة، fallback للكاش لو أوفلاين
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ② CDN & Assets — Cache-First: سريع + يشتغل أوفلاين
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => null);
    })
  );
});

// ── NOTIFICATIONS ────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});

// ── MESSAGE ──────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
