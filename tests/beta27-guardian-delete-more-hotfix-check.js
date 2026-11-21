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
 // Archive-only policy: user history is NEVER deleted by this UI action.
 const deletion=method(v9,'async function deleteSt(){','function v9MediaKeys()');
 assert(deletion.includes("await setStudentStatusWithUndo(id,'archived')"));
 assert(!deletion.includes('markStudentCascadeDeletion')&&!deletion.includes('mediaDelete'));
 const calls=[];
 const student={id:'s1',name:'A',studentStatus:'active'};
 const sessions=[{studentId:'s1'}],tasks=[{studentId:'s1'}],students=[student];
 const ctx={curStId:'s1',students,sessions,tasks,confirm:()=>true,v9StudentStatus:st=>st.studentStatus,
  setStudentStatusWithUndo:async(id,status)=>{calls.push('archive');student.studentStatus=status;},
  v9Toast:()=>{},goPage:()=>calls.push('students-page')};
 vm.createContext(ctx);vm.runInContext(deletion+'\nglobalThis.runDeletion=deleteSt;',ctx);
 assert.equal(await ctx.runDeletion(),true);
 assert.equal(student.studentStatus,'archived');
 assert.equal(students.length,1);assert.equal(sessions.length,1);assert.equal(tasks.length,1);
 assert.deepEqual(calls,['archive','students-page']);
 const failCtx={curStId:'s1',students:[{id:'s1',name:'A',studentStatus:'active'}],sessions:[{studentId:'s1'}],tasks:[{studentId:'s1'}],
  confirm:()=>true,v9StudentStatus:st=>st.studentStatus,v9Toast:()=>{},goPage:()=>{throw Error('should not navigate');},
  setStudentStatusWithUndo:async()=>{ /* guardian revoke failed upstream; status unchanged */ }};
 vm.createContext(failCtx);vm.runInContext(deletion+'\nglobalThis.runDeletion=deleteSt;',failCtx);
 assert.equal(await failCtx.runDeletion(),false);
 assert.equal(failCtx.students.length,1);assert.equal(failCtx.sessions.length,1);assert.equal(failCtx.tasks.length,1);
 console.log('PASS guardian revoke and archive-only flow; student/session/media retained');
})().catch(e=>{console.error(e);process.exitCode=1});
