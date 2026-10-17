'use strict';
/* 11.8.1: Quran text throughout all teacher review phases, no new local schema. */
(function(g){
  const app=()=>g.ImamApp||{};
  let parts=[];
  const q=(id)=>document.getElementById(id);
  const surahs=()=>typeof S!=='undefined'?S:(g.S||[]);
  function rangeForSection(key){
    if(!['new','rec','far'].includes(key))return null;
    const list=surahs(),val=q(key+'-s')?.value||'',idx=list.findIndex(s=>s.n===val||('سورة '+s.n)===val);
    if(idx<0)return null;
    const max=list[idx].a,full=q(key+'-full')?.checked;
    let from=full?1:Number(q(key+'-f')?.value),to=full?max:Number(q(key+'-t')?.value);
    if(!full&&(!from||!to))return null;
    from=Math.min(max,Math.max(1,from||1));to=Math.min(max,Math.max(1,to||max));
    return{surah:list[idx].n,from:Math.min(from,to),to:Math.max(from,to)};
  }
  function openSection(key){
    const data=rangeForSection(key);
    if(!data){g.toast?.('اختر السورة ونطاق الآيات قبل فتح النص','info');return;}
    if(key==='new'&&typeof g.openQuranTextModal==='function')return g.openQuranTextModal();
    return g.openQuranRangeText?.(data);
  }
  // A quarter can cross surah boundaries. Build exact inclusive ranges up to (not
  // including) the following rub', then navigate per surah using the existing
  // single-surah Quran reader so word-level corrections keep the right reference.
  function segments(juz,quarter){
    const structure=app().QuranStructure,list=surahs();
    const start=structure?.refFor?.(juz,quarter);
    const end=quarter<8?structure?.refFor?.(juz,quarter+1):juz<30?structure?.refFor?.(juz+1,1):{surah:115,ayah:1};
    if(!start||!end||start.surah>end.surah||!list[start.surah-1])return[];
    const ranges=[];
    for(let chapter=start.surah;chapter<=Math.min(end.surah,114);chapter++){
      const name=list[chapter-1]?.n,max=list[chapter-1]?.a;
      if(!name||!max)break;
      const from=chapter===start.surah?start.ayah:1;
      const to=chapter===end.surah?end.ayah-1:max;
      if(from<=to&&from>=1)ranges.push({surah:name,from,to,chapter});
    }
    return ranges;
  }
  function drawParts(selected){
    const modal=q('quranTextModal');if(!modal)return;
    let host=q('v1181RangeParts');
    if(!host){host=document.createElement('nav');host.id='v1181RangeParts';host.className='v1181-range-parts';host.setAttribute('aria-label','أجزاء نطاق المراجعة');modal.querySelector('#quranSourceNote')?.insertAdjacentElement('afterend',host);}
    host.hidden=false;
    host.innerHTML=`<span>نطاق المراجعة (${parts.length} ${parts.length===1?'سورة':'سور'})</span>`;
    parts.forEach((r,i)=>{
      const b=document.createElement('button');b.type='button';b.className=i===selected?'active':'';
      b.textContent=`سورة ${r.surah} · ${r.from}–${r.to}`;b.setAttribute('aria-current',i===selected?'true':'false');
      b.addEventListener('click',()=>openPart(i));host.appendChild(b);
    });
  }
  function openPart(i){
    if(!parts[i])return;
    // The reader's range is always the ACTIVE surah, never a misleading multi-surah range.
    g.openQuranRangeText?.(parts[i]);drawParts(i);
  }
  function openQuarter(j,qtr){
    const result=segments(Number(j),Number(qtr));
    if(!result.length){g.toast?.('تعذر تحديد بداية ونهاية الربع','error');return;}
    parts=result;openPart(0);
  }
  function openJuzChip(i){
    const raw=typeof juzChips!=='undefined'?juzChips[i]:null;
    const parsed=app().RecitationCarry?.parseJuzChip?.(raw,typeof JZ!=='undefined'?JZ:[]);
    if(!parsed){g.toast?.('اختر جزءًا أو ربعًا أولًا','info');return;}
    const j=(typeof JZ!=='undefined'?JZ:[]).indexOf(parsed.juzName)+1;
    if(j<=0)return;
    if(parsed.quarter)return openQuarter(j,parsed.quarter);
    const list=Array.from({length:8},(_,i)=>segments(j,i+1)).flat();
    parts=[];
    for(const r of list){const prev=parts[parts.length-1];if(prev&&prev.chapter===r.chapter&&prev.to+1===r.from)prev.to=r.to;else parts.push({...r});}
    if(parts.length)openPart(0);
  }
  function openSurahReviewChip(i){
    const chip=typeof surahReviewChips!=='undefined'?surahReviewChips[i]:'';
    const name=String(chip||'').replace(/^سورة\s+/,'').trim();
    const idx=surahs().findIndex(x=>x.n===name);
    if(idx<0)return g.toast?.('اختر سورة للمراجعة أولًا','info');
    return g.openQuranRangeText?.({surah:name,from:1,to:surahs()[idx].a});
  }
  // Hide old multi-surah navigation when reader is opened for another review.
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('button');if(!button)return;
    const inline=button.getAttribute('onclick')||'';
    if(/\b(openPrevQuranText|openQuranRangeText|openQuranTextModal|v1181OpenCurrentSection|v1181OpenSurahReviewChip)\s*\(/.test(inline)){
      const nav=q('v1181RangeParts');if(nav)nav.hidden=true;
    }
  },true);
  g.v1181OpenCurrentSection=openSection;
  g.v1181OpenQuarterText=openQuarter;
  g.v1181OpenJuzChipText=openJuzChip;
  g.v1181OpenSurahReviewChip=openSurahReviewChip;
  app().RevisionQuranText={rangeForSection,segments,openSection,openQuarter,openJuzChip,openSurahReviewChip};
  if(typeof module!=='undefined'&&module.exports)module.exports={segments};
})(globalThis);
