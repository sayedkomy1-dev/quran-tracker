'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sw=read('sw.js');
const html=read('index.html');
const runtime=read('js/core/runtime.js');
const app=read('app.js');
const bootstrap=read('js/core/offline-bootstrap.js');
const version='11.12.1-beta.13';
assert(html.includes(`name="application-version" content="${version}"`));
assert(html.includes(`app.js?v=${version}`));
assert(html.includes(`runtime.js?v=${version}`));
assert(html.includes(`offline-bootstrap.js?v=${version}`));
assert(sw.includes(`const APP_VERSION = '${version}'`));
assert(sw.includes(`const CACHE_NAME = 'quran-pwa-v${version}-workspace-workflow'`));
assert(sw.includes("const CRITICAL_FRESH_SHELL = ["));
assert(sw.includes('await cache.put(absolute(\'./\'),latestHTML.clone())'));
assert(read('VERSION').trim()===version);
assert(read('js/core/offline-bootstrap.js').includes("{updateViaCache:'none'}"));

const base='https://welivequran.online/';
function key(r){return typeof r==='string'?new URL(r,base).href:r.url;}
function makeCache(){
 const m=new Map();
 return {m,async put(k,v){m.set(key(k),v.clone());},async match(k,opt={}){
   const exact=m.get(key(k));if(exact)return exact.clone();
   if(!opt.ignoreSearch)return undefined;
   const wanted=new URL(key(k));wanted.search='';wanted.hash='';
   for(const [uri,val] of m){const u=new URL(uri);u.search='';u.hash='';if(u.href===wanted.href)return val.clone();}
 }};
}
async function testWorker({staleIndex=false,offlineRuntime=false}={}){
 const old=makeCache();await old.put(base,new Response(html.replaceAll(version,'11.9.0')));
 const named=new Map([['quran-pwa-v11.9.0-old',old]]);
 const cachesMock={
  async open(name){if(!named.has(name))named.set(name,makeCache());return named.get(name);},
  async match(k,opt={}){for(const cache of named.values()){const r=await cache.match(k,opt);if(r)return r;}},
  async keys(){return [...named.keys()];}
 };
 const events={};
 const sourceFor=url=>{
  const p=new URL(key(url)).pathname;
  if(p==='/index.html')return staleIndex?html.replaceAll(version,'11.9.0'):html;
  if(p==='/app.js')return app;
  if(p==='/js/core/runtime.js')return runtime;
  if(p==='/js/core/offline-bootstrap.js')return bootstrap;
  return 'ok';
 };
 const ctx={
   self:{location:{href:base+'sw.js',origin:base.slice(0,-1)},addEventListener(n,fn){events[n]=fn;}},
   URL,Request,Response,AbortController,setTimeout,clearTimeout,console,
   fetch:async(req)=>{
      if(offlineRuntime&&new URL(key(req)).pathname==='/js/core/runtime.js')throw new Error('network offline');
      return new Response(sourceFor(req),{status:200});
   },
   caches:cachesMock
 };
 vm.createContext(ctx);vm.runInContext(sw,ctx,{filename:'sw.js'});
 assert(events.install,'service worker install missing');
 let installation;
 events.install({waitUntil(p){installation=p;}});
 assert(installation,'install did not call waitUntil');
 if(staleIndex||offlineRuntime){
   await assert.rejects(installation);
   assert((await old.match(base)),'previous offline cache must survive a failed update');
   return;
 }
 await installation;
 const newCache=await cachesMock.open('quran-pwa-v11.12.1-beta.13-workspace-workflow');
 const currentRoot=await newCache.match(base);
 const currentHtml=await newCache.match(base+'index.html');
 assert(currentRoot && currentHtml,'both root and index paths must have current HTML');
 assert((await currentRoot.text()).includes('name="application-version" content="11.12.1-beta.13"'),'root may not serve stale HTML');
 assert((await currentHtml.text()).includes('app.js?v=11.12.1-beta.13'),'index may not serve old app.js');
}
(async()=>{
 await testWorker({staleIndex:true});
 await testWorker({offlineRuntime:true});
 await testWorker({});
 console.log('PASS 11.12.1-beta.13 owner upgrade: reject stale shell, preserve offline cache, verified current root/index and core scripts');
})().catch(e=>{console.error(e);process.exitCode=1;});
