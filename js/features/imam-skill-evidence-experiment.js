'use strict';
/* Experimental read-only projection; requires authenticated teacher observations supplied by caller. */
function buildSkillEvidence({ownerId,studentId,asOf,assessments},catalog){
 const goodId=v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=160;
 const day=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return '';const x=new Date(v+'T00:00:00Z');return Number.isFinite(x.getTime())&&x.toISOString().slice(0,10)===v?v:'';};
 if(!goodId(ownerId)||!goodId(studentId)||!day(asOf)||!Array.isArray(assessments)||!Array.isArray(catalog))return {status:'invalid-input',skills:[]};
 const known=new Set(catalog.map(x=>x[0]));
 const relevant=assessments.filter(a=>a?.ownerId===ownerId&&a.studentId===studentId);
 const counts=new Map();for(const a of relevant)if(goodId(a.id))counts.set(a.id,(counts.get(a.id)||0)+1);
 const bySkill=new Map();
 for(const a of relevant){
  if(!goodId(a.id)||counts.get(a.id)!==1||!known.has(a.skillId)||!goodId(a.teacherId)||!goodId(a.assessmentId)||!goodId(a.criterionVersion)||a.source!=='teacher-observation'||a.reviewStatus!=='approved'||!day(a.observedDay)||!day(a.reviewedDay)||a.observedDay>a.reviewedDay||a.reviewedDay>asOf||!['demonstrated','needs-practice','inconclusive'].includes(a.outcome))continue;
  const e={id:a.id,assessmentId:a.assessmentId,teacherId:a.teacherId,criterionVersion:a.criterionVersion,observedDay:a.observedDay,reviewedDay:a.reviewedDay,outcome:a.outcome};
  if(!bySkill.has(a.skillId))bySkill.set(a.skillId,[]);
  bySkill.get(a.skillId).push(e);
 }
 return {status:'evidence-only',skills:catalog.map(([skillId,title])=>{
   const rows=(bySkill.get(skillId)||[]).sort((a,b)=>a.observedDay.localeCompare(b.observedDay)||a.reviewedDay.localeCompare(b.reviewedDay)||a.id.localeCompare(b.id));
   // Multiple records for the same assessment or conflicting same-day outcomes
   // are not votes and do not establish a new mastery status.
   const latestDay=rows.at(-1)?.observedDay||null;
   const latest=rows.filter(x=>x.observedDay===latestDay);
   const outcomes=new Set(latest.map(x=>x.outcome));
   const state=outcomes.size===1?latest[0].outcome:latest.length?'inconclusive':'unknown';
   return {skillId,title,state,latestDay,observations:rows.length,demonstratedDays:new Set(rows.filter(x=>x.outcome==='demonstrated').map(x=>x.observedDay)).size,evidence:rows.slice(-20),evidenceTruncated:rows.length>20,mastery:null};
 }),limitations:['Explicit teacher observations only; not an automatic mastery score.','A demonstrated skill in an assessment does not guarantee retention or transfer.','Same-day conflicting observations are inconclusive.']};
}
if(typeof module==='object'&&module.exports)module.exports={buildSkillEvidence};
