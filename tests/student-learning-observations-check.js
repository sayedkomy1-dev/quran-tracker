'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const profile=require('../js/features/student-learning-profile.js');
require('../sync-core.js');
const sync=globalThis.WLQSyncCore;
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
const validInput={
  id:'obs-1',category:'repetition',date:'2026-11-23',today:'2026-11-23',
  evidence:'استدعى الآية بعد تكرارها مرتين دون تلميح',
  nextStep:'ابدأ بآيتين ثم زد المقطع تدريجيًا بعد الإتقان',
  now:'2026-11-23T10:00:00.000Z'
};
check('creates a structured observation from teacher-entered evidence',()=>{
  const result=profile.createObservation(validInput);
  assert.equal(result.ok,true);assert.equal(result.record.id,'obs-1');
  assert.equal(result.record.category,'repetition');assert.equal(result.record.archivedAt,'');
});
check('rejects unknown categories and future observation dates',()=>{
  assert.equal(profile.createObservation({...validInput,category:'diagnosis'}).ok,false);
  assert.equal(profile.createObservation({...validInput,date:'2026-11-24'}).ok,false);
});
check('requires concrete evidence and a teaching next step',()=>{
  assert.equal(profile.createObservation({...validInput,evidence:'جيد'}).ok,false);
  assert.equal(profile.createObservation({...validInput,nextStep:'تمام'}).ok,false);
});
check('renders teacher notes with HTML escaping and reversible archive controls',()=>{
  const html=profile.renderObservations({learningObservations:[
    {...profile.createObservation(validInput).record,evidence:'<img src=x onerror=alert(1)> سلوك مسجل',nextStep:'راجع الآية ثم أعد التقييم'},
    {...profile.createObservation({...validInput,id:'obs-2',category:'attention'}).record,archivedAt:'2026-11-23T11:00:00.000Z'}
  ]});
  assert(html.includes('&lt;img'));assert(!html.includes('<img'));
  assert(html.includes('data-slp-observation-toggle'));assert(html.includes('data-archived="1"'));
  assert(html.includes('لا تظهر في بوابة الطالب أو ولي الأمر'));
});
check('merges append-only observations from both snapshots and keeps the newest archive state',()=>{
  const local=[{id:'st-1',updatedAt:'2026-11-23T10:00:00.000Z',learningObservations:[
    {id:'obs-a',updatedAt:'2026-11-23T09:00:00.000Z',category:'repetition'},
    {id:'obs-same',updatedAt:'2026-11-20T09:00:00.000Z',archivedAt:''}
  ]}];
  const remote=[{id:'st-1',updatedAt:'2026-11-22T10:00:00.000Z',learningObservations:[
    {id:'obs-b',updatedAt:'2026-11-22T09:00:00.000Z',category:'recall'},
    {id:'obs-same',updatedAt:'2026-11-24T09:00:00.000Z',archivedAt:'2026-11-24T09:00:00.000Z'}
  ]}];
  const merged=sync.mergeById(local,remote,'students');
  assert.equal(merged.length,1);
  assert.deepEqual(merged[0].learningObservations.map(x=>x.id).sort(),['obs-a','obs-b','obs-same']);
  assert.equal(merged[0].learningObservations.find(x=>x.id==='obs-same').archivedAt,'2026-11-24T09:00:00.000Z');
});
check('keeps observations for different students isolated',()=>{
  const merged=sync.mergeById(
    [{id:'st-a',learningObservations:[{id:'obs-a',updatedAt:'2026-11-23T09:00:00Z'}]}],
    [{id:'st-b',learningObservations:[{id:'obs-b',updatedAt:'2026-11-23T09:00:00Z'}]}],
    'students'
  );
  assert.equal(merged.length,2);
  assert.deepEqual(merged.map(x=>x.learningObservations[0].id).sort(),['obs-a','obs-b']);
});
check('connects save/archive actions to the teacher progress panel',()=>{
  const root=path.resolve(__dirname,'..');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const progress=fs.readFileSync(path.join(root,'js/features/student-progress.js'),'utf8');
  assert.match(app,/function saveStudentLearningObservation/);
  assert.match(app,/function archiveStudentLearningObservation/);
  assert.match(progress,/renderObservations\(st\)/);
  assert.match(progress,/data-slp-observation-toggle/);
});
check('does not expose private teacher observations through the guardian snapshot whitelist',()=>{
  const share=fs.readFileSync(path.join(__dirname,'../js/features/guardian-portal-share.js'),'utf8');
  assert(!share.includes('learningObservations'));
  assert.match(share,/student:\s*\{\s*id:\s*st\.id/);
  assert(!/student:\s*\{\s*\.\.\.st/.test(share));
});
check('does not add SQL or network/storage access to the observation profile module',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../js/features/student-learning-profile.js'),'utf8');
  assert(!/localStorage|indexedDB|fetch\s*\(|XMLHttpRequest/i.test(source));
  assert.match(source,/renderObservations/);
});
console.log('OK RC16 student learning observations: '+checks+'/'+checks);
