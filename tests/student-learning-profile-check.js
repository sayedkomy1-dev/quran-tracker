'use strict';
const assert=require('node:assert/strict');
const profile=require('../js/features/student-learning-profile.js');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
const student={id:'a',name:'طالب'};
const sessions=[
  {id:'a1',studentId:'a',date:'2026-11-01',status:'حضر',assessmentScores:{new:90,rec:55}},
  {id:'a2',studentId:'a',date:'2026-11-02',status:'حضر',assessmentScores:{new:92,rec:60}},
  {id:'a3',studentId:'a',date:'2026-11-03',status:'حضر',assessmentScores:{new:88,rec:62}},
  {id:'a4',studentId:'a',date:'2026-11-04',status:'غاب'},
  {id:'a5',studentId:'a',date:'2026-11-05',status:'غاب'},
  {id:'a-future',studentId:'a',date:'2026-11-29',status:'حضر',assessmentScores:{new:0,rec:0}},
  {id:'b1',studentId:'b',date:'2026-11-02',status:'حضر',assessmentScores:{new:10,rec:10}}
];
const mockEngine={buildQueue(rows,id,day){
  assert.equal(id,'a');assert.equal(day,'2026-11-29');
  assert(!rows.some(row=>row.id==='a-future'||row.studentId==='b'));
  return [{type:'مخرج',occurrences:2,where:'الفاتحة · آية 2'}];
}};
function make(overrides={}){return profile.build({student,sessions,progress:{rows:sessions},referenceDay:'2026-11-28',errorEngine:mockEngine,...overrides});}
check('isolates the selected student and excludes future sessions',()=>{
  const result=make();assert.equal(result.rangeSessions,5);assert.equal(result.present,3);assert.equal(result.absent,2);
});
check('derives strengths only from repeated evidence across sessions',()=>{
  const result=make();assert.equal(result.strengths.length,1);assert.equal(result.strengths[0].key,'new');assert.equal(result.strengths[0].average,90);
});
check('derives support needs from repeated low scores, not a single weak result',()=>{
  const result=make();assert.equal(result.support.length,1);assert.equal(result.support[0].key,'rec');assert.equal(result.support[0].average,59);
});
check('counts attendance from attended and absent records only',()=>{
  const result=make();assert.equal(result.attendance,60);
});
check('does not present an attendance percentage from fewer than four records',()=>{const result=profile.build({student,sessions:[sessions[0]],progress:{rows:[sessions[0]]},referenceDay:'2026-11-28'});assert.equal(result.attendance,null);});
check('uses the existing error engine and reports recurrence from its evidence',()=>{
  const result=make();assert.equal(result.openErrors.count,1);assert.equal(result.openErrors.recurring,1);
});
check('limits confidence when assessment history is sparse',()=>{
  const result=profile.build({student,sessions:[sessions[0]],progress:{rows:[sessions[0]]},referenceDay:'2026-11-28'});
  assert.equal(result.evidence,'بيانات محدودة');assert.equal(result.strengths.length,0);assert.equal(result.support.length,0);
  assert.match(profile.render(result),/حصتين أو أكثر/);
});
check('does not invent a zero error count when the engine is unavailable',()=>{
  const result=profile.build({student,sessions,progress:{rows:sessions},referenceDay:'2026-11-28'});
  assert.equal(result.openErrors,null);assert.match(profile.render(result),/أخطاء مفتوحة<\/small><strong>غير متاح/);
});
check('trend compares only actual scored sessions',()=>{
  const rows=[
    {id:'t1',studentId:'a',date:'2026-11-01',status:'حضر',assessmentScores:{new:50}},
    {id:'t2',studentId:'a',date:'2026-11-02',status:'حضر',assessmentScores:{new:55}},
    {id:'t3',studentId:'a',date:'2026-11-03',status:'حضر',assessmentScores:{new:80}},
    {id:'t4',studentId:'a',date:'2026-11-04',status:'حضر',assessmentScores:{new:90}}
  ];
  const result=profile.build({student,sessions:rows,progress:{rows},referenceDay:'2026-11-28'});
  assert.equal(result.trend.label,'تحسن');
});
check('HTML escapes free text returned by the existing error engine',()=>{
  const engine={buildQueue:()=>[{type:'<img src=x onerror=alert(1)>',occurrences:1,where:''}]};
  const result=profile.build({student,sessions:[sessions[0]],progress:{rows:[sessions[0]]},referenceDay:'2026-11-28',errorEngine:engine});
  const html=profile.render(result);assert(!html.includes('<img'));assert(html.includes('&lt;img'));
});
check('does not mutate source student or session records',()=>{
  const frozen=Object.freeze({...sessions[0],assessmentScores:Object.freeze({...sessions[0].assessmentScores})});
  const result=profile.build({student:Object.freeze({...student}),sessions:Object.freeze([frozen]),progress:{rows:Object.freeze([frozen])},referenceDay:'2026-11-28'});
  assert.equal(result.assessedSessions,1);assert.equal(frozen.assessmentScores.new,90);
});
check('returns no profile without a valid student identity',()=>assert.equal(profile.build({student:null}),null));
check('does not claim a fixed learning style, diagnosis, or automatic grade',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/features/student-learning-profile.js'),'utf8');
  assert.match(source,/لا يصنّف الطالب إلى نمط تعلم ثابت/);
  assert(!/localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|assessmentScores\s*=/i.test(source));
});
console.log('OK RC16 student learning profile: '+checks+'/'+checks);
