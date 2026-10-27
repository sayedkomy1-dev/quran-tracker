'use strict';
/* Beta.27: choose teacher assignment endpoints while reading the complete surah.
   Educational UI only; no writes to sessions/guardian state without explicit approval. */
(function(g){
  const $=id=>g.document?.getElementById(id);
  const kinds={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة'};
  const surahs=()=>typeof S!=='undefined'?S:(g.S||[]);
  const resolveSurah=(name)=>surahs().findIndex(x=>x.n===String(name||'').replace(/^سورة\s+/,'').trim());
  const asAyah=(n,max)=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=max?Number(n):null;
  const escapeHTML=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let draft=null,request=0, opening=false;
  // Chapter data already comes from the existing verified QPC Hafs source. Keep the
  // same chapter promise in this page to avoid another IndexedDB read or HTTP call.
  const chapterReady=new Map(),chapterPending=new Map();
  let prefetchTimer=0;
  function cachedChapter(chapter){
    chapter=Number(chapter);
    if(!Number.isInteger(chapter)||chapter<1||chapter>114)return Promise.reject(new Error('Invalid chapter'));
    if(chapterReady.has(chapter))return Promise.resolve(chapterReady.get(chapter));
    if(chapterPending.has(chapter))return chapterPending.get(chapter);
    const loader=g.__ia27OriginalQpcLoader||g.fetchQpcHafsChapter;
    if(typeof loader!=='function')return Promise.reject(new Error('No Quran text source'));
    const promise=Promise.resolve().then(()=>loader(chapter)).then(rows=>{
      if(!Array.isArray(rows)||!rows.length)throw new Error('Empty Quran chapter');
      chapterReady.set(chapter,rows);return rows;
    }).finally(()=>chapterPending.delete(chapter));
    chapterPending.set(chapter,promise);return promise;
  }
  function prefetchChapter(key){
    const idx=resolveSurah($(key+'-s')?.value);
    if(idx<0)return;
    clearTimeout(prefetchTimer);
    prefetchTimer=setTimeout(()=>cachedChapter(idx+1).catch(()=>{}),240);
  }

  function snapshot(key){
    const name=$(key+'-s')?.value,idx=resolveSurah(name);
    if(idx<0)return null;
    const max=Number(surahs()[idx].a),full=!!$(key+'-full')?.checked;
    const from=full?1:asAyah($(key+'-f')?.value,max);
    const to=full?max:asAyah($(key+'-t')?.value,max);
    return{key,idx,surah:surahs()[idx].n,max,from:from||1,to:to&&to>=(from||1)?to:null,full};
  }
  function dismiss(skipDecoration=false){
    if(!draft)return;
    draft=null;const box=$('ia27RangePicker');if(box)box.hidden=true;
    $('quranTextModal')?.classList.remove('ia27-selecting-range');
    if(!skipDecoration)g.ImamTeacherErrorMarking?.decorate?.();
  }
  function ensure(){
    let panel=$('ia27RangePicker');if(panel)return panel;
    const target=$('quranSourceNote');if(!target)return null;
    panel=g.document.createElement('section');panel.id='ia27RangePicker';panel.className='ia27-text-picker';panel.dir='rtl';panel.hidden=true;
    panel.innerHTML='<b id="ia27PickerTitle">اختيار الموضع من النص</b><p id="ia27PickerHint" role="status"></p><div class="ia27-picker-fields"><label>من آية <input id="ia27PickerFrom" type="number" min="1" inputmode="numeric" aria-label="آية البداية"></label><label>إلى آية <input id="ia27PickerTo" type="number" min="1" inputmode="numeric" aria-label="آية النهاية" placeholder="اختارها من النص"></label></div><div class="ia27-picker-actions"><button type="button" id="ia27PickStart" data-picker="start">تحديد البداية من النص</button><button type="button" id="ia27PickEnd" data-picker="end">تحديد النهاية من النص</button><button type="button" id="ia27ApprovePicker" data-picker="approve" class="ia27-picker-approve">اعتماد النطاق</button><button type="button" data-picker="dismiss">عرض النص فقط</button></div>';
    target.insertAdjacentElement('afterend',panel);
    panel.addEventListener('click',e=>{const cmd=e.target.closest('[data-picker]')?.dataset.picker;if(cmd==='start'||cmd==='end'){if(draft){draft.mode=cmd;refresh();}}if(cmd==='approve')approve();if(cmd==='dismiss')dismiss();});
    for(const [id,field] of [['ia27PickerFrom','from'],['ia27PickerTo','to']])$(id).addEventListener('change',()=>{if(!draft)return;const value=asAyah($(id).value,draft.max);draft[field]=value;if(field==='from'&&!draft.from)draft.from=1;if(draft.to&&draft.to<draft.from)draft.to=null;refresh();if(field==='from')displayFromBeginning();});
    $('quranVerseContent')?.addEventListener('click',e=>{
      if(!draft||!e.target.closest('.quran-ayah-num, .ia27-choose-end'))return;
      const verse=e.target.closest('.quran-ayah');const num=Number(verse?.dataset.ayah);
      if(!num||num<1||num>draft.max)return;
      e.stopPropagation(); // Verse-number selection must not register word/letter errors.
      if(draft.mode==='start'){draft.from=num;if(draft.to&&draft.to<num)draft.to=null;draft.mode='end';}
      else if(num<draft.from){g.toast?.('آية النهاية لا تسبق آية البداية','info');return;}
      else draft.to=num;
      refresh();
      if(draft.to){
        g.toast?.(`تم اختيار الآية ${draft.to} كنهاية. اضغط «اعتماد النطاق» لإكمال التكليف`,'success');
        // On phones the approval button is above the long Quran passage.
        g.requestAnimationFrame?.(()=>$('ia27RangePicker')?.scrollIntoView?.({block:'start',behavior:'smooth'}));
      }
    },true);
    return panel;
  }
  function refresh(){
    if(!draft)return;
    const panel=ensure();if(!panel)return;
    panel.hidden=false;$('quranTextModal')?.classList.add('ia27-selecting-range');
    $('ia27PickerTitle').textContent=`تحديد ${kinds[draft.key]||'التسميع'} — سورة ${draft.surah}`;
    $('ia27PickerHint').textContent=draft.mode==='start'?'اضغط على رقم آية البداية، ثم حدد النهاية.':'اقرأ حتى نهاية السورة، ثم اضغط على رقم الآية التي تريد الوقوف عندها.';
    $('ia27PickerFrom').value=draft.from;
    $('ia27PickerFrom').max=draft.max;
    $('ia27PickerTo').value=draft.to||'';
    $('ia27PickerTo').max=draft.max;
    for(const mode of ['start','end'])$('ia27Pick'+(mode==='start'?'Start':'End')).setAttribute('aria-pressed',String(draft.mode===mode));
    $('ia27ApprovePicker').disabled=!draft.to;
    $('quranVerseContent')?.querySelectorAll('.quran-ayah').forEach(el=>{
      // A genuine large tap target. Word/letter error buttons remain unchanged.
      const numEl=el.querySelector('.quran-ayah-num');
      if(numEl&&numEl.tagName!=='BUTTON'){
        const b=g.document.createElement('button');b.type='button';b.className=numEl.className+' ia27-choose-end';
        b.textContent=numEl.textContent;b.setAttribute('aria-label',`اختيار الآية ${el.dataset.ayah} كنهاية أو بداية للتكليف`);
        b.title='اضغط لاختيار الآية';numEl.replaceWith(b);
      }
      const number=el.querySelector('.quran-ayah-num');
      if(number)number.setAttribute('aria-pressed',String(Number(el.dataset.ayah)===(draft.mode==='start'?draft.from:draft.to)));
      const ayah=Number(el.dataset.ayah);
      el.classList.toggle('ia27-picked',!!draft.to&&ayah>=draft.from&&ayah<=draft.to);
      el.classList.toggle('ia27-picked-start',ayah===draft.from);
      el.classList.toggle('ia27-picked-end',!!draft.to&&ayah===draft.to);
    });
    // Audio should never accidentally recite to the end of a long surah while choosing the limit.
    if(typeof V8!=='undefined'&&V8.quranRange?.chapter===draft.idx+1){V8.quranRange.from=draft.from;V8.quranRange.to=draft.to||draft.from;}
    const play=$('quranEnginePlayBtn')||$('quranPlayAllBtn');if(play)play.disabled=!draft.to;
  }
  function displayFromBeginning(){
    if(!draft)return;
    const s={...draft},token=++request;opening=true;
    try{g.openQuranRangeText?.({surah:s.surah,from:s.from,to:s.max});}finally{opening=false;}
    // Keep the complete remainder of the surah visible. Only the AUDIO range is bounded.
    g.setTimeout?.(()=>{if(token===request&&draft&&draft.key===s.key)refresh();},0);
  }
  function openAssignment(key){
    if(!Object.hasOwn(kinds,key))return;
    const item=snapshot(key);
    if(!item){g.toast?.('اختر السورة أولًا، وبعدها افتح النص لاختيار البداية والنهاية','info');$(key+'-s')?.focus();return;}
    const prev=$('ia27RangePicker');if(prev)prev.hidden=true;
    draft={...item,mode:asAyah($(key+'-f')?.value,item.max)?'end':'start'};
    g.ImamTeacherErrorMarking?.setContext?.(key==='new'?'new_read':'review');
    ensure();refresh();displayFromBeginning();
  }
  function approve(){
    const d=draft;if(!d)return;
    if(!d.to||d.to<d.from){g.toast?.('حدد آية النهاية من النص قبل اعتماد التكليف','info');return;}
    // No session is saved here: just update the CURRENT assignment editor.
    const key=d.key,surah=$(key+'-s');if(!surah||resolveSurah(surah.value)!==d.idx)return g.toast?.('تغيرت السورة؛ افتح النص من جديد','error');
    const full=$(key+'-full');if(full)full.checked=false;
    const start=$(key+'-f'),end=$(key+'-t');if(!start||!end)return;
    start.value=String(d.from);end.value=String(d.to);
    const range=$(key+'-range');if(range)range.style.display='flex';
    const enabled=$('tog-'+key);if(enabled&&!enabled.classList.contains('on'))g.togSec?.(key);
    for(const input of [start,end])input.dispatchEvent(new Event('change',{bubbles:true}));
    try{g.scheduleDraftSave?.();}catch(_){}
    dismiss(true);g.closeQuranTextModal?.();g.toast?.(`تم تحديد ${kinds[key]} من ${d.from} إلى ${d.to} — احفظ الحصة لاعتماد التكليف`,'success');
  }
  function openAssessment(){
    dismiss();let row=null;
    try{const prev=g.v10Prev?.();row=prev?.new||prev?.rec||prev?.far;}catch(_){}
    if(!row?.surah){const key=['new','rec','far'].find(k=>resolveSurah($(k+'-s')?.value)>=0);if(key){const r=snapshot(key);row={surah:r.surah,from:r.from,to:r.to||r.max};}}
    if(!row?.surah){g.toast?.('اختر الطالب وتكليف التسميع أولًا، أو حدد السورة في أحد أقسام الحصة','info');return;}
    g.ImamTeacherErrorMarking?.setContext?.('recitation');g.openQuranRangeText?.(row);
  }
  function openReviewListText(kind){
    dismiss();
    if(kind==='juz'){
      const cards=$('juz-chips')?.querySelectorAll('.v1181-chip-text');
      if(cards?.length){g.v1181OpenJuzChipText?.(0);return;}
      g.toast?.('أضف الجزء أو الربع إلى قائمة المراجعة أولًا، ثم افتح النص','info');return;
    }
    if(kind==='surah'){
      const cards=$('surah-review-chips')?.querySelectorAll('.v1181-chip-text');
      if(cards?.length){g.v1181OpenSurahReviewChip?.(0);return;}
      g.toast?.('اختر سورة من قائمة مراجعة السور أولًا','info');
    }
  }
  function init(){ensure();
    // Warm the selected chapter while the teacher chooses the range. Failed
    // prefetch never changes the session or blocks opening the reader.
    if(typeof g.fetchQpcHafsChapter==='function'&&!g.__ia27OriginalQpcLoader){
      g.__ia27OriginalQpcLoader=g.fetchQpcHafsChapter;
      g.fetchQpcHafsChapter=cachedChapter;
    }
    for(const key of ['new','rec','far'])$(key+'-s')?.addEventListener('change',()=>prefetchChapter(key));
    // Other calls to the reader (errors, assessments, reviews, smart board) must never inherit editing controls.
    const base=g.openQuranRangeText;
    if(typeof base==='function'&&!base.ia27RangeWrapped){const wrapped=function(...args){if(!opening)dismiss(true);return base.apply(this,args);};wrapped.ia27RangeWrapped=true;g.openQuranRangeText=wrapped;}
    const close=g.closeQuranTextModal;if(typeof close==='function')g.closeQuranTextModal=function(...args){dismiss(true);return close.apply(this,args);};
    const container=$('quranVerseContent');if(container&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{if(draft)refresh();}).observe(container,{childList:true,subtree:false});
  }
  g.ia27OpenAssignmentText=openAssignment;
  g.ia27OpenAssessmentText=openAssessment;
  g.ia27OpenReviewListText=openReviewListText;
  g.ia27CloseTextPicker=dismiss;
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.QuranRangePicker={snapshot,openAssignment,approve,dismiss};
  if(typeof module!=='undefined'&&module.exports)module.exports={asAyah,resolveSurah};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
})(globalThis);
