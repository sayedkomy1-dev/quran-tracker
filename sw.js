/* أكاديمية الإمام — Service Worker v10.8.0 */
const CACHE_NAME = 'quran-pwa-v10.8.0';
const APP_VERSION = '10.8.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=10.8.0',
  './app.js?v=10.8.0',
  './v8.js?v=10.8.0',
  './v9.js?v=10.8.0',
  './js/features/mushaf-offline.js?v=10.8.0',
  './v9.css?v=10.8.0',
  './v10.css?v=10.8.0',
  './quran-engine.css?v=10.8.0',
  './v10.js?v=10.8.0',
  './js/features/guardian-communication.js?v=10.8.0',
  './js/features/student-progress.js?v=10.8.0',
  './js/features/teacher-followup.js?v=10.8.0',
  './js/features/quran-engine.js?v=10.8.0',
  './js/features/quran-structure.js?v=10.8.0',
  './js/core/runtime.js?v=10.8.0',
  './js/features/v10-data.js?v=10.8.0',
  './js/features/recitation-carry.js?v=10.8.0',
  './auth.js?v=10.8.0',
  './sync-core.js?v=10.8.0',
  './auth.css?v=10.8.0',
  './privacy.html',
  './terms.html',
  './manifest.json?v=10.8.0',
  './favicon.png',
  './icon-96.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './assets/mushaf-corner.svg',
  './assets/mushaf-title-ornament.svg',
  './assets/kfgqpc/mushaf-meta.json',
  './assets/kfgqpc/ayah-page-map.json',
  './assets/kfgqpc/mushaf604/frame.png',
  './assets/kfgqpc/mushaf604/page-001.png',
  './assets/kfgqpc/mushaf604/page-002.png',
  './assets/kfgqpc/mushaf604/page-001-dark.png',
  './assets/kfgqpc/mushaf604/page-002-dark.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Cache each shell asset independently. A transient failure for one file
    // must not prevent the new service worker from installing.
    await Promise.all(APP_SHELL.map(async url=>{
      try{await cache.add(url);}catch(err){console.warn('[SW] precache failed',url,err);}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('quran-pwa-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    if(self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(()=>{});
    await self.clients.claim();
  })());
});

async function trimRuntimeCache(cache,maxEntries=80){
  const keys=await cache.keys();
  if(keys.length<=maxEntries)return;
  await Promise.all(keys.slice(0,keys.length-maxEntries).map(k=>cache.delete(k)));
}

self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET'||!req.url.startsWith('http'))return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const preload=await event.preloadResponse;
        const res=preload||await fetch(req);
        if(res&&res.ok){const cache=await caches.open(CACHE_NAME);cache.put('./index.html',res.clone()).catch(()=>{});}
        return res;
      }catch(_){
        return (await caches.match('./index.html'))||(await caches.match('./'))||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const isCodeAsset=/\.(?:js|css)$/.test(url.pathname)||url.pathname.endsWith('/manifest.json');
    const cached=await caches.match(req);
    const network=fetch(req,{cache:'no-store'}).then(async res=>{
      if(res&&res.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,res.clone()).then(()=>trimRuntimeCache(cache)).catch(()=>{});
      }
      return res;
    }).catch(()=>null);
    // Code/config is network-first so a newly deployed reader cannot be shadowed
    // by the previous service worker cache. Other same-origin assets stay cache-first.
    if(isCodeAsset)return (await network)||cached||new Response('',{status:503,statusText:'Offline'});
    return cached||(await network)||new Response('',{status:503,statusText:'Offline'});
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=event.notification?.data?.url||'./';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    const existing=list.find(c=>'focus' in c);
    if(existing){await existing.focus();if('navigate' in existing)await existing.navigate(target).catch(()=>{});return;}
    return self.clients.openWindow(target);
  }));
});

self.addEventListener('message', event => {
  if(event.data==='SKIP_WAITING')self.skipWaiting();
  if(event.data==='GET_VERSION'&&event.ports?.[0])event.ports[0].postMessage({version:APP_VERSION,cache:CACHE_NAME});
});
