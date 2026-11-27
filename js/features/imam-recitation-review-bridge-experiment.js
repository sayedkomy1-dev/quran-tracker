'use strict';
/* Research only. No network, storage, authentication, or production loading. */
function projectApprovedRecitation(context, candidates, decisions, resolveLocation) {
  // Pure projection only. The caller must obtain context and decisions from a trusted,
  // authorized server. This function is not an authentication or persistence boundary.
  const id=v=>typeof v==='string'&&v.length>0&&v.length<=160&&v.trim()===v&&!/[\x00-\x1f\x7f]/.test(v);
  const integer=v=>Number.isInteger(v);
  const types=new Map([
    ...['تشكيل / حركة','نطق حرف','مخرج حرف','إبدال حرف','حذف حرف','زيادة حرف','كلمة خاطئة','حذف كلمة','زيادة كلمة','تقديم / تأخير كلمة'].map(t=>[t,'pronunciation']),
    ...['نسيان','تردد','تلقين'].map(t=>[t,'memory']),
    ...['إظهار','إدغام بغنة','إدغام بغير غنة','إخفاء','إقلاب','غنة','قلقلة','مد طبيعي','مد متصل','مد منفصل','مد لازم','تفخيم','ترقيق','وقف/ابتداء','حكم تجويدي آخر'].map(t=>[t,'tajweed'])
  ]);
  const scope=['ownerId','studentId','recordingId','sessionId','jobId','corpusVersion','engineVersion'];
  const same=x=>x&&scope.every(k=>x[k]===context[k]);
  const result={annotations:[],skipped:[],status:'projection-only'};
  if(!context||!scope.every(k=>id(context[k]))||!id(context.teacherId)||!integer(context.surahId)||context.surahId<1||context.surahId>114||!integer(context.fromAyah)||!integer(context.toAyah)||context.fromAyah<1||context.toAyah<context.fromAyah||context.toAyah>286||!integer(context.durationMs)||context.durationMs<1||context.durationMs>180000||typeof resolveLocation!=='function'||!Array.isArray(candidates)||!Array.isArray(decisions))return {...result,status:'invalid-context'};
  const counts=rows=>{const m=new Map();for(const x of rows)if(id(x?.candidateId))m.set(x.candidateId,(m.get(x.candidateId)||0)+1);return m;};
  const cc=counts(candidates),dc=counts(decisions);
  const reviewed=new Map(decisions.filter(d=>id(d?.candidateId)&&dc.get(d.candidateId)===1).map(d=>[d.candidateId,d]));
  const existing=new Set(Array.isArray(context.existingAnnotationIds)?context.existingAnnotationIds:[]);
  for(const c of candidates){
    const skip=reason=>result.skipped.push({candidateId:id(c?.candidateId)?c.candidateId:null,reason});
    if(!id(c?.candidateId)||cc.get(c.candidateId)!==1||!same(c)){skip('invalid-or-duplicate-candidate');continue;}
    const d=reviewed.get(c.candidateId);
    if(!same(d)||d.teacherId!==context.teacherId||d.decision!=='approved'||!id(d.decisionId)||!id(d.reviewedAt)||!Number.isFinite(Date.parse(d.reviewedAt))){skip('no-valid-teacher-approval');continue;}
    if(c.alignmentStatus!=='verified'||!types.has(c.type)||c.surahId!==context.surahId||!integer(c.ayah)||c.ayah<context.fromAyah||c.ayah>context.toAyah||!['ayah','word','char'].includes(c.targetLevel)){skip('unmapped-or-outside-assignment');continue;}
    if(!integer(c.wordIndex)||!integer(c.charIndex)||(c.targetLevel==='ayah'?(c.wordIndex!==-1||c.charIndex!==-1):c.wordIndex<0)||(c.targetLevel==='char'?c.charIndex<0:c.charIndex!==-1)){skip('invalid-index');continue;}
    const noTime=c.startMs==null&&c.endMs==null;
    if(!noTime&&(!integer(c.startMs)||!integer(c.endMs)||c.startMs<0||c.endMs<=c.startMs||c.endMs>context.durationMs)){skip('invalid-timing');continue;}
    // Do not trust model text. Resolver must use the academy's selected canonical corpus,
    // exact zero-based word/grapheme indexes, and reject mismatched corpus versions.
    let loc;try{loc=resolveLocation({corpusVersion:context.corpusVersion,surahId:c.surahId,ayah:c.ayah,targetLevel:c.targetLevel,wordIndex:c.wordIndex,charIndex:c.charIndex});}catch{skip('corpus-unavailable');continue;}
    if(!loc||loc.verified!==true||loc.corpusVersion!==context.corpusVersion||typeof loc.surah!=='string'||!loc.surah||typeof loc.ayahText!=='string'||!loc.ayahText||(c.targetLevel!=='ayah'&&(typeof loc.word!=='string'||!loc.word))||(c.targetLevel==='char'&&(typeof loc.charText!=='string'||!loc.charText))){skip('canonical-location-unverified');continue;}
    const annotationId='ai-reviewed:'+JSON.stringify([context.recordingId,context.jobId,c.candidateId]);
    if(existing.has(annotationId)){skip('already-projected');continue;}
    existing.add(annotationId);
    result.annotations.push({id:annotationId,source:'quran-word',mode:'recitation',type:c.type,group:types.get(c.type),surahId:c.surahId,surah:loc.surah,ayah:c.ayah,wordIndex:c.wordIndex,charIndex:c.charIndex,targetLevel:c.targetLevel,word:c.targetLevel==='ayah'?'الآية كاملة':loc.word,charText:c.targetLevel==='char'?loc.charText:'',ayahText:loc.ayahText,resolved:false,at:d.reviewedAt,aiEvidence:{recordingId:context.recordingId,jobId:context.jobId,candidateId:c.candidateId,engineVersion:context.engineVersion,corpusVersion:context.corpusVersion,teacherId:context.teacherId,decisionId:d.decisionId,reviewedAt:d.reviewedAt,startMs:noTime?null:c.startMs,endMs:noTime?null:c.endMs}});
  }
  return result;
}
if(typeof module==='object'&&module.exports)module.exports={projectApprovedRecitation};
