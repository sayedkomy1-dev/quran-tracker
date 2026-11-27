'use strict';
const assert=require('node:assert/strict');
const {buildSkillEvidence}=require('../js/features/imam-skill-evidence-experiment.js');
function testEvidence(build,assert){
 const catalog=[['a','a'],['b','b']];
 const a={id:'1',ownerId:'o',studentId:'s',skillId:'a',teacherId:'t',assessmentId:'test1',criterionVersion:'v1',source:'teacher-observation',reviewStatus:'approved',observedDay:'2026-11-01',reviewedDay:'2026-11-01',outcome:'demonstrated'};
 const b={...a,id:'2',assessmentId:'test2',observedDay:'2026-11-03',reviewedDay:'2026-11-03',outcome:'needs-practice'};
 const run=(assessments,extra={})=>build({ownerId:'o',studentId:'s',asOf:'2026-11-05',assessments,...extra},catalog);
 let n=0;const check=(x,m)=>{assert(x,m);n++;};
 check(run([]).skills[0].state==='unknown','absence unknown');
 check(run([a]).skills[0].state==='demonstrated','positive evidence');
 check(run([a,b]).skills[0].state==='needs-practice','latest observation');
 check(run([a,b]).skills[0].demonstratedDays===1,'history retained');
 check(run([a,b]).skills[0].mastery===null,'no mastery score');
 check(run([a,{...b,observedDay:a.observedDay}]).skills[0].state==='inconclusive','same-day disagreement');
 check(run([{...a,studentId:'other'}]).skills[0].state==='unknown','student isolation');
 check(run([{...a,ownerId:'other'}]).skills[0].state==='unknown','tenant isolation');
 check(run([{...a,source:'ai'}]).skills[0].state==='unknown','ai not teacher evidence');
 check(run([{...a,reviewStatus:'pending'}]).skills[0].state==='unknown','pending excluded');
 check(run([{...a,reviewedDay:'2026-11-06'}]).skills[0].state==='unknown','future excluded');
 check(run([a,a]).skills[0].state==='unknown','duplicate records excluded');
 check(run([{...a,criterionVersion:''}]).skills[0].state==='unknown','criterion required');
 check(run([{...a,observedDay:'2026-02-30'}]).skills[0].state==='unknown','invalid day');
 check(run([a]).skills[1].state==='unknown','no inferred prerequisite');
 check(run([a],{ownerId:''}).status==='invalid-input','invalid owner');
 const before=JSON.stringify([a,b]);run([a,b]);check(JSON.stringify([a,b])===before,'no mutation');
 return n;
}
console.log('PASS',testEvidence(buildSkillEvidence,assert),'skill evidence checks');
