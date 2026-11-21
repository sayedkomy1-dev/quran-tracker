'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const sync=fs.readFileSync('sync-core.js','utf8');
const auth=fs.readFileSync('auth.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function snippet(src,start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert(a>=0&&b>a,`snippet missing: ${start}`);
 return src.slice(a,b);
}
const readFns=snippet(app,'function readAccountAtomicSnapshot(){','function readOfflineSafetySnapshot(){');
const saveFn=snippet(app,'function save(){','const AV_BG=');
function contextWithStorage(){
 let store=new Map();let denied=null;let seq=1700000000000;const snapshots=[];
 const localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem(k,v){if(denied?.(k))throw new Error('QuotaExceededError');store.set(k,String(v));},
  removeItem:k=>store.delete(k),
  key:i=>[...store.keys()][i]||null,get length(){return store.size;}
 };
 const c={
  console:{warn(){},error(){}},Date,JSON,localStorage,storageScopeUserId:'teacher-A',
  students:[{id:'student-1',name:'طالب'}],sessions:[{id:'ses-1',studentId:'student-1'}],tasks:[],settings:{theme:'light'},
  accountLocalKey:k=>'wlq.account.teacher-A.'+k,
  parseJSONSafe:(s,def)=>{try{return JSON.parse(s);}catch(_){return def;}},
  snapshotHasData:s=>!!((s.students||[]).length||(s.sessions||[]).length||(s.tasks||[]).length),
  nextSnapshotStamp:()=>++seq,
  idbWriteSnapshot:stamp=>snapshots.push(stamp),writeOfflineSafetySnapshot:()=>{},
  queueMicrotask:fn=>fn(),updateTaskBadge:()=>{},
  document:{dispatchEvent(){}},Event:function Event(){},
  globalThis:null
 };
 c.globalThis=c;c.ImamApp={};vm.createContext(c);vm.runInContext(readFns+saveFn,c);
 return{c,store,localStorage,snapshots,deny:f=>{denied=f;}};
}
const x=contextWithStorage();
assert.equal(vm.runInContext('save()',x.c),true);
let raw=x.localStorage.getItem('wlq.account.teacher-A.snapshot.v2');
assert(raw&&JSON.parse(raw).snapshot.students[0].id==='student-1');
assert.equal(x.snapshots.length,1);
// An interrupted old four-key write cannot overwrite an atomic checkpoint.
x.localStorage.setItem('wlq.account.teacher-A.students','[{"id":"broken"}]');
assert.equal(vm.runInContext('accountSnapshotFromLocalStorage().students[0].id',x.c),'student-1');
// A later save changes both data and timestamp in the same storage operation.
x.c.students.push({id:'student-2',name:'طالب ثان'});
assert.equal(vm.runInContext('save()',x.c),true);
assert.equal(vm.runInContext('accountSnapshotFromLocalStorage().students.length',x.c),2);
// Subsequent failures cannot quietly report success or erase the last checkpoint.
x.deny(()=>true);x.c.students.push({id:'student-3'});
assert.equal(vm.runInContext('save()',x.c),false);
assert.equal(x.c.ImamApp.SaveHealth.ok,false);
assert.equal(vm.runInContext('accountSnapshotFromLocalStorage().students.length',x.c),2);
// Previous account installs with only the four legacy keys remain readable.
const old=contextWithStorage();old.localStorage.setItem('wlq.account.teacher-A.students','[{"id":"legacy"}]');
assert.equal(vm.runInContext('accountSnapshotFromLocalStorage().students[0].id',old.c),'legacy');
// Cross-account isolation must refuse another user's complete checkpoint.
old.localStorage.setItem('wlq.account.teacher-A.snapshot.v2',JSON.stringify({format:2,userId:'different-account',stamp:999,snapshot:{students:[{id:'other'}],sessions:[],tasks:[],settings:{}}}));
assert.equal(vm.runInContext('accountSnapshotFromLocalStorage().students[0].id',old.c),'legacy');

const ctx={globalThis:null,console,Date};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(sync,ctx);
const C=ctx.WLQSyncCore;
const now=Date.now(),past=new Date(now-86400000).toISOString(),future=new Date(now+86400000).toISOString();
const recent={id:'one',updatedAt:past,title:'legitimate'},skewed={id:'one',updatedAt:future,title:'wrong-clock'};
const merged=C.mergeById([recent],[skewed],'tasks',{});
assert.equal(merged[0].title,'legitimate','a future device clock must not supersede valid task');
assert.equal(C.clockSkewReview({tasks:[skewed]}).length,1,'must show clock anomaly');
assert.equal(C.mergeById([],[skewed],'tasks',{}).length,1,'future-dated isolated record must be preserved');
const futureDeletion={tasks:{one:{deletedAt:future,deviceId:'broken'}}};
assert.equal(C.mergeById([recent],[],'tasks',futureDeletion).length,1,'future-dated tombstone must not delete live data');

assert(auth.includes('requestDurableStorage()'),'best-effort storage persistence missing');
assert(html.includes('rc8-premium-workspace.css?v=beta28-rc8'));
assert(html.includes('rc8-premium-workspace.js?v=beta28-rc8'));
assert(sw.includes('rc8-premium-workspace.css?v=beta28-rc8'));
assert(sw.includes('rc8-premium-workspace.js?v=beta28-rc8'));
assert(/rc\.8 \(اختباري\)/.test(html));
console.log('PASS RC8: atomic account backup, legacy compatibility, failed-save recovery, device-clock skew, PWA wiring');
