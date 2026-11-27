'use strict';
/* Experimental, read-only, local learning memory. Not loaded by production. */
function buildLearningMemory(sessions, studentId, asOf) {
  const validDay = value => {
    const s = String(value ?? '').slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    const d = new Date(s+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===s ? s : '';
  };
  const clean = (value,max=80) => String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
  const empty = () => ({status:'insufficient-evidence',sessions:0,patterns:[],limitations:['No mastery or causal diagnosis can be inferred from missing error annotations.']});
  const cutoff=validDay(asOf);
  if(!clean(studentId,160)||!cutoff||!Array.isArray(sessions)) return empty();
  const bySession=new Map(),conflicts=new Set();
  for(const s of sessions){
    if(!s||String(s.studentId)!==String(studentId)||s.status!=='حضر') continue;
    const id=clean(s.id,160), day=validDay(s.sessionDate||s.date);
    if(!id||!day||day>cutoff||conflicts.has(id)) continue;
    if(bySession.has(id)){bySession.delete(id);conflicts.add(id);continue;}
    bySession.set(id,{s,day});
  }
  const buckets=new Map();
  for(const [sessionId,{s,day}] of bySession){
    for(const e of Array.isArray(s.recitationErrors)?s.recitationErrors:[]){
      if(!e||e.source!=='quran-word')continue;
      const surah=Number(e.surahId),ayah=Number(e.ayah),word=Number(e.wordIndex),type=clean(e.type);
      const level=e.targetLevel==='ayah'?'ayah':e.targetLevel==='char'?'char':'word';
      if(!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>286||!Number.isInteger(word)||(level==='ayah'?word!==-1:word<0)||e.wordIndex==null||!type)continue;
      const char=Number(e.charIndex);
      if(level==='char'&&(!Number.isInteger(char)||char<0||e.charIndex==null))continue;
      const letter=e.targetLevel==='char'&&Number.isInteger(char)&&char>=0&&e.charIndex!=null?clean(e.charText,10).replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,''):'';
      const key=JSON.stringify([type,/^[ء-ي]$/.test(letter)?letter:'']);
      const loc=JSON.stringify([surah,ayah,word,e.targetLevel==='char'&&Number.isInteger(char)&&char>=0&&e.charIndex!=null?char:-1]);
      const b=buckets.get(key)||{type,letter:/^[ء-ي]$/.test(letter)?letter:null,days:new Set(),locations:new Set(),records:new Map()};
      const ref=JSON.stringify([sessionId,loc]);
      if(b.records.has(ref)) continue;
      b.days.add(day);b.locations.add(loc);
      b.records.set(ref,{sessionId,day,surah,ayah,wordIndex:word,targetLevel:level,charIndex:JSON.parse(loc)[3],errorId:clean(e.id,160)||null});
      buckets.set(key,b);
    }
  }
  const patterns=[...buckets.values()].filter(b=>b.days.size>=2&&b.locations.size>=2).map(b=>{
    const evidence=[...b.records.values()].sort((a,c)=>a.day.localeCompare(c.day)||a.sessionId.localeCompare(c.sessionId)||a.surah-c.surah||a.ayah-c.ayah||a.wordIndex-c.wordIndex||a.charIndex-c.charIndex);
    return {kind:'observed-cross-location-pattern',type:b.type,letter:b.letter,distinctDays:b.days.size,distinctLocations:b.locations.size,observations:evidence.length,firstSeen:evidence[0].day,lastSeen:evidence[evidence.length-1].day,evidence:evidence.slice(-20),evidenceTruncated:evidence.length>20,requiresTeacherReview:true,suggestedAction:'recheck-in-new-context'};
  }).sort((a,b)=>b.distinctDays-a.distinctDays||b.distinctLocations-a.distinctLocations||a.type.localeCompare(b.type)||String(a.letter).localeCompare(String(b.letter)));
  return {status:patterns.length?'review-required':'insufficient-evidence',sessions:bySession.size,patterns,limitations:['Historical annotations only; a recurring pattern is not a diagnosis or proof of a current weakness.','Missing observations are not evidence of mastery.','Duplicate session IDs are excluded pending reconciliation.']};
}
if(typeof module==='object'&&module.exports)module.exports={buildLearningMemory};
