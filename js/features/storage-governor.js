'use strict';
/* IMAM Beta28 RC13 — safe browser-storage observability and cache maintenance.
   This module never deletes student data, lesson records, recordings, Quran audio,
   or unknown browser caches. Only the Service Worker may trim its own runtime cache. */
(function(g){
  const APP_CACHE_PREFIX='quran-pwa-';
  const LEGACY_AUDIO_CACHE='imam-guardian-tahfeez-audio-v1';
  const AUDIO_DB='imam-quran-audio-library-v1';
  const MIN_AUDIO_HEADROOM=32*1024*1024;
  const WARN_RATIO=.82,CRITICAL_RATIO=.92,LOCAL_WARN_BYTES=3.5*1024*1024,LOCAL_CRITICAL_BYTES=4.5*1024*1024;
  const AUTO_CLEAN_KEY='imam-storage-auto-clean-rc13';
  const $=id=>g.document?.getElementById(id)||null;
  const fmt=n=>{n=Number(n)||0;if(n<1024)return `${Math.round(n)} بايت`;const units=['KB','MB','GB','TB'];let i=-1;do{n/=1024;i++;}while(n>=1024&&i<units.length-1);return `${n.toFixed(n>=100?0:n>=10?1:2)} ${units[i]}`;};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ratioOf(e){return e?.quota>0?Math.min(1,Math.max(0,(Number(e.usage)||0)/e.quota)):null;}
  async function estimate(){try{return await g.navigator?.storage?.estimate?.()||{usage:0,quota:0};}catch(_){return{usage:0,quota:0};}}
  async function persistence(){try{return await g.navigator?.storage?.persisted?.()??false;}catch(_){return false;}}
  function localBytes(storage){let total=0;try{for(let i=0;i<storage.length;i++){const k=storage.key(i)||'',v=storage.getItem(k)||'';total+=(k.length+v.length)*2;}}catch(_){}return total;}
  async function cacheInventory(){const out=[];if(!g.caches?.keys)return out;let names=[];try{names=await g.caches.keys();}catch(_){return out;}
    for(const name of names){let count=0;try{const c=await g.caches.open(name);count=(await c.keys()).length;}catch(_){}
      const kind=name.startsWith(APP_CACHE_PREFIX)?'app':name===LEGACY_AUDIO_CACHE?'legacy-audio':'other';
      out.push({name,count,kind,protected:kind!=='app'});
    }
    return out;
  }
  async function databaseInventory(){try{if(!g.indexedDB?.databases)return[];const rows=await g.indexedDB.databases();return rows.filter(x=>x?.name).map(x=>({name:x.name,version:x.version||0,protected:true}));}catch(_){return[];}}
  async function inspect(options={}){
    const [storage,persisted,caches,databases]=await Promise.all([estimate(),persistence(),cacheInventory(),databaseInventory()]);
    const ratio=ratioOf(storage),usage=Number(storage.usage)||0,quota=Number(storage.quota)||0;
    const details=storage.usageDetails&&typeof storage.usageDetails==='object'?storage.usageDetails:{};
    let localStorageBytes=0,sessionStorageBytes=0,audioLibrary=[];
    try{localStorageBytes=localBytes(g.localStorage);}catch(_){}try{sessionStorageBytes=localBytes(g.sessionStorage);}catch(_){}
    // Counting every ayah across six readers can be expensive on older phones.
    // Scan the full audio library only when the teacher explicitly refreshes the settings manager.
    if(options.includeAudio)try{audioLibrary=await g.ImamOfflineAudio?.statsAll?.()||[];}catch(_){}
    const localStorageLevel=localStorageBytes>=LOCAL_CRITICAL_BYTES?'critical':localStorageBytes>=LOCAL_WARN_BYTES?'warning':'normal';
    return {usage,quota,available:Math.max(0,quota-usage),ratio,persisted,caches,databases,localStorageBytes,sessionStorageBytes,localStorageLevel,audioLibrary,usageDetails:details,
      warning:ratio!==null&&ratio>=CRITICAL_RATIO?'critical':ratio!==null&&ratio>=WARN_RATIO?'warning':'normal',
      audioCachePresent:caches.some(x=>x.name===LEGACY_AUDIO_CACHE),audioDatabasePresent:databases.some(x=>x.name===AUDIO_DB)};
  }
  async function canContinueAudioDownload(){
    const e=await estimate(),ratio=ratioOf(e);
    if(!e.quota||ratio===null)return {ok:true,reason:'estimate-unavailable',available:null};
    const available=Math.max(0,e.quota-(Number(e.usage)||0));
    if(available<MIN_AUDIO_HEADROOM)return {ok:false,reason:'low-headroom',available,ratio};
    if(ratio>=.96)return {ok:false,reason:'quota-pressure',available,ratio};
    return {ok:true,available,ratio};
  }
  function sendWorker(type){return new Promise(async(resolve,reject)=>{
    if(!g.navigator?.serviceWorker)return reject(new Error('SERVICE_WORKER_UNAVAILABLE'));
    let worker=g.navigator.serviceWorker.controller;
    if(!worker){try{const reg=await g.navigator.serviceWorker.getRegistration();worker=reg?.active||null;}catch(_){}}
    if(!worker)return reject(new Error('SERVICE_WORKER_NOT_ACTIVE'));
    if(typeof MessageChannel==='undefined')return reject(new Error('MESSAGE_CHANNEL_UNAVAILABLE'));
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(new Error('STORAGE_CLEAN_TIMEOUT'));},15000);
    channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();const result=e.data||{};result.ok?resolve(result):reject(new Error(result.error||'STORAGE_CLEAN_FAILED'));};
    try{worker.postMessage({type},[channel.port2]);}catch(e){clearTimeout(timer);channel.port1.close();reject(e);}
  });}
  async function readActiveWorkerVersion(){return new Promise(async(resolve,reject)=>{
    if(!g.navigator?.serviceWorker)return reject(new Error('SERVICE_WORKER_UNAVAILABLE'));
    let worker=g.navigator.serviceWorker.controller;if(!worker){try{const reg=await g.navigator.serviceWorker.getRegistration();worker=reg?.active||null;}catch(_){}}
    if(!worker)return reject(new Error('SERVICE_WORKER_NOT_ACTIVE'));
    if(typeof MessageChannel==='undefined')return reject(new Error('MESSAGE_CHANNEL_UNAVAILABLE'));
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(new Error('STORAGE_VERSION_TIMEOUT'));},5000);
    channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data||{});};
    try{worker.postMessage('GET_VERSION',[channel.port2]);}catch(e){clearTimeout(timer);channel.port1.close();reject(e);}
  });}
  async function cleanSafeCaches(){
    // Never ask an older controlling worker to clean caches for a newer shell.
    const info=await readActiveWorkerVersion();
    if(!String(info.offlineStage||'').includes('5.7-storage-audio-portal-rc13')||!String(info.cache||'').endsWith('-rc13-storage-audio-portal'))throw new Error('SERVICE_WORKER_VERSION_MISMATCH');
    return sendWorker('IMAM_STORAGE_SAFE_CLEAN');
  }
  async function requestPersistence(){
    if(!g.navigator?.storage?.persist)return {supported:false,granted:false};
    try{return {supported:true,granted:!!(await g.navigator.storage.persist())};}catch(_){return {supported:true,granted:false};}
  }
  function paint(report){
    const status=$('imamStorageSummary'),detail=$('imamStorageDetails'),bar=$('imamStorageBar');if(!status||!detail)return;
    const pct=report.ratio===null?null:Math.round(report.ratio*100);
    status.textContent=pct===null?'تعذر تقدير مساحة التخزين من هذا المتصفح':`المستخدم ${fmt(report.usage)} من ${fmt(report.quota)} (${pct}%)`;
    if(bar){bar.style.width=`${pct??0}%`;bar.dataset.level=report.warning;bar.parentElement?.setAttribute('aria-valuenow',String(pct??0));}
    const note=report.warning==='critical'?'المساحة قاربت الحد الحرج. سيحاول التطبيق تنظيف كاش التشغيل القديم بأمان، وأوقف تنزيلات الصوت حتى تتوفر مساحة كافية.':report.warning==='warning'?'استخدام التخزين مرتفع. يُفضّل تنظيف كاش التشغيل المؤقت قبل تنزيل حزم كبيرة.':report.localStorageLevel==='critical'?'مساحة LocalStorage تقترب من حد المتصفح؛ تم تقليل النسخ المكررة، ولا تمسح بيانات التطبيق يدويًا.':report.localStorageLevel==='warning'?'حجم LocalStorage مرتفع نسبيًا؛ ستتم مراقبته لتجنب فشل حفظ الحصص.':'حالة المساحة ضمن النطاق المعتاد.';
    const cacheRows=report.caches.length?report.caches.map(x=>`<li><b>${esc(x.name)}</b> — ${x.count} عنصر ${x.kind==='app'?'(كاش تشغيل)':x.kind==='legacy-audio'?'(تلاوات قديمة محفوظة)':'(محمي)'}</li>`).join(''):'<li>لا توجد Cache Storage مسجلة.</li>';
    const dbRows=report.databases.length?report.databases.map(x=>`<li><b>${esc(x.name)}</b> — الإصدار ${x.version}</li>`).join(''):'<li>قائمة قواعد البيانات غير متاحة في هذا المتصفح.</li>';
    const detailRows=Object.entries(report.usageDetails||{}).filter(([,v])=>Number(v)>0).map(([k,v])=>`<li>${esc(k)}: ${fmt(v)}</li>`).join('');
    const audioRows=(report.audioLibrary||[]).map(x=>`<li>${esc(x.label)} — ${Number(x.count)||0} آية · ${fmt(x.bytes)}</li>`).join('');
    const audioTotal=(report.audioLibrary||[]).reduce((n,x)=>n+(Number(x.bytes)||0),0);
    detail.innerHTML=`<div class="sg-alert" data-level="${report.warning}">${note}</div>
      <div class="sg-grid"><div><small>الحالة الدائمة</small><b>${report.persisted?'ممنوحة':'غير مضمونة'}</b></div><div><small>المساحة المتاحة</small><b>${report.quota?fmt(report.available):'غير معروفة'}</b></div><div><small>LocalStorage التقريبي</small><b>${fmt(report.localStorageBytes)} · ${report.localStorageLevel==='critical'?'حرج':report.localStorageLevel==='warning'?'مرتفع':'طبيعي'}</b></div><div><small>SessionStorage التقريبي</small><b>${fmt(report.sessionStorageBytes)}</b></div></div>
      <details><summary>تفاصيل كاش التشغيل (${report.caches.length})</summary><ul>${cacheRows}</ul></details>
      <details><summary>قواعد البيانات المحلية (${report.databases.length})</summary><ul>${dbRows}</ul></details>
      ${audioRows?`<details><summary>مكتبة التلاوات المحمّلة (${fmt(audioTotal)})</summary><ul>${audioRows}</ul></details>`:''}
      ${detailRows?`<details><summary>تفصيل المساحة حسب المتصفح</summary><ul>${detailRows}</ul></details>`:''}
      <p class="sg-protection">التنظيف الآمن لا يحذف الطلاب أو الحصص أو الملاحظات الصوتية أو المصحف أو التلاوات المحمّلة. التلاوات القديمة محفوظة ولا تُمس تلقائيًا.</p>`;
  }
  function notifyPressure(report){
    if(!report||!(report.warning==='critical'||report.localStorageLevel==='critical')||!g.document?.body||$('imamStorageCriticalNotice'))return;
    let already=false;try{already=g.sessionStorage?.getItem('imam-storage-critical-notice-rc13')==='1';}catch(_){}
    if(already)return;
    try{g.sessionStorage?.setItem('imam-storage-critical-notice-rc13','1');}catch(_){}
    const notice=g.document.createElement('div');notice.id='imamStorageCriticalNotice';notice.className='sg-global-alert';notice.setAttribute('role','alert');
    const message=g.document.createElement('span');message.textContent=report.warning==='critical'?'تنبيه: مساحة الجهاز قاربت الحد الحرج. أوقف تنزيلات المصحف مؤقتًا؛ سيُنظف التطبيق كاش التشغيل القديم فقط إذا تأكدت سلامة ملفات العمل دون لمس التلاوات أو البيانات التعليمية.':'تنبيه: مساحة LocalStorage تقترب من حد المتصفح. لا تمسح بيانات التطبيق؛ افتح الإعدادات لمراجعة التخزين، واحتفظ بمسودة الحصة حتى تأكيد الحفظ.';
    const close=g.document.createElement('button');close.type='button';close.textContent='إغلاق';close.setAttribute('aria-label','إغلاق تنبيه التخزين');close.addEventListener('click',()=>notice.remove());
    notice.append(message,close);g.document.body.prepend(notice);
  }
  async function autoCleanAtCritical(report){
    if(report?.warning!=='critical'||!g.navigator?.serviceWorker)return false;
    let attempted=false;try{attempted=g.sessionStorage?.getItem(AUTO_CLEAN_KEY)==='1';}catch(_){}
    if(attempted)return false;
    try{g.sessionStorage?.setItem(AUTO_CLEAN_KEY,'1');}catch(_){}
    try{const result=await cleanSafeCaches();return !!result?.ok;}
    catch(err){console.warn('[storage governor] automatic safe cache cleanup skipped',err);return false;}
  }
  async function refresh(eventOrIncludeAudio){const includeAudio=eventOrIncludeAudio===true||!!eventOrIncludeAudio?.type;const button=$('imamStorageRefresh');if(button)button.disabled=true;try{let report=await inspect({includeAudio});if(await autoCleanAtCritical(report))report=await inspect({includeAudio});paint(report);notifyPressure(report);return report;}catch(e){const s=$('imamStorageSummary');if(s)s.textContent='تعذر فحص التخزين حاليًا.';throw e;}finally{if(button)button.disabled=false;}}
  async function cleanFromUI(){const b=$('imamStorageClean');if(b)b.disabled=true;const status=$('imamStorageActionStatus');try{const result=await cleanSafeCaches();if(status)status.textContent=`اكتمل التنظيف الآمن: حذف ${result.deletedOldCaches||0} كاش قديم وإزالة ${result.trimmedRuntimeEntries||0} عنصر تشغيل مؤقت. لم تُمس التلاوات أو البيانات التعليمية.`;await refresh(true);}catch(e){if(status)status.textContent=e.message==='SERVICE_WORKER_NOT_ACTIVE'?'خدمة التطبيق غير جاهزة بعد. أعد فتح التطبيق ثم حاول مرة أخرى.':e.message==='SERVICE_WORKER_VERSION_MISMATCH'?'نسخة خدمة التطبيق لم تُحدّث بعد إلى RC13؛ حدّث التطبيق أولًا. لم يتم حذف أي كاش.':'تعذر التنظيف الآمن؛ لم يتم حذف بيانات المستخدم.'; }finally{if(b)b.disabled=false;}}
  async function persistFromUI(){const status=$('imamStorageActionStatus'),b=$('imamStoragePersist');if(b)b.disabled=true;try{const r=await requestPersistence();if(status)status.textContent=!r.supported?'هذا المتصفح لا يدعم طلب حماية التخزين.':r.granted?'وافق المتصفح على حماية التخزين من الإزالة التلقائية.':'لم يمنح المتصفح الحماية الدائمة؛ سنظل نراقب المساحة ونحافظ على البيانات.';await refresh(true);}finally{if(b)b.disabled=false;}}
  function bind(){
    const card=$('imamStorageManager');
    if(card&&!card.dataset.bound){card.dataset.bound='1';$('imamStorageRefresh')?.addEventListener('click',e=>refresh(e));$('imamStorageClean')?.addEventListener('click',cleanFromUI);$('imamStoragePersist')?.addEventListener('click',persistFromUI);}
    // Inspect storage on every portal; at critical quota, trim only old/unpinned app caches once per tab.
    void refresh().catch(()=>{});
  }
  const api={inspect,refresh,cleanSafeCaches,requestPersistence,canContinueAudioDownload,formatBytes:fmt,constants:{MIN_AUDIO_HEADROOM,WARN_RATIO,CRITICAL_RATIO,LOCAL_WARN_BYTES,LOCAL_CRITICAL_BYTES}};
  g.ImamStorageGovernor=api;
  if(g.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();}
})(globalThis);
