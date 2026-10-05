'use strict';
/* We Live Quran — lightweight Madani Mushaf page cache v10.4.0
   Keeps the existing trusted full-PDF import path, and adds an optional
   page-by-page offline pack. The page mirror is independent from KFGQPC;
   the official KFGQPC links remain the authority/source reference. */
(function initMushafOfflineFeature(g){
  const APP=g.ImamApp||(g.ImamApp={});
  const Legacy=APP.Legacy;
  const BASE_RENDER=g.renderV9Mushaf;
  const BASE_CURRENT=g.openCurrentMushafPage;
  const PAGE_COUNT=604;
  const PAGE_PREFIX='mushaf:lite:page:';
  const META_KEY='mushaf:lite:meta';
  const SOURCE_INFO='https://pdf.quran.ws/hafs/';
  const OFFICIAL_INFO='https://qurancomplex.gov.sa/en/apps-hafs/';
  const state={running:false,cancel:false,objectUrl:'',lastError:'',lastPage:1};

  function clampPage(n){return Math.max(1,Math.min(PAGE_COUNT,Number(n)||1));}
  function pageKey(page){return `${PAGE_PREFIX}${clampPage(page)}`;}
  function pageUrl(page){page=clampPage(page);return `https://pdf.quran.ws/pdfs/hafs/page/quran-hafs-page-${page}.pdf`;}
  function esc(s){return APP.Utils?.escapeHtml?APP.Utils.escapeHtml(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function notify(msg,type='info'){if(typeof g.v9Toast==='function')g.v9Toast(msg,type);else if(typeof g.toast==='function')g.toast(msg,type);}
  function fmt(n){return typeof g.fmtBytes==='function'?g.fmtBytes(n):`${Math.round((Number(n)||0)/1048576*10)/10} MB`;}

  async function keys(){
    if(typeof g.v9MediaKeys==='function')return (await g.v9MediaKeys()).filter(k=>String(k).startsWith(PAGE_PREFIX));
    return [];
  }
  async function stats(){
    const ks=await keys(); let bytes=0;
    for(const k of ks){const b=await g.mediaGet(k).catch(()=>null);bytes+=Number(b?.size||0);}
    return {count:ks.length,bytes};
  }
  async function hasPage(page){return !!(await g.mediaGet(pageKey(page)).catch(()=>null));}

  async function fetchPage(page){
    page=clampPage(page);
    const existing=await g.mediaGet(pageKey(page)).catch(()=>null);if(existing)return {page,size:existing.size||0,cached:true};
    const res=await fetch(pageUrl(page),{cache:'no-store',credentials:'omit'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const blob=await res.blob();
    if(!blob||blob.size<500)throw new Error('EMPTY_PAGE');
    await g.mediaPut(pageKey(page),blob);
    return {page,size:blob.size,cached:false};
  }

  function progressText(text){const el=document.getElementById('mushafLiteProgress');if(el)el.textContent=text||'';}
  async function saveMeta(extra={}){
    const s=await stats();const raw=await g.idbKvGet(META_KEY).catch(()=>null);let old={};try{old=JSON.parse(raw||'{}')}catch(_){}
    await g.idbKvPut(META_KEY,JSON.stringify({...old,...extra,count:s.count,bytes:s.bytes,updatedAt:new Date().toISOString()}));
    return s;
  }

  async function downloadRange(from=1,to=PAGE_COUNT){
    if(state.running){notify('يوجد تنزيل صفحات جارٍ بالفعل','info');return;}
    from=clampPage(from);to=clampPage(to);if(to<from)[from,to]=[to,from];
    if(!navigator.onLine){notify('شغّل الإنترنت أولًا لتنزيل الصفحات','error');return;}
    const st=await (typeof g.storageInfo==='function'?g.storageInfo():Promise.resolve({usage:0,quota:0}));
    if(st.quota&&st.usage/st.quota>.9){notify('مساحة التخزين على الجهاز منخفضة. حرّر مساحة أولًا.','error');return;}
    state.running=true;state.cancel=false;state.lastError='';
    if(typeof g.requestPersistentStorage==='function')await g.requestPersistentStorage().catch(()=>{});
    const existing=new Set(await keys());const pages=[];for(let p=from;p<=to;p++)if(!existing.has(pageKey(p)))pages.push(p);
    let done=0,failed=0,totalBytes=0,index=0;
    progressText(pages.length?`جارٍ تجهيز ${pages.length} صفحة…`:`✓ الصفحات ${from}–${to} محفوظة بالفعل`);
    const workers=Array.from({length:Math.min(3,Math.max(1,pages.length))},async()=>{
      while(!state.cancel){const i=index++;if(i>=pages.length)break;const p=pages[i];
        try{const r=await fetchPage(p);done++;totalBytes+=r.size||0;}
        catch(err){failed++;state.lastError=String(err?.message||err);if(failed>=3){state.cancel=true;break;}}
        progressText(`تنزيل صفحات المصحف: ${done}/${pages.length}${failed?` · أخطاء ${failed}`:''} · الصفحة ${p}`);
      }
    });
    await Promise.all(workers);
    state.running=false;
    const s=await saveMeta({lastRange:[from,to],lastError:state.lastError||'',completed:!state.cancel&&failed===0});
    if(failed){progressText(`تعذر تنزيل بعض الصفحات (${failed}). ${state.lastError||''}`);notify('تعذر التنزيل المباشر من مرآة الصفحات. يمكنك الاستمرار باستخدام ملف PDF المحلي.','error');}
    else if(state.cancel){progressText(`تم إيقاف التنزيل. المحفوظ حاليًا ${s.count}/${PAGE_COUNT} صفحة (${fmt(s.bytes)}).`);notify('تم إيقاف تنزيل الصفحات','info');}
    else{progressText(`✓ محفوظ ${s.count}/${PAGE_COUNT} صفحة · ${fmt(s.bytes)}`);notify(from===1&&to===PAGE_COUNT?'تم تنزيل المصحف الخفيف للعمل دون إنترنت':'تم تنزيل الصفحات المطلوبة','success');}
    await enhanceCard();
  }
  function cancelDownload(){state.cancel=true;progressText('جارٍ إيقاف التنزيل بعد الصفحة الحالية…');}

  async function deletePack(){
    const s=await stats();if(!s.count)return notify('لا توجد صفحات خفيفة محفوظة','info');
    if(!confirm(`سيتم حذف ${s.count} صفحة مصحف خفيفة فقط. لن تتأثر بيانات الطلاب أو ملف PDF الكامل. متابعة؟`))return;
    const ks=await keys();for(const k of ks)await g.mediaDelete(k).catch(()=>{});await g.idbKvPut(META_KEY,'{}').catch(()=>{});
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    notify('تم حذف حزمة الصفحات الخفيفة','success');if(typeof g.renderV9Mushaf==='function')await g.renderV9Mushaf();
  }

  async function getVersePage(chapter,ayah){
    const key=`mushaf:page:${chapter}:${ayah}`,cached=await g.idbKvGet(key).catch(()=>null);if(cached){const p=Number(cached);if(p>=1&&p<=PAGE_COUNT)return p;}
    if(!navigator.onLine)return null;
    try{const res=await fetch(`https://api.quran.com/api/v4/verses/by_key/${chapter}:${ayah}?fields=page_number`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error();const d=await res.json(),p=Number(d.verse?.page_number||d.page_number);if(p>=1&&p<=PAGE_COUNT){await g.idbKvPut(key,String(p));return p;}}catch(_){}
    return null;
  }
  async function downloadCurrentRangePages(){
    const r=(typeof V8!=='undefined'?V8.quranRange:null)||(typeof g.quranRangeFromNew==='function'?g.quranRangeFromNew():null);
    if(!r)return downloadRange(state.lastPage,state.lastPage);
    progressText('جارٍ تحديد صفحات نطاق الحفظ…');
    const a=await getVersePage(r.chapter,r.from),b=await getVersePage(r.chapter,r.to);if(!a||!b){notify('تعذر تحديد صفحات النطاق الآن','error');return;}
    return downloadRange(a,b);
  }

  async function showLitePage(page,targetId='mushafLiteFrame'){
    page=clampPage(page);state.lastPage=page;await g.idbKvPut('mushaf:lastPage',String(page)).catch(()=>{});
    const target=document.getElementById(targetId);if(!target)return false;
    const blob=await g.mediaGet(pageKey(page)).catch(()=>null);
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    if(blob){state.objectUrl=URL.createObjectURL(blob);target.innerHTML=`<iframe title="مصحف المدينة — صفحة ${page}" src="${state.objectUrl}#zoom=page-width"></iframe>`;}
    else if(navigator.onLine){target.innerHTML=`<iframe title="مصحف المدينة — صفحة ${page}" src="${pageUrl(page)}#zoom=page-width"></iframe><div class="mushaf-lite-online-note">هذه الصفحة تُعرض من الإنترنت ولم تُحفظ بعد. <button onclick="downloadMushafLitePage(${page})">تنزيلها Offline</button></div>`;}
    else{target.innerHTML=`<div class="v9-mushaf-empty"><div><b>الصفحة ${page} غير محفوظة على هذا الجهاز</b><p>اتصل بالإنترنت ونزّل الصفحة أو الحزمة المطلوبة.</p></div></div>`;}
    const input=document.getElementById('mushafLitePageInput');if(input)input.value=page;return !!blob;
  }
  async function downloadPage(page){page=clampPage(page);progressText(`جارٍ تنزيل الصفحة ${page}…`);try{await fetchPage(page);await saveMeta({lastRange:[page,page]});progressText(`✓ الصفحة ${page} محفوظة Offline`);notify(`تم تنزيل الصفحة ${page}`,'success');await showLitePage(page);}catch(err){state.lastError=String(err?.message||err);progressText(`تعذر تنزيل الصفحة ${page}: ${state.lastError}`);notify('تعذر تنزيل الصفحة من المرآة داخل المتصفح','error');}await enhanceCard();}

  async function enhanceCard(){
    const root=document.getElementById('v9MushafApp');if(!root)return;
    let card=document.getElementById('mushafLiteCard');const s=await stats();const last=clampPage(Number(await g.idbKvGet('mushaf:lastPage').catch(()=>1))||1);state.lastPage=last;
    const html=`<section class="mushaf-lite-card" id="mushafLiteCard">
      <div class="mushaf-lite-head"><div><span class="v92-kicker">خيار خفيف</span><h2>صفحات مصحف المدينة Offline حسب الطلب</h2><p>بدل ملف PDF الكامل الكبير، يمكن حفظ صفحات متجهية منفصلة. الصفحة المحفوظة تعمل دون إنترنت، ويمكنك تنزيل صفحة واحدة، نطاق الحفظ، أو الـ604 صفحة.</p></div><span class="mushaf-lite-count">${s.count}/${PAGE_COUNT} صفحة · ${fmt(s.bytes)}</span></div>
      <div class="mushaf-lite-source"><b>المصدر:</b> مرآة مستقلة لصفحات مصحف المدينة (quran.ws)، وليست نطاقًا رسميًا للمجمع. المرجع الرسمي يبقى مجمع الملك فهد. لم نعتمد ادعاء «نسخة رسمية 46MB» لعدم التحقق من ملف رسمي ثابت بهذا الحجم. <button onclick="openMushafLiteSourceInfo()">المصدر</button> <button onclick="openMushafOfficialInfo()">المرجع الرسمي</button></div>
      <div class="mushaf-lite-actions"><button class="btn btn-g" onclick="downloadMushafLitePage(${last})">تنزيل الصفحة ${last}</button><button class="btn btn-out" onclick="downloadMushafRangePages()">تنزيل صفحات نطاق الحفظ</button><button class="btn btn-out" onclick="downloadMushafLiteAll()">تنزيل المصحف الخفيف كاملًا</button>${state.running?'<button class="btn btn-red" onclick="cancelMushafLiteDownload()">إيقاف التنزيل</button>':''}<button class="btn btn-out" onclick="deleteMushafLitePack()">حذف الحزمة الخفيفة</button></div>
      <div id="mushafLiteProgress" class="v9-mushaf-progress">${state.running?'جارٍ التنزيل…':s.count?`✓ محفوظ ${s.count} صفحة (${fmt(s.bytes)})`:'لم يتم تنزيل صفحات خفيفة بعد'}</div>
      <div class="mushaf-lite-reader"><div class="mushaf-lite-toolbar"><b>قارئ الصفحات الخفيف</b><input id="mushafLitePageInput" type="number" min="1" max="604" value="${last}" onkeydown="if(event.key==='Enter')openMushafLitePage(this.value)"><button onclick="openMushafLitePage(Math.max(1,(Number(document.getElementById('mushafLitePageInput')?.value)||1)-1))">السابق</button><button onclick="openMushafLitePage(Math.min(604,(Number(document.getElementById('mushafLitePageInput')?.value)||1)+1))">التالي</button></div><div id="mushafLiteFrame" class="mushaf-lite-frame"><div class="v9-mushaf-empty"><div><b>صفحة ${last}</b><p>اضغط «فتح الصفحة» لعرضها، أو نزّلها للعمل دون إنترنت.</p><button class="btn btn-g btn-sm" onclick="openMushafLitePage(${last})">فتح الصفحة</button></div></div></div></div>
    </section>`;
    if(card)card.outerHTML=html;else{const anchor=root.querySelector('.v92-install-flow')||root.querySelector('.v92-offline-card');if(anchor)anchor.insertAdjacentHTML('afterend',html);else root.insertAdjacentHTML('beforeend',html);}
  }

  async function currentMushafPage(){
    const body=document.getElementById('v9MushafPaneBody');if(!body)return;
    let p=null;try{p=await g.getMushafPageForRange?.();}catch(_){}
    if(!p){if(typeof BASE_CURRENT==='function')return BASE_CURRENT();return;}
    const lite=await g.mediaGet(pageKey(p)).catch(()=>null);
    if(lite){if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);state.objectUrl=URL.createObjectURL(lite);body.className='';body.innerHTML=`<iframe title="صفحة المصحف ${p}" src="${state.objectUrl}#zoom=page-width"></iframe>`;return;}
    const full=await g.mediaGet('mushaf:madinah:pdf').catch(()=>null);if(full&&typeof BASE_CURRENT==='function')return BASE_CURRENT();
    if(navigator.onLine){body.className='';body.innerHTML=`<iframe title="صفحة المصحف ${p}" src="${pageUrl(p)}#zoom=page-width"></iframe><div class="mushaf-lite-online-note">الصفحة تعمل من الإنترنت. <button onclick="downloadMushafLitePage(${p})">تنزيل الصفحة Offline</button></div>`;return;}
    body.className='v9-mushaf-empty';body.innerHTML=`<div><b>صفحة ${p} غير محفوظة</b><p>نزّل الصفحة أو الحزمة الخفيفة أثناء الاتصال بالإنترنت.</p><button class="btn btn-out btn-sm" onclick="closeQuranTextModal();goPage('mushaf')">إدارة المصحف Offline</button></div>`;
  }

  async function wrappedRender(...args){const result=typeof BASE_RENDER==='function'?await BASE_RENDER.apply(this,args):undefined;await enhanceCard();return result;}
  if(Legacy){Legacy.override('renderV9Mushaf',wrappedRender,'mushaf-offline-v10.4');Legacy.override('openCurrentMushafPage',currentMushafPage,'mushaf-offline-v10.4');}
  else{g.renderV9Mushaf=wrappedRender;g.openCurrentMushafPage=currentMushafPage;}

  g.downloadMushafLitePage=downloadPage;
  g.downloadMushafRangePages=downloadCurrentRangePages;
  g.downloadMushafLiteAll=()=>downloadRange(1,PAGE_COUNT);
  g.cancelMushafLiteDownload=cancelDownload;
  g.deleteMushafLitePack=deletePack;
  g.openMushafLitePage=showLitePage;
  g.openMushafLiteSourceInfo=()=>window.open(SOURCE_INFO,'_blank','noopener');
  g.openMushafOfficialInfo=()=>window.open(OFFICIAL_INFO,'_blank','noopener');
  APP.MushafOffline={pageUrl,stats,downloadRange,downloadPage,showPage:showLitePage,source:SOURCE_INFO,official:OFFICIAL_INFO};
})(globalThis);
