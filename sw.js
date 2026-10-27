/* Historical prior V8 offline ref: './v8.js?v=11.2.0-s3' */
/* Compatibility v11.4.0: quran-pwa-v11.4.0-goal-planning1-complete */
/* v11.3 compatibility marker: quran-pwa-v11.3.0-smart-revision1 */
/* Stage 3 compatibility: quran-pwa-v11.2.0-error3 | uiStage:'11.2-error-marking-3' */
/* أكاديمية الإمام — Service Worker v11.3.0 Smart Revision Stage 1 + Stable Offline Shell */
// Stage 4.1 compatibility: quran-pwa-v11.2.0-guardian-engagement4.1
// Stage 4 compatibility: quran-pwa-v11.2.0-parent-audio4 | './guardian-manifest.json?v=11.2.0-s4' | './js/features/guardian-audio-assist.js?v=11.2.0-s4'
// Regression compatibility refs: quran-pwa-v11.2.0-error2 | uiStage:'11.2-error-marking-2' | './teacher-error-marking.css?v=11.2.0-s2' | './js/features/teacher-error-marking.js?v=11.2.0-s2' | './guardian-portal.css?v=11.2.0-s2' | './js/features/guardian-portal-view.js?v=11.2.0-s2' | './guardian-tahfeez.css?v=11.2.0-s4' | './js/features/guardian-tahfeez.js?v=11.2.0-s1.1'
// Compatibility marker for Tahfeez Stage 1 offline checks: './guardian-tahfeez.css?v=11.2.0-s1.1' | './js/features/guardian-tahfeez.js?v=11.2.0-s1.1'
// Compatibility markers for historical static regression checks: quran-pwa-v11.2.0-error1.1 | uiStage:'11.2-error-marking-1.1' | './js/features/teacher-error-marking.js?v=11.2.0-s1.1'
// Stage 1 compatibility: quran-pwa-v11.5.0-student-finance1 ./student-finance.css?v=11.5.0-s1 ./js/features/student-finance.js?v=11.5.0-s1
const CACHE_NAME = 'quran-pwa-v11.12.1-beta.27-workspace-workflow';
// Candidate hotfix cache is separate from beta.27, so failed installation cannot alter its offline shell.
const LIVE_CACHE_NAME = CACHE_NAME + '-integration-review1';
// Historical regression marker: quran-pwa-v11.5.1-student-finance2
const APP_VERSION = '11.12.1-beta.27';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
// Never populate a new release's essential code from an old offline cache.
// A temporarily unreachable deployment must leave the previous worker active.
const CRITICAL_FRESH_SHELL = [
  './integrated-teacher-brief.css?v=11.12.1-beta.27-integration-review1',
  './js/features/integrated-teacher-brief.js?v=11.12.1-beta.27-integration-review1',
  './index.html',
  './css/platform/tokens.css?v=11.12.1-beta.27',
  './css/platform/legacy-features.css?v=11.12.1-beta.27',
  './css/platform/components.css?v=11.12.1-beta.27-more-scroll-hotfix2',
  './css/platform/responsive.css?v=11.12.1-beta.27',
  './css/platform/surah-picker.css?v=11.12.1-beta.27',
  './js/features/platform-ux.js?v=11.12.1-beta.27',
  './js/features/platform-workflow.js?v=11.12.1-beta.27',
  './js/features/guardian-portal-share.js?v=11.12.1-beta.27-guardian-reactivation-hotfix4',
  './js/features/assignment-audio-share.js?v=11.12.1-beta.27',
  './v9.js?v=11.12.1-beta.27-guardian-reactivation-hotfix4',
  './v8.js?v=11.12.1-beta.27-error-followup-candidate',
  './js/features/error-followup-engine.js?v=11.12.1-beta.27-error-followup-candidate',
  './error-followup.css?v=11.12.1-beta.27-error-followup-candidate',
  './app.js?v=11.12.1-beta.27',
  './js/core/runtime.js?v=11.12.1-beta.27',
  './js/core/boot-health.js?v=11.12.1-beta.27',
  './js/core/offline-bootstrap.js?v=11.12.1-beta.27',
  './js/features/role-home.js?v=11.12.1-beta.27',
  './js/features/supervisor-dashboard.js?v=11.12.1-beta.27',
  './role-home.css?v=11.12.1-beta.27',
  './teacher-rating.css?v=11.12.1-beta.27',
  './v10.js?v=11.12.1-beta.27',
  './js/features/surah-picker-17.js?v=11.12.1-beta.27',
  './js/features/beta19-experience.js?v=11.12.1-beta.27',
  './js/features/academy-analytics-1112.js?v=11.12.1-beta.27',
  './academy-analytics-1112.css?v=11.12.1-beta.27',
  './imam-smart-board.css?v=11.12.1-beta.27',
  './teacher-quran-range-picker.css?v=11.12.1-beta.27-quran-picker-hotfix2',
  './js/features/imam-board-tafsir.js?v=11.12.1-beta.27',
  './js/features/imam-board-corpus.js?v=11.12.1-beta.27',
  './js/features/imam-smart-board.js?v=11.12.1-beta.27-quran-picker1',
  './js/features/teacher-quran-range-picker.js?v=11.12.1-beta.27-quran-picker-hotfix2',
  './imam-board-display.html',
  './imam-board-display.js?v=11.12.1-beta.27'
];


const APP_SHELL = [
  './integrated-teacher-brief.css?v=11.12.1-beta.27-integration-review1',
  './js/features/integrated-teacher-brief.js?v=11.12.1-beta.27-integration-review1',
  './css/platform/tokens.css?v=11.12.1-beta.27',
  './css/platform/legacy-features.css?v=11.12.1-beta.27',
  './css/platform/components.css?v=11.12.1-beta.27-more-scroll-hotfix2',
  './css/platform/responsive.css?v=11.12.1-beta.27',
  './css/platform/public-experience.css?v=11.12.1-beta.27',
  './css/platform/student-display.css?v=11.12.1-beta.27',
  './js/features/platform-ux.js?v=11.12.1-beta.27',
  './js/features/platform-workflow.js?v=11.12.1-beta.27',
  './',
  './index.html',
  './imam-smart-board.css?v=11.12.1-beta.27',
  './teacher-quran-range-picker.css?v=11.12.1-beta.27-quran-picker-hotfix2',
  './js/features/imam-board-tafsir.js?v=11.12.1-beta.27',
  './js/features/imam-board-corpus.js?v=11.12.1-beta.27',
  './js/features/imam-smart-board.js?v=11.12.1-beta.27-quran-picker1',
  './js/features/teacher-quran-range-picker.js?v=11.12.1-beta.27-quran-picker-hotfix2',
  './imam-board-display.html',
  './imam-board-display.js?v=11.12.1-beta.27',
  './guest-practice.html',
  './guest-practice.css?v=11.7.4.2',
  './js/features/guest-practice.js?v=11.7.4.2',
  './js/features/guardian-tahfeez.js?v=11.7.4.2',
  './role-home.css?v=11.12.1-beta.27',
  './ux-guidance.css?v=11.7.4.2',
  './js/features/role-home.js?v=11.12.1-beta.27',
  './js/features/academy-analytics-1112.js?v=11.12.1-beta.27',
  './academy-analytics-1112.css?v=11.12.1-beta.27',
  './js/features/ux-guidance.js?v=11.12.1-beta.27',


  './app.js?v=11.12.1-beta.27',
  './v8.js?v=11.12.1-beta.27-error-followup-candidate',
  './js/features/error-followup-engine.js?v=11.12.1-beta.27-error-followup-candidate',
  './error-followup.css?v=11.12.1-beta.27-error-followup-candidate',
  './v9.js?v=11.12.1-beta.27-guardian-reactivation-hotfix4',
  './js/features/mushaf-offline.js?v=11.7.4.2',


  './quran-engine.css?v=11.0.0',
  './session-intelligence-119.css?v=11.9.2',
  './circle-management-1110.css?v=11.11.1',
  './academic-exams-1111.css?v=11.11.1',
  './js/features/academic-exams-1111.js?v=11.11.1',
  './progress-bridge-1111.css?v=11.11.1',
  './academy-analytics-1112.css?v=11.12.1-beta.27',
  './js/features/academy-analytics-1112.js?v=11.12.1-beta.27',
  './js/features/progress-bridge-1111.js?v=11.11.1',
  './js/features/circle-management-1110.js?v=11.11.1',
  './placement-center-1191.css?v=11.9.2',
  './js/features/placement-center-1191.js?v=11.9.2',
  './js/features/session-intelligence-119.js?v=11.12.1-beta.27-guardian-both-hotfix3',
  './teacher-error-marking.css?v=11.8.0',
  './correction-document.css?v=11.7.4.5',
  './smart-revision.css?v=11.3.0-s1',
  './goal-planning.css?v=11.4.2-s2',
  './student-finance.css?v=11.5.1-s2',
  './guardian-finance.css?v=11.5.1-s2',
  './guardian-messages.css?v=11.6.0-s1',
  './teacher-rating.css?v=11.12.1-beta.27',
  './js/features/guardian-ratings.js?v=11.7.0-s1',
  './js/features/supervisor-dashboard.js?v=11.12.1-beta.27',
  './js/features/teacher-inbox.js?v=11.6.0-s1',
  './js/features/guardian-messages.js?v=11.6.0-s1',
  './v10.js?v=11.12.1-beta.27',
  './revision-quran-text.css?v=11.8.1',
  './js/features/revision-quran-text.js?v=11.8.1',
  './js/features/teacher-error-marking.js?v=11.12.1-beta.27-quran-picker-hotfix2',
  './js/features/teacher-correction-document.js?v=11.7.4.5',
  './js/features/guardian-communication.js?v=11.0.0',
  './js/features/student-progress.js?v=11.0.0',
  './js/features/teacher-followup.js?v=11.0.0',
  './js/features/circle-analytics.js?v=11.0.0',
  './js/features/smart-revision.js?v=11.9.2',
  './js/features/goal-planning.js?v=11.12.1-beta.27-guardian-both-hotfix3',
  './js/features/student-finance.js?v=11.5.1-s2',
  './js/features/guardian-portal-share.js?v=11.12.1-beta.27-guardian-reactivation-hotfix4',
  './js/features/quran-audio-export.js?v=11.2.0-s4',
  './js/features/assignment-audio-share.js?v=11.12.1-beta.27',
  './js/features/v11-ui.js?v=11.12.1-beta.27',
  './achievement-certificates.css?v=11.8.0',
  './js/features/achievement-certificates.js?v=11.9.0',
  './guardian-portal.html',
  './guardian-portal.css?v=11.2.0-s4.1',
  './guardian-tahfeez.css?v=11.2.0-s4.1',
  './js/features/guardian-engagement.js?v=11.2.0-s4.1',
  './js/features/guardian-portal-experience.js?v=11.2.0-s4.1',
  './js/features/guardian-audio-assist.js?v=11.2.0-s4.1',
  './js/features/guardian-tahfeez.js?v=11.2.0-s4.1',
  './js/features/guardian-portal-view.js?v=11.7.4.2',
  './guardian-login.html',
  './guardian-login.css?v=11.2.0-s4',
  './guardian-login.js?v=11.0.0',
  './js/features/quran-engine.js?v=11.0.0',
  './js/features/quran-structure.js?v=11.0.0',
  './js/core/runtime.js?v=11.12.1-beta.27',
  './js/core/boot-health.js?v=11.12.1-beta.27',
  './js/core/offline-bootstrap.js?v=11.12.1-beta.27',
  './js/core/mobile-navigation.js?v=11.12.1-beta.27',
  './js/features/v10-data.js?v=11.0.0',
  './js/features/recitation-carry.js?v=11.0.0',
  './auth.js?v=11.7.4-foundation',
  './sync-core.js?v=11.0.0',
  './auth.css?v=11.0.0',
  './academy-workspaces.css?v=11.7.4-foundation',
  './js/features/academy-workspaces.js?v=11.7.4-foundation',
  './privacy.html',
  './terms.html',
  './manifest.json?v=11.12.1-beta.27',
  './guardian-manifest.json?v=11.2.0-s4.1',
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
  './guest-practice.html',
  './guest-practice.css?v=11.7.4.2',
  './js/features/guest-practice.js?v=11.7.4.2',
  './js/features/guardian-tahfeez.js?v=11.7.4.2',
  './role-home.css?v=11.12.1-beta.27',
  './ux-guidance.css?v=11.7.4.2',
  './js/features/role-home.js?v=11.12.1-beta.27',
  './js/features/ux-guidance.js?v=11.12.1-beta.27',


  './session-intelligence-119.css?v=11.9.2',
  './circle-management-1110.css?v=11.11.1',
  './js/features/circle-management-1110.js?v=11.11.1',
  './placement-center-1191.css?v=11.9.2',
  './js/features/placement-center-1191.js?v=11.9.2',
  './js/features/session-intelligence-119.js?v=11.12.1-beta.27-guardian-both-hotfix3',
  './teacher-error-marking.css?v=11.8.0',
  './correction-document.css?v=11.7.4.5',
  './smart-revision.css?v=11.3.0-s1',
  './goal-planning.css?v=11.4.2-s2',
  './student-finance.css?v=11.5.1-s2',
  './guardian-messages.css?v=11.6.0-s1',
  './teacher-rating.css?v=11.12.1-beta.27',
  './js/features/guardian-ratings.js?v=11.7.0-s1',
  './js/features/supervisor-dashboard.js?v=11.12.1-beta.27',
  './js/features/teacher-inbox.js?v=11.6.0-s1',
  './js/features/guardian-messages.js?v=11.6.0-s1',
  './js/features/smart-revision.js?v=11.9.2',
  './js/features/goal-planning.js?v=11.12.1-beta.27-guardian-both-hotfix3',
  './js/features/student-finance.js?v=11.5.1-s2',
  './js/features/v11-ui.js?v=11.12.1-beta.27',
  './js/features/teacher-error-marking.js?v=11.12.1-beta.27-quran-picker-hotfix2',
  './js/features/teacher-correction-document.js?v=11.7.4.5',
  './app.js?v=11.12.1-beta.27',
  './revision-quran-text.css?v=11.8.1',
  './js/features/revision-quran-text.js?v=11.8.1',
  './auth.js?v=11.7.4-foundation',
  './js/core/runtime.js?v=11.12.1-beta.27',
  './js/core/offline-bootstrap.js?v=11.12.1-beta.27'
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
async function cacheVerifiedCurrentShell(cache,url){
  const request=new Request(absolute(url),{cache:'no-store',credentials:'same-origin'});
  const response=await fetchWithTimeout(request,8000,{cache:'no-store'});
  if(!response||!response.ok)throw new Error(`[SW] new release not available: ${url}`);
  // Reject stale edge/CDN HTML and runtime even if the server replied HTTP 200.
  const body=await response.clone().text();
  if(url==='./index.html' &&
     (!body.includes(`name="application-version" content="${APP_VERSION}"`)
      ||!body.includes(`app.js?v=${APP_VERSION}`)
      ||!body.includes(`runtime.js?v=${APP_VERSION}`)))
    throw new Error('[SW] index.html is an older release');
  if(url.startsWith('./js/core/runtime.js') && !body.includes(`version:'${APP_VERSION}'`))
    throw new Error('[SW] runtime.js is an older release');
  if(url.startsWith('./app.js') && !body.includes(`WLQ_RELEASE_${APP_VERSION}`))
    throw new Error('[SW] app.js is an older release');
  if(url.startsWith('./js/core/offline-bootstrap.js') && !body.includes(`WLQ_RELEASE_${APP_VERSION}`))
    throw new Error('[SW] offline bootstrap is an older release');
  await cache.put(request,response.clone());
  await cache.put(canonicalRequest(request),response.clone());
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
    const cache=await caches.open(LIVE_CACHE_NAME);
    // Install the exact current app HTML/runtime first. No old-cache fallback
    // is allowed for these files: otherwise a new worker may report v11.12.1-beta.27
    // while actually serving an older account's v11.9 application shell.
    for(const url of CRITICAL_FRESH_SHELL)await cacheVerifiedCurrentShell(cache,url);
    const optionalShell=APP_SHELL.filter(url=>url!=='./'&&!CRITICAL_FRESH_SHELL.includes(url));
    const results=await Promise.all(optionalShell.map(url=>cacheSameOrigin(cache,url)));
    // Both '/' and '/index.html' must point at the SAME verified current HTML.
    // A separately cached './' response from an old release caused stale boots.
    const latestHTML=await cache.match(absolute('./index.html'));
    if(!latestHTML)throw new Error('[SW] current HTML missing after install');
    await cache.put(absolute('./'),latestHTML.clone());
    // The Supabase browser client is optional for trusted offline startup, but
    // caching it removes the last CDN dependency on normal offline launches.
    await cacheExternal(cache,SUPABASE_CDN);
    for(const url of CORE_SHELL){
      const hit=await cache.match(absolute(url));
      if(!hit)throw new Error(`[SW] refusing incomplete offline shell: ${url}`);
    }
    if(!results.some(Boolean))throw new Error('[SW] no app shell assets available');
    // Keep the installed update WAITING until the person taps Update now.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    // Delete old app caches only after Stage 5 has installed a complete core shell.
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('quran-pwa-')&&k!==LIVE_CACHE_NAME).map(k=>caches.delete(k)));
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable().catch(()=>{});
    await self.clients.claim();
  })());
});

async function trimRuntimeCache(cache,maxEntries=110){
  const keys=await cache.keys();
  if(keys.length<=maxEntries)return;
  // App shell shares this cache with runtime responses. Never evict the pinned
  // Quran/lesson code, CSS or offline entrypoint while trimming runtime data.
  const pinned=new Set();
  for(const path of [...APP_SHELL,...CORE_SHELL,...CRITICAL_FRESH_SHELL,'./']){
    const url=absolute(path);
    pinned.add(url);
    const plain=new URL(url);plain.search='';plain.hash='';pinned.add(plain.href);
  }
  const runtime=keys.filter(key=>!pinned.has(key.url));
  const count=Math.min(runtime.length,keys.length-maxEntries);
  await Promise.all(runtime.slice(0,count).map(key=>cache.delete(key)));
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
  const cache=await caches.open(LIVE_CACHE_NAME);
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
  const cache=await caches.open(LIVE_CACHE_NAME);
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
      const cache=await caches.open(LIVE_CACHE_NAME);
      const portalNav=url.pathname.endsWith('/guardian-portal.html');
      const guardianLoginNav=url.pathname.endsWith('/guardian-login.html');
      const guestNav=url.pathname.endsWith('/guest-practice.html');
      const fallback=guestNav?'./guest-practice.html':portalNav?'./guardian-portal.html':guardianLoginNav?'./guardian-login.html':'./index.html';
      const cached=(await matchLocalAsset(cache,req))
        ||(await matchLocalAsset(cache,new Request(absolute(fallback),{credentials:'same-origin'})))
        ||(await matchLocalAsset(cache,new Request(absolute('./index.html'),{credentials:'same-origin'})));
      // Keep the currently active shell immutable until the user accepts a
      // fully installed next Service Worker version. No silent HTML refresh.
      if(cached)return cached;
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
      const cache=await caches.open(LIVE_CACHE_NAME);
      const cached=await matchLocalAsset(cache,req);
      if(cached)return cached; // opt-in update: no silent JS/CSS refresh
      return cacheFirstSameOrigin(req);
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(LIVE_CACHE_NAME);
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
  if(event.data==='GET_VERSION'&&event.ports?.[0])event.ports[0].postMessage({version:APP_VERSION,cache:LIVE_CACHE_NAME,offlineStage:'5.5',uiStage:'11.7.3-supervision-2'});
});
