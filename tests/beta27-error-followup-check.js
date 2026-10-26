'use strict';
/* Pure regression checks; never accesses the live academy service or user data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../js/features/error-followup-engine.js');
const s=(id,studentId,day,errors=[],followups=[])=>({id,studentId,sessionDate:day,status:'حضر',recitationErrors:errors,errorFollowups:followups});
const manual=(type='تجويد',section='المراجعة البعيدة',note='سورة الملك - آية ١',extra={})=>({type,section,note,...extra});
const quran=(extra={})=>({source:'quran-word',surahId:67,surah:'الملك',ayah:1,wordIndex:1,word:'تبارك',type:'تشكيل',mode:'new_read',resolved:true,...extra});
let base=[s('s1','student-A','2026-10-01',[manual('تجويد','الحفظ الجديد','الآية ٢',{resolved:true}),quran()])];
// Correction in the original lesson does not mean it was mastered when tested later.
let next=engine.buildQueue(base,'student-A','2026-10-08','');
assert.equal(next.length,2);
assert(next.every(x=>x.correctedInSession));
assert(!engine.buildQueue(base,'student-B','2026-10-08','').length,'student isolation');
assert(!engine.buildQueue(base,'student-A','2026-10-01','').length,'no same-session leakage');
assert(next.some(x=>x.section==='الحفظ الجديد'));
assert(next.some(x=>x.where.includes('تبارك')));
const key1=engine.errorKey(base[0].recitationErrors[0]);
const key2=engine.errorKey(base[0].recitationErrors[1]);
assert.notEqual(key1,key2);
// A teacher-verified mastery closes only the relevant original error.
base.push(s('s2','student-A','2026-10-08',[],[{key:key1,decision:'mastered',at:'2026-10-08T12:00:00Z',sourceSessionId:'s1',sourceErrorId:'s1:0'}]));
next=engine.buildQueue(base,'student-A','2026-10-10','');
assert.equal(next.length,1);
assert.equal(next[0].key,key2);
// Later re-occurrence of the same word/type reopens it without extra card.
base.push(s('s3','student-A','2026-10-11',[quran({resolved:false}),quran({resolved:false})]));
next=engine.buildQueue(base,'student-A','2026-10-12','');
assert.equal(next.length,1);
assert.equal(next[0].occurrences,3);
// A previously mastered manual error also reopens on a later recitation.
base.push(s('s4','student-A','2026-10-12',[manual('تجويد','الحفظ الجديد','الآية ٢')]));
next=engine.buildQueue(base,'student-A','2026-10-13','');
assert.equal(next.length,2);
assert.equal(next.find(x=>x.key===key1).occurrences,2);
// An explicit 'needs stabilization' or 'repeat' keeps follow-up open.
base.push(s('s5','student-A','2026-10-13',[],[{key:key2,decision:'stabilize',at:'2026-10-13T12:00:00Z'}]));
assert.equal(engine.buildQueue(base,'student-A','2026-10-14','').length,2);
base.push(s('s6','student-A','2026-10-14',[],[{key:key2,decision:'repeat',at:'2026-10-14T12:00:00Z'}]));
assert.equal(engine.buildQueue(base,'student-A','2026-10-15','').length,2);
// Later session, non-present session, and current edit don't interfere with prior decisions.
base.push(s('s7','student-A','2026-10-16',[],[{key:key2,decision:'mastered',at:'2026-10-16T12:00:00Z'}]));
assert.equal(engine.buildQueue(base,'student-A','2026-10-16','s7').length,2);
assert.equal(engine.buildQueue(base,'student-A','2026-10-17','').length,1);
base.push({...s('s8','student-A','2026-10-17',[],[{key:key1,decision:'mastered'}]),status:'غاب'});
assert.equal(engine.buildQueue(base,'student-A','2026-10-18','').length,1);
// Include field from draft / normalized import and reject malicious/invalid decisions.
const good={key:key1,decision:'mastered',at:'2026-10-18T18:22:00Z',sourceSessionId:'s1',sourceErrorId:'err1'};
assert.deepEqual(engine.normalizeDecisions([good])[0],good);
assert.equal(engine.normalizeDecisions([{key:'x',decision:'mastered'},{key:key1,decision:'xxx'}]).length,0);
engine.reset();engine.load([good]);assert.equal(engine.capture().length,1);engine.load(engine.capture());assert.equal(engine.capture()[0].sourceSessionId,'s1');
// The existing normalizer must retain an optional position, an ID and correction status.
const v8=fs.readFileSync('v8.js','utf8');
const normCode=v8.slice(v8.indexOf('function v8NormalizeErrorRecord('),v8.indexOf('function v8Toast('));
const normalized=vm.runInNewContext(`(function(){const V8_ERROR_TYPES=['تجويد'];const V8_ERROR_CONTEXTS=['الحفظ الجديد'];const v8SafeText=(v,max)=>String(v??'').slice(0,max);const v8Now=()=> '2026-10-01';${normCode};return v8NormalizeErrorRecord;})()`,{});
const sample=normalized({id:'err-1',type:'تجويد',section:'الحفظ الجديد',note:'الآية ٢',resolved:true,resolvedAt:'2026-10-01'});
assert.equal(sample.id,'err-1');assert.equal(sample.note,'الآية ٢');assert.equal(sample.resolved,true);
assert.equal(sample.resolvedAt,'2026-10-01');
// A filtered orphan must never shift one student's error/decision data onto another.
const imported={students:[{id:'A',plan:'balanced'}],sessions:[
  s('orphan','deleted-student','2026-10-01',[manual('تجويد','الحفظ الجديد','يتيم')],[{...good,key:key2}]),
  s('valid','A','2026-10-02',[manual('تجويد','الحفظ الجديد','سليم')],[good])
]};
const sanitizeCode=v8.slice(v8.indexOf('function sanitizeBackupData(d){'),v8.indexOf('function importData(e){'));
const ctx={__IMAM_BASE__:{sanitizeBackupData:()=>({students:[{id:'A'}],sessions:[{id:'valid',studentId:'A'}]})},
  V8_PLANS:{balanced:true},globalThis:{ImamErrorFollowup:engine},v8NormalizeErrorRecord:x=>x, v8Now:()=> '2026-10-02'};
vm.createContext(ctx);
vm.runInContext(sanitizeCode+'\nthis.safeImport=sanitizeBackupData;',ctx);
const safeImport=ctx.safeImport(imported);
assert.equal(safeImport.sessions[0].recitationErrors[0].note,'سليم');
assert.equal(safeImport.sessions[0].errorFollowups[0].key,key1);

const page=fs.readFileSync('index.html','utf8'),worker=fs.readFileSync('sw.js','utf8');
for(const ref of ['js/features/error-followup-engine.js?v=11.12.1-beta.27-error-followup-candidate','error-followup.css?v=11.12.1-beta.27-error-followup-candidate']){
  assert(page.includes(ref)&&worker.includes(ref),`new asset not online/offline: ${ref}`);
}
for(const token of ['ia27ErrorFollowup','ia27ErrorPosition'])assert(page.includes(`id="${token}"`));
for(const token of ['d.errorFollowups=','se.errorFollowups=','toggleRecitationErrorCorrected','ia27RenderErrorFollowups()'])assert(v8.includes(token),token);
assert(!page.includes('<script src="v8.js?v=11.2.0-s3" defer></script>'),'stale V8 cache ref');
assert(worker.includes('quran-picker-candidate1'),'candidate must have isolated service-worker cache');
console.log('PASS beta27: error follow-up queue, corrected-in-lesson, manual/Quran, isolation, recurrence, mastery, decisions, import and offline assets');
