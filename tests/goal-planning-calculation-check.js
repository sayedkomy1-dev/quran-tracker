'use strict';
// Behavioral regression tests for Stage 1: no dummy progress, cross-surah
// boundaries, schedules, proposed assignments and explicit teacher consent.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=fs.readFileSync('app.js','utf8');
const match=root.match(/const S=(\[[\s\S]*?\]);\s*const JZ=/);
assert.ok(match,'bundled Surah metadata should exist');
const surahs=vm.runInNewContext('('+match[1]+')');
const records={students:[],sessions:[],curStId:null};
let prompted=0,applied=0,saved=0,approved=false;
const ctx={
  S:surahs,
  ImamApp:{State:records},
  document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},
  confirm(){prompted++;return approved;},
  setSectionAutoValue(type,sid,from,to){assert.equal(type,'new');assert.equal(sid,0);assert.equal(from,1);assert.equal(to,2);applied++;},
  startFor(){},scheduleDraftSave(){saved++;},setSessionStep(){},toast(){},
  setTimeout(callback){callback();},console
};
ctx.globalThis=ctx;
vm.runInNewContext(fs.readFileSync('js/features/goal-planning.js','utf8'),ctx,{filename:'goal-planning.js'});
const G=ctx.ImamApp.GoalPlanner;
const base={enabled:true,targetType:'surah',surahId:1,from:1,to:7,startDate:'2026-10-13',targetDate:'2026-11-13',sessionsPerWeek:2,weekDays:[2,5],ayahPerSession:2};
records.students.push({id:'st1',name:'Student',memorizationGoal:base,scheduleDays:[2,5]});
const present=(grade,from,to,extra={})=>({studentId:'st1',status:'حضر',prevGrades:{new:grade},actualRecitation:{new:{surah:'الفاتحة',from,to}},...extra});
records.sessions.push(
  // New assignment alone is not proof of completion.
  {studentId:'st1',status:'حضر',new:{surah:'الفاتحة',from:1,to:7}},
  present('ممتاز',1,2),present('ضعيف',3,7),present('إعادة',3,7),
  present('جيد',1,2), // same verses twice must not increase progress
  {studentId:'st1',status:'غاب',prevGrades:{new:'ممتاز'},actualRecitation:{new:{surah:'الفاتحة',from:3,to:7}}},
  {studentId:'another',status:'حضر',prevGrades:{new:'ممتاز'},actualRecitation:{new:{surah:'الفاتحة',from:3,to:7}}}
);
let a=G.analyze('st1','2026-10-20');
assert.equal(a.total,7);assert.equal(a.doneCount,2);assert.equal(a.remainingCount,5);
assert.equal(a.next.from,3);assert.equal(a.next.to,4);assert.equal(a.next.count,2);
assert.equal(a.preferred,2);assert.ok(a.expectedFinish.match(/^\d{4}-\d{2}-\d{2}$/));
assert.ok(a.plannedSessions>=8);assert.ok(a.sessionsUntilDeadline>0);
assert.equal(G.buildGuardian('st1').completed,2);
records.sessions.push(present('جيد جداً',3,3));
a=G.analyze('st1','2026-10-20');assert.equal(a.doneCount,3);assert.equal(a.next.from,4);
// Cross-surah targets and full Quran boundaries.
const count=t=>G.targetVerses({enabled:true,startDate:'2026-10-13',targetDate:'2027-10-13',...t}).length;
assert.equal(count({targetType:'quran'}),6236);
assert.equal(count({targetType:'juz',juz:1}),148);
assert.equal(count({targetType:'juzRange',juzFrom:1,juzTo:1}),148);
assert.equal(count({targetType:'juzRange',juzFrom:1,juzTo:30}),6236);
assert.equal(count({targetType:'custom',surahId:1,from:6,endSurahId:2,endAyah:3}),5);
assert.equal(count({targetType:'surah',surahId:112,from:1,to:4}),4);
assert.equal(G.cleanGoal({targetType:'juzRange',juzFrom:30,juzTo:31}).juzTo,30);
assert.equal(G.cleanGoal({targetType:'custom',surahId:10,from:5,endSurahId:9,endAyah:1}).endSurahId,10);
assert.equal(G.cleanGoal({...base,weekDays:[2,2,5,8,-1]}).sessionsPerWeek,2);
// Consent is mandatory: decline must never mutate the teacher's draft.
records.sessions.length=0;
ctx.goalPlanningApply('st1');assert.equal(prompted,1);assert.equal(applied,0);assert.equal(saved,0);
approved=true;
ctx.goalPlanningApply('st1');assert.equal(prompted,2);assert.equal(applied,1);assert.equal(saved,1);
console.log('PASS goal-planning-calculation-check (verified learning evidence, 5 goal types, real schedules, consent)');
