'use strict';
/* We Live Quran v10.5.2 — pure helpers for item-level recitation assessment + carry-forward. */
(function initRecitationCarry(g){
  const root=g.ImamApp||(g.ImamApp={});
  const QUARTER_LABELS=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن'];
  const PASSING=new Set(['ممتاز','جيد جداً','جيد جدًا','جيد']);

  function normalizeGrade(value){
    const v=String(value||'').trim();
    if(v==='جيد جدًا')return 'جيد جداً';
    if(v==='يحتاج متابعة')return 'ضعيف';
    return v;
  }
  function isPassingGrade(value){return PASSING.has(normalizeGrade(value));}
  function resultStatus(result){
    const r=result||{},grade=normalizeGrade(r.grade||r.evaluation||'');
    if(isPassingGrade(grade))return 'completed';
    if(grade==='ضعيف'||grade==='إعادة')return 'repeat';
    if(r.status==='completed'||r.status==='repeat'||r.status==='not_heard')return r.status;
    return 'not_heard';
  }
  function parseJuzChip(raw,knownJuz=[]){
    const value=String(raw||'').trim().replace(/^جزء\s*:\s*/,'').trim();
    if(!value)return null;
    const quarterMatch=value.match(/^(.*?)\s*[—-]\s*(?:ربع\s+الجزء\s+|الربع\s+)(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|[1-8])(?:\s*\/\s*(?:4|8))?(?:\s*[—·].*)?$/);
    let base=value,quarter=null;
    if(quarterMatch){
      base=quarterMatch[1].trim();
      const token=quarterMatch[2];
      quarter=/^[1-8]$/.test(token)?Number(token):QUARTER_LABELS.indexOf(token)+1;
    }
    const numeric=base.match(/^(?:الجزء|جزء)?\s*(\d{1,2})$/);
    if(numeric){const n=Number(numeric[1]);base=n>=1&&n<=knownJuz.length?knownJuz[n-1]:base;}
    if(!base.startsWith('جزء '))base='جزء '+base;
    const norm=x=>String(x||'').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
    const exact=knownJuz.find(x=>x===base)||knownJuz.find(x=>norm(x)===norm(base))||null;
    if(!exact)return null;
    return {juzName:exact,quarter};
  }
  function quarterChip(juzName,quarter){
    const q=Number(quarter);
    if(!(q>=1&&q<=8))return String(juzName||'').trim();
    return `${String(juzName||'').trim()} — الربع ${QUARTER_LABELS[q-1]}`;
  }
  function itemLabel(item){
    if(item?.type==='juz_quarter')return quarterChip(item.juzName,item.quarter);
    if(item?.surahName)return `سورة ${item.surahName}`;
    return String(item?.label||'').trim();
  }
  function pendingItems(assignments,resultMap){
    const out=[];
    for(const assignment of assignments||[]){
      const byId=resultMap?.[assignment.id]||{};
      for(const item of assignment.items||[]){
        const result=byId[item.id]||{};
        if(resultStatus(result)!=='completed')out.push({...item,_assignmentType:assignment.type,_assignmentId:assignment.id,_status:resultStatus(result),_grade:normalizeGrade(result.grade||result.evaluation||'')});
      }
    }
    return out;
  }
  const api={QUARTER_LABELS,normalizeGrade,isPassingGrade,resultStatus,parseJuzChip,quarterChip,itemLabel,pendingItems};
  root.RecitationCarry=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
