'use strict';
// Runtime simulation: deterministic test audio frames, mock storage and native share.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const records=new Map(); let calls=0,dialog=null,shares=0;
const db={transaction(){const t={objectStore(){return {get(k){const r={result:records.get(k)};queueMicrotask(()=>t.oncomplete?.());return r;},put(row){records.set(row.key,row);const r={result:row.key};queueMicrotask(()=>t.oncomplete?.());return r;}};}};return t;}};
const indexedDB={open(){const q={result:db};queueMicrotask(()=>q.onsuccess());return q;}};
const node=()=>({disabled:false,textContent:'',onclick:null});
const doc={readyState:'loading',addEventListener(){},body:{append(d){dialog=d;}},createElement(tag){assert.equal(tag,'dialog');const items={};return {querySelector(k){return items[k]??=node();},addEventListener(){},showModal(){},remove(){dialog=null;}};}};
const frame=Uint8Array.from([255,251,144,0,...Array(413).fill(0)]);
const ctx={console,Blob,File,Uint8Array,AbortController,setTimeout,clearTimeout,indexedDB,document:doc,navigator:{onLine:true,storage:{persist:async()=>true},canShare:()=>true,share:async p=>{assert(p.files.length);shares++;}},fetch:async url=>{calls++;assert(url.includes('everyayah.com/data/Alafasy_128kbps/'));return {ok:true,blob:async()=>new Blob([frame],{type:'audio/mpeg'})};}};
vm.createContext(ctx);for(const f of ['offline-audio-library','temporary-media-share','quran-audio-export'])vm.runInContext(read('js/features/'+f+'.js'),ctx,{filename:f});
const lib=ctx.ImamOfflineAudio,exporter=ctx.ImamQuranAudioExport,media=ctx.ImamTemporaryMedia;
(async()=>{
 assert.equal(lib.coordinates(0).length,6236);assert.equal(lib.coordinates(1).length,7);assert.throws(()=>lib.key('mishary',1,8));assert.equal(lib.url('mishary',1,7),'https://everyayah.com/data/Alafasy_128kbps/001007.mp3');
 assert.equal(lib.isMp3(frame),true);assert.equal(lib.isMp3(Uint8Array.from([60,104,116,109,108])),false);
 const tagged=Uint8Array.from([73,68,51,4,0,0,0,0,0,0,...frame]);assert.equal(lib.audioPayload(tagged).length,frame.length);
 const infoFrame=frame.slice();infoFrame.set([73,110,102,111],36);assert.equal(lib.audioPayload(Uint8Array.from([...infoFrame,...frame])).length,frame.length);
 const partial=await lib.download('mishary',1,p=>{if(p.done===2)lib.stop();});assert.equal(partial.done,2);assert.equal(partial.stopped,true);assert.equal(records.size,2);assert.equal(calls,2);
 const completed=await lib.download('mishary',1);assert.equal(completed.done,7);assert.equal(records.size,7);assert.equal(calls,7);
 ctx.navigator.onLine=false;const file=await exporter.buildFile({chapter:1,from:1,to:3,reciter:'mishary',surah:'الفاتحة'});assert.equal(file.size,3*frame.length);assert.equal(file.type,'audio/mpeg');assert.equal(calls,7);assert.equal(records.size,7,'must not store merged assignment');
 await assert.rejects(exporter.buildFile({chapter:2,from:1,to:1,reciter:'mishary'}),/AUDIO_OFFLINE_MISSING:2:1/);await assert.rejects(exporter.buildFile({chapter:1,from:0,to:3}),/AUDIO_INVALID_VERSE/);
 let promise=exporter.shareFile(file);assert.equal(shares,0,'preparing must not invoke native share');assert(dialog);await dialog.querySelector('[data-share]').onclick();let result=await promise;assert.equal(result.shared,true);assert.equal(result.downloaded,false);assert.equal(shares,1);assert.equal(dialog,null);
 promise=media.share([file]);dialog.querySelector('[data-cancel]').onclick();assert.equal((await promise).cancelled,true);assert.equal(shares,1);assert.equal(dialog,null);
 ctx.navigator.canShare=()=>false;result=await media.share([file]);assert.equal(result.unsupported,true);assert.equal(result.downloaded,false);assert.equal(dialog,null);
 for(const page of ['index.html','guardian-portal.html','guest-practice.html']){const h=read(page);assert(h.includes('data-imam-audio-library'));assert(h.includes('offline-audio-library.js?v=beta28-stage1'));assert(h.includes(page==='index.html'?'temporary-media-share.js?v=beta28-rc4':'temporary-media-share.js?v=beta28-stage1'));}
 assert.equal(JSON.parse(read('manifest.json')).orientation,'portrait-primary');assert.equal(JSON.parse(read('guardian-manifest.json')).orientation,'portrait-primary');
 const sw=read('sw.js');assert(sw.includes('-beta28-stage1'));assert(sw.includes('./js/features/offline-audio-library.js?v=beta28-stage1'));assert(sw.includes('./js/features/temporary-media-share.js?v=beta28-stage1'));
 console.log('PASS media stage1: mock storage resume, offline MP3 merge, missing ayah, no persistent export, explicit share/cancel/unsupported and portal assets');
})().catch(e=>{console.error(e);process.exitCode=1;});
