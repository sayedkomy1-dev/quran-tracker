'use strict';
/* Imam Academy v11.2.0 — Interactive Quran Error Marking, Stage 1.
   Word-level teacher annotations inside the Quran text modal.
   Data is stored additively inside session.recitationErrors. */
(function teacherErrorMarking(g){
  const ERROR_TYPES=[
    ['تشكيل','pronunciation'],['نطق حرف','pronunciation'],['حذف حرف','pronunciation'],['زيادة حرف','pronunciation'],['كلمة خاطئة','pronunciation'],
    ['نسيان','memory'],['تردد','memory'],['تلقين','memory'],
    ['مد','tajweed'],['غنة','tajweed'],['إخفاء','tajweed'],['إدغام','tajweed'],['إقلاب','tajweed'],['قلقلة','tajweed'],['وقف/ابتداء','tajweed'],['حكم تجويدي آخر','tajweed']
  ];
  const CONTEXTS={
    new_read:'الحفظ الجديد — قراءة الطالب',
    talaqqin:'التلقين — ترديد خلف الشيخ',
    recitation:'التسميع',
    review:'المراجعة'
  };
  const state={enabled:false,context:'recitation',target:null,observer:null,installed:false};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function now(){return new Date().toISOString();}
  function errorId(){try{return makeId('qe');}catch(_){return `qe-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}}
  function currentErrors(){try{return Array.isArray(V8.sessionErrors)?V8.sessionErrors:[];}catch(_){return[];}}
  function quranErrors(){return currentErrors().filter(x=>x?.source==='quran-word');}
  function currentRange(){try{return V8.quranRange||null;}catch(_){return null;}}
  function ctxLabel(v){return CONTEXTS[v]||CONTEXTS.recitation;}
  function colorClass(type){return ERROR_TYPES.find(x=>x[0]===type)?.[1]||'memory';}
  function sameWord(e,target){const r=currentRange();return e?.source==='quran-word'&&Number(e.surahId||0)===Number(r?.chapter||0)&&Number(e.ayah)===Number(target.ayah)&&Number(e.wordIndex)===Number(target.wordIndex);}
  function markCount(target){return quranErrors().filter(e=>sameWord(e,target)).length;}
  function setContext(v){state.context=CONTEXTS[v]?v:'recitation';const sel=$('qmarkContext');if(sel&&sel.value!==state.context)sel.value=state.context;refreshHint();}
  function refreshHint(){const h=$('qmarkHint');if(h)h.textContent=state.enabled?`وضع التصحيح مفعّل · ${ctxLabel(state.context)} · اضغط على أي كلمة لتسجيل الخطأ`:'فعّل وضع التصحيح ثم اضغط على الكلمة التي أخطأ فيها الطالب.';}
  function refreshPanel(){
    const btn=$('qmarkToggle'),count=$('qmarkCount');if(btn){btn.classList.toggle('active',state.enabled);btn.textContent=state.enabled?'✓ وضع التصحيح مفعّل':'✎ تفعيل وضع التصحيح';}
    if(count){const n=quranErrors().length;count.textContent=n===1?'علامة واحدة':`${n} علامات`;}
    $('quranVerseContent')?.classList.toggle('qmark-enabled',state.enabled);refreshHint();paintAllWords();
  }
  function toggle(){state.enabled=!state.enabled;refreshPanel();}
  function wordKey(target){const r=currentRange();return `${r?.chapter||0}:${target.ayah}:${target.wordIndex}`;}
  function paintWord(el){
    if(!el)return;const target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex)};const rows=quranErrors().filter(e=>sameWord(e,target));
    el.classList.remove('qmark-memory','qmark-pronunciation','qmark-tajweed','qmark-resolved');
    el.removeAttribute('data-qmark-count');el.removeAttribute('title');
    if(!rows.length)return;
    const unresolved=rows.filter(x=>!x.resolved),source=unresolved.length?unresolved:rows;const groups=new Set(source.map(x=>colorClass(x.type)));
    if(groups.has('pronunciation'))el.classList.add('qmark-pronunciation');else if(groups.has('tajweed'))el.classList.add('qmark-tajweed');else el.classList.add('qmark-memory');
    if(!unresolved.length)el.classList.add('qmark-resolved');el.dataset.qmarkCount=String(rows.length);el.title=rows.map(x=>`${x.type}${x.resolved?' ✓':''}`).join('، ');
  }
  function paintAllWords(){document.querySelectorAll('#quranVerseContent .qmark-word').forEach(paintWord);}
  function verseRawText(ayahEl){
    const clone=ayahEl.cloneNode(true);clone.querySelectorAll('.quran-ayah-num,.qmark-word').forEach(n=>n.remove());const direct=[...ayahEl.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();return direct||clone.textContent.trim();
  }
  function decorateAyah(ayahEl){
    if(!ayahEl||ayahEl.dataset.qmarkReady==='1')return;const ayah=Number(ayahEl.dataset.ayah);if(!ayah)return;
    const num=ayahEl.querySelector('.quran-ayah-num')?.cloneNode(true);let raw='';
    const textNode=[...ayahEl.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    raw=textNode||(()=>{const c=ayahEl.cloneNode(true);c.querySelector('.quran-ayah-num')?.remove();return c.textContent.trim();})();
    const words=raw.split(/\s+/).filter(Boolean);if(!words.length)return;
    ayahEl.textContent='';words.forEach((word,i)=>{const w=document.createElement('button');w.type='button';w.className='qmark-word';w.dataset.ayah=String(ayah);w.dataset.wordIndex=String(i);w.dataset.word=word;w.textContent=word;w.addEventListener('click',ev=>{ev.stopPropagation();onWordClick(w);});ayahEl.appendChild(w);ayahEl.appendChild(document.createTextNode(' '));});if(num)ayahEl.appendChild(num);ayahEl.dataset.qmarkReady='1';
    ayahEl.dataset.qmarkRaw=raw;paintAllWords();
  }
  function decorate(){const content=$('quranVerseContent');if(!content)return;content.querySelectorAll('.quran-ayah').forEach(decorateAyah);refreshPanel();}
  function onWordClick(el){
    if(!state.enabled){try{toast('فعّل وضع التصحيح أولًا','info');}catch(_){}return;}
    if(typeof curStId!=='undefined'&&!curStId){try{toast('اختر الطالب أولًا قبل تسجيل موضع الخطأ','error');}catch(_){}return;}
    state.target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex),word:el.dataset.word||el.textContent.trim(),el};openSheet();
  }
  function ensureSheet(){
    if($('quranErrorSheet'))return;const sheet=document.createElement('div');sheet.id='quranErrorSheet';sheet.className='qmark-sheet';sheet.hidden=true;sheet.innerHTML=`<div class="qmark-sheet-backdrop" data-close="1"></div><section class="qmark-sheet-card" role="dialog" aria-modal="true" aria-label="تسجيل خطأ التلاوة"><div class="qmark-sheet-head"><div><small id="qmarkTargetMeta">موضع الخطأ</small><b id="qmarkTargetWord">—</b></div><button type="button" id="qmarkClose" aria-label="إغلاق">✕</button></div><div class="qmark-sheet-context"><span>السياق</span><strong id="qmarkTargetContext">التسميع</strong></div><div class="qmark-types" id="qmarkTypes"></div><div class="qmark-current"><div class="qmark-current-head"><b>العلامات على هذه الكلمة</b><span id="qmarkWordCount">0</span></div><div id="qmarkCurrentList"></div></div></section>`;document.body.appendChild(sheet);
    $('qmarkTypes').innerHTML=ERROR_TYPES.map(([type,group])=>`<button type="button" class="qmark-type ${group}" data-type="${esc(type)}">${esc(type)}</button>`).join('');
    $('qmarkTypes').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)addError(b.dataset.type);});$('qmarkClose').addEventListener('click',closeSheet);sheet.addEventListener('click',e=>{if(e.target?.dataset?.close)closeSheet();});
  }
  function openSheet(){ensureSheet();const t=state.target,r=currentRange();if(!t||!r)return;$('qmarkTargetWord').textContent=t.word;$('qmarkTargetMeta').textContent=`سورة ${r.surah||''} · الآية ${t.ayah} · الكلمة ${t.wordIndex+1}`;$('qmarkTargetContext').textContent=ctxLabel(state.context);renderCurrent();const s=$('quranErrorSheet');s.hidden=false;requestAnimationFrame(()=>s.classList.add('open'));}
  function closeSheet(){const s=$('quranErrorSheet');if(!s)return;s.classList.remove('open');setTimeout(()=>{s.hidden=true;},160);}
  function addError(type){
    if(!state.target||!ERROR_TYPES.some(x=>x[0]===type))return;const r=currentRange();if(!r)return;
    const duplicate=quranErrors().find(e=>sameWord(e,state.target)&&e.type===type&&e.mode===state.context&&!e.resolved);if(duplicate){try{toast('هذا النوع مسجل بالفعل على نفس الكلمة','info');}catch(_){}return;}
    const row={id:errorId(),type,at:now(),source:'quran-word',mode:state.context,surah:r.surah||'',surahId:Number(r.chapter)||0,ayah:Number(state.target.ayah),wordIndex:Number(state.target.wordIndex),word:String(state.target.word||'').slice(0,120),resolved:false,resolvedAt:''};
    currentErrors().push(row);try{renderSessionErrors();scheduleDraftSave();}catch(_){}renderCurrent();paintAllWords();refreshPanel();
  }
  function findById(id){return currentErrors().find(x=>x?.id===id);}
  function toggleResolved(id){const e=findById(id);if(!e)return;e.resolved=!e.resolved;e.resolvedAt=e.resolved?now():'';try{renderSessionErrors();scheduleDraftSave();}catch(_){}renderCurrent();paintAllWords();}
  function removeError(id){const list=currentErrors(),i=list.findIndex(x=>x?.id===id);if(i<0)return;list.splice(i,1);try{renderSessionErrors();scheduleDraftSave();}catch(_){}renderCurrent();paintAllWords();refreshPanel();}
  function renderCurrent(){if(!state.target)return;const rows=quranErrors().filter(e=>sameWord(e,state.target));$('qmarkWordCount').textContent=String(rows.length);const el=$('qmarkCurrentList');if(!el)return;el.innerHTML=rows.length?rows.map(e=>`<div class="qmark-current-item ${e.resolved?'resolved':''}"><div><b>${esc(e.type)}</b><small>${esc(ctxLabel(e.mode))}${e.resolved?' · تم التصحيح':''}</small></div><div><button type="button" data-resolve="${esc(e.id||'')}">${e.resolved?'إعادة فتح':'✓ تم التصحيح'}</button><button type="button" class="danger" data-remove="${esc(e.id||'')}">حذف</button></div></div>`).join(''):'<p class="qmark-empty">لم تُسجل علامة على هذه الكلمة بعد.</p>';
    el.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>toggleResolved(b.dataset.resolve)));el.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeError(b.dataset.remove)));
  }
  function installPanel(){
    const note=$('quranSourceNote');if(!note||$('quranCorrectionPanel'))return;const panel=document.createElement('div');panel.id='quranCorrectionPanel';panel.className='qmark-panel';panel.innerHTML=`<div class="qmark-panel-top"><button type="button" id="qmarkToggle" class="qmark-toggle">✎ تفعيل وضع التصحيح</button><label><span>مرحلة القراءة</span><select id="qmarkContext"><option value="new_read">الحفظ الجديد — قراءة الطالب</option><option value="talaqqin">التلقين — ترديد خلف الشيخ</option><option value="recitation" selected>التسميع</option><option value="review">المراجعة</option></select></label><span id="qmarkCount" class="qmark-count">0 علامات</span></div><div id="qmarkHint" class="qmark-hint">فعّل وضع التصحيح ثم اضغط على الكلمة التي أخطأ فيها الطالب.</div><div class="qmark-legend"><span class="pronunciation">نطق/حروف</span><span class="memory">حفظ/تردد</span><span class="tajweed">تجويد</span><span class="resolved">تم التصحيح</span></div>`;note.insertAdjacentElement('afterend',panel);$('qmarkToggle').addEventListener('click',toggle);$('qmarkContext').addEventListener('change',e=>setContext(e.target.value));refreshPanel();
  }
  function updateContextForOpen(kind){if(kind==='new')setContext('new_read');else if(kind==='talaqqin')setContext('talaqqin');else if(kind==='review')setContext('review');else setContext('recitation');}
  function observe(){const c=$('quranVerseContent');if(!c||state.observer)return;state.observer=new MutationObserver(()=>decorate());state.observer.observe(c,{childList:true,subtree:true});decorate();}
  function hookOpeners(){
    const originalNew=g.openQuranTextModal;if(typeof originalNew==='function')g.openQuranTextModal=async function(...args){updateContextForOpen('new');const out=await originalNew.apply(this,args);setTimeout(decorate,0);return out;};
    const originalPrev=g.openPrevQuranText;if(typeof originalPrev==='function')g.openPrevQuranText=function(key,...args){updateContextForOpen(key==='new'?'recitation':'review');const out=originalPrev.call(this,key,...args);setTimeout(decorate,0);return out;};
    const originalRange=g.openQuranRangeText;if(typeof originalRange==='function')g.openQuranRangeText=function(...args){const out=originalRange.apply(this,args);setTimeout(decorate,0);return out;};
  }
  function init(){if(state.installed)return;state.installed=true;installPanel();ensureSheet();observe();hookOpeners();refreshPanel();}
  g.ImamTeacherErrorMarking={init,toggle,setContext,decorate,paintAllWords,closeSheet};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
