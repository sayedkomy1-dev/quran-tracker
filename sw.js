/* ═══════════════════════════════════════════
   Service Worker — بالقرآن نحيا
   v2 — يدعم الوضع الأوفلاين الكامل
═══════════════════════════════════════════ */

const CACHE = 'quran-pwa-v2';

// ملفات محلية — لازم تتكاش
const LOCAL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// مكتبات CDN — نكاشها عشان تشتغل أوفلاين
const CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// ══ INSTALL: كاش كل الملفات ══
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // كاش الملفات المحلية أولاً (لازم تنجح)
      await cache.addAll(LOCAL_FILES);

      // كاش CDN (best-effort — لو فشل مش مشكلة)
      await Promise.allSettled(
        CDN_FILES.map(url =>
          fetch(url, { mode: 'cors', credentials: 'omit' })
            .then(res => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {}) // صامت لو فشل الفيتش
        )
      );
    })
  );
  self.skipWaiting();
});

// ══ ACTIVATE: امسح الكاش القديم ══
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ══ FETCH: الاستراتيجية ══
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // للـ CDN: cache-first (لو موجود في الكاش استخدمه، غير كده اجيبه وكاشه)
  if (CDN_FILES.some(cdn => url.startsWith(cdn.split('/').slice(0, 3).join('/')))) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request, { mode: 'cors', credentials: 'omit' })
          .then(res => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // للملفات المحلية: network-first مع fallback للكاش
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // لو نجح — حدّث الكاش وارجع النتيجة
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // لو فشل النت — ارجع من الكاش
        caches.match(e.request).then(cached =>
          cached || caches.match('./index.html')
        )
      )
  );
});

// ══ MESSAGE: تحديث يدوي ══
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
