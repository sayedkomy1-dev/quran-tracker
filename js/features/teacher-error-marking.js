'use strict';
/* Imam Academy v11.2.0 — Interactive Quran Error Marking, Stage 1.1.
   Fixes persistence across the v10 compatibility layer, remembers correction mode,
   supports custom teacher error labels and creates a shareable annotated PNG. */
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
  function now(){return new Date().toISOString();}
  function errorId(){try{return makeId('qe');}catch(_){return `qe-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}}
  function currentErrors(){try{return Array.isArray(V8.sessionErrors)?V8.sessionErrors:[];}catch(_){return[];}}
  function quranErrors(list=currentErrors()){return (list||[]).filter(x=>x?.source==='quran-word');}
  function currentRange(){try{return V8.quranRange||null;}catch(_){return null;}}
  function ctxLabel(v){return CONTEXTS[v]||CONTEXTS.recitation;}
  function cleanType(v){return String(v||'').replace(/[\u0000-\u001f]/g,'').trim().replace(/\s+/g,' ').slice(0,60);}
  function presetGroup(type){return ERROR_TYPES.find(x=>x[0]===type)?.[1]||'';}
  function colorClass(type,row){return ['pronunciation','memory','tajweed','custom'].includes(row?.group)?row.group:(presetGroup(type)||'custom');}
  function readPrefs(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');state.enabled=p.enabled!==false;state.context=CONTEXTS[p.context]?p.context:'recitation';state.customTypes=Array.isArray(p.customTypes)?p.customTypes.map(cleanType).filter(Boolean).slice(0,12):[];}catch(_){state.enabled=true;}}
  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify({enabled:!!state.enabled,context:state.context,customTypes:state.customTypes.slice(0,12)}));}catch(_){}}
  function sameWord(e,target){const r=currentRange();return e?.source==='quran-word'&&Number(e.surahId||0)===Number(r?.chapter||0)&&Number(e.ayah)===Number(target.ayah)&&Number(e.wordIndex)===Number(target.wordIndex);}
  function setContext(v){state.context=CONTEXTS[v]?v:'recitation';const sel=$('qmarkContext');if(sel&&sel.value!==state.context)sel.value=state.context;savePrefs();refreshHint();}
  function refreshHint(){const h=$('qmarkHint');if(h)h.textContent=state.enabled?`وضع التصحيح مفعّل · ${ctxLabel(state.context)} · اضغط على أي كلمة لتسجيل الخطأ`:'فعّل وضع التصحيح ثم اضغط على الكلمة التي أخطأ فيها الطالب.';}
  function refreshPanel(){
    const btn=$('qmarkToggle'),count=$('qmarkCount');if(btn){btn.classList.toggle('active',state.enabled);btn.textContent=state.enabled?'✓ وضع التصحيح مفعّل':'✎ تفعيل وضع التصحيح';}
    if(count){const n=quranErrors().length;count.textContent=n===1?'علامة واحدة':`${n} علامات`;}
    const sel=$('qmarkContext');if(sel)sel.value=state.context;
    $('quranVerseContent')?.classList.toggle('qmark-enabled',state.enabled);refreshHint();renderCustomTypes();paintAllWords();
  }
  function toggle(){state.enabled=!state.enabled;savePrefs();refreshPanel();}
  function paintWord(el){
    if(!el)return;const target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex)};const rows=quranErrors().filter(e=>sameWord(e,target));
    el.classList.remove('qmark-memory','qmark-pronunciation','qmark-tajweed','qmark-custom','qmark-resolved');el.removeAttribute('data-qmark-count');el.removeAttribute('title');if(!rows.length)return;
    const unresolved=rows.filter(x=>!x.resolved),source=unresolved.length?unresolved:rows,groups=new Set(source.map(x=>colorClass(x.type,x)));
    if(groups.has('pronunciation'))el.classList.add('qmark-pronunciation');else if(groups.has('tajweed'))el.classList.add('qmark-tajweed');else if(groups.has('custom'))el.classList.add('qmark-custom');else el.classList.add('qmark-memory');
    if(!unresolved.length)el.classList.add('qmark-resolved');el.dataset.qmarkCount=String(rows.length);el.title=rows.map(x=>`${x.type}${x.resolved?' ✓':''}`).join('، ');
  }
  function paintAllWords(){document.querySelectorAll('#quranVerseContent .qmark-word').forEach(paintWord);}
  function decorateAyah(ayahEl){
    if(!ayahEl||ayahEl.dataset.qmarkReady==='1')return;const ayah=Number(ayahEl.dataset.ayah);if(!ayah)return;
    const num=ayahEl.querySelector('.quran-ayah-num')?.cloneNode(true);const textNode=[...ayahEl.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
    const raw=textNode||(()=>{const c=ayahEl.cloneNode(true);c.querySelector('.quran-ayah-num')?.remove();return c.textContent.trim();})();const words=raw.split(/\s+/).filter(Boolean);if(!words.length)return;
    const r=currentRange();quranErrors().forEach(e=>{if(!e.ayahText&&Number(e.surahId||0)===Number(r?.chapter||0)&&Number(e.ayah)===ayah)e.ayahText=String(raw).slice(0,1200);});ayahEl.textContent='';words.forEach((word,i)=>{const w=document.createElement('button');w.type='button';w.className='qmark-word';w.dataset.ayah=String(ayah);w.dataset.wordIndex=String(i);w.dataset.word=word;w.textContent=word;w.addEventListener('click',ev=>{ev.stopPropagation();onWordClick(w);});ayahEl.appendChild(w);ayahEl.appendChild(document.createTextNode(' '));});if(num)ayahEl.appendChild(num);ayahEl.dataset.qmarkReady='1';ayahEl.dataset.qmarkRaw=raw;paintAllWords();
  }
  function decorate(){const content=$('quranVerseContent');if(!content)return;content.querySelectorAll('.quran-ayah').forEach(decorateAyah);refreshPanel();}
  function onWordClick(el){
    if(!state.enabled){try{toast('فعّل وضع التصحيح أولًا','info');}catch(_){}return;}if(typeof curStId!=='undefined'&&!curStId){try{toast('اختر الطالب أولًا قبل تسجيل موضع الخطأ','error');}catch(_){}return;}
    const ayahEl=el.closest('.quran-ayah');state.target={ayah:Number(el.dataset.ayah),wordIndex:Number(el.dataset.wordIndex),word:el.dataset.word||el.textContent.trim(),ayahText:ayahEl?.dataset?.qmarkRaw||'',el};openSheet();
  }
  function ensureSheet(){
    if($('quranErrorSheet'))return;const sheet=document.createElement('div');sheet.id='quranErrorSheet';sheet.className='qmark-sheet';sheet.hidden=true;sheet.innerHTML=`<div class="qmark-sheet-backdrop" data-close="1"></div><section class="qmark-sheet-card" role="dialog" aria-modal="true" aria-label="تسجيل خطأ التلاوة"><div class="qmark-sheet-head"><div><small id="qmarkTargetMeta">موضع الخطأ</small><b id="qmarkTargetWord">—</b></div><button type="button" id="qmarkClose" aria-label="إغلاق">✕</button></div><div class="qmark-sheet-context"><span>السياق</span><strong id="qmarkTargetContext">التسميع</strong></div><div class="qmark-types" id="qmarkTypes"></div><div class="qmark-custom-entry"><input id="qmarkCustomInput" maxlength="60" placeholder="اكتب خطأ مخصصًا… مثال: تفخيم الراء" autocomplete="off"><button type="button" id="qmarkCustomAdd">+ تسجيل</button></div><div id="qmarkCustomTypes" class="qmark-custom-types"></div><div class="qmark-current"><div class="qmark-current-head"><b>العلامات على هذه الكلمة</b><span id="qmarkWordCount">0</span></div><div id="qmarkCurrentList"></div></div></section>`;document.body.appendChild(sheet);
    $('qmarkTypes').innerHTML=ERROR_TYPES.map(([type,group])=>`<button type="button" class="qmark-type ${group}" data-type="${esc(type)}" data-group="${group}">${esc(type)}</button>`).join('');
    $('qmarkTypes').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)addError(b.dataset.type,b.dataset.group);});$('qmarkClose').addEventListener('click',closeSheet);sheet.addEventListener('click',e=>{if(e.target?.dataset?.close)closeSheet();});
    $('qmarkCustomAdd').addEventListener('click',addCustomError);$('qmarkCustomInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCustomError();}});renderCustomTypes();
  }
  function addCustomError(){const input=$('qmarkCustomInput'),type=cleanType(input?.value);if(!type)return;addError(type,'custom');if(!state.customTypes.includes(type)){state.customTypes.unshift(type);state.customTypes=state.customTypes.slice(0,12);savePrefs();renderCustomTypes();}if(input)input.value='';}
  function renderCustomTypes(){const el=$('qmarkCustomTypes');if(!el)return;el.innerHTML=state.customTypes.length?`<span>أخطاء مخصصة محفوظة:</span>${state.customTypes.map(t=>`<button type="button" data-custom="${esc(t)}">${esc(t)}</button>`).join('')}`:'';el.querySelectorAll('[data-custom]').forEach(b=>b.addEventListener('click',()=>addError(b.dataset.custom,'custom')));}
  function openSheet(){ensureSheet();const t=state.target,r=currentRange();if(!t||!r)return;$('qmarkTargetWord').textContent=t.word;$('qmarkTargetMeta').textContent=`سورة ${r.surah||''} · الآية ${t.ayah} · الكلمة ${t.wordIndex+1}`;$('qmarkTargetContext').textContent=ctxLabel(state.context);renderCurrent();const s=$('quranErrorSheet');s.hidden=false;requestAnimationFrame(()=>s.classList.add('open'));}
  function closeSheet(){const s=$('quranErrorSheet');if(!s)return;s.classList.remove('open');setTimeout(()=>{s.hidden=true;},160);}
  function persistSessionErrorsNow(){try{renderSessionErrors();scheduleDraftSave();if(typeof saveDraftNow==='function')saveDraftNow();}catch(_){} }
  function addError(type,group){
    type=cleanType(type);if(!state.target||!type)return;const r=currentRange();if(!r)return;group=['pronunciation','memory','tajweed','custom'].includes(group)?group:(presetGroup(type)||'custom');
    const duplicate=quranErrors().find(e=>sameWord(e,state.target)&&e.type===type&&e.mode===state.context&&!e.resolved);if(duplicate){try{toast('هذا النوع مسجل بالفعل على نفس الكلمة','info');}catch(_){}return;}
    const row={id:errorId(),type,group,at:now(),source:'quran-word',mode:state.context,surah:r.surah||'',surahId:Number(r.chapter)||0,ayah:Number(state.target.ayah),wordIndex:Number(state.target.wordIndex),word:String(state.target.word||'').slice(0,120),ayahText:String(state.target.ayahText||'').slice(0,1200),resolved:false,resolvedAt:''};
    currentErrors().push(row);persistSessionErrorsNow();renderCurrent();paintAllWords();refreshPanel();
  }
  function findById(id){return currentErrors().find(x=>x?.id===id);}
  function toggleResolved(id){const e=findById(id);if(!e)return;e.resolved=!e.resolved;e.resolvedAt=e.resolved?now():'';persistSessionErrorsNow();renderCurrent();paintAllWords();}
  function removeError(id){const list=currentErrors(),i=list.findIndex(x=>x?.id===id);if(i<0)return;list.splice(i,1);persistSessionErrorsNow();renderCurrent();paintAllWords();refreshPanel();}
  function renderCurrent(){if(!state.target)return;const rows=quranErrors().filter(e=>sameWord(e,state.target));$('qmarkWordCount').textContent=String(rows.length);const el=$('qmarkCurrentList');if(!el)return;el.innerHTML=rows.length?rows.map(e=>`<div class="qmark-current-item ${e.resolved?'resolved':''}"><div><b>${esc(e.type)}</b><small>${esc(ctxLabel(e.mode))}${e.resolved?' · تم التصحيح':''}</small></div><div><button type="button" data-resolve="${esc(e.id||'')}">${e.resolved?'إعادة فتح':'✓ تم التصحيح'}</button><button type="button" class="danger" data-remove="${esc(e.id||'')}">حذف</button></div></div>`).join(''):'<p class="qmark-empty">لم تُسجل علامة على هذه الكلمة بعد.</p>';el.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>toggleResolved(b.dataset.resolve)));el.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeError(b.dataset.remove)))}
  function installPanel(){
    const note=$('quranSourceNote');if(!note||$('quranCorrectionPanel'))return;const panel=document.createElement('div');panel.id='quranCorrectionPanel';panel.className='qmark-panel';panel.innerHTML=`<div class="qmark-panel-top"><button type="button" id="qmarkToggle" class="qmark-toggle">✎ تفعيل وضع التصحيح</button><label><span>مرحلة القراءة</span><select id="qmarkContext"><option value="new_read">الحفظ الجديد — قراءة الطالب</option><option value="talaqqin">التلقين — ترديد خلف الشيخ</option><option value="recitation">التسميع</option><option value="review">المراجعة</option></select></label><span id="qmarkCount" class="qmark-count">0 علامات</span><button type="button" id="qmarkShareImage" class="qmark-share">▣ مشاركة صورة الأخطاء</button></div><div id="qmarkHint" class="qmark-hint"></div><div class="qmark-legend"><span class="pronunciation">نطق/حروف</span><span class="memory">حفظ/تردد</span><span class="tajweed">تجويد</span><span class="custom">مخصص</span><span class="resolved">تم التصحيح</span></div>`;note.insertAdjacentElement('afterend',panel);$('qmarkToggle').addEventListener('click',toggle);$('qmarkContext').addEventListener('change',e=>setContext(e.target.value));$('qmarkShareImage').addEventListener('click',shareCurrentDraftImage);refreshPanel();
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
    if(typeof baseCapture==='function')legacy.override('captureDraft',function(...args){const d=baseCapture.apply(this,args)||{};d.recitationErrors=currentErrors().map(x=>({...x}));return d;},'v11.2.0-error1.1');
    if(typeof baseApply==='function')legacy.override('applyDraft',function(d,...args){const out=baseApply.call(this,d,...args);try{V8.sessionErrors=Array.isArray(d?.recitationErrors)?d.recitationErrors.map(x=>({...x})):[];renderSessionErrors();setTimeout(paintAllWords,0);}catch(_){}return out;},'v11.2.0-error1.1');
    if(typeof baseBuild==='function')legacy.override('buildSesData',function(...args){const d=baseBuild.apply(this,args)||{};d.recitationErrors=currentErrors().map(x=>({...x}));return d;},'v11.2.0-error1.1');
  }
  function rowsForImage(ses){return quranErrors(ses?.recitationErrors||[]).filter(x=>x.surah&&x.ayah).slice(0,120);}
  function groupRows(rows){const m=new Map();for(const e of rows){const k=`${e.surahId||0}:${e.ayah}`;if(!m.has(k))m.set(k,{surah:e.surah,surahId:e.surahId,ayah:e.ayah,text:e.ayahText||'',errors:[]});const g=m.get(k);if(!g.text&&e.ayahText)g.text=e.ayahText;g.errors.push(e);}return [...m.values()].sort((a,b)=>(a.surahId-b.surahId)||(a.ayah-b.ayah));}
  function rounded(ctx,x,y,w,h,r,fill){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  function snapshotColor(e){if(e.resolved)return '#DDF4E5';const g=colorClass(e.type,e);if(g==='pronunciation')return '#FFE2D7';if(g==='tajweed')return '#DCEAFF';if(g==='custom')return '#EFE3FF';return '#FFF0BF';}
  function buildSnapshotCanvas(st,ses){
    const groups=groupRows(rowsForImage(ses)),W=1080,temp=document.createElement('canvas');temp.width=W;temp.height=Math.min(10000,520+Math.max(1,groups.length)*650);const c=temp.getContext('2d');c.fillStyle='#F7F4EA';c.fillRect(0,0,temp.width,temp.height);c.direction='rtl';c.textAlign='right';
    c.fillStyle='#0F5136';c.font='700 48px Arial';c.fillText('متابعة مواضع التصحيح',W-60,80);c.fillStyle='#26372E';c.font='700 30px Arial';c.fillText(st?.name||'الطالب',W-60,128);c.fillStyle='#6C786F';c.font='24px Arial';c.fillText(new Date(ses?.date||Date.now()).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}),W-60,168);
    let y=220;const maxGroups=12;for(const grp of groups.slice(0,maxGroups)){
      rounded(c,42,y-30,W-84,70,18,'#E9F2EC');c.fillStyle='#174F36';c.font='700 27px Arial';c.fillText(`سورة ${grp.surah} — الآية ${grp.ayah}`,W-68,y+14);y+=78;
      const text=grp.text||grp.errors.sort((a,b)=>a.wordIndex-b.wordIndex).map(e=>e.word).join(' '),words=String(text).split(/\s+/).filter(Boolean),byIndex=new Map();for(const e of grp.errors){if(!byIndex.has(Number(e.wordIndex)))byIndex.set(Number(e.wordIndex),[]);byIndex.get(Number(e.wordIndex)).push(e);}c.font='42px "Traditional Arabic", serif';c.textAlign='right';c.direction='rtl';let x=W-70;const left=70,gap=16,lineH=74;
      for(let i=0;i<words.length;i++){const word=words[i],mw=c.measureText(word).width;if(x-mw<left){x=W-70;y+=lineH;}const errs=byIndex.get(i)||[];if(errs.length)rounded(c,x-mw-7,y-47,mw+14,59,10,snapshotColor(errs.find(e=>!e.resolved)||errs[0]));c.fillStyle='#17251C';c.fillText(word,x,y);x-=mw+gap;}y+=54;
      c.font='700 21px Arial';for(const [idx,errs] of [...byIndex.entries()].sort((a,b)=>a[0]-b[0])){const word=words[idx]||errs[0]?.word||'الموضع',types=[...new Set(errs.map(e=>`${e.type}${e.resolved?' ✓':''}`))].join('، ');c.fillStyle='#526158';c.fillText(`• ${word}: ${types}`,W-76,y);y+=34;}y+=34;
    }
    if(groups.length>maxGroups){c.fillStyle='#8A5B22';c.font='700 22px Arial';c.fillText(`+ ${groups.length-maxGroups} آيات أخرى محفوظة في سجل الحصة`,W-60,y);y+=45;}
    c.fillStyle='#78827A';c.font='20px Arial';c.fillText(settings?.circle||'أكاديمية الإمام لتحفيظ القرآن الكريم',W-60,y+30);const H=Math.min(temp.height,Math.max(520,y+80)),out=document.createElement('canvas');out.width=W;out.height=H;out.getContext('2d').drawImage(temp,0,0,W,H,0,0,W,H);return out;
  }
  function canvasFile(canvas,st){const data=canvas.toDataURL('image/png'),bin=atob(data.split(',')[1]),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const name=`quran-errors-${String(st?.name||'student').replace(/[^\p{L}\p{N}-]+/gu,'-').slice(0,40)}.png`;return new File([u8],name,{type:'image/png'});}
  function downloadFile(file){const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
  async function shareErrorSnapshot(st,ses,msg=''){
    const rows=rowsForImage(ses);if(!rows.length)return false;let file;try{file=canvasFile(buildSnapshotCanvas(st,ses),st);}catch(e){console.warn('[qmark] snapshot failed',e);return false;}
    try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:`مواضع التصحيح — ${st?.name||''}`,text:String(msg||'')});return true;}}catch(e){if(e?.name==='AbortError')return true;console.warn('[qmark] native file share failed',e);}
    downloadFile(file);try{toast('تم تنزيل صورة الأخطاء. سيتم فتح رسالة ولي الأمر أيضًا.','info');}catch(_){}return false;
  }
  async function shareCurrentDraftImage(){
    const sid=$('sesSt')?.value,st=(g.students||[]).find?.(x=>x.id===sid);if(!st){try{toast('اختر الطالب أولًا','error');}catch(_){}return;}const data=typeof g.buildSesData==='function'?g.buildSesData():{},dateKey=$('sesDate')?.value||new Date().toISOString().slice(0,10),ses={studentId:sid,date:dateKey,status:typeof sesStatus!=='undefined'?sesStatus:'حضر',...data};if(!rowsForImage(ses).length){try{toast('لا توجد علامات أخطاء على النص لإنشاء صورة','info');}catch(_){}return;}const msg=typeof g.buildWAMsg==='function'?g.buildWAMsg(st,ses):'';const shared=await shareErrorSnapshot(st,ses,msg);if(!shared&&typeof g.openWhatsApp==='function')g.openWhatsApp(st,msg);
  }
  function installWhatsAppBridge(){
    const legacy=g.ImamApp?.Legacy;if(!legacy)return;
    legacy.override('saveAndSendWA',async function(){const ses=g.saveSession?.({silent:true,noCelebrate:true});if(!ses)return;const st=(g.students||[]).find?.(x=>x.id===ses.studentId);if(!st)return;const msg=g.buildWAMsg?.(st,ses)||'';if(rowsForImage(ses).length){const shared=await shareErrorSnapshot(st,ses,msg);if(!shared)g.openWhatsApp?.(st,msg);try{toast(shared?'اختر واتساب من نافذة المشاركة لإرسال صورة الأخطاء':'تم فتح رسالة ولي الأمر','success');}catch(_){}return;}g.openWhatsApp?.(st,msg);},'v11.2.0-error1.1');
    if(typeof g.saveAndSendWAMode==='function')legacy.override('saveAndSendWAMode',async function(mode){const ses=g.saveSession?.({silent:true,noCelebrate:true});if(!ses)return;const st=(g.students||[]).find?.(x=>x.id===ses.studentId);if(!st)return;const msg=typeof g.buildWAMsgMode==='function'?g.buildWAMsgMode(st,ses,mode):g.buildWAMsg?.(st,ses)||'';if(rowsForImage(ses).length){const shared=await shareErrorSnapshot(st,ses,msg);if(!shared)g.openWhatsApp?.(st,msg);return;}g.openWhatsApp?.(st,msg);},'v11.2.0-error1.1');
  }
  function init(){if(state.installed)return;state.installed=true;readPrefs();installPersistenceBridges();installPanel();ensureSheet();observe();hookOpeners();installWhatsAppBridge();refreshPanel();document.addEventListener('visibilitychange',()=>{if(document.hidden){savePrefs();if(currentErrors().length)try{saveDraftNow();}catch(_){}}});g.addEventListener?.('pagehide',()=>{savePrefs();if(currentErrors().length)try{saveDraftNow();}catch(_){}},{capture:true});}
  g.ImamTeacherErrorMarking={init,toggle,setContext,decorate,paintAllWords,closeSheet,shareErrorSnapshot,shareCurrentDraftImage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
