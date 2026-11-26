'use strict';
const assert=require('node:assert/strict');
const {buildLearningMemory}=require('../js/features/imam-learning-memory-experiment.js');
function runTests(build, assert){
  let n=0;const check=(condition,msg)=>{assert(condition,msg);n++};
  const err=(surahId=1,ayah=2,props={})=>({source:'quran-word',type:'نطق حرف',surahId,ayah,wordIndex:1,targetLevel:'char',charIndex:0,charText:'حَ',id:'e',...props});
  const ses=(id,date,errors,studentId='a',status='حضر')=>({id,studentId,date,status,recitationErrors:errors});
  const rows=[ses('1','2026-11-01',[err(),err()]),ses('2','2026-11-03',[err(2,5)]),ses('3','2026-11-04',[err(3,5)],'b'),ses('4','2026-11-05',[err(4,5)],'a','غاب'),ses('5','2026-12-01',[err(5,5)])];
  const base=build(rows,'a','2026-11-26');
  check(base.status==='review-required','pattern');
  check(base.sessions===2,'student/attendance/date scope');
  check(base.patterns[0].observations===2,'deduplication');
  check(base.patterns[0].distinctLocations===2,'distinct locations');
  check(base.patterns[0].letter==='ح','letter normalization');
  check(base.patterns[0].requiresTeacherReview===true,'teacher gate');
  check(base.patterns[0].evidence.every(e=>['1','2'].includes(e.sessionId)),'evidence isolation');
  check(build(rows,'b','2026-11-26').patterns.length===0,'no sibling leakage');
  check(build([ses('1','2026-11-01',[err(),err(2,5)])],'a','2026-11-26').patterns.length===0,'requires repeated days');
  check(build([ses('1','2026-11-01',[err()]),ses('2','2026-11-02',[err()])],'a','2026-11-26').patterns.length===0,'requires distinct locations');
  check(build([...rows,rows[0]],'a','2026-11-26').patterns.length===0,'conflicting duplicates excluded');
  check(build(rows,'a','2026-02-30').patterns.length===0,'invalid cutoff');
  check(build([], 'a','2026-11-26').status==='insufficient-evidence','no fabricated mastery');
  const before=JSON.stringify(rows);build(rows,'a','2026-11-26');check(JSON.stringify(rows)===before,'no mutation');
  check(build([ses('1','2026-11-01',[err(0,2)]),ses('2','2026-11-02',[err(2,5)])],'a','2026-11-26').patterns.length===0,'invalid location');
  check(build([ses('1','2026-11-01',[err(1,2,{wordIndex:null})]),ses('2','2026-11-02',[err(2,5)])],'a','2026-11-26').patterns.length===0,'missing location');
  return n;
}
console.log('PASS',runTests(buildLearningMemory,assert),'learning memory checks');
