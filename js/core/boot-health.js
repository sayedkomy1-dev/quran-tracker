'use strict';
/* Imam Academy: minimal, local-only PWA restart diagnosis. No student/account data.
   Events are capped and not sent to any server. */
(function(g){
  const KEY='wlq:pwa-boot-health:v1',MAX=40;
  function read(){
    try{const v=JSON.parse(g.localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.slice(-MAX):[];}
    catch(_){return [];}
  }
  function log(type,detail){
    const permitted=/^(start|page-show|page-hide|background|foreground|discarded|js-error|promise-error|app-ready|auth-paused|sw-update-waiting|sw-update-requested|sw-controller-change|sw-reload-approved|sw-update-check)$/;
    if(!permitted.test(String(type)))return;
    const e={at:new Date().toISOString(),event:String(type)};
    if(typeof detail==='string'&&/^[a-z0-9_-]{1,32}$/.test(detail))e.detail=detail;
    try{g.localStorage.setItem(KEY,JSON.stringify([...read(),e].slice(-MAX)));}catch(_){}
  }
  function report(){return {release:'11.12.1-beta.19',wasDiscarded:g.document?.wasDiscarded===true,events:read()};}
  function summary(){return JSON.stringify(report(),null,2);}
  g.ImamBootHealth=Object.freeze({log,report,summary,clear(){try{g.localStorage.removeItem(KEY);}catch(_){}}});
  let nav='unknown';
  try{const x=g.performance?.getEntriesByType?.('navigation')?.[0]?.type;if(['navigate','reload','back_forward'].includes(x))nav=x;}catch(_){}
  log('start',nav);
  if(g.document?.wasDiscarded===true)log('discarded','browser');
  g.addEventListener?.('pageshow',ev=>log('page-show',ev.persisted?'bfcache':'new'));
  g.addEventListener?.('pagehide',ev=>log('page-hide',ev.persisted?'bfcache':'hidden'));
  g.document?.addEventListener?.('visibilitychange',()=>log(g.document.visibilityState==='visible'?'foreground':'background'));
  g.addEventListener?.('error',()=>log('js-error'));
  g.addEventListener?.('unhandledrejection',()=>log('promise-error'));
  g.navigator?.serviceWorker?.addEventListener?.('controllerchange',()=>log('sw-controller-change'));
})(globalThis);
