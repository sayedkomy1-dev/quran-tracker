'use strict';
/* Offline-only regression checks. No student data or remote Supabase calls. */
const fs=require('fs');const vm=require('vm');const assert=require('node:assert/strict');
const source=fs.readFileSync('v9.js','utf8');
const portalSource=fs.readFileSync('js/features/guardian-portal-share.js','utf8');
const page=fs.readFileSync('index.html','utf8');const worker=fs.readFileSync('sw.js','utf8');
function slice(from,to){const i=source.indexOf(from);const j=source.indexOf(to,i+from.length);assert(i>=0&&j>i,from);return source.slice(i,j);}
const code=[slice('async function v9GuardInactiveStudents(ids){','async function bulkSetStatus(status){'),slice('async function bulkSetStatus(status){','function bulkMoveGroup(){'),slice('function saveSt(){','function openV9ContextMenu('),slice('async function setStudentStatusWithUndo(id,status){','async function deleteSt(){')].join('\n');
function sandbox({failAt=0,localFail=false,existing=false}={}){
 const events=[],students=[{id:'a',name:'أحمد',studentStatus:'archived',phone:'201000000000'},{id:'b',name:'يوسف',studentStatus:'paused',phone:'201000000000'}];
 let count=0;const box={open:true,classList:{contains:()=>box.open}};
 const fields={'m-status':{value:'active'},'m-pinned':{value:'0'},'m-name':{value:'أحمد'},'m-phone':{value:'201000000000'},'stModal':box};
 const portal={restoreForStudentReactivation:async id=>{events.push('activate:'+id);count++;if(count===failAt)throw Error('RPC_FAIL');return {ok:true,changed:!existing,pinChanged:false};},revokeForStudentDeletion:async id=>{events.push('revoke:'+id);return {ok:true};},forgetReactivationSecret:id=>events.push('clear:'+id),showReactivationCredentials:ids=>events.push('show:'+ids.join(','))};
 const ctx={students,editId:'a',curStId:'a',V9:{selectedStudents:new Set(['a','b']),undo:null,filters:{}},V9_BASE:{saveSt:()=>{events.push('base-save');box.open=false;students[0].studentStatus=fields['m-status'].value;}},globalThis:{ImamApp:{GuardianPortal:portal}},document:{getElementById:id=>fields[id]||{value:'',classList:{contains:()=>false}}},setTimeout:fn=>fn(),v9StudentStatus:st=>st.studentStatus||'active',v9Toast:(message,kind)=>events.push('toast:'+kind),save:()=>{events.push('save');return !localFail;},renderSt:()=>{},renderHome:()=>{},updateBulkBar:()=>{},console:{warn:()=>{}},openProf:()=>{},goPage:()=>{},normPhone:x=>x};
 vm.createContext(ctx);vm.runInContext(code+'\nthis.ops={setStudentStatusWithUndo,bulkSetStatus,saveSt};',ctx);return{ctx,events,students,box,fields};
}
(async()=>{
 {let s=sandbox();await s.ctx.ops.setStudentStatusWithUndo('a','active');assert.equal(s.students[0].studentStatus,'active');assert(s.events.indexOf('activate:a')<s.events.indexOf('save'));assert(!s.events.some(x=>x.startsWith('revoke:')));}
 {let s=sandbox({failAt:1});await s.ctx.ops.setStudentStatusWithUndo('a','active');assert.equal(s.students[0].studentStatus,'archived');assert(!s.events.includes('save'));}
 {let s=sandbox({localFail:true});await s.ctx.ops.setStudentStatusWithUndo('a','active');assert.equal(s.students[0].studentStatus,'archived');assert(s.events.includes('revoke:a'));}
 {let s=sandbox();await s.ctx.ops.bulkSetStatus('active');assert.deepEqual(s.students.map(st=>st.studentStatus),['active','active']);assert(s.events.indexOf('activate:b')<s.events.indexOf('save'));}
 {let s=sandbox({failAt:2});await s.ctx.ops.bulkSetStatus('active');assert.deepEqual(s.students.map(st=>st.studentStatus),['archived','paused']);assert(s.events.includes('revoke:a'));assert(!s.events.includes('save'));}
 {let s=sandbox();let result=await s.ctx.ops.saveSt();assert.equal(result,true);assert.equal(s.students[0].studentStatus,'active');assert(s.events.indexOf('activate:a')<s.events.indexOf('base-save'));}
 {let s=sandbox({failAt:1});let result=await s.ctx.ops.saveSt();assert.equal(result,false);assert(s.box.open);assert.equal(s.students[0].studentStatus,'archived');assert(!s.events.includes('base-save'));}
 {let s=sandbox();s.fields['m-phone'].value='201122222222';let result=s.ctx.ops.saveSt();assert.equal(result,false);assert(!s.events.includes('activate:a'));}
 {let s=sandbox({existing:true});await s.ctx.ops.setStudentStatusWithUndo('a','active');assert.equal(s.students[0].studentStatus,'active');assert(!s.events.includes('revoke:a'));}
 // Execute the actual guardian restore method in a sandbox with no backend.
 const openMarker='  async function restoreForStudentReactivation(studentId){';
 const closeMarker='  function showReactivationCredentials(ids){';
 const region=portalSource.slice(portalSource.indexOf(openMarker),portalSource.indexOf(closeMarker));
 assert(region.startsWith(openMarker)&&region.includes('ACCESS_RPC.enable'));
 async function simulatePortal({beforeLinked=false,beforeActive=true,pinChanged=false,verify=false,invalid=false}={}){
   const ops=[],secrets=new Map();let reads=0;const phone=invalid?'447700900000':'201000000000';
   const ctx={liveAvailable:()=>true,studentById:()=>({id:'a',phone}),studentPhone:()=>phone,validEgyptPhone:()=>!invalid,
      accessStatus:async()=>{reads++;return reads===1?{available:true,linked:beforeLinked,active:beforeActive,phoneLast4:'0000'}:{available:!verify,linked:!verify,active:true,phoneLast4:'0000'};},
      buildSnapshot:(id,args)=>{ops.push('snapshot:'+id+':'+args.forReactivation);return {v:'1'};},
      generatePin:()=> '123456',studentRef:async()=> 'ref',rpc:async(name,args)=>{ops.push('rpc:'+name+':'+args.p_reset_pin);return {ok:true,pin_changed:pinChanged,account_created:pinChanged};},
      ACCESS_RPC:{enable:'enable'},pendingReactivationSecrets:secrets,phoneDisplay:x=>x,guardianLoginUrl:()=>'/guardian-login.html',
      forgetReactivationSecret:id=>secrets.delete(id),revokeForStudentDeletion:async id=>{ops.push('rollback:'+id);return {ok:true};},
      console:{error:()=>{}}};
   vm.createContext(ctx);vm.runInContext(region+'\nthis.restore=restoreForStudentReactivation;',ctx);
   let result,error;try{result=await ctx.restore('a');}catch(e){error=e;}
   return {ops,result,error,secrets};
 }
 {const x=await simulatePortal({beforeLinked:true});assert.equal(x.result.changed,false);assert.deepEqual(x.ops,[],'existing linked sibling shares unchanged PIN');}
 {const x=await simulatePortal({pinChanged:true});assert.equal(x.result.ok,true);assert.equal(x.result.pinChanged,true);assert(x.ops.includes('snapshot:a:true'));assert(x.ops.includes('rpc:enable:false'));assert.equal(x.secrets.get('a').pin,'123456');}
 {const x=await simulatePortal({verify:true});assert(x.error);assert(x.ops.includes('rollback:a'));assert.equal(x.secrets.size,0);}
 {const x=await simulatePortal({invalid:true});assert(x.error);assert(!x.ops.some(t=>t.startsWith('rpc:')));}
 assert(portalSource.includes("if(st.studentStatus&&st.studentStatus!=='active'&&!forReactivation)throw new Error('STUDENT_NOT_ACTIVE')"));
 assert(portalSource.includes('p_reset_pin:false'));assert(portalSource.includes('pendingReactivationSecrets'));assert(portalSource.includes('showReactivationCredentials'));
 assert(page.includes('guardian-reactivation-hotfix4')&&worker.includes('guardian-reactivation-hotfix4'));
 console.log('PASS beta27 automatic student reactivation, rollback and guardian PIN display (offline mocks)');
})().catch(e=>{console.error(e);process.exitCode=1;});
