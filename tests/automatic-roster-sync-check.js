'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const feature=fs.readFileSync('js/features/supervisor-dashboard.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('sql/supervision-roster-permissions.sql','utf8');
new vm.Script(feature);new vm.Script(app);
assert.match(app,/dispatchEvent\(new Event\('imam:local-save'\)\)/);
assert.match(feature,/startAutoRosterSync\(\)/);
assert.match(feature,/app_teacher_roster_publish/);
assert.match(feature,/lastPublishedSignature/);
assert.match(feature,/students\.length===0/);
assert.match(feature,/actor!==currentActor\(\)/);
assert.match(feature,/phone|الهواتف/); // explicit privacy promise only
assert.match(sql,/if v_actor is null or not exists\(select 1 from public\.app_users/);
assert.match(sw,/quran-pwa-v11\.12\.1-beta\.24-workspace-workflow/);
for(const u of ['app.js?v=11.12.1-beta.24','js/features/supervisor-dashboard.js?v=11.12.1-beta.24']){
  assert(html.includes(u));assert(sw.includes(u));
}
const listeners={};const timers=new Map();let seq=0,online=true,user='teacher-1',role='teacher';
const students=[{id:'a',name:'سارة',level:'مبتدئ',phone:'SECRET-NUMBER',guardianPin:'SECRET-PIN'}, {id:'b',name:'محمد',group:'الحلقة'}];
const sessions=[{studentId:'a',status:'حضر'},{studentId:'b',status:'غاب'}];
const submitted=[];
const status={textContent:''},button={disabled:false};
const elements={supervisorRosterSyncStatus:status,supervisorRosterSyncButton:button};
const doc={readyState:'loading',visibilityState:'visible',getElementById:k=>elements[k]||null,
  addEventListener:(name,fn)=>{listeners[name]=fn;},createElement:()=>({}),};
const sdk={rpc:async(name,args)=>{
  if(name==='app_teacher_roster_publish') {submitted.push(args.p_students);return {data:{ok:true,count:args.p_students.length},error:null};}
  if(name==='app_supervision_access')return {data:{allowed:false,owner:false},error:null};
  throw Error(`Unexpected RPC ${name}`);
}};
const world={console,document:doc,Date,JSON,Set,Map,String,Number,Math,Array,Promise,
  navigator:{get onLine(){return online;}},crypto:{randomUUID:()=>`batch-${seq++}`},
  setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id;},
  clearTimeout:id=>timers.delete(id),setInterval:()=>1,
  addEventListener:(key,fn)=>{listeners[key]=fn;},
  WeLiveQuranAuth:{isOwner:()=>false,isActive:()=>true,getAccess:()=>({user_id:user,role,status:'active'}),getClient:()=>sdk},
  ImamApp:{State:{students,sessions},GuardianPortal:{studentRef:async id=>id.repeat(64)}}
};
world.globalThis=world;
vm.runInNewContext(feature,world);
async function pump(){
  // a save may queue more than one debounced task, drain until awaiting the async RPC has settled
  const keys=[...timers.keys()];for(const k of keys){const entry=timers.get(k);if(!entry)continue;timers.delete(k);entry.fn();}
  for(let i=0;i<14;i++)await Promise.resolve();
}
(async()=>{
  world.ImamApp.Supervision.startAutoRosterSync();
  await pump();
  assert.equal(submitted.length,1,'Startup publishes roster even without opening student page');
  assert.equal(submitted[0].length,2);
  assert.deepEqual(Object.keys(submitted[0][0]).sort(),['absent','group','level','name','present','ref'].sort());
  assert.equal(submitted[0][0].present,1);
  assert(!JSON.stringify(submitted).includes('SECRET-NUMBER'));
  assert(!JSON.stringify(submitted).includes('SECRET-PIN'));
  listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,1,'Unchanged save should not republish');
  students[0].name='سارة الجديدة';listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,2,'Student edit triggers automatic sync');
  sessions.push({studentId:'a',status:'حضر'});listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,3,'Attendance update triggers automatic sync');
  online=false;students[0].name='سارة دون اتصال';listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,3,'Never transmit while offline');
  online=true;listeners.online();await pump();
  assert.equal(submitted.length,4,'Reconnect publishes latest saved roster');
  students.splice(0,2);listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,4,'Never replace previous roster with empty local state');
  students.push({id:'c',name:'طالب جديد'});role='guest';listeners['imam:local-save']();await pump();
  assert.equal(submitted.length,4,'Non-teacher sessions cannot publish');
  console.log('PASS automatic-roster-sync: initial upload, save debounce, attendance, offline retry, privacy, empty protection, scoped access');
})().catch(e=>{console.error(e);process.exitCode=1;});
