'use strict';
/* Imam Academy v11.2.0 — Interactive Quran Error Marking, Stage 2.
   Adds precise character-level annotations, richer guardian/report detail, and
   more robust annotated PNG generation while preserving direct WhatsApp Save & Send. */
(function teacherErrorMarking(g){
  const ERROR_TYPES=[
    ['تشكيل','pronunciation'],['نطق حرف','pronunciation'],['حذف حرف','pronunciation'],['زيادة حرف','pronunciation'],['كلمة خاطئة','pronunciation'],
    ['نسيان','memory'],['تردد','memory'],['تلقين','memory'],
    ['مد','tajweed'],['غنة','tajweed'],['إخفاء','tajweed'],['إدغام','tajweed'],['إقلاب','tajweed'],['قلقلة','tajweed'],['وقف/ابتداء','tajweed'],['حكم تجويدي آخر','tajweed']
  ];
  const CONTEXTS={new_read:'الحفظ الجديد — قراءة الطالب',talaqqin:'التلقين — ترديد خلف الشيخ',recitation:'التسميع',review:'المراجعة'};
  const PREF_KEY='imam:qmark:prefs:v2';
  const state={enabled:true,context:'recitation',target:null,observer:null,installed:false,customTypes:[]};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const appState=()=>g.ImamApp?.State||{};
  function stateStudents(){const v=appState().students;return Array.isArray(v)?v:[];}
  function stateSettings(){const v=appState().settings;return v&&typeof v==='object'?v:{};}
  function findStudent(id){return stateStudents().find(x=>x?.id===id)||null;}
  function now(){return new Date().toISOString();}
  function errorId(){try{return makeId('qe');}catch(_){return `qe-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}}
  function currentErrors(){try{return Array.isArray(V8.sessionErrors)?V8.sessionErrors:[];}catch(_){return[];}}
  function quranErrors(list=currentErrors()){return (list||[]).filter(x=>x?.source==='quran-word');}
  function currentRange(){try{return V8.quranRange||null;}catch(_){return null;}}
  function ctxLabel(v){return CONTEXTS[v]||CONTEXTS.recitation;}
  function cleanType(v){return String(v||'').replace(/[\u0000-\u001f]/g,'').trim().replace(/\s+/g,' ').slice(0,60);}
  function presetGroup(type){return ERROR_TYPES.find(x=>x[0]===type)?.[1]||'';}
  function colorClass(type,row){return ['pronunciation','memory','tajweed','custom'].includes(row?.group)?row.group:(presetGroup(type)||'custom');}
  function graphemes(text){
    const raw=String(text||'');
    try{if(Intl?.Segmenter)return [...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(raw)].map(x=>x.segment);}
    catch(_){}
    try{return raw.match(/\P{M}\p{M}*|\p{M}+/gu)||Array.from(raw);}catch(_){return Array.from(raw);}
  }
  function rowIsChar(e){return e?.targetLevel==='char'&&Number.isInteger(Number(e.charIndex))&&Number(e.charIndex)>=0;}
  function targetIsChar(t=state.target){return t?.charIndex!==null&&t?.charIndex!==undefined&&Number.isInteger(Number(t.charIndex))&&Number(t.charIndex)>=0;}
  function targetDescriptor(t=state.target){return targetIsChar(t)?`الحرف «${t.charText||''}» داخل الكلمة`:'الكلمة كاملة';}
  function readPrefs(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');state.enabled=p.enabled!==false;state.context=CONTEXTS[p.context]?p.context:'recitation';state.customTypes=Array.isArray(p.customTypes)?p.customTypes.map(cleanType).filter(Boolean).slice(0,12):[];}catch(_){state.enabled=true;}}
  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify({enabled:!!state.enabled,context:state.context,customTypes:state.customTypes.slice(0,12)}));}catch(_){}}
  function sameWord(e,target){const r=currentRange();return e?.source==='quran-word'&&Number(e.surahId||0)===Number(r?.chapter||0)&&Number(e.ayah)===Number(target.ayah)&&Number(e.wordIndex)===Number(target.wordIndex);}
  function sameTarget(e,target){
    if(!sameWord(e,target))return false;
    if(targetIsChar(target))return rowIsChar(e)&&Number(e.charIndex)===Number(target.charIndex);
    return !rowIsChar(e);
  }
  function setContext(v){state.context=CONTEXTS[v]?v:'recitation';const sel=$('qmarkContext');if(sel&&sel.value!==state.context)sel.value=state.context;savePrefs();refreshHint();}
  function refreshHint(){const h=$('qmarkHint');if(h)h.textContent=state.enabled?`وضع التصحيح مفعّل · ${ctxLabel(state.context)} · اضغط على الكلمة، ثم اختر الحرف إن كان الخطأ في حرف بعينه`:'فعّل وضع التصحيح ثم اضغط على الكلمة التي أخطأ فيها الطالب.';}
  function refreshPanel(){
    const btn=$('qmarkToggle'),count=$('qmarkCount');if(btn){btn.classList.toggle('active',state.enabled);btn.textContent=state.enabled?'✓ وضع التصحيح مفعّل':'✎ تفعيل وضع التصحيح';}
    if(count){const n=quranErrors().length;count.textContent=n===1?'علامة واحدة':`${n} علامات`;}
    const sel=$('qmarkContext');if(sel)sel.value=state.context;
    $('quranVerseContent')?.classList.toggle('qmark-enabled',state.enabled);refreshHint();renderCustomTypes();paintAllWords();
  }
  function toggle(){state.enabled=!state.enabled;savePrefs();refreshPanel();}
  function applyMarkerClass(el,rows,prefix='qmark'){
    if(!el||!rows.length)return;
    const unresolved=rows.filter(x=>!x.resolved),source=unresolved.length?unresolved:rows,groups=new Set(source.map(x=>colorClass(x.type,x)));
    if(groups.has('pronunciation'))el.classList.add(`${prefix}-pronunciation`);
    else if(groups.has('tajweed'))el.classList.add(`${prefix}-tajweed`);
    else if(groups.has('custom'))el.classList.add(`${prefix}-custom`);
    else el.classList.add(`${prefix}-memory`);
    if(!unresolved.length)el.classList.add(`${prefix}-resolved`);
  }
  function paintWord(el){
    if(!el)return;
    const target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex)};
    const rows=quranErrors().filter(e=>sameWord(e,target));
    el.classList.remove('qmark-memory','qmark-pronunciation','qmark-tajweed','qmark-custom','qmark-resolved','qmark-all-resolved');
    el.removeAttribute('data-qmark-count');el.removeAttribute('title');
    el.querySelectorAll('.qmark-char').forEach(ch=>{ch.classList.remove('qchar-memory','qchar-pronunciation','qchar-tajweed','qchar-custom','qchar-resolved');ch.removeAttribute('title');ch.removeAttribute('data-qchar-count');});
    if(!rows.length)return;
    const wordRows=rows.filter(e=>!rowIsChar(e));
    if(wordRows.length)applyMarkerClass(el,wordRows,'qmark');
    const chars=new Map();
    rows.filter(rowIsChar).forEach(e=>{const i=Number(e.charIndex);if(!chars.has(i))chars.set(i,[]);chars.get(i).push(e);});
    for(const [i,list] of chars){const ch=el.querySelector(`.qmark-char[data-char-index="${i}"]`);if(!ch)continue;applyMarkerClass(ch,list,'qchar');ch.dataset.qcharCount=String(list.length);ch.title=list.map(x=>`${x.type}${x.resolved?' ✓':''}`).join('، ');}
    el.dataset.qmarkCount=String(rows.length);
    el.title=rows.map(x=>`${rowIsChar(x)?`الحرف ${x.charText||''}: `:''}${x.type}${x.resolved?' ✓':''}`).join('، ');
    if(!rows.some(x=>!x.resolved))el.classList.add('qmark-all-resolved');
  }
  function paintAllWords(){document.querySelectorAll('#quranVerseContent .qmark-word').forEach(paintWord);}
  function decorateAyah(ayahEl){
    if(!ayahEl||ayahEl.dataset.qmarkReady==='1')return;const ayah=Number(ayahEl.dataset.ayah);if(!ayah)return;
    const num=ayahEl.querySelector('.quran-ayah-num')?.cloneNode(true);const textNode=[...ayahEl.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    const raw=textNode||(()=>{const c=ayahEl.cloneNode(true);c.querySelector('.quran-ayah-num')?.remove();return c.textContent.trim();})();const words=raw.split(/\s+/).filter(Boolean);if(!words.length)return;
    const r=currentRange();quranErrors().forEach(e=>{if(!e.ayahText&&Number(e.surahId||0)===Number(r?.chapter||0)&&Number(e.ayah)===ayah)e.ayahText=String(raw).slice(0,1200);});
    ayahEl.textContent='';
    words.forEach((word,i)=>{
      const w=document.createElement('button');w.type='button';w.className='qmark-word';w.dataset.ayah=String(ayah);w.dataset.wordIndex=String(i);w.dataset.word=word;
      graphemes(word).forEach((ch,ci)=>{const span=document.createElement('span');span.className='qmark-char';span.dataset.charIndex=String(ci);span.dataset.charText=ch;span.textContent=ch;w.appendChild(span);});
      w.addEventListener('click',ev=>{ev.stopPropagation();const ch=ev.target.closest?.('.qmark-char');onWordClick(w,ch?Number(ch.dataset.charIndex):null);});
      ayahEl.appendChild(w);ayahEl.appendChild(document.createTextNode(' '));
    });
    if(num)ayahEl.appendChild(num);ayahEl.dataset.qmarkReady='1';ayahEl.dataset.qmarkRaw=raw;paintAllWords();
  }
  function decorate(){const content=$('quranVerseContent');if(!content)return;content.querySelectorAll('.quran-ayah').forEach(decorateAyah);refreshPanel();}
  function onWordClick(el,preferredCharIndex=null){
    if(!state.enabled){try{toast('فعّل وضع التصحيح أولًا','info');}catch(_){}return;}if(typeof curStId!=='undefined'&&!curStId){try{toast('اختر الطالب أولًا قبل تسجيل موضع الخطأ','error');}catch(_){}return;}
    const ayahEl=el.closest('.quran-ayah'),word=el.dataset.word||el.textContent.trim(),chars=graphemes(word),ci=Number(preferredCharIndex);const hasChar=preferredCharIndex!==null&&preferredCharIndex!==undefined&&Number.isInteger(ci)&&ci>=0&&ci<chars.length;
    state.target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex),word,ayahText:ayahEl?.dataset?.qmarkRaw||'',charIndex:hasChar?ci:null,charText:hasChar?chars[ci]:'',el};openSheet();
  }
  function ensureSheet(){
    if($('quranErrorSheet'))return;const sheet=document.createElement('div');sheet.id='quranErrorSheet';sheet.className='qmark-sheet';sheet.hidden=true;sheet.innerHTML=`<div class="qmark-sheet-backdrop" data-close="1"></div><section class="qmark-sheet-card" role="dialog" aria-modal="true" aria-label="تسجيل خطأ التلاوة"><div class="qmark-sheet-head"><div><small id="qmarkTargetMeta">موضع الخطأ</small><b id="qmarkTargetWord">—</b></div><button type="button" id="qmarkClose" aria-label="إغلاق">✕</button></div><div class="qmark-sheet-context"><span>السياق</span><strong id="qmarkTargetContext">التسميع</strong></div><div class="qmark-char-section"><div class="qmark-char-head"><b>حدد موضع الخطأ</b><small id="qmarkScopeLabel">الكلمة كاملة</small></div><div class="qmark-char-picker"><button type="button" class="qmark-char-choice whole active" data-char-index="-1">الكلمة كاملة</button><div id="qmarkCharChoices"></div></div><p>اختيار حرف اختياري؛ استخدمه عندما يكون الخطأ في نطق أو تشكيل أو زيادة/حذف حرف بعينه.</p></div><div class="qmark-types" id="qmarkTypes"></div><div class="qmark-custom-entry"><input id="qmarkCustomInput" maxlength="60" placeholder="اكتب خطأ مخصصًا… مثال: تفخيم الراء" autocomplete="off"><button type="button" id="qmarkCustomAdd">+ تسجيل</button></div><div id="qmarkCustomTypes" class="qmark-custom-types"></div><div class="qmark-current"><div class="qmark-current-head"><b>العلامات على هذه الكلمة</b><span id="qmarkWordCount">0</span></div><div id="qmarkCurrentList"></div></div></section>`;document.body.appendChild(sheet);
    $('qmarkTypes').innerHTML=ERROR_TYPES.map(([type,group])=>`<button type="button" class="qmark-type ${group}" data-type="${esc(type)}" data-group="${group}">${esc(type)}</button>`).join('');
    $('qmarkTypes').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)addError(b.dataset.type,b.dataset.group);});$('qmarkClose').addEventListener('click',closeSheet);sheet.addEventListener('click',e=>{if(e.target?.dataset?.close)closeSheet();});
    sheet.querySelector('.qmark-char-choice.whole').addEventListener('click',()=>setTargetChar(-1));
    $('qmarkCharChoices').addEventListener('click',e=>{const b=e.target.closest('[data-char-index]');if(b)setTargetChar(Number(b.dataset.charIndex));});
    $('qmarkCustomAdd').addEventListener('click',addCustomError);$('qmarkCustomInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomError();}});renderCustomTypes();
  }
  function setTargetChar(index){
    if(!state.target)return;const chars=graphemes(state.target.word);
    if(Number.isInteger(index)&&index>=0&&index<chars.length){state.target.charIndex=index;state.target.charText=chars[index];}
    else{state.target.charIndex=null;state.target.charText='';}
    renderCharPicker();renderCurrent();
  }
  function renderCharPicker(){
    if(!state.target)return;const chars=graphemes(state.target.word),host=$('qmarkCharChoices'),whole=document.querySelector('#quranErrorSheet .qmark-char-choice.whole');
    if(host)host.innerHTML=chars.map((ch,i)=>`<button type="button" class="qmark-char-choice ${targetIsChar()&&Number(state.target.charIndex)===i?'active':''}" data-char-index="${i}" title="الحرف ${i+1}">${esc(ch)}</button>`).join('');
    if(whole)whole.classList.toggle('active',!targetIsChar());
    if($('qmarkScopeLabel'))$('qmarkScopeLabel').textContent=targetDescriptor();
  }
  function addCustomError(){const input=$('qmarkCustomInput'),type=cleanType(input?.value);if(!type)return;addError(type,'custom');if(!state.customTypes.includes(type)){state.customTypes.unshift(type);state.customTypes=state.customTypes.slice(0,12);savePrefs();renderCustomTypes();}if(input)input.value='';}
  function renderCustomTypes(){const el=$('qmarkCustomTypes');if(!el)return;el.innerHTML=state.customTypes.length?`<span>أخطاء مخصصة محفوظة:</span>${state.customTypes.map(t=>`<button type="button" data-custom="${esc(t)}">${esc(t)}</button>`).join('')}`:'';el.querySelectorAll('[data-custom]').forEach(b=>b.addEventListener('click',()=>addError(b.dataset.custom,'custom')));}
  function openSheet(){ensureSheet();const t=state.target,r=currentRange();if(!t||!r)return;$('qmarkTargetWord').textContent=t.word;$('qmarkTargetMeta').textContent=`سورة ${r.surah||''} · الآية ${t.ayah} · الكلمة ${t.wordIndex+1}`;$('qmarkTargetContext').textContent=ctxLabel(state.context);renderCharPicker();renderCurrent();const s=$('quranErrorSheet');s.hidden=false;requestAnimationFrame(()=>s.classList.add('open'));}
  function closeSheet(){const s=$('quranErrorSheet');if(!s)return;s.classList.remove('open');setTimeout(()=>{s.hidden=true;},160);}
  function persistSessionErrorsNow(){try{renderSessionErrors();scheduleDraftSave();if(typeof saveDraftNow==='function')saveDraftNow();}catch(_){} }
  function addError(type,group){
    type=cleanType(type);if(!state.target||!type)return;const r=currentRange();if(!r)return;group=['pronunciation','memory','tajweed','custom'].includes(group)?group:(presetGroup(type)||'custom');
    const duplicate=quranErrors().find(e=>sameTarget(e,state.target)&&e.type===type&&e.mode===state.context&&!e.resolved);if(duplicate){try{toast(targetIsChar()?'هذا النوع مسجل بالفعل على نفس الحرف':'هذا النوع مسجل بالفعل على نفس الكلمة','info');}catch(_){}return;}
    const row={id:errorId(),type,group,at:now(),source:'quran-word',mode:state.context,surah:r.surah||'',surahId:Number(r.chapter)||0,ayah:Number(state.target.ayah),wordIndex:Number(state.target.wordIndex),word:String(state.target.word||'').slice(0,120),ayahText:String(state.target.ayahText||'').slice(0,1200),targetLevel:targetIsChar()?'char':'word',charIndex:targetIsChar()?Number(state.target.charIndex):-1,charText:targetIsChar()?String(state.target.charText||'').slice(0,20):'',resolved:false,resolvedAt:''};
    currentErrors().push(row);persistSessionErrorsNow();renderCurrent();paintAllWords();refreshPanel();
  }
  function findById(id){return currentErrors().find(x=>x?.id===id);}
  function toggleResolved(id){const e=findById(id);if(!e)return;e.resolved=!e.resolved;e.resolvedAt=e.resolved?now():'';persistSessionErrorsNow();renderCurrent();paintAllWords();}
  function removeError(id){const list=currentErrors(),i=list.findIndex(x=>x?.id===id);if(i<0)return;list.splice(i,1);persistSessionErrorsNow();renderCurrent();paintAllWords();refreshPanel();}
  function renderCurrent(){
    if(!state.target)return;const rows=quranErrors().filter(e=>sameWord(e,state.target));$('qmarkWordCount').textContent=String(rows.length);const el=$('qmarkCurrentList');if(!el)return;
    el.innerHTML=rows.length?rows.map(e=>`<div class="qmark-current-item ${e.resolved?'resolved':''}"><div><b>${esc(e.type)}</b><small>${esc(ctxLabel(e.mode))}${rowIsChar(e)?` · الحرف «${esc(e.charText||'')}»`:''}${e.resolved?' · تم التصحيح':''}</small></div><div><button type="button" data-resolve="${esc(e.id||'')}">${e.resolved?'إعادة فتح':'✓ تم التصحيح'}</button><button type="button" class="danger" data-remove="${esc(e.id||'')}">حذف</button></div></div>`).join(''):'<p class="qmark-empty">لم تُسجل علامة على هذه الكلمة بعد.</p>';
    el.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>toggleResolved(b.dataset.resolve)));el.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeError(b.dataset.remove)));
  }
  function installPanel(){
    const note=$('quranSourceNote');if(!note||$('quranCorrectionPanel'))return;const panel=document.createElement('div');panel.id='quranCorrectionPanel';panel.className='qmark-panel';panel.innerHTML=`<div class="qmark-panel-top"><button type="button" id="qmarkToggle" class="qmark-toggle">✎ تفعيل وضع التصحيح</button><label><span>مرحلة القراءة</span><select id="qmarkContext"><option value="new_read">الحفظ الجديد — قراءة الطالب</option><option value="talaqqin">التلقين — ترديد خلف الشيخ</option><option value="recitation">التسميع</option><option value="review">المراجعة</option></select></label><span id="qmarkCount" class="qmark-count">0 علامات</span><button type="button" id="qmarkShareImage" class="qmark-share">▣ مشاركة صورة الأخطاء</button></div><div id="qmarkHint" class="qmark-hint"></div><div class="qmark-legend"><span class="pronunciation">نطق/حروف</span><span class="memory">حفظ/تردد</span><span class="tajweed">تجويد</span><span class="custom">مخصص</span><span class="char">تحديد حرف</span><span class="resolved">تم التصحيح</span></div>`;note.insertAdjacentElement('afterend',panel);$('qmarkToggle').addEventListener('click',toggle);$('qmarkContext').addEventListener('change',e=>setContext(e.target.value));$('qmarkShareImage').addEventListener('click',shareCurrentDraftImage);refreshPanel();
  }
  function updateContextForOpen(kind){if(kind==='new')setContext('new_read');else if(kind==='talaqqin')setContext('talaqqin');else if(kind==='review')setContext('review');else setContext('recitation');}
  function observe(){const c=$('quranVerseContent');if(!c||state.observer)return;state.observer=new MutationObserver(()=>decorate());state.observer.observe(c,{childList:true,subtree:true});decorate();}
  function hookOpeners(){
    const originalNew=g.openQuranTextModal;if(typeof originalNew==='function')g.openQuranTextModal=async function(...args){updateContextForOpen('new');const out=await originalNew.apply(this,args);setTimeout(decorate,0);return out;};
    const originalPrev=g.openPrevQuranText;if(typeof originalPrev==='function')g.openPrevQuranText=function(key,...args){updateContextForOpen(key==='new'?'recitation':'review');const out=originalPrev.call(this,key,...args);setTimeout(decorate,0);return out;};
    const originalRange=g.openQuranRangeText;if(typeof originalRange==='function')g.openQuranRangeText=function(...args){const out=originalRange.apply(this,args);setTimeout(decorate,0);return out;};
  }
  function installPersistenceBridges(){
    const legacy=g.ImamApp?.Legacy;if(!legacy)return;
    const baseCapture=g.captureDraft,baseApply=g.applyDraft,baseBuild=g.buildSesData;
    if(typeof baseCapture==='function')legacy.override('captureDraft',function(...args){const d=baseCapture.apply(this,args)||{};d.recitationErrors=currentErrors().map(x=>({...x}));return d;},'v11.2.0-error1.2');
    if(typeof baseApply==='function')legacy.override('applyDraft',function(d,...args){const out=baseApply.call(this,d,...args);try{V8.sessionErrors=Array.isArray(d?.recitationErrors)?d.recitationErrors.map(x=>({...x})):[];renderSessionErrors();setTimeout(paintAllWords,0);}catch(_){}return out;},'v11.2.0-error1.2');
    if(typeof baseBuild==='function')legacy.override('buildSesData',function(...args){const d=baseBuild.apply(this,args)||{};d.recitationErrors=currentErrors().map(x=>({...x}));return d;},'v11.2.0-error1.2');
  }
  function rowsForImage(ses){return quranErrors(ses?.recitationErrors||[]).filter(x=>x.surah&&x.ayah).slice(0,120);}
  function groupRows(rows){const m=new Map();for(const e of rows){const k=`${e.surahId||0}:${e.ayah}`;if(!m.has(k))m.set(k,{surah:e.surah,surahId:e.surahId,ayah:e.ayah,text:e.ayahText||'',errors:[]});const g=m.get(k);if(!g.text&&e.ayahText)g.text=e.ayahText;g.errors.push(e);}return [...m.values()].sort((a,b)=>(a.surahId-b.surahId)||(a.ayah-b.ayah));}
  function rounded(ctx,x,y,w,h,r,fill){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  function snapshotColor(e){if(e.resolved)return '#DDF4E5';const g=colorClass(e.type,e);if(g==='pronunciation')return '#FFE2D7';if(g==='tajweed')return '#DCEAFF';if(g==='custom')return '#EFE3FF';return '#FFF0BF';}
  function snapshotStroke(e){if(e.resolved)return '#4D9B62';const g=colorClass(e.type,e);if(g==='pronunciation')return '#DB6A4A';if(g==='tajweed')return '#5D83C4';if(g==='custom')return '#8A64BF';return '#C69B35';}
  function charUnderlineBox(ctx,word,charIndex,rightX,baselineY){
    const chars=graphemes(word);if(charIndex<0||charIndex>=chars.length)return null;
    const prefix=chars.slice(0,charIndex).join(''),through=chars.slice(0,charIndex+1).join('');
    const prefixW=ctx.measureText(prefix).width,throughW=ctx.measureText(through).width;
    const charW=Math.max(9,throughW-prefixW);return{x:rightX-throughW,w:charW,y:baselineY+10};
  }
  function buildSnapshotCanvas(st,ses){
    const groups=groupRows(rowsForImage(ses)),W=900,maxGroups=10,temp=document.createElement('canvas');temp.width=W;temp.height=Math.min(6200,470+Math.max(1,Math.min(groups.length,maxGroups))*520);const c=temp.getContext('2d');c.fillStyle='#F8F5EC';c.fillRect(0,0,temp.width,temp.height);c.direction='rtl';c.textAlign='right';
    c.fillStyle='#0F5136';c.font='700 40px Arial';c.fillText('مواضع التصحيح في التلاوة',W-48,66);c.fillStyle='#26372E';c.font='700 27px Arial';c.fillText(st?.name||'الطالب',W-48,108);c.fillStyle='#6C786F';c.font='21px Arial';c.fillText(new Date(ses?.date||Date.now()).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}),W-48,144);
    const legend=[['#DB6A4A','نطق/حروف'],['#C69B35','حفظ/تردد'],['#5D83C4','تجويد'],['#8A64BF','مخصص'],['#4D9B62','تم التصحيح']];let lx=W-48;c.font='16px Arial';for(const [col,label] of legend){const tw=c.measureText(label).width;c.fillStyle=col;c.fillRect(lx-14,168,10,10);c.fillStyle='#5D6962';c.fillText(label,lx-20,178);lx-=tw+55;}
    let y=230;
    for(const grp of groups.slice(0,maxGroups)){
      rounded(c,34,y-26,W-68,60,15,'#E9F2EC');c.fillStyle='#174F36';c.font='700 23px Arial';c.fillText(`سورة ${grp.surah} — الآية ${grp.ayah}`,W-54,y+12);y+=68;
      const text=grp.text||grp.errors.sort((a,b)=>a.wordIndex-b.wordIndex).map(e=>e.word).join(' '),words=String(text).split(/\s+/).filter(Boolean),byIndex=new Map();for(const e of grp.errors){if(!byIndex.has(Number(e.wordIndex)))byIndex.set(Number(e.wordIndex),[]);byIndex.get(Number(e.wordIndex)).push(e);}
      c.font='38px "Traditional Arabic","Amiri",serif';c.textAlign='right';c.direction='rtl';let x=W-54;const left=54,gap=14,lineH=68;
      for(let i=0;i<words.length;i++){
        const word=words[i],mw=c.measureText(word).width;if(x-mw<left){x=W-54;y+=lineH;}
        const errs=byIndex.get(i)||[],wordErrs=errs.filter(e=>!rowIsChar(e)),charErrs=errs.filter(rowIsChar);
        if(wordErrs.length)rounded(c,x-mw-6,y-43,mw+12,54,9,snapshotColor(wordErrs.find(e=>!e.resolved)||wordErrs[0]));
        c.fillStyle='#17251C';c.fillText(word,x,y);
        for(const e of charErrs){const box=charUnderlineBox(c,word,Number(e.charIndex),x,y);if(!box)continue;c.strokeStyle=snapshotStroke(e);c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(box.x+2,box.y);c.lineTo(box.x+box.w-2,box.y);c.stroke();}
        x-=mw+gap;
      }
      y+=48;c.font='700 18px Arial';
      for(const [idx,errs] of [...byIndex.entries()].sort((a,b)=>a[0]-b[0])){
        const word=words[idx]||errs[0]?.word||'الموضع',types=[...new Set(errs.map(e=>`${rowIsChar(e)?`الحرف «${e.charText||''}» — `:''}${e.type}${e.resolved?' ✓':''}`))].join('، ');c.fillStyle='#526158';c.fillText(`• ${word}: ${types}`,W-58,y);y+=30;
      }
      y+=28;if(y>temp.height-240)break;
    }
    if(groups.length>maxGroups){c.fillStyle='#8A5B22';c.font='700 19px Arial';c.fillText(`+ ${groups.length-maxGroups} آيات أخرى محفوظة في سجل الحصة`,W-48,y);y+=38;}
    c.fillStyle='#78827A';c.font='18px Arial';c.fillText(stateSettings().circle||'أكاديمية الإمام لتحفيظ القرآن الكريم',W-48,y+28);const H=Math.min(temp.height,Math.max(470,y+70)),out=document.createElement('canvas');out.width=W;out.height=H;out.getContext('2d').drawImage(temp,0,0,W,H,0,0,W,H);return out;
  }
  async function canvasFile(canvas,st){
    let blob=await new Promise(resolve=>{try{canvas.toBlob(resolve,'image/png',1);}catch(_){resolve(null);}});
    if(!blob){const data=canvas.toDataURL('image/png'),bin=atob(data.split(',')[1]),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);blob=new Blob([u8],{type:'image/png'});}
    const name=`quran-errors-${String(st?.name||'student').replace(/[^\p{L}\p{N}-]+/gu,'-').slice(0,40)}.png`;return new File([blob],name,{type:'image/png'});
  }
  function downloadFile(file){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
  async function shareErrorSnapshot(st,ses,msg=''){
    const rows=rowsForImage(ses);if(!rows.length)return false;let file;try{file=await canvasFile(buildSnapshotCanvas(st,ses),st);}catch(e){console.warn('[qmark] snapshot failed',e);return false;}
    try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:`مواضع التصحيح — ${st?.name||''}`,text:String(msg||'')});return true;}}catch(e){if(e?.name==='AbortError')return true;console.warn('[qmark] native file share failed',e);}
    downloadFile(file);try{toast('تم تنزيل صورة الأخطاء. سيتم فتح رسالة ولي الأمر أيضًا.','info');}catch(_){}return false;
  }
  function safeOpenWhatsApp(st,msg){
    try{
      if(typeof g.openWhatsApp==='function')return g.openWhatsApp(st,msg);
      if(typeof openWhatsApp==='function')return openWhatsApp(st,msg);
    }catch(e){console.warn('[qmark] WhatsApp handoff failed',e);}
    try{toast('تعذر فتح واتساب — جرّب مرة أخرى','error');}catch(_){}
    return false;
  }
  async function shareCurrentDraftImage(){
    const sid=$('sesSt')?.value,st=findStudent(sid);
    if(!sid||!st){try{toast('اختر الطالب أولًا','error');}catch(_){}return;}
    const data=typeof g.buildSesData==='function'?g.buildSesData():{},dateKey=$('sesDate')?.value||new Date().toISOString().slice(0,10),ses={studentId:sid,date:dateKey,status:typeof sesStatus!=='undefined'?sesStatus:'حضر',...data};
    if(!rowsForImage(ses).length){try{toast('لا توجد علامات أخطاء على النص لإنشاء صورة','info');}catch(_){}return;}
    const msg=typeof g.buildWAMsg==='function'?g.buildWAMsg(st,ses):'';
    const shared=await shareErrorSnapshot(st,ses,msg);
    if(!shared)safeOpenWhatsApp(st,msg);
  }
  function correctionDetailsText(ses){
    const all=quranErrors(ses?.recitationErrors||[]),rows=all.slice().sort((a,b)=>(Number(a.resolved)-Number(b.resolved))||(Number(a.surahId)-Number(b.surahId))||(Number(a.ayah)-Number(b.ayah))||(Number(a.wordIndex)-Number(b.wordIndex))).slice(0,12);
    if(!rows.length)return '';
    const lines=rows.map(e=>`${e.resolved?'✓':'•'} سورة ${e.surah||'—'} ${e.ayah||''} — «${e.word||'—'}»${rowIsChar(e)?` — الحرف «${e.charText||''}»`:''}: ${e.type}`);
    const extra=all.length-rows.length;if(extra>0)lines.push(`… و${extra} مواضع أخرى محفوظة في سجل الحصة`);
    return `\n\n🪶 *مواضع التصحيح على النص*\n${lines.join('\n')}`;
  }
  function appendCorrectionDetails(msg,ses){
    const base=String(msg||''),details=correctionDetailsText(ses);if(!base||!details||base.includes('🪶 *مواضع التصحيح على النص*'))return base;
    for(const marker of ['\n\n📖 *التكليف للحصة القادمة*','\n\n📖 *القادم*','\n\n📝 *ملاحظات المحفظ*'])if(base.includes(marker))return base.replace(marker,details+marker);
    return base+details;
  }
  function installReportBridge(){
    const legacy=g.ImamApp?.Legacy;if(!legacy)return;
    const baseMode=g.buildWAMsgMode,baseMsg=g.buildWAMsg;
    if(typeof baseMode==='function')legacy.override('buildWAMsgMode',function(st,ses,mode='detailed'){return appendCorrectionDetails(baseMode.call(this,st,ses,mode),ses);},'v11.2.0-error2');
    if(typeof baseMsg==='function')legacy.override('buildWAMsg',function(st,ses){return appendCorrectionDetails(baseMsg.call(this,st,ses),ses);},'v11.2.0-error2');
  }
  function installWhatsAppBridge(){
    const legacy=g.ImamApp?.Legacy;if(!legacy)return;
    // Stage 1.3: restore the original message-first UX.
    // Save & Send must open the guardian chat directly (wa.me/openWhatsApp path)
    // exactly as before Error Marking was introduced. Image sharing stays available
    // only from the explicit “مشاركة صورة الأخطاء” button, so it never intercepts
    // the normal WhatsApp workflow with the Android share sheet.
    legacy.override('saveAndSendWA',function(){
      let ses=null;
      try{ses=typeof g.saveSession==='function'?g.saveSession({silent:true,noCelebrate:true}):null;}catch(e){console.error('[qmark] save before WhatsApp failed',e);}
      if(!ses){try{toast('تعذر حفظ الحصة قبل الإرسال','error');}catch(_){}return;}
      const st=findStudent(ses.studentId);
      if(!st){try{toast('تعذر العثور على بيانات الطالب بعد الحفظ','error');}catch(_){}return;}
      const msg=typeof g.buildWAMsg==='function'?g.buildWAMsg(st,ses):'';
      safeOpenWhatsApp(st,msg);
      try{toast('تم حفظ الحصة وفتح رسالة ولي الأمر','success');}catch(_){}
    },'v11.2.0-error1.3');
    if(typeof g.saveAndSendWAMode==='function')legacy.override('saveAndSendWAMode',function(mode){
      let ses=null;
      try{ses=typeof g.saveSession==='function'?g.saveSession({silent:true,noCelebrate:true}):null;}catch(e){console.error('[qmark] save mode before WhatsApp failed',e);}
      if(!ses)return;
      const st=findStudent(ses.studentId);if(!st)return;
      const msg=typeof g.buildWAMsgMode==='function'?g.buildWAMsgMode(st,ses,mode):(typeof g.buildWAMsg==='function'?g.buildWAMsg(st,ses):'');
      safeOpenWhatsApp(st,msg);
    },'v11.2.0-error1.3');
  }
  function init(){if(state.installed)return;state.installed=true;readPrefs();installPersistenceBridges();installPanel();ensureSheet();observe();hookOpeners();installReportBridge();installWhatsAppBridge();refreshPanel();document.addEventListener('visibilitychange',()=>{if(document.hidden){savePrefs();if(currentErrors().length)try{saveDraftNow();}catch(_){}}});g.addEventListener?.('pagehide',()=>{savePrefs();if(currentErrors().length)try{saveDraftNow();}catch(_){}},{capture:true});}
  g.ImamTeacherErrorMarking={init,toggle,setContext,decorate,paintAllWords,closeSheet,shareErrorSnapshot,shareCurrentDraftImage,graphemes};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
