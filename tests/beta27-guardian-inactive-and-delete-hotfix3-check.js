'use strict';
/* Candidate-only test: no network, no real students. Verify that archive/pause,
 * including bulk/editor, revoke access BEFORE local status changes. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'v9.js'),'utf8');
const portal=fs.readFileSync(path.join(root,'js/features/guardian-portal-share.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function slice(from,to){const i=source.indexOf(from),j=source.indexOf(to,i+from.length);assert(i>=0&&j>i,from);return source.slice(i,j);}
const code=[
 slice('async function v9GuardInactiveStudents(ids){','async function bulkSetStatus(status){'),
 slice('async function bulkSetStatus(status){','function bulkMoveGroup(){'),
 slice('function saveSt(){','function openV9ContextMenu('),
 slice('async function setStudentStatusWithUndo(id,status){','async function deleteSt(){')
].join('\n');
function sandbox({deny=false,denyAt=0,portalMissing=false}={}){
 const events=[],students=[{id:'a',name:'الأخ الأول',studentStatus:'active',phone:'201000000000'},
                        {id:'b',name:'الأخ الثاني',studentStatus:'active',phone:'201000000000'}];
 let rpcCount=0;
 const box={classList:{contains:()=>box.open},open:true};
 const fields={'m-status':{value:'paused'},'m-pinned':{value:'0'},'stModal':box};
 const ctx={students,sessions:[{studentId:'a'},{studentId:'b'}],tasks:[{studentId:'a'}],editId:'a',curStId:'a',
   V9:{selectedStudents:new Set(['a','b']),undo:null,filters:{}},
   V9_BASE:{saveSt:()=>{events.push('base-save');box.open=false;ctx.students[0].studentStatus=fields['m-status'].value;}},
   globalThis:{ImamApp:{GuardianPortal:portalMissing?{}:{revokeForStudentDeletion:async id=>{events.push('rpc:'+id);rpcCount++;if(deny||(denyAt&&rpcCount===denyAt))throw Error('OFFLINE');return {ok:true};}}}},
   document:{getElementById:id=>fields[id]||{value:'',classList:{contains:()=>false}}},
   setTimeout:()=>{},
   v9StudentStatus:st=>st.studentStatus||'active',
   v9Toast:(message,kind)=>events.push('toast:'+kind),
   save:()=>{events.push('save');return true;},renderSt:()=>{},renderHome:()=>{},updateBulkBar:()=>{},
   console:{warn:()=>{}},openProf:()=>{},goPage:()=>{}}
 vm.createContext(ctx);vm.runInContext(code+'\nthis.ops={setStudentStatusWithUndo,bulkSetStatus,saveSt};',ctx);
 return {ctx,events,fields,box};
}
(async()=>{
 {const {ctx,events}=sandbox();await ctx.ops.setStudentStatusWithUndo('a','archived');
  assert.equal(ctx.students[0].studentStatus,'archived');assert.equal(ctx.students[1].studentStatus,'active');
  assert.equal(ctx.sessions.length,2);assert(events.indexOf('rpc:a')<events.indexOf('save'));
  assert.equal(ctx.V9.undo,null);}
 {const {ctx,events}=sandbox({deny:true});await ctx.ops.setStudentStatusWithUndo('a','paused');
  assert.equal(ctx.students[0].studentStatus,'active');assert(!events.includes('save'));}
 {const {ctx,events}=sandbox({portalMissing:true});await ctx.ops.setStudentStatusWithUndo('a','archived');
  assert.equal(ctx.students[0].studentStatus,'active');assert(!events.includes('save'));}
 {const {ctx,events}=sandbox();await ctx.ops.bulkSetStatus('paused');
  assert.deepEqual(ctx.students.map(s=>s.studentStatus),['paused','paused']);
  assert(events.indexOf('rpc:a')<events.indexOf('save')&&events.indexOf('rpc:b')<events.indexOf('save'));
  assert.equal(ctx.V9.selectedStudents.size,0);}
 {const {ctx,events}=sandbox({denyAt:2});await ctx.ops.bulkSetStatus('archived');
  assert.deepEqual(ctx.students.map(s=>s.studentStatus),['active','active']);assert(!events.includes('save'));
  assert.equal(ctx.V9.selectedStudents.size,2);}
 {const {ctx,events,box}=sandbox();await ctx.ops.saveSt();
  assert.equal(ctx.students[0].studentStatus,'paused');assert(!box.open);
  assert(events.indexOf('rpc:a')<events.indexOf('base-save'));
  assert.equal(ctx.students.length,2);}
 {const {ctx,events,box}=sandbox({deny:true});await ctx.ops.saveSt();
  assert(box.open);assert.equal(ctx.students[0].studentStatus,'active');assert(!events.includes('base-save'));}
 {const {ctx,events,fields}=sandbox();fields['m-status'].value='active';
  const result=ctx.ops.saveSt();assert.equal(result,true);
  assert(!events.includes('rpc:a'),'normal edit does not require remote access');}
 {const {ctx,events,fields}=sandbox({deny:true});ctx.students[0].studentStatus='paused';
  fields['m-status'].value='paused';const result=ctx.ops.saveSt();assert.equal(result,true);
  assert(!events.includes('rpc:a'),'editing existing paused notes does not require re-revoking');}
 {const {ctx,events}=sandbox();ctx.students[0].studentStatus='paused';
  await ctx.ops.setStudentStatusWithUndo('a','archived');assert(events.includes('rpc:a'),'existing paused record rechecked before archive');}
 assert(portal.includes("if(st.studentStatus&&st.studentStatus!=='active')throw new Error('STUDENT_NOT_ACTIVE')"),'inactive snapshots blocked');
 assert(portal.includes('revokeForStudentDeactivation:revokeForStudentDeletion'),'all status routes reuse verified cleanup');
 assert(index.includes('guardian-both-hotfix3')&&worker.includes('guardian-both-hotfix3'),'fresh worker asset versioning');
 for(const f of ['js/features/goal-planning.js','js/features/session-intelligence-119.js']){
   const t=fs.readFileSync(path.join(root,f),'utf8');assert(t.includes("typeof out.then==='function'"),`${f} must await deferred status save`);
 }
 console.log('PASS beta27 guardian archive, pause, bulk, editor and deletion safeguards (mock RPC)');
})().catch(err=>{console.error(err);process.exitCode=1});
