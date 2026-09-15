const VERSION='v10.1.0-clean';
const CACHE=`imam-academy-${VERSION}`;
const SHELL=[
  './','./index.html','./manifest.webmanifest','./assets/css/tokens.css','./assets/css/app.css',
  './assets/js/main.js','./assets/js/core/utils.js','./assets/js/core/db.js','./assets/js/core/store.js','./assets/js/core/router.js','./assets/js/core/pwa.js',
  './assets/js/data/quran-meta.js',
  './assets/js/features/home.js','./assets/js/features/students.js','./assets/js/features/attendance.js','./assets/js/features/session.js','./assets/js/features/quran.js','./assets/js/features/mushaf.js','./assets/js/features/reports.js','./assets/js/features/library.js','./assets/js/features/profile.js','./assets/js/features/tasks.js','./assets/js/features/security.js','./assets/js/features/health.js','./assets/js/features/groups.js','./assets/js/features/onboarding.js','./assets/js/features/settings.js','./assets/js/features/more.js',
  './assets/icons/academy-badge.png','./assets/icons/icon-96.png','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/icon-maskable.png','./assets/icons/favicon.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('imam-academy-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));return}e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));return res}).catch(()=>new Response('Offline',{status:503,statusText:'Offline'}))))});
