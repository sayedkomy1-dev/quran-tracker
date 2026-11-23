'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sw=fs.readFileSync('sw.js','utf8');
const a=sw.indexOf('async function trimRuntimeCache('),b=sw.indexOf('async function refreshSameOrigin(',a);
assert(a>=0&&b>a,'runtime trim function must exist');
const ctx={URL,APP_SHELL:['./index.html','./app.js'],CORE_SHELL:[],CRITICAL_FRESH_SHELL:['./index.html'],absolute:x=>new URL(x,'https://academy.test/app/').href};
vm.createContext(ctx);vm.runInContext(sw.slice(a,b)+';this.trim=trimRuntimeCache;',ctx);
const pinned=['https://academy.test/app/index.html','https://academy.test/app/app.js'];
const runtime=['https://academy.test/app/runtime-old','https://academy.test/app/runtime-mid','https://academy.test/app/runtime-new'];
const deleted=[];const cache={async keys(){return[...pinned,...runtime].map(url=>({url}));},async delete(key){deleted.push(key.url);return true;}};
(async()=>{
 await ctx.trim(cache,2);
 assert.deepEqual(deleted,[runtime[0]],'oldest runtime entry should be removed while pinned shell and newest runtime entries remain');
 assert(sw.includes("if(event.data?.type==='IMAM_STORAGE_SAFE_CLEAN'"),'safe cleanup message listener missing');
 const validation=sw.indexOf('missingProtectedShellAssets(active)',sw.indexOf("event.data?.type==='IMAM_STORAGE_SAFE_CLEAN'"));
 const deletion=sw.indexOf('for(const name of old)',validation);
 assert(validation>=0&&deletion>validation,'worker must validate core and critical shell files before deleting prior app caches');
 assert(sw.includes("name.startsWith('quran-pwa-')&&name!==ACTIVE_CACHE_NAME"),'only obsolete application caches may be removed');
 // Simulate quota pressure: the oldest unpinned runtime entries are evicted, then the write retries.
 const helperCtx={...ctx,canonicalRequest:x=>x,};vm.createContext(helperCtx);
 vm.runInContext(sw.slice(a,b)+';this.trim=trimRuntimeCache;this.putRuntime=cacheRuntimeResponse;',helperCtx);
 const oldRuntime=Array.from({length:100},(_,i)=>`https://academy.test/app/old-${i}`),evicted=[];let putCalls=0,keys=[...pinned,...oldRuntime];
 const pressureCache={async keys(){return keys.map(url=>({url}));},async delete(key){evicted.push(key.url);keys=keys.filter(url=>url!==key.url);return true;},async put(request){putCalls++;if(putCalls===1){const e=new Error('quota');e.name='QuotaExceededError';throw e;}if(!keys.includes(request))keys.push(request);}};
 await helperCtx.putRuntime(pressureCache,'https://academy.test/app/new.js',{clone(){return this;}});
 assert.equal(evicted.length,60,'quota retry should trim old runtime cache from 100 entries to 40 before retry');
 assert.equal(putCalls,3,'request and canonical response should both be stored after one quota retry');
 // Exercise the actual message handler: only old quran-pwa caches may be removed.
 async function runSafeClean(shellComplete){
   const events={};let names=['quran-pwa-old','imam-guardian-tahfeez-audio-v1','unrelated-cache'],removed=[];
   const base='https://academy.test/app/';
   const self={location:{href:base+'sw.js',origin:'https://academy.test'},registration:{},clients:{claim:async()=>{}},addEventListener(name,fn){events[name]=fn;},skipWaiting(){}};
   const workerCaches={
     async keys(){return names.slice();},
     async open(name){return{async match(url){return shellComplete?{}:null;},async keys(){return[];},async delete(){return true;}};},
     async delete(name){removed.push(name);names=names.filter(x=>x!==name);return true;},
     async match(){return null;}
   };
   const c={self,caches:workerCaches,URL,Request,Response,AbortController,Promise,Math,Number,String,Object,Array,JSON,console,setTimeout,clearTimeout,fetch:async()=>new Response('',{status:200})};
   vm.createContext(c);vm.runInContext(sw,c);
   const active=vm.runInContext('ACTIVE_CACHE_NAME',c);names.push(active);
   const pinnedPaths=vm.runInContext("[...APP_SHELL,...CORE_SHELL,...CRITICAL_FRESH_SHELL,'./']",c);
   const pinnedUrls=[...new Set(pinnedPaths.flatMap(path=>{const u=new URL(path,base).href,plain=new URL(u);plain.search='';plain.hash='';return[u,plain.href];}))];
   let runtime=Array.from({length:100},(_,i)=>base+'runtime-'+i);
   workerCaches.open=async name=>name===active?{async match(){return shellComplete?{}:null;},async keys(){return[...pinnedUrls,...runtime].map(url=>({url}));},async delete(key){runtime=runtime.filter(x=>x!==key.url);return true;}}:{async keys(){return[];},async match(){return null;}};
   let pending;const reply={value:null,postMessage(v){this.value=v;}};
   events.message({data:{type:'IMAM_STORAGE_SAFE_CLEAN'},ports:[reply],waitUntil(p){pending=p;}});
   await pending;return{reply:reply.value,removed,names,runtime};
 }
 const cleaned=await runSafeClean(true);
 assert.equal(cleaned.reply.ok,true);assert.deepEqual(cleaned.removed,['quran-pwa-old']);
 assert(cleaned.names.includes('imam-guardian-tahfeez-audio-v1')&&cleaned.names.includes('unrelated-cache'),'legacy Quran audio and unknown caches must remain untouched');
 assert.equal(cleaned.runtime.length,80,'safe cleanup must keep runtime cache within its 80-entry cap');
 const refused=await runSafeClean(false);assert.equal(refused.reply.ok,false);assert.equal(refused.removed.length,0,'incomplete shell must block all old-cache deletion');
 console.log('storage-governor-sw-check: PASS — pinned shell preservation, bounded FIFO runtime cache, quota retry, actual safe-clean message and refusal on incomplete shell');
})().catch(e=>{console.error(e);process.exitCode=1;});
