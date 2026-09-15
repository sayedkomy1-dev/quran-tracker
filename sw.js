/* أكاديمية الإمام — Service Worker v9.2.2 */
const CACHE_NAME = 'quran-pwa-v10.0.0';
const APP_VERSION = '10.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './v8.js',
  './v9.js',
  './v9.css',
  './v10.css',
  './v10.js',
  './manifest.json',
  './favicon.png',
  './icon-96.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
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
    const cached=await caches.match(req);
    const network=fetch(req).then(async res=>{
      if(res&&res.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,res.clone()).then(()=>trimRuntimeCache(cache)).catch(()=>{});
      }
      return res;
    }).catch(()=>null);
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
