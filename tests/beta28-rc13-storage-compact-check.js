'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('function writeOfflineSafetySnapshot(){'),end=app.indexOf('\nfunction save(){',start);
assert(start>=0&&end>start,'RC13 snapshot compaction functions must exist before save()');
const source=app.slice(start,end);
const atomic={students:[{id:'s1',name:'طالب'}],sessions:[{id:'h1',studentId:'s1'}],tasks:[],settings:{}};
const data=new Map([
 ['acct:u1:students',JSON.stringify(atomic.students)],
 ['acct:u1:sessions',JSON.stringify(atomic.sessions)],
 ['acct:u1:tasks','["not-a-duplicate"]'],
 ['acct:u1:settings',JSON.stringify(atomic.settings)],
 ['WLQ_OFFLINE_SAFETY_KEY',JSON.stringify({userId:'u1',email:'teacher@example.test',savedAt:'2026-11-22',snapshot:atomic})],
 ['unrelated','keep']
]);
const localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
const c={console,localStorage,storageScopeUserId:'u1',storageScopeEmail:'teacher@example.test',WLQ_OFFLINE_SAFETY_KEY:'WLQ_OFFLINE_SAFETY_KEY',students:atomic.students,sessions:atomic.sessions,tasks:atomic.tasks,settings:atomic.settings,
 accountLocalKey:k=>'acct:u1:'+k,readAccountAtomicSnapshot:()=>({userId:'u1',snapshot:atomic}),
 readOfflineSafetySnapshot:()=>{try{return JSON.parse(localStorage.getItem('WLQ_OFFLINE_SAFETY_KEY'))?.snapshot||null;}catch(_){return null;}},
 snapshotHasData:s=>!!(s&&(s.students?.length||s.sessions?.length||s.tasks?.length)),
};
vm.createContext(c);vm.runInContext(source+';this.compact=compactRedundantAccountMirrors;this.writeSafety=writeOfflineSafetySnapshot;',c);
const removed=c.compact();
assert.equal(removed,4,'only exact account mirrors and a redundant global snapshot are removed');
assert(!data.has('acct:u1:students')&&!data.has('acct:u1:sessions')&&!data.has('acct:u1:settings'));
assert.equal(data.get('acct:u1:tasks'),'["not-a-duplicate"]','non-identical data must be preserved');
assert.equal(data.get('unrelated'),'keep','unrelated LocalStorage keys must be preserved');
assert(!data.has('WLQ_OFFLINE_SAFETY_KEY'),'valid atomic snapshot makes its duplicate global copy redundant');
// When there is no valid atomic snapshot, keep a fallback copy for non-empty account data.
c.readAccountAtomicSnapshot=()=>null;c.readOfflineSafetySnapshot=()=>null;c.students=[{id:'s2'}];c.sessions=[];c.tasks=[];c.settings={};c.writeSafety();
assert(data.has('WLQ_OFFLINE_SAFETY_KEY'),'fallback safety snapshot is still written when no atomic snapshot exists');
console.log('PASS RC13 storage compaction: exact duplicates only, last-good atomic snapshot preserved, unique and unrelated data untouched');
