'use strict';
/* We Live Quran — mobile-first Madani Mushaf offline pages v10.5.4
   Fixes Android's inability to render cached PDF pages inline by using the
   versioned quran.ws SVG CDN. Each SVG is optionally gzip-compressed before
   being persisted in IndexedDB, then inflated only when displayed. */
(function initMushafOfflineFeature(g){
  const APP=g.ImamApp||(g.ImamApp={});
  const Legacy=APP.Legacy;
  const BASE_RENDER=g.renderV9Mushaf;
  const PAGE_COUNT=604;
  const PAGE_PREFIX='mushaf:svg:gzip:page:';
  const OLD_PAGE_PREFIX='mushaf:lite:page:';
  const META_KEY='mushaf:svg:gzip:meta';
  const SURAH_INDEX_KEY='mushaf:surah-index:v1';
  const READER_THEME_KEY='mushaf:reader-theme';
  const CDN_VERSION='v1.1.1';
  const CDN_ROOT=`https://cdn.quran.ws/svg/pages/${CDN_VERSION}/hafs-kfqc`;
  const SOURCE_INFO='https://quran.ws/blocks/quran-svg/';
  const OFFICIAL_INFO='https://qurancomplex.gov.sa/en/apps-hafs/';
  const state={running:false,cancel:false,objectUrl:'',lastError:'',lastPage:1,teacherPage:1,readerBound:false,audioCtx:null,readerTheme:'day',surahIndex:null};

  function clampPage(n){return Math.max(1,Math.min(PAGE_COUNT,Number(n)||1));}
  function padPage(page){return String(clampPage(page)).padStart(3,'0');}
  function pageKey(page){return `${PAGE_PREFIX}${padPage(page)}`;}
  function pageUrl(page){return `${CDN_ROOT}/${padPage(page)}.svg`;}
  function notify(msg,type='info'){if(typeof g.v9Toast==='function')g.v9Toast(msg,type);else if(typeof g.toast==='function')g.toast(msg,type);}
  function fmt(n){return typeof g.fmtBytes==='function'?g.fmtBytes(n):`${Math.round((Number(n)||0)/104857.6)/10} MB`;}
  function supportsCompression(){return typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined';}

  async function allMediaKeys(){
    if(typeof g.v9MediaKeys==='function')return await g.v9MediaKeys();
    return [];
  }
  async function keys(){return (await allMediaKeys()).filter(k=>String(k).startsWith(PAGE_PREFIX));}
  async function oldKeys(){return (await allMediaKeys()).filter(k=>String(k).startsWith(OLD_PAGE_PREFIX));}
  async function stats(){
    const ks=await keys();let bytes=0;
    for(const k of ks){const b=await g.mediaGet(k).catch(()=>null);bytes+=Number(b?.size||0);}
    return {count:ks.length,bytes};
  }
  async function legacyStats(){
    const full=await g.mediaGet('mushaf:madinah:pdf').catch(()=>null);
    const old=await oldKeys();let pageBytes=0;
    for(const k of old){const b=await g.mediaGet(k).catch(()=>null);pageBytes+=Number(b?.size||0);}
    return {pdfBytes:Number(full?.size||0),oldPages:old.length,oldPageBytes:pageBytes};
  }
  async function hasPage(page){return !!(await g.mediaGet(pageKey(page)).catch(()=>null));}

  async function gzipBlob(blob){
    if(!supportsCompression())return new Blob([blob],{type:'image/svg+xml'});
    const stream=blob.stream().pipeThrough(new CompressionStream('gzip'));
    const gz=await new Response(stream).blob();
    return new Blob([gz],{type:'application/gzip'});
  }
  async function inflateBlob(blob){
    if(!blob)return null;
    if(blob.type!=='application/gzip')return blob.type==='image/svg+xml'?blob:new Blob([blob],{type:'image/svg+xml'});
    if(!supportsCompression())throw new Error('GZIP_NOT_SUPPORTED');
    const stream=blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const raw=await new Response(stream).blob();
    return new Blob([raw],{type:'image/svg+xml'});
  }

  async function fetchPage(page){
    page=clampPage(page);
    const existing=await g.mediaGet(pageKey(page)).catch(()=>null);
    if(existing)return {page,size:existing.size||0,cached:true};
    const res=await fetch(pageUrl(page),{cache:'no-store',credentials:'omit'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const raw=await res.blob();
    if(!raw||raw.size<1000)throw new Error('EMPTY_PAGE');
    const head=(await raw.slice(0,220).text()).toLowerCase();
    if(!head.includes('<svg')&&!head.includes('<?xml'))throw new Error('INVALID_SVG');
    const stored=await gzipBlob(raw);
    await g.mediaPut(pageKey(page),stored);
    return {page,size:stored.size,cached:false};
  }

  function progressText(text){for(const id of ['mushafLiteProgress','v1053TeacherDownloadStatus']){const el=document.getElementById(id);if(el)el.textContent=text||'';}}
  async function saveMeta(extra={}){
    const s=await stats();const raw=await g.idbKvGet(META_KEY).catch(()=>null);let old={};
    try{old=JSON.parse(raw||'{}')}catch(_){old={};}
    await g.idbKvPut(META_KEY,JSON.stringify({...old,...extra,format:'svg-gzip',cdnVersion:CDN_VERSION,count:s.count,bytes:s.bytes,updatedAt:new Date().toISOString()}));
    return s;
  }
  async function refreshHomeState(){
    try{if(typeof g.v1052RefreshMushafQuickStatus==='function')await g.v1052RefreshMushafQuickStatus();}catch(_){ }
    try{await updateTeacherDownloadState();}catch(_){ }
  }

  async function cleanupLegacyStorageOnce(){
    const flag='mushaf:v1053:legacy-cleaned';
    if(await g.idbKvGet(flag).catch(()=>null))return;
    // v10.5.4 no longer uses the 200+ MB PDF path at all.
    await g.mediaDelete('mushaf:madinah:pdf').catch(()=>{});
    await g.idbKvPut('mushaf:madinah:meta','{}').catch(()=>{});
    const old=await oldKeys().catch(()=>[]);
    for(const k of old)await g.mediaDelete(k).catch(()=>{});
    await g.idbKvPut(flag,new Date().toISOString()).catch(()=>{});
  }

  function playPageFlipSound(){
    try{
      const AC=g.AudioContext||g.webkitAudioContext;if(!AC)return;
      const ctx=state.audioCtx||(state.audioCtx=new AC());if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      const dur=.13,frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,frames,ctx.sampleRate),data=buf.getChannelData(0);
      for(let i=0;i<frames;i++){const t=i/frames;data[i]=(Math.random()*2-1)*(1-t)*(.55+.45*Math.sin(Math.PI*t));}
      const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      filter.type='bandpass';filter.frequency.value=1450;filter.Q.value=.55;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);
      src.buffer=buf;src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start();
    }catch(_){ }
  }

  function surahBaseRows(){
    const arr=(typeof S!=='undefined'&&Array.isArray(S))?S:[];
    return arr.map((x,i)=>({id:i+1,name:String(x?.n||`سورة ${i+1}`),page:null}));
  }
  async function loadSurahIndex(force=false){
    if(state.surahIndex&&!force)return state.surahIndex;
    if(!force){
      const raw=await g.idbKvGet(SURAH_INDEX_KEY).catch(()=>null);
      try{const rows=JSON.parse(raw||'[]');if(Array.isArray(rows)&&rows.length===114){state.surahIndex=rows;return rows;}}catch(_){ }
    }
    const fallback=surahBaseRows();
    if(!navigator.onLine){state.surahIndex=fallback;return fallback;}
    try{
      const res=await fetch('https://api.quran.com/api/v4/chapters?language=ar',{headers:{Accept:'application/json'},cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const data=await res.json(),chs=Array.isArray(data?.chapters)?data.chapters:[];
      const rows=fallback.map((row,i)=>{
        const ch=chs.find(x=>Number(x?.id)===i+1)||chs[i]||{};
        const page=Number(Array.isArray(ch?.pages)?ch.pages[0]:ch?.page_number||0);
        return {...row,name:String(ch?.name_arabic||row.name),page:page>=1&&page<=PAGE_COUNT?page:null};
      });
      if(rows.some(x=>x.page)){state.surahIndex=rows;await g.idbKvPut(SURAH_INDEX_KEY,JSON.stringify(rows)).catch(()=>{});return rows;}
    }catch(_){ }
    state.surahIndex=fallback;return fallback;
  }
  function currentSurahForPage(page){
    const rows=Array.isArray(state.surahIndex)?state.surahIndex:[];let found=null;
    for(const row of rows){if(Number(row.page)>0&&Number(row.page)<=page)found=row;else if(Number(row.page)>page)break;}
    return found;
  }
  async function persistSurahPage(chapter,page){
    chapter=Number(chapter);page=Number(page);if(!(chapter>=1&&chapter<=114&&page>=1&&page<=PAGE_COUNT))return;
    const rows=await loadSurahIndex(false);const row=rows[chapter-1];if(row&&Number(row.page)!==page){row.page=page;state.surahIndex=rows;await g.idbKvPut(SURAH_INDEX_KEY,JSON.stringify(rows)).catch(()=>{});}
  }
  async function renderSurahDrawer(query=''){
    const list=document.getElementById('v1054SurahList');if(!list)return;
    const rows=await loadSurahIndex(false),q=String(query||'').trim().replace(/^سورة\s+/,'');
    const filtered=rows.filter(r=>!q||String(r.name).includes(q)||String(r.id)===q||String(r.id).startsWith(q));
    list.innerHTML=filtered.map(r=>`<button type="button" class="v1054-surah-row" onclick="jumpTeacherMushafSurah(${r.id})"><span class="v1054-surah-no">${r.id}</span><span class="v1054-surah-name">سورة ${r.name}</span><span class="v1054-surah-page">${r.page?`ص ${r.page}`:'—'}</span></button>`).join('')||'<div class="v1054-surah-empty">لا توجد سورة مطابقة</div>';
  }
  function openSurahDrawer(){
    const mo=ensureTeacherReader(),drawer=mo.querySelector('#v1054SurahDrawer'),shade=mo.querySelector('#v1054SurahShade');if(!drawer)return;
    drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');shade?.classList.add('open');
    const input=drawer.querySelector('input');if(input){input.value='';setTimeout(()=>input.focus({preventScroll:true}),80);}renderSurahDrawer('').catch(()=>{});
  }
  function closeSurahDrawer(){const mo=document.getElementById('v1053TeacherMushaf'),drawer=mo?.querySelector('#v1054SurahDrawer'),shade=mo?.querySelector('#v1054SurahShade');drawer?.classList.remove('open');drawer?.setAttribute('aria-hidden','true');shade?.classList.remove('open');}
  async function jumpSurah(chapter){
    chapter=Math.max(1,Math.min(114,Number(chapter)||1));let rows=await loadSurahIndex(false),page=Number(rows[chapter-1]?.page||0);
    if(!page&&navigator.onLine){page=await getVersePage(chapter,1);if(page)await persistSurahPage(chapter,page);}
    if(!page)return notify('تعذر تحديد صفحة بداية السورة بدون إنترنت. افتح القائمة مرة أثناء الاتصال بالإنترنت.','error');
    closeSurahDrawer();await teacherPage(page,true);
  }
  async function applyReaderTheme(theme){
    theme=theme==='night'?'night':'day';state.readerTheme=theme;const shell=document.querySelector('#v1053TeacherMushaf .v1053-reader-shell');if(shell)shell.dataset.theme=theme;
    const btn=document.getElementById('v1054ThemeToggle');if(btn){btn.innerHTML=theme==='night'?'☀️<span>نهاري</span>':'🌙<span>ليلي</span>';btn.setAttribute('aria-label',theme==='night'?'الوضع النهاري':'الوضع الليلي');}
    await g.idbKvPut(READER_THEME_KEY,theme).catch(()=>{});
  }
  async function toggleReaderTheme(){await applyReaderTheme(state.readerTheme==='night'?'day':'night');}

  function ensureTeacherReader(){
    let mo=document.getElementById('v1053TeacherMushaf');if(mo)return mo;
    mo=document.createElement('div');mo.id='v1053TeacherMushaf';mo.className='v1053-reader-modal';mo.setAttribute('aria-hidden','true');
    mo.innerHTML=`<div class="v1053-reader-shell" role="dialog" aria-modal="true" aria-label="مصحف المحفظ" data-theme="day">
      <header class="v1053-reader-top v1054-reader-top">
        <div class="v1054-top-side v1054-top-right"><button type="button" class="v1054-reader-tool" onclick="openTeacherSurahMenu()" aria-label="فهرس السور">☰<span>السور</span></button></div>
        <div class="v1054-reader-title"><b>مصحف المدينة النبوية</b><span>حفص عن عاصم · قراءة هادئة داخل التطبيق</span></div>
        <div class="v1054-top-side v1054-top-left"><button id="v1054ThemeToggle" type="button" class="v1054-reader-tool" onclick="toggleTeacherMushafTheme()" aria-label="الوضع الليلي">🌙<span>ليلي</span></button><button type="button" class="v1053-reader-close" onclick="closeTeacherMushafReader()" aria-label="إغلاق">✕</button></div>
      </header>
      <div class="v1053-reader-meta v1054-reader-meta"><button type="button" class="v1054-next" onclick="teacherMushafTurn(1)" aria-label="الصفحة التالية">التالي <b>›</b></button><label>صفحة <input id="v1053TeacherPageInput" type="number" min="1" max="604" value="1" onchange="openTeacherMushafPage(this.value,false)"></label><button type="button" class="v1054-prev" onclick="teacherMushafTurn(-1)" aria-label="الصفحة السابقة"><b>‹</b> السابق</button></div>
      <div class="v1053-mushaf-ornament v1054-mushaf-ornament"><span class="v1053-corner c1">۞</span><span class="v1053-corner c2">۞</span><span class="v1053-corner c3">۞</span><span class="v1053-corner c4">۞</span><div class="v1054-frame-crown">﴿</div><div id="v1053TeacherMushafFrame" class="v1053-teacher-frame"><div class="v9-mushaf-empty"><div><b>جاري فتح المصحف…</b></div></div></div><div class="v1054-frame-crown bottom">﴾</div></div>
      <footer class="v1053-reader-bottom v1054-reader-bottom"><span id="v1053TeacherPageState">صفحة 1</span><span id="v1054TeacherSurahState"></span><span id="v1053TeacherDownloadStatus"></span><small>اسحب لليمين للصفحة التالية، ولليسار للصفحة السابقة.</small></footer>
      <button id="v1053TeacherDownload" type="button" class="v1053-reader-download v1054-floating-download" onclick="downloadTeacherMushafPages()">⇩ تنزيل المصحف للعمل دون إنترنت</button>
      <div id="v1054SurahShade" class="v1054-surah-shade" onclick="closeTeacherSurahMenu()"></div>
      <aside id="v1054SurahDrawer" class="v1054-surah-drawer" aria-hidden="true"><header><div><b>فهرس السور</b><span>انتقل مباشرة إلى بداية السورة</span></div><button type="button" onclick="closeTeacherSurahMenu()">✕</button></header><div class="v1054-surah-search"><input type="search" inputmode="search" placeholder="ابحث باسم السورة أو رقمها…" oninput="filterTeacherSurahMenu(this.value)"></div><div id="v1054SurahList" class="v1054-surah-list"></div></aside>
    </div>`;
    document.body.appendChild(mo);
    const frame=mo.querySelector('#v1053TeacherMushafFrame');let x0=0,y0=0,t0=0;
    frame.addEventListener('touchstart',e=>{const t=e.changedTouches?.[0];if(!t)return;x0=t.clientX;y0=t.clientY;t0=Date.now();},{passive:true});
    frame.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-x0,dy=t.clientY-y0,dt=Date.now()-t0;if(dt<700&&Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.25){teacherTurn(dx>0?1:-1);}}, {passive:true});
    mo.addEventListener('click',e=>{if(e.target===mo)closeTeacherReader();});
    return mo;
  }

  async function updateTeacherDownloadState(){
    const btn=document.getElementById('v1053TeacherDownload');const s=await stats();
    if(btn){const complete=s.count>=PAGE_COUNT;btn.hidden=complete;btn.style.display=complete?'none':'';btn.textContent=complete?'':(s.count?`⇩ استكمال التنزيل ${s.count}/${PAGE_COUNT}`:'⇩ تنزيل المصحف للعمل دون إنترنت');}
    const home=document.getElementById('v1053HomeMushafDownload');if(home){const complete=s.count>=PAGE_COUNT;home.hidden=complete;home.style.display=complete?'none':'';}
  }

  async function teacherPage(page,withSound=true){
    page=clampPage(page);state.teacherPage=page;
    const target=document.getElementById('v1053TeacherMushafFrame');if(!target)return;
    await showLitePage(page,'v1053TeacherMushafFrame');
    target.querySelectorAll('.mushaf-lite-online-note').forEach(x=>x.remove());
    const inp=document.getElementById('v1053TeacherPageInput');if(inp)inp.value=page;
    const st=document.getElementById('v1053TeacherPageState');if(st)st.textContent=`صفحة ${page} من ${PAGE_COUNT}`;
    const surahState=document.getElementById('v1054TeacherSurahState'),row=currentSurahForPage(page);if(surahState)surahState.textContent=row?`سورة ${row.name}`:'';
    if(withSound)playPageFlipSound();
    updateTeacherDownloadState().catch(()=>{});
  }
  function teacherTurn(delta){const next=clampPage((state.teacherPage||1)+Number(delta||0));if(next===state.teacherPage)return;teacherPage(next,true).catch(()=>{});}
  async function openTeacherReader(page){
    const mo=ensureTeacherReader(),last=clampPage(page||Number(await g.idbKvGet('mushaf:lastPage').catch(()=>1))||1);state.teacherPage=last;
    const savedTheme=await g.idbKvGet(READER_THEME_KEY).catch(()=>null);state.readerTheme=savedTheme==='night'?'night':'day';
    mo.classList.add('open');mo.setAttribute('aria-hidden','false');document.body.classList.add('v1053-reader-open');
    await loadSurahIndex(false).catch(()=>{});await applyReaderTheme(state.readerTheme);await teacherPage(last,false);await updateTeacherDownloadState();
  }
  function closeTeacherReader(){const mo=document.getElementById('v1053TeacherMushaf');if(!mo)return;mo.classList.remove('open');mo.setAttribute('aria-hidden','true');document.body.classList.remove('v1053-reader-open');}
  async function downloadTeacherPages(){await downloadRange(1,PAGE_COUNT);await refreshHomeState();}

  async function downloadRange(from=1,to=PAGE_COUNT){
    if(state.running){notify('يوجد تنزيل صفحات جارٍ بالفعل','info');return;}
    from=clampPage(from);to=clampPage(to);if(to<from)[from,to]=[to,from];
    if(!navigator.onLine){notify('شغّل الإنترنت أولًا لتنزيل الصفحات','error');return;}
    const st=await (typeof g.storageInfo==='function'?g.storageInfo():Promise.resolve({usage:0,quota:0}));
    if(st.quota&&st.usage/st.quota>.9){notify('مساحة التخزين على الجهاز منخفضة. حرّر مساحة أولًا.','error');return;}
    state.running=true;state.cancel=false;state.lastError='';
    if(from===1&&to===PAGE_COUNT)await loadSurahIndex(true).catch(()=>{});
    if(typeof g.requestPersistentStorage==='function')await g.requestPersistentStorage().catch(()=>{});
    const existing=new Set(await keys());const pages=[];for(let p=from;p<=to;p++)if(!existing.has(pageKey(p)))pages.push(p);
    let done=0,failed=0,index=0;
    progressText(pages.length?`جارٍ تجهيز ${pages.length} صفحة…`:`✓ الصفحات ${from}–${to} محفوظة بالفعل`);
    const workers=Array.from({length:Math.min(3,Math.max(1,pages.length))},async()=>{
      while(!state.cancel){
        const i=index++;if(i>=pages.length)break;const p=pages[i];
        try{await fetchPage(p);done++;}
        catch(err){failed++;state.lastError=String(err?.message||err);if(failed>=3){state.cancel=true;break;}}
        progressText(`تنزيل صفحات المصحف: ${done}/${pages.length}${failed?` · أخطاء ${failed}`:''} · الصفحة ${p}`);
      }
    });
    await Promise.all(workers);state.running=false;
    const s=await saveMeta({lastRange:[from,to],lastError:state.lastError||'',completed:!state.cancel&&failed===0});
    if(failed){progressText(`تعذر تنزيل بعض الصفحات (${failed}). ${state.lastError||''}`);notify('تعذر تنزيل بعض صفحات المصحف. أعد المحاولة لاحقًا.','error');}
    else if(state.cancel){progressText(`تم إيقاف التنزيل. المحفوظ ${s.count}/${PAGE_COUNT} صفحة (${fmt(s.bytes)}).`);notify('تم إيقاف تنزيل الصفحات','info');}
    else{progressText(`✓ محفوظ ${s.count}/${PAGE_COUNT} صفحة · ${fmt(s.bytes)}`);notify(from===1&&to===PAGE_COUNT?'تم تنزيل المصحف للعمل دون إنترنت':'تم تنزيل الصفحات المطلوبة','success');}
    await renderPrimaryUI();await refreshHomeState();
  }
  function cancelDownload(){state.cancel=true;progressText('جارٍ إيقاف التنزيل بعد الصفحة الحالية…');}

  async function deletePack(){
    const s=await stats();if(!s.count)return notify('لا توجد صفحات مصحف محفوظة','info');
    if(!confirm(`سيتم حذف ${s.count} صفحة من الحزمة الجديدة فقط. لن تتأثر بيانات الطلاب. متابعة؟`))return;
    const ks=await keys();for(const k of ks)await g.mediaDelete(k).catch(()=>{});
    await g.idbKvPut(META_KEY,'{}').catch(()=>{});
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    notify('تم حذف صفحات المصحف المحفوظة','success');await renderPrimaryUI();
  }

  async function cleanupOldPageCache(){
    const ks=await oldKeys();if(!ks.length)return notify('لا توجد صفحات PDF قديمة محفوظة','info');
    if(!confirm(`سيتم حذف ${ks.length} صفحة PDF قديمة فقط من إصدار 10.4.0. متابعة؟`))return;
    for(const k of ks)await g.mediaDelete(k).catch(()=>{});
    notify('تم حذف كاش الصفحات القديم','success');await renderPrimaryUI();
  }
  async function deleteLegacyPdf(){
    const b=await g.mediaGet('mushaf:madinah:pdf').catch(()=>null);if(!b)return notify('لا يوجد ملف PDF قديم مثبت','info');
    if(!confirm(`سيتم حذف ملف PDF القديم (${fmt(b.size)}). الصفحات الجديدة المحفوظة لن تتأثر. متابعة؟`))return;
    await g.mediaDelete('mushaf:madinah:pdf').catch(()=>{});
    await g.idbKvPut('mushaf:madinah:meta','{}').catch(()=>{});
    notify('تم حذف ملف PDF القديم وتحرير المساحة','success');await renderPrimaryUI();
  }

  async function getVersePage(chapter,ayah){
    const key=`mushaf:page:${chapter}:${ayah}`,cached=await g.idbKvGet(key).catch(()=>null);
    if(cached){const p=Number(cached);if(p>=1&&p<=PAGE_COUNT)return p;}
    if(!navigator.onLine)return null;
    try{
      const res=await fetch(`https://api.quran.com/api/v4/verses/by_key/${chapter}:${ayah}?fields=page_number`,{headers:{Accept:'application/json'}});
      if(!res.ok)throw new Error();const d=await res.json(),p=Number(d.verse?.page_number||d.page_number);
      if(p>=1&&p<=PAGE_COUNT){await g.idbKvPut(key,String(p));if(Number(ayah)===1)await persistSurahPage(chapter,p);return p;}
    }catch(_){ }
    return null;
  }
  async function downloadCurrentRangePages(){
    const r=(typeof V8!=='undefined'?V8.quranRange:null)||(typeof g.quranRangeFromNew==='function'?g.quranRangeFromNew():null);
    if(!r)return downloadRange(state.lastPage,state.lastPage);
    progressText('جارٍ تحديد صفحات نطاق الحفظ…');
    const a=await getVersePage(r.chapter,r.from),b=await getVersePage(r.chapter,r.to);
    if(!a||!b){notify('تعذر تحديد صفحات النطاق الآن','error');return;}
    return downloadRange(a,b);
  }

  function pageMarkup(url,page,offline){
    return `<div class="mushaf-svg-page-wrap"><img class="mushaf-svg-page" src="${url}" alt="مصحف المدينة — صفحة ${page}"></div>${offline?'':`<div class="mushaf-lite-online-note">عرض مباشر من الإنترنت · <button onclick="downloadMushafLitePage(${page})">حفظ الصفحة Offline</button></div>`}`;
  }
  async function showLitePage(page,targetId='mushafLiteFrame'){
    page=clampPage(page);state.lastPage=page;await g.idbKvPut('mushaf:lastPage',String(page)).catch(()=>{});
    const target=document.getElementById(targetId);if(!target)return false;
    const stored=await g.mediaGet(pageKey(page)).catch(()=>null);
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    if(stored){
      try{const svg=await inflateBlob(stored);state.objectUrl=URL.createObjectURL(svg);target.innerHTML=pageMarkup(state.objectUrl,page,true);}
      catch(err){target.innerHTML=`<div class="v9-mushaf-empty"><div><b>تعذر فتح الصفحة المحفوظة</b><p>احذف الصفحة وأعد تنزيلها.</p></div></div>`;}
    }else if(navigator.onLine){target.innerHTML=pageMarkup(pageUrl(page),page,false);}
    else{target.innerHTML=`<div class="v9-mushaf-empty"><div><b>الصفحة ${page} غير محفوظة على هذا الجهاز</b><p>اتصل بالإنترنت ونزّل الصفحة أو نطاق الحفظ.</p></div></div>`;}
    const input=document.getElementById('mushafLitePageInput');if(input)input.value=page;
    return !!stored;
  }
  async function downloadPage(page){
    page=clampPage(page);progressText(`جارٍ تنزيل الصفحة ${page}…`);
    try{await fetchPage(page);await saveMeta({lastRange:[page,page]});progressText(`✓ الصفحة ${page} محفوظة Offline`);notify(`تم تنزيل الصفحة ${page}`,'success');await showLitePage(page);}
    catch(err){state.lastError=String(err?.message||err);progressText(`تعذر تنزيل الصفحة ${page}: ${state.lastError}`);notify('تعذر تنزيل الصفحة','error');}
    await renderPrimaryUI({keepPage:true});await refreshHomeState();
  }

  async function renderPrimaryUI(opts={}){
    const root=document.getElementById('v9MushafApp');if(!root)return;
    const s=await stats();
    const last=clampPage(Number(await g.idbKvGet('mushaf:lastPage').catch(()=>1))||1);state.lastPage=last;
    const st=await (typeof g.storageInfo==='function'?g.storageInfo():Promise.resolve({usage:0,quota:0}));
    const pct=st.quota?Math.min(100,Math.round((st.usage||0)/st.quota*100)):0;
    root.classList.add('mushaf-mobile-reader-v1041');
    root.innerHTML=`
      <section class="mushaf-lite-card mushaf-lite-primary">
        <div class="mushaf-lite-head"><div><span class="v92-kicker">مصحف المدينة النبوية · قارئ 10.5.4</span><h1>قارئ المصحف Offline — حفص عن عاصم</h1><p>الصفحات تُعرض كصورة SVG واضحة داخل التطبيق بدل PDF، لذلك تعمل على Android بدون شاشة «فتح PDF».</p></div><span class="mushaf-lite-count">${s.count}/${PAGE_COUNT} صفحة · ${fmt(s.bytes)}</span></div>
        <div class="mushaf-lite-actions">${s.count<PAGE_COUNT?`<button class="btn btn-g" onclick="downloadMushafLiteAll()">${s.count?`استكمال تنزيل المصحف ${s.count}/${PAGE_COUNT}`:'تنزيل المصحف Offline'}</button>`:''}<button class="btn btn-out" onclick="downloadMushafRangePages()">تنزيل نطاق الحفظ</button>${state.running?'<button class="btn btn-red" onclick="cancelMushafLiteDownload()">إيقاف</button>':''}</div>
        <div id="mushafLiteProgress" class="v9-mushaf-progress">${state.running?'جارٍ التنزيل…':s.count?`✓ محفوظ ${s.count} صفحة (${fmt(s.bytes)})`:'لم يتم تنزيل صفحات بعد'}</div>
        <div class="mushaf-lite-reader"><div class="mushaf-lite-toolbar"><b>قارئ الصفحات</b><input id="mushafLitePageInput" type="number" min="1" max="604" value="${last}" onkeydown="if(event.key==='Enter')openMushafLitePage(this.value)"><button onclick="openMushafLitePage(Math.max(1,(Number(document.getElementById('mushafLitePageInput')?.value)||1)-1))">السابق</button><button onclick="openMushafLitePage(Math.min(604,(Number(document.getElementById('mushafLitePageInput')?.value)||1)+1))">التالي</button></div><div id="mushafLiteFrame" class="mushaf-lite-frame"><div class="v9-mushaf-empty"><div><b>صفحة ${last}</b><p>اضغط «فتح الصفحة» لعرضها.</p><button class="btn btn-g btn-sm" onclick="openMushafLitePage(${last})">فتح الصفحة</button></div></div></div></div>
      </section>
      <section class="v92-offline-card"><div><b>التخزين Offline</b><span>المستخدم ${fmt(st.usage)} من ${fmt(st.quota)}</span></div><div class="v92-storage"><i style="width:${pct}%"></i></div><div class="v92-step-actions"><button class="btn btn-out btn-sm" onclick="requestPersistentStorage().then(()=>renderV9Mushaf())">حماية التخزين</button><button class="btn btn-out btn-sm" onclick="downloadQuranTextPack()">تنزيل النص العثماني Offline</button></div><div id="v9TextPackProgress" class="v9-mushaf-progress">${(g.settings?.v9?.textPackStatus)||''}</div></section>
      <section class="mushaf-lite-source"><b>المصدر التقني:</b> صفحات مصحف المدينة بصيغة SVG من Quran.ws CDN، الإصدار ${CDN_VERSION}. <button onclick="openMushafLiteSourceInfo()">تفاصيل المصدر</button> <button onclick="openMushafOfficialInfo()">مرجع مجمع الملك فهد</button></section>`;
    if(opts.keepPage||s.count||navigator.onLine)setTimeout(()=>showLitePage(last).catch(()=>{}),0);
  }

  async function currentMushafPage(){
    const body=document.getElementById('v9MushafPaneBody');if(!body)return;
    let p=null;try{p=await g.getMushafPageForRange?.();}catch(_){ }
    if(!p){body.className='v9-mushaf-empty';body.innerHTML='<div><b>تعذر تحديد صفحة المصحف</b><p>افتح المصحف يدويًا وحدد الصفحة.</p></div>';return;}
    const stored=await g.mediaGet(pageKey(p)).catch(()=>null);
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    if(stored){
      try{const svg=await inflateBlob(stored);state.objectUrl=URL.createObjectURL(svg);body.className='';body.innerHTML=pageMarkup(state.objectUrl,p,true);return;}catch(_){ }
    }
    if(navigator.onLine){body.className='';body.innerHTML=pageMarkup(pageUrl(p),p,false);return;}
    body.className='v9-mushaf-empty';body.innerHTML=`<div><b>صفحة ${p} غير محفوظة</b><p>نزّل الصفحة أو نطاق الحفظ أثناء الاتصال بالإنترنت.</p><button class="btn btn-out btn-sm" onclick="closeQuranTextModal();goPage('mushaf')">إدارة المصحف Offline</button></div>`;
  }

  async function wrappedRender(){await renderPrimaryUI();}
  if(Legacy){Legacy.override('renderV9Mushaf',wrappedRender,'mushaf-offline-v10.5.4');Legacy.override('openCurrentMushafPage',currentMushafPage,'mushaf-offline-v10.5.4');}
  else{g.renderV9Mushaf=wrappedRender;g.openCurrentMushafPage=currentMushafPage;}

  g.downloadMushafLitePage=downloadPage;
  g.downloadMushafRangePages=downloadCurrentRangePages;
  g.downloadMushafLiteAll=()=>downloadRange(1,PAGE_COUNT);
  g.cancelMushafLiteDownload=cancelDownload;
  g.deleteMushafLitePack=deletePack;
  g.cleanupOldMushafPageCache=cleanupOldPageCache;
  g.deleteLegacyMushafPdf=deleteLegacyPdf;
  g.openMushafLitePage=showLitePage;
  g.openMushafLiteSourceInfo=()=>window.open(SOURCE_INFO,'_blank','noopener');
  g.openMushafOfficialInfo=()=>window.open(OFFICIAL_INFO,'_blank','noopener');
  g.openTeacherMushaf=openTeacherReader;
  g.downloadMadinahMushafDirect=downloadTeacherPages;
  g.closeTeacherMushafReader=closeTeacherReader;
  g.teacherMushafTurn=teacherTurn;
  g.openTeacherMushafPage=(page,sound=true)=>teacherPage(page,sound!==false);
  g.downloadTeacherMushafPages=downloadTeacherPages;
  g.openTeacherSurahMenu=openSurahDrawer;
  g.closeTeacherSurahMenu=closeSurahDrawer;
  g.filterTeacherSurahMenu=(q)=>renderSurahDrawer(q);
  g.jumpTeacherMushafSurah=jumpSurah;
  g.toggleTeacherMushafTheme=toggleReaderTheme;
  APP.MushafOffline={pageUrl,stats,downloadRange,downloadAll:downloadTeacherPages,downloadPage,showPage:showLitePage,render:renderPrimaryUI,openCurrent:currentMushafPage,openTeacherReader,closeTeacherReader,loadSurahIndex,jumpSurah,pageCount:PAGE_COUNT,source:SOURCE_INFO,official:OFFICIAL_INFO,cdnVersion:CDN_VERSION};
  // v10.5.4 removes the legacy PDF storage path. Only SVG pages downloaded from the web remain.
  setTimeout(()=>{cleanupLegacyStorageOnce().then(()=>refreshHomeState()).catch(()=>{});renderPrimaryUI().catch(err=>console.error('[mushaf-offline] initial render',err));},0);
})(globalThis);
