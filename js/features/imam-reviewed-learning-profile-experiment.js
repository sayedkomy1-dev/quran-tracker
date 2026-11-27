'use strict';
/* Research only: no writes, network, UI loading, authorization or grading. */
function candidateSnapshot(c){
  if(!c||typeof c!=='object')return '';
  return JSON.stringify(['review-v1',...['ownerId','studentId','recordingId','sessionId','jobId','corpusVersion','engineVersion','candidateId','type','alignmentStatus','surahId','ayah','targetLevel','wordIndex','charIndex','startMs','endMs'].map(k=>c[k]??null)]);
}
function buildReviewedLearningProfile(input, deps){
  const {ownerId,studentId,asOf,sessions,batches,resolveLocation}=input||{};
  const invalid=()=>({status:'invalid-scope',projected:0,skipped:[],memory:null,graph:null});
  const validId=x=>typeof x==='string'&&x.length>0&&x.length<=160&&x.trim()===x;
  const day=x=>{if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x))return '';const d=new Date(x+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x?x:'';};
  if(!validId(ownerId)||!validId(studentId)||!day(asOf)||!Array.isArray(sessions)||!Array.isArray(batches)||typeof resolveLocation!=='function')return invalid();
  // Sessions and review decisions must be scoped by an authenticated caller; this is not an authorization boundary.
  const scoped=sessions.filter(s=>s&&s.ownerId===ownerId&&s.studentId===studentId);
  const count=(rows,fn)=>{const m=new Map();for(const x of rows){const k=fn(x);if(k)m.set(k,(m.get(k)||0)+1);}return m;};
  const sessionCounts=count(scoped,s=>s.id);
  const copies=scoped.filter(s=>validId(s.id)&&sessionCounts.get(s.id)===1).map(s=>({...s,recitationErrors:(Array.isArray(s.recitationErrors)?s.recitationErrors:[]).map(e=>({...e}))}));
  const byId=new Map(copies.map(s=>[s.id,s]));
  const relevant=batches.filter(b=>b?.context?.ownerId===ownerId&&b.context.studentId===studentId);
  const recordingCounts=count(relevant,b=>b.context.recordingId),jobCounts=count(relevant,b=>b.context.jobId);
  const skipped=[];let projected=0;
  for(const b of relevant){
    const c=b.context,s=byId.get(c.sessionId),when=day(String(s?.sessionDate||s?.date||'').slice(0,10));
    const skip=reason=>skipped.push({jobId:c.jobId??null,reason});
    if(!s||s.status!=='حضر'||!when||when>asOf){skip('no-existing-attended-session');continue;}
    if(!validId(c.recordingId)||!validId(c.jobId)||recordingCounts.get(c.recordingId)!==1||jobCounts.get(c.jobId)!==1){skip('duplicate-or-invalid-job');continue;}
    if(s.recordingId!==c.recordingId){skip('recording-not-linked-to-session');continue;}
    const candidates=Array.isArray(b.candidates)?b.candidates:[],decisions=Array.isArray(b.decisions)?b.decisions:[];
    const candidateCounts=count(candidates,x=>x?.candidateId),decisionCounts=count(decisions,x=>x?.candidateId);
    const candidatesById=new Map(candidates.filter(x=>candidateCounts.get(x?.candidateId)===1).map(x=>[x.candidateId,x]));
    const allowed=decisions.filter(d=>{
      const item=candidatesById.get(d?.candidateId),reviewDay=day(String(d?.reviewedAt||'').slice(0,10));
      return item&&decisionCounts.get(d.candidateId)===1&&d.approvedSnapshot===candidateSnapshot(item)&&reviewDay&&reviewDay>=when&&reviewDay<=asOf;
    });
    const existing=s.recitationErrors.map(e=>e.id);
    const out=deps.projectApprovedRecitation({...c,existingAnnotationIds:existing},candidates,allowed,resolveLocation);
    s.recitationErrors.push(...out.annotations);projected+=out.annotations.length;
    for(const e of out.skipped)skipped.push({jobId:c.jobId,...e});
  }
  const memory=deps.buildLearningMemory(copies,studentId,asOf);
  const graph=deps.projectSkillGraph(memory,deps.SKILLS);
  return {status:'review-only-preview',projected,skipped,memory,graph};
}
if(typeof module==='object'&&module.exports)module.exports={candidateSnapshot,buildReviewedLearningProfile};
