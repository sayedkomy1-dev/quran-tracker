'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/features/storage-governor.js','utf8');
let deleted=0,audioStatsCalls=0;
const cacheNames=['quran-pwa-current','imam-guardian-tahfeez-audio-v1','unrelated-cache'];
const cacheStore={
  'quran-pwa-current':['/index.html','/app.js'],
  'imam-guardian-tahfeez-audio-v1':['https://everyayah.com/data/sample.mp3'],
  'unrelated-cache':['/user-content']
};
const caches={async keys(){return cacheNames.slice();},async open(name){return{async keys(){return(cacheStore[name]||[]).map(url=>({url}));},async delete(){deleted++;return true;}};}};
function storage(values){return{length:Object.keys(values).length,key(i){return Object.keys(values)[i]??null;},getItem(k){return values[k]??null;}};}
const context={
  console,Promise,Math,Number,String,Object,Array,JSON,MessageChannel,
  navigator:{storage:{estimate:async()=>({usage:970,quota:1000,usageDetails:{indexedDB:600,caches:300}}),persisted:async()=>false}},
  caches,indexedDB:{databases:async()=>[{name:'QuranApp',version:7},{name:'imam-quran-audio-library-v1',version:1}]},
  localStorage:storage({students:'data',draft:'draft'}),sessionStorage:storage({token:'x'}),ImamOfflineAudio:{statsAll:async()=>{audioStatsCalls++;return[{reciter:'mishary',label:'مشاري',count:1,bytes:1024}];}},
  document:{readyState:'complete',getElementById(){return null;}}
};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  const api=context.ImamStorageGovernor;assert(api,'storage governor API should be exposed');
  const report=await api.inspect();
  assert.equal(report.warning,'critical','critical threshold must take precedence over warning threshold');
  assert.equal(report.ratio,.97);assert.equal(report.persisted,false);
  assert(report.audioCachePresent,'legacy audio cache must be identified');
  assert(report.audioDatabasePresent,'new audio database must be identified');
  assert(report.databases.some(x=>x.name==='QuranApp'),'main academy database must be reported');
  assert(report.caches.find(x=>x.name==='imam-guardian-tahfeez-audio-v1').protected,'audio cache must be protected');
  assert(report.caches.find(x=>x.name==='unrelated-cache').protected,'unknown caches must be protected');
  assert.equal(audioStatsCalls,0,'full per-verse audio-library scans must not run on every page load');
  const detailed=await api.inspect({includeAudio:true});assert.equal(audioStatsCalls,1);assert.equal(detailed.audioLibrary[0].bytes,1024,'settings refresh may load per-reciter storage detail');
  const capacity=await api.canContinueAudioDownload();assert.equal(capacity.ok,false,'audio download must pause under critical quota pressure');
  assert.equal(deleted,0,'inspection and capacity checks must never delete storage');
  const text=fs.readFileSync('index.html','utf8');
  assert(text.includes('id="imamStorageManager"')&&text.includes('imamStorageClean'),'settings must expose storage manager');
  assert(text.includes('storage-governor.js?v=beta28-rc13'),'main shell must load storage governor');
  assert(text.includes('id="imamStorageManager"')&&text.includes('data-imam-audio-library'),'teacher settings must expose the audio library manager');
  for(const page of ['guardian-portal.html','guest-practice.html'])assert(!fs.readFileSync(page,'utf8').includes('data-imam-audio-library'),`${page} must not expose full-library administration`);assert(fs.readFileSync('maqraa.html','utf8').includes('data-imam-audio-library'),'the independent public Maqraa must expose its own offline recitation library');
  for(const page of ['guardian-portal.html','guest-practice.html','maqraa.html'])assert(fs.readFileSync(page,'utf8').includes('storage-governor.js?v=beta28-rc13'),`${page} must enforce the audio download headroom guard`);
  const audio=fs.readFileSync('js/features/offline-audio-library.js','utf8');
  assert(audio.includes('canContinueAudioDownload')&&audio.includes('storageLimited'),'audio library must stop safely when storage headroom is low');
  const worker=fs.readFileSync('sw.js','utf8');
  assert(worker.includes("event.data?.type==='IMAM_STORAGE_SAFE_CLEAN'"),'worker safe-clean message missing');
  assert(worker.includes("name.startsWith('quran-pwa-')&&name!==ACTIVE_CACHE_NAME"),'only old app caches may be removed');
  assert(worker.includes('missingProtectedShellAssets')&&worker.includes('ACTIVE_OFFLINE_SHELL_INCOMPLETE'),'safe cleanup must validate core and critical offline assets first');
  assert(worker.includes('5.9-guardian-home-recitation-rc17-offline-outbox'),'worker must expose the RC17 offline-outbox cache contract');
  assert(worker.includes('maxRuntimeEntries=80'),'runtime cache must have a finite entry cap');
  const governor=source;
  assert(!governor.includes('indexedDB.deleteDatabase')&&!governor.includes('caches.delete('),'page manager must not delete databases or caches directly');
  console.log('storage-governor-check: PASS — quota monitor, persistent-storage status, protected cache inventory, audio headroom guard, safe SW cleanup contract');
})().catch(e=>{console.error(e);process.exitCode=1;});
