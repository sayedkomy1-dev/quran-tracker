'use strict';
/* Research projection only. No changes to existing Smart Revision or official assignments. */
function buildPersonalPlan(input,catalog){
 const {ownerId,studentId,asOf,graph,skillEvidence,similarPairs,resolveVerse,methodObservations}=input||{};
 const day=x=>{if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x))return '';const d=new Date(x+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x?x:'';};
 const id=x=>typeof x==='string'&&x.length>0&&x.length<=160&&x.trim()===x;
 const invalid={status:'invalid-scope',activities:[],methodHistory:[]};
 if(!id(ownerId)||!id(studentId)||!day(asOf)||!Array.isArray(catalog)||!Array.isArray(graph?.nodes)||!Array.isArray(skillEvidence?.skills))return invalid;
 // Input graph/evidence must have been calculated under the same authorized scope.
 const known=new Map(catalog.map(n=>[n[0],n[1]])),activities=[];
 for(const [skillId,title] of known){
   const g=graph.nodes.find(x=>x.id===skillId),e=skillEvidence.skills.find(x=>x.skillId===skillId);
   const patterns=(g?.patterns||[]).filter(p=>p.distinctDays>=2&&p.distinctLocations>=2&&day(p.lastSeen)&&p.lastSeen<=asOf);
   const current=e&&day(e.latestDay)&&e.latestDay<=asOf?e.state:'unknown';
   if(!patterns.length&&current!=='needs-practice'&&current!=='inconclusive')continue;
   const evidence=patterns.flatMap(p=>Array.isArray(p.evidence)?p.evidence.map(x=>({sessionId:x.sessionId,day:x.day,surah:x.surah,ayah:x.ayah,wordIndex:x.wordIndex,charIndex:x.charIndex})):[]).filter(x=>id(x.sessionId)&&day(x.day)&&x.day<=asOf);
   const score=current==='needs-practice'?3:current==='inconclusive'?2:1;
   const checks=(g?.candidateChecks||[]).filter(x=>known.has(x.skillId)).map(x=>({skillId:x.skillId,label:known.get(x.skillId),reviewStatus:'unreviewed'}));
   activities.push({kind:'teacher-skill-check',skillId,title,priority:score,reason:current==='needs-practice'?'teacher-observed-need':current==='inconclusive'?'inconclusive-assessment':'historical-error-pattern',currentEvidence:current,evidence:evidence.slice(-20),assessmentEvidence:(e?.evidence||[]).slice(-5),candidateChecks:checks,requiresTeacherReview:true});
 }
 // Suggested similar-verse pairs are only shown when one reference is actually
 // present in an observed memory/word-accuracy pattern. Neither pair nor error proves confusion.
 const locationSet=new Set(activities.filter(a=>['recall','word-accuracy'].includes(a.skillId)).flatMap(a=>a.evidence.map(x=>`${x.surah}:${x.ayah}`)));
 const similar=[],seen=new Set();
 if(typeof resolveVerse==='function')for(const p of Array.isArray(similarPairs)?similarPairs:[]){
   if(!p||!Number.isInteger(p.surahId)||!Number.isInteger(p.ayahNumber)||!Number.isInteger(p.similarSurahId)||!Number.isInteger(p.similarAyahNumber))continue;
   const a=`${p.surahId}:${p.ayahNumber}`,b=`${p.similarSurahId}:${p.similarAyahNumber}`,k=[a,b].sort().join('|');
   if(a===b||seen.has(k)||(!locationSet.has(a)&&!locationSet.has(b)))continue;
   let av,bv;try{av=resolveVerse(p.surahId,p.ayahNumber);bv=resolveVerse(p.similarSurahId,p.similarAyahNumber);}catch{continue;}
   if(!av||!bv)continue;
   seen.add(k);similar.push({kind:'possible-similarity-check',pair:[a,b],reviewStatus:'unreviewed',requiresTeacherReview:true,confusionEstablished:false});
 }
 const methods=[];
 const groups=new Map(),rows=Array.isArray(methodObservations)?methodObservations:[];
 const scoped=rows.filter(x=>x?.ownerId===ownerId&&x.studentId===studentId),counts=new Map();
 for(const x of scoped)if(id(x.id))counts.set(x.id,(counts.get(x.id)||0)+1);
 for(const x of scoped){
   if(!id(x.id)||counts.get(x.id)!==1||!id(x.teacherId)||!known.has(x.skillId)||!id(x.methodId)||!day(x.day)||x.day>asOf||x.reviewStatus!=='approved'||x.source!=='teacher-observation'||!['demonstrated','needs-practice','inconclusive'].includes(x.outcome))continue;
   const key=JSON.stringify([x.skillId,x.methodId]),m=groups.get(key)||{skillId:x.skillId,methodId:x.methodId,observations:[],causalEffect:null};
   m.observations.push({id:x.id,day:x.day,outcome:x.outcome});groups.set(key,m);
 }
 for(const m of groups.values())methods.push({...m,observations:m.observations.sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id)).slice(-20),interpretation:'observations-following-method-not-causal-effect'});
 return {status:'teacher-review-required',activities:activities.sort((a,b)=>b.priority-a.priority||a.skillId.localeCompare(b.skillId)).slice(0,5),similarVerseChecks:similar.slice(0,5),methodHistory:methods,automaticAssignment:false,automaticMastery:false};
}
if(typeof module==='object'&&module.exports)module.exports={buildPersonalPlan};
