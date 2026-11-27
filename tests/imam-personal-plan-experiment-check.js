'use strict';
const assert=require('node:assert/strict');
const {buildPersonalPlan}=require('../js/features/imam-personal-plan-experiment.js');
function checks(build,assert){
 const catalog=[['recall','الحفظ'],['articulation','المخارج']];
 const p={distinctDays:2,distinctLocations:2,lastSeen:'2026-11-03',evidence:[{sessionId:'s1',day:'2026-11-01',surah:2,ayah:35},{sessionId:'s2',day:'2026-11-03',surah:2,ayah:36}]};
 const input={ownerId:'o',studentId:'s',asOf:'2026-11-04',graph:{nodes:[{id:'recall',patterns:[p]},{id:'articulation',patterns:[]}]},skillEvidence:{skills:[{skillId:'recall',state:'demonstrated',latestDay:'2026-11-04',evidence:[]},{skillId:'articulation',state:'needs-practice',latestDay:'2026-11-04',evidence:[]}]},similarPairs:[{surahId:2,ayahNumber:35,similarSurahId:7,similarAyahNumber:19}],resolveVerse:()=>({text:'fixture'}),methodObservations:[{id:'m1',ownerId:'o',studentId:'s',teacherId:'t',skillId:'recall',methodId:'repeat',day:'2026-11-03',reviewStatus:'approved',source:'teacher-observation',outcome:'demonstrated'}]};
 const run=x=>build({...input,...x},catalog);let n=0;const check=(v,m)=>{assert(v,m);n++;};
 const out=run({});check(out.activities.length===2,'two relevant activities');
 check(out.activities[0].skillId==='articulation','explicit needs first');
 check(out.activities[1].currentEvidence==='demonstrated','historical errors not overriding new positive test');
 check(out.similarVerseChecks.length===1&&!out.similarVerseChecks[0].confusionEstablished,'similarity not diagnosis');
 check(run({resolveVerse:()=>null}).similarVerseChecks.length===0,'unresolved pair blocked');
 check(run({similarPairs:[{surahId:3,ayahNumber:1,similarSurahId:4,similarAyahNumber:1}]}).similarVerseChecks.length===0,'irrelevant pair');
 check(out.methodHistory[0].causalEffect===null,'method not causal');
 check(run({methodObservations:[{...input.methodObservations[0],studentId:'another'}]}).methodHistory.length===0,'student isolated');
 check(run({methodObservations:[{...input.methodObservations[0],ownerId:'another'}]}).methodHistory.length===0,'tenant isolated');
 check(run({methodObservations:[{...input.methodObservations[0],reviewStatus:'pending'}]}).methodHistory.length===0,'pending method excluded');
 check(run({graph:{nodes:[]},skillEvidence:{skills:[]}}).activities.length===0,'no invented activity');
 check(!out.automaticAssignment&&!out.automaticMastery,'no automatic grading');
 check(out.activities.every(a=>a.requiresTeacherReview),'teacher gate');
 check(run({asOf:'2026-02-30'}).status==='invalid-scope','invalid date');
 return n;
}
console.log('PASS',checks(buildPersonalPlan,assert),'personal plan checks');
