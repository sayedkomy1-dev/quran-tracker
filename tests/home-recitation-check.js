'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const core=require('../js/features/home-recitation-core.js');

assert.equal(core.normalizeMime('audio/webm;codecs=opus'),'audio/webm');
assert.equal(core.normalizeMime('audio/x-m4a'),'audio/mp4');
assert.equal(core.extensionForMime('audio/mp4'),'m4a');
const surahs=[['الفاتحة',7],['البقرة',286],['آل عمران',200]];
assert.equal(core.validSurahRange(1,1,7,surahs),true);
assert.equal(core.validSurahRange(1,1,8,surahs),false);
assert.equal(core.validSurahRange(2,286,286,surahs),true);
assert.equal(core.validSurahRange(2,287,287,surahs),false);
assert.equal(core.validDuration(20*60*1000),true);
assert.equal(core.validDuration(20*60*1000+1),false);
assert.equal(core.formatTime(125900),'2:05');
assert.equal(core.canQueue(2,20*1024*1024,2*1024*1024),true);
assert.equal(core.canQueue(3,0,1024),false);
assert.equal(core.canQueue(1,49*1024*1024,2*1024*1024),false);
assert.equal(core.fileAllowed({type:'audio/webm;codecs=opus',size:1024}),true);
assert.equal(core.fileAllowed({type:'video/mp4',size:1024}),false);
assert.equal(core.fileAllowed({type:'audio/mp4',size:21*1024*1024}),false);
assert.equal(core.validAnnotation({time_ms:1200,ayah_no:3,note:'تصحيح'}, {from:2,to:4},5000).ok,true);
assert.equal(core.validAnnotation({time_ms:6000,ayah_no:3,note:'تصحيح'}, {from:2,to:4},5000).reason,'time');
assert.equal(core.validAnnotation({time_ms:100,ayah_no:8,note:'تصحيح'}, {from:2,to:4},5000).reason,'ayah');
assert.equal(core.validAnnotation({time_ms:100,ayah_no:null,note:' '}, {from:2,to:4},5000).reason,'note');

const browserJs=read('js/features/home-recitation.js');
new vm.Script(browserJs,{filename:'home-recitation.js'});
assert(browserJs.includes("indexedDB.open(DB_NAME,1)"),'offline queue must use IndexedDB');
assert(browserJs.includes("audio.currentTime"),'teacher markers must use actual playback position');
assert(browserJs.includes("student_ref:ctx.studentRef"),'student uploads must be bound to the active student');
assert(browserJs.includes("if(samePortalContext(ctx))"),'upload completion must not cross student context');
assert(browserJs.includes("stopPortalRecording()"),'recording must stop when the selected student changes');
assert(browserJs.includes("teacher_private_note"),'teacher-only note editor is present');
assert(browserJs.includes("student_visible"),'student feedback requires explicit approval');
assert(browserJs.includes("hrcSaveFeedback"),'save action must target its own button');
assert(!browserJs.includes('SERVICE_ROLE_KEY'),'service-role credentials must never reach browser code');
assert(!browserJs.includes('createFallbackTeacherToneWav'),'no synthetic teacher/learner audio fallback');

const edge=read('supabase/functions/guardian-recitation/index.ts');
const countsText=edge.match(/const SURAH_AYAH_COUNTS = \[([\s\S]*?)\];/);
assert(countsText,'backend must validate Quran ayah ranges');
assert.equal((countsText[1].match(/\d+/g)||[]).length,114,'backend must contain all 114 surah ayah counts');
assert(edge.includes('authClient.auth.getUser(bearer)'),'teacher endpoints must verify the real Supabase user JWT');
assert(edge.includes('guardian_portal_sessions'),'student endpoints must validate the guardian phone/PIN session');
assert(edge.includes('guardian_portal_accounts'),'student endpoints must validate the linked guardian account');
assert(edge.includes('guardian_portal_shares'),'student endpoints must validate the exact student link');
assert(edge.includes('createSignedUrl'),'audio playback must use short-lived signed URLs');
assert(edge.includes('teacher/restore')&&edge.includes('async function teacherRestore'),'archiving must be reversible from the teacher UI');
assert(edge.includes('SIGNED_URL_SECONDS = 1800'),'signed URLs must remain available long enough for a full recording review');
assert(edge.includes('MAX_FILE_BYTES = 20 * 1024 * 1024'),'server must enforce the upload size limit');
assert(edge.includes('MAX_DAILY_SUBMISSIONS = 12'),'server must enforce per-student daily limits');
assert(edge.includes('hasAudioSignature'),'server must inspect the actual audio file signature');
assert(!edge.includes('.delete('),'uploaded audio must not have a permanent-delete route');
const studentList=edge.slice(edge.indexOf('async function studentList'),edge.indexOf('async function teacherList'));
assert(!studentList.includes('teacher_private_note'),'private teacher notes must never be returned to students or guardians');
const teacherList=edge.slice(edge.indexOf('async function teacherList'),edge.indexOf('async function teacherFeedback'));
assert(teacherList.includes('teacher_private_note'),'private notes remain available to the authorized teacher');

const sessionSql=read('sql/guardian-portal-engagement.sql');
assert(sessionSql.includes("'student_ref',s.student_ref"),'guardian session must return the authorized student reference');
const sql=read('sql/rc16-home-recitation.sql');
assert(sql.includes("values (\n  'imam-home-recitations',\n  'imam-home-recitations',\n  false"),'storage bucket must be private');
assert(sql.includes('enable row level security'),'submission and feedback tables must enable RLS');
assert(sql.includes('revoke all on table public.student_recitation_submissions from public, anon, authenticated'));
assert(sql.includes('revoke all on table public.student_recitation_feedback from public, anon, authenticated'));
assert(sql.includes('grant all on table public.student_recitation_submissions to service_role'));
assert(sql.includes('grant all on table public.student_recitation_feedback to service_role'));
assert(!sql.includes('create policy'),'no direct browser storage/table policy is added');

const portal=read('guardian-portal.html');
const index=read('index.html');
const view=read('js/features/guardian-portal-view.js');
const progress=read('js/features/student-progress.js');
const sw=read('sw.js');
for(const file of [portal,index]){
  assert(file.includes('home-recitation.css?v=beta28-rc16-home-recitation1'));
  assert(file.includes('js/features/home-recitation-core.js?v=beta28-rc16-home-recitation1'));
  assert(file.includes('js/features/home-recitation.js?v=beta28-rc16-home-recitation1'));
}
assert(portal.includes('id="homeRecitationCard"'),'home recording UI must exist in the phone/PIN portal');
assert(view.includes('setStudentContext?.({sessionToken,studentRef:row.student_ref'),'student context must come from the authenticated session response');
assert(view.includes('setStudentContext?.(null)'),'static/live/error views must not expose the upload control');
assert(view.includes("g.addEventListener('online'"),'offline session recovery must retry after reconnect');
assert(progress.includes('renderTeacherPanel?.(studentId)'),'teacher inbox must be connected to the existing student profile');
assert(progress.includes('openTeacherInbox?.(studentId)'),"teacher can open the student's home recordings from the profile");
assert(sw.includes("'-rc16-home-recitation1'"),'service-worker cache namespace must advance');
for(const asset of ['home-recitation.css','js/features/home-recitation-core.js','js/features/home-recitation.js']){
  assert(sw.includes("'./"+asset+"?v=beta28-rc16-home-recitation1'"),'fresh shell missing '+asset);
}
assert(read('docs/RC16-HOME-RECITATION-SETUP.md').includes('staging first'));
console.log('PASS RC16 home recitation: Quran range, audio validation, offline queue, student isolation, teacher privacy, signed playback, and shell integration');
