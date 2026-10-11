/* أكاديمية الإمام — Service Worker v11.2.0 Interactive Error Marking Stage 1 + Stable Offline Shell */
const CACHE_NAME = 'quran-pwa-v11.2.0-error1';
const APP_VERSION = '11.2.0';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=11.0.0',
  './v11.css?v=11.0.0-s2',
  './app.js?v=11.0.0',
  './v8.js?v=11.0.0',
  './v9.js?v=11.0.0',
  './js/features/mushaf-offline.js?v=11.0.0',
  './v9.css?v=11.0.0',
  './v10.css?v=11.0.0',
  './quran-engine.css?v=11.0.0',
  './teacher-error-marking.css?v=11.2.0-s1',
  './v10.js?v=11.0.0',
  './js/features/teacher-error-marking.js?v=11.2.0-s1',
  './js/features/guardian-communication.js?v=11.0.0',
  './js/features/student-progress.js?v=11.0.0',
  './js/features/teacher-followup.js?v=11.0.0',
  './js/features/circle-analytics.js?v=11.0.0',
  './js/features/guardian-portal-share.js?v=11.1.0',
  './js/features/v11-ui.js?v=11.0.0-s2',
  './guardian-portal.html',
  './guardian-portal.css?v=11.1.0',
  './guardian-tahfeez.css?v=11.2.0-s1',
  './js/features/guardian-tahfeez.js?v=11.2.0-s1',
  './js/features/guardian-portal-view.js?v=11.1.0',
  './guardian-login.html',
  './guardian-login.css?v=11.0.0',
  './guardian-login.js?v=11.0.0',
  './js/features/quran-engine.js?v=11.0.0',
  './js/features/quran-structure.js?v=11.0.0',
  './js/core/runtime.js?v=11.2.0',
  './js/core/offline-bootstrap.js?v=11.0.0',
  './js/core/mobile-navigation.js?v=11.0.0',
  './js/features/v10-data.js?v=11.0.0',
  './js/features/recitation-carry.js?v=11.0.0',
  './auth.js?v=11.0.0',
  './sync-core.js?v=11.0.0',
  './auth.css?v=11.0.0',
  './privacy.html',
  './terms.html',
  './manifest.json?v=11.0.0',
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

// If any of these are unavailable, activating the new worker would make the
// installed PWA unusable offline. Keep the previous worker active instead.
const CORE_SHELL = [
  './index.html',
  './styles.css?v=11.0.0',
  './v11.css?v=11.0.0-s2',
  './teacher-error-marking.css?v=11.2.0-s1',
  './js/features/v11-ui.js?v=11.0.0-s2',
  './js/features/teacher-error-marking.js?v=11.2.0-s1',
  './app.js?v=11.0.0',
  './auth.js?v=11.0.0',
  './js/core/runtime.js?v=11.2.0',
  './js/core/offline-bootstrap.js?v=11.0.0'
];

function absolute(url){return new URL(url,self.location.href).href;}
function canonicalRequest(input){
  const u=new URL(typeof input==='string'?absolute(input):input.url);
  u.search='';u.hash='';
  return new Request(u.href,{credentials:'same-origin'});
}

async function fetchWithTimeout(request,ms=1400,options={}){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),ms);
  try{return await fetch(request,{...options,signal:ctrl.signal});}
  finally{clearTimeout(timer);}
}
async function oldCached(request){
  try{
    return (await caches.match(request))||(await caches.match(request,{ignoreSearch:true}))||null;
  }catch(_){return null;}
}
async function matchLocalAsset(cache,request){
  try{
    return (await cache.match(request))
      ||(await cache.match(request,{ignoreSearch:true}))
      ||(await cache.match(canonicalRequest(request)))
      ||(await caches.match(request))
      ||(await caches.match(request,{ignoreSearch:true}))
      ||(await caches.match(canonicalRequest(request)))
      ||null;
  }catch(_){return null;}
}
async function cacheSameOrigin(cache,url){
  const request=new Request(absolute(url),{cache:'reload',credentials:'same-origin'});
  try{
    const response=await fetchWithTimeout(request,3500);
    if(response&&response.ok){
      await cache.put(request,response.clone());
      // Also keep a queryless alias. It makes the offline shell resilient when
      // an older HTML document asks for the same CSS/JS with a different cache-buster.
      await cache.put(canonicalRequest(request),response.clone());
      return true;
    }
  }catch(_){ }
  const previous=await oldCached(request);
  if(previous){
    await cache.put(request,previous.clone());
    await cache.put(canonicalRequest(request),previous.clone());
    return true;
  }
  console.warn('[SW] shell asset unavailable',url);
  return false;
}
async function cacheExternal(cache,url){
  const request=new Request(url,{mode:'no-cors',credentials:'omit',cache:'no-store'});
  try{
    const response=await fetchWithTimeout(request,2500);
    if(response&&(response.ok||response.type==='opaque')){await cache.put(request,response.clone());return true;}
  }catch(_){ }
  const previous=await oldCached(request);
  if(previous){await cache.put(request,previous.clone());return true;}
  console.warn('[SW] optional external asset unavailable',url);
  return false;
}

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const results=await Promise.all(APP_SHELL.map(url=>cacheSameOrigin(cache,url)));
    // The Supabase browser client is optional for trusted offline startup, but
    // caching it removes the last CDN dependency on normal offline launches.
    await cacheExternal(cache,SUPABASE_CDN);
    for(const url of CORE_SHELL){
      const hit=await cache.match(absolute(url));
      if(!hit)throw new Error(`[SW] refusing incomplete offline shell: ${url}`);
    }
    if(!results.some(Boolean))throw new Error('[SW] no app shell assets available');
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    // Delete old app caches only after Stage 5 has installed a complete core shell.
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('quran-pwa-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable().catch(()=>{});
    await self.clients.claim();
  })());
});

async function trimRuntimeCache(cache,maxEntries=110){
  const keys=await cache.keys();
  if(keys.length<=maxEntries)return;
  await Promise.all(keys.slice(0,keys.length-maxEntries).map(k=>cache.delete(k)));
}

async function refreshSameOrigin(cache,req){
  try{
    const res=await fetchWithTimeout(req,1800,{cache:'no-store'});
    if(res&&res.ok){
      await cache.put(req,res.clone());
      await cache.put(canonicalRequest(req),res.clone());
      await trimRuntimeCache(cache);
      return true;
    }
  }catch(_){ }
  return false;
}

async function cacheFirstSameOrigin(req){
  const cache=await caches.open(CACHE_NAME);
  const cached=await matchLocalAsset(cache,req);
  if(cached)return cached;
  try{
    const res=await fetchWithTimeout(req,2200,{cache:'no-store'});
    if(res&&res.ok){
      cache.put(req,res.clone()).catch(()=>{});
      cache.put(canonicalRequest(req),res.clone()).then(()=>trimRuntimeCache(cache)).catch(()=>{});
      return res;
    }
  }catch(_){ }
  return new Response('',{status:503,statusText:'Offline'});
}

async function externalSupabase(req){
  const cache=await caches.open(CACHE_NAME);
  const cached=(await cache.match(req))||(await cache.match(SUPABASE_CDN));
  if(cached)return cached;
  try{
    const res=await fetchWithTimeout(req,2200);
    if(res&&(res.ok||res.type==='opaque')){cache.put(req,res.clone()).catch(()=>{});return res;}
  }catch(_){ }
  return new Response('',{status:503,statusText:'Offline'});
}

self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET'||!req.url.startsWith('http'))return;
  const url=new URL(req.url);

  // The only third-party runtime required by the teacher shell is Supabase JS.
  // Cache it explicitly so a controlled PWA does not depend on jsDelivr offline.
  if(url.href===SUPABASE_CDN||(
    url.hostname==='cdn.jsdelivr.net'&&
    url.pathname.includes('/@supabase/supabase-js@2')
  )){
    event.respondWith(externalSupabase(req));
    return;
  }

  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const portalNav=url.pathname.endsWith('/guardian-portal.html');
      const guardianLoginNav=url.pathname.endsWith('/guardian-login.html');
      const fallback=portalNav?'./guardian-portal.html':guardianLoginNav?'./guardian-login.html':'./index.html';
      const cached=(await matchLocalAsset(cache,req))
        ||(await matchLocalAsset(cache,new Request(absolute(fallback),{credentials:'same-origin'})))
        ||(await matchLocalAsset(cache,new Request(absolute('./index.html'),{credentials:'same-origin'})));
      if(cached){
        event.waitUntil((async()=>{
          try{
            const res=await fetchWithTimeout(req,1800,{cache:'no-store'});
            if(res&&res.ok){
              await cache.put(absolute(fallback),res.clone());
              await cache.put(canonicalRequest(req),res.clone()).catch(()=>{});
            }
          }catch(_){ }
        })());
        return cached;
      }
      try{
        const preload=await Promise.race([event.preloadResponse,new Promise(r=>setTimeout(()=>r(null),700))]);
        const res=preload||await fetchWithTimeout(req,2200,{cache:'no-store'});
        if(res&&res.ok){cache.put(absolute(fallback),res.clone()).catch(()=>{});return res;}
      }catch(_){ }
      return new Response('Offline',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }

  const isCodeAsset=/\.(?:js|css)$/.test(url.pathname)||url.pathname.endsWith('/manifest.json');
  if(isCodeAsset){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await matchLocalAsset(cache,req);
      if(cached){event.waitUntil(refreshSameOrigin(cache,req));return cached;}
      return cacheFirstSameOrigin(req);
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await matchLocalAsset(cache,req);
    if(cached)return cached;
    try{
      const res=await fetch(req);
      if(res&&res.ok){cache.put(req,res.clone()).then(()=>trimRuntimeCache(cache)).catch(()=>{});return res;}
    }catch(_){ }
    return new Response('',{status:503,statusText:'Offline'});
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
  if(event.data==='GET_VERSION'&&event.ports?.[0])event.ports[0].postMessage({version:APP_VERSION,cache:CACHE_NAME,offlineStage:'5.5',uiStage:'11.2-error-marking-1'});
});
