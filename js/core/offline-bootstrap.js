// WLQ_RELEASE_11.12.1-beta.10 — Register update scripts without stale HTTP caching.
'use strict';
/* We Live Quran v10.10.0 — Stage 5 offline bootstrap.
   Registers the service worker before authentication/network libraries so a
   previously trusted device can start from the cached app shell when offline. */
(function offlineBootstrap(g){
  const state={registration:null,error:null,started:false};
  function updateNetworkFlag(){
    try{document.documentElement.dataset.wlqNetwork=navigator.onLine===false?'offline':'online';}catch(_){ }
  }
  async function register(){
    if(state.started)return state.registration;
    state.started=true;
    updateNetworkFlag();
    addEventListener('online',updateNetworkFlag);
    addEventListener('offline',updateNetworkFlag);
    if(!('serviceWorker' in navigator))return null;
    try{
      state.registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      return state.registration;
    }catch(err){
      state.error=err;
      console.warn('[offline bootstrap] service worker registration failed',err);
      return null;
    }
  }
  const ready=register();
  g.WLQOfflineBootstrap={ready,state,register,updateNetworkFlag};
})(globalThis);
