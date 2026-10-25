'use strict';
/* Regression coverage: fail-closed guardian access cleanup before a student is
 * removed; both independent portal paths must be blocked, siblings preserved. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const portal=fs.readFileSync(path.join(root,'js/features/guardian-portal-share.js'),'utf8');
const v9=fs.readFileSync(path.join(root,'v9.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/platform/components.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function method(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);}
assert(css.includes('#v9MoreSheet > .mo-box{')&&/max-height:92dvh/.test(css)&&/overflow-y:auto/.test(css),'More has bounded internal scroll');
assert(method(v9,'function openV9More(){','function closeV9More()').includes('box.scrollTop=0'),'More opens at top');
assert(index.includes('guardian-both-hotfix3')&&sw.includes('guardian-both-hotfix3'),'new assets cached separately');
assert(portal.includes('revokeForStudentDeletion,revokeForStudentDeactivation:revokeForStudentDeletion'),'guardian cleanup is exported');
const cleanupCode=method(portal,'async function revokeForStudentDeletion(studentId){','async function accessStatus(studentId){');
async function checkCleanup({link=false,phone=false,offline=false,statusFails=false,unlinkFails=false}={}){
 const calls=[];let linked=link,phoneLinked=phone;
 const ctx={
  liveAvailable:()=>!offline,
  liveStatus:async()=>({available:!statusFails,exists:link,active:linked}),
  accessStatus:async()=>({available:!statusFails,linked:phoneLinked}),
  revokeLive:async()=>{calls.push('revoke');linked=false;return true;},
  studentRef:async()=> 'abcd', ACCESS_RPC:{unlink:'unlink'},
  rpc:async()=>{calls.push('unlink');if(unlinkFails)throw new Error('RPC_ERROR');phoneLinked=false;return {ok:true,unlinked:true,remaining_students:1}}};
 vm.createContext(ctx);vm.runInContext(cleanupCode+'\nglobalThis.cleanup=revokeForStudentDeletion;',ctx);
 let success=false;try{const res=await ctx.cleanup('student1');success=res.ok===true;}catch(e){}
 return {success,calls};
}
(async()=>{
 assert.deepEqual((await checkCleanup()).calls,[],'unshared student has no destructive RPC');
 assert.equal((await checkCleanup({link:true,phone:true})).success,true,'both paths revoked');
 assert.deepEqual((await checkCleanup({link:true,phone:true})).calls,['revoke','unlink'],'direct link revoked before phone unlink');
 assert.equal((await checkCleanup({link:true,phone:true,unlinkFails:true})).success,false,'uncertain revocation blocks local deletion');
 assert.equal((await checkCleanup({offline:true})).success,false,'offline cannot claim safe cleanup');
 assert.equal((await checkCleanup({statusFails:true})).success,false,'status failure cannot claim safe cleanup');
 // Verify the live app's deletion handler delegates to guardian cleanup before
 // marking tombstones, removing sessions, or deleting attached media.
 const deletion=method(v9,'async function deleteSt(){','function v9MediaKeys()');
 assert(deletion.indexOf('revokeForStudentDeletion(id)')<deletion.indexOf('markStudentCascadeDeletion(id)'));
 assert(deletion.indexOf('revokeForStudentDeletion(id)')<deletion.indexOf('mediaDelete(x)'));
 const calls=[];
 const ctx={curStId:'s1',students:[{id:'s1',name:'A'},{id:'s2',name:'B'}],sessions:[{studentId:'s1'}],tasks:[{studentId:'s1'}],
  confirm:()=>true,
  globalThis:{ImamApp:{GuardianPortal:{revokeForStudentDeletion:async()=>{calls.push('cleanup');return {ok:true}}}}},
  markStudentCascadeDeletion:()=>calls.push('tombstone'),mediaDelete:()=>calls.push('media'),
  V8:{voiceNoteId:'',pendingVoiceBlob:null},save:()=>calls.push('save'),renderHome:()=>{},renderSt:()=>{},v9Toast:()=>{},goPage:()=>{},console};
 vm.createContext(ctx);vm.runInContext(deletion+'\nglobalThis.runDeletion=deleteSt;',ctx);
 await ctx.globalThis.runDeletion();
 assert.deepEqual(ctx.students.map(x=>x.id),['s2']);
 assert.deepEqual(calls,['cleanup','tombstone','save']);
 const failCtx={...ctx,students:[{id:'s1',name:'A'},{id:'s2',name:'B'}],sessions:[{studentId:'s1'}],tasks:[{studentId:'s1'}],
  globalThis:{ImamApp:{GuardianPortal:{revokeForStudentDeletion:async()=>{throw new Error('offline')}}}},curStId:'s1'};
 const failCalls=[];failCtx.markStudentCascadeDeletion=()=>failCalls.push('tombstone');failCtx.save=()=>failCalls.push('save');
 vm.createContext(failCtx);vm.runInContext(deletion+'\nglobalThis.runDeletion=deleteSt;',failCtx);
 await failCtx.globalThis.runDeletion();assert.equal(failCtx.students.length,2);assert.deepEqual(failCalls,[],'failure keeps students and children intact');
 console.log('PASS beta27 guardian delete + More scroll hotfix (mocked RPC and deletion)');
})().catch(e=>{console.error(e);process.exitCode=1});
