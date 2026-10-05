'use strict';
/* We Live Quran — Quran teaching engine v10.3.1
   Flexible reciters, repetition/tutoring timing, ayah selection, and per-surah offline audio. */
(function registerQuranEngine(g){
  const root=g.ImamApp||(g.ImamApp={});
  const RECITERS=Object.freeze([
    {id:'Husary_128kbps',label:'الشيخ محمود خليل الحصري — مرتل'},
    {id:'Husary_Muallim_128kbps',label:'الشيخ محمود خليل الحصري — معلم'},
    {id:'Alafasy_128kbps',label:'الشيخ مشاري راشد العفاسي'},
    {id:'Minshawy_Murattal_128kbps',label:'الشيخ محمد صديق المنشاوي — مرتل'},
    {id:'Minshawy_Teacher_128kbps',label:'الشيخ محمد صديق المنشاوي — معلم'},
    {id:'MaherAlMuaiqly128kbps',label:'الشيخ ماهر المعيقلي'}
  ]);
  const reciterIds=new Set(RECITERS.map(x=>x.id));
  const legacy={
    open:g.openQuranTextModal,
    close:g.closeQuranTextModal,
    stop:g.stopQuranAudio,
    everyAyahURL:g.everyAyahURL
  };
  const Q={
    inited:false,selectedAyah:0,rangeLoopsLeft:0,itemRepeatsLeft:0,advanceTimer:null,objectUrl:'',
    downloading:false,cancelDownload:false,lastMode:'range',lastError:'',
    prefsDirty:false,prefsTimer:null,lastSelectedEl:null
  };
  const esc=v=>root.Utils?.escapeHtml?root.Utils.escapeHtml(v):String(v??'');
  const toast=(m,t='info')=>{try{(g.v9Toast||g.v8Toast||g.toast)(m,t);}catch(_){console.log(m);}};
  const clamp=(n,min,max,def=min)=>{n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;};
  const now=()=>new Date().toISOString();
  function cfg(){
    settings.quranEngine={
      playMode:'range',ayahRepeat:Math.max(1,Number(settings.v9?.quranRepeat||1)),rangeRepeat:1,
      tutorPauseSec:Math.max(0,Number(settings.v9?.tutorDelay||0)),speed:Number(settings.v9?.quranSpeed||1),
      ...(settings.quranEngine||{})
    };
    const c=settings.quranEngine;
    c.playMode=c.playMode==='ayah'?'ayah':'range';
    c.ayahRepeat=Math.round(clamp(c.ayahRepeat,1,50,1));
    c.rangeRepeat=Math.round(clamp(c.rangeRepeat,1,20,1));
    c.tutorPauseSec=clamp(c.tutorPauseSec,0,60,0);
    c.speed=clamp(c.speed,.5,1.5,1);
    if(!reciterIds.has(settings.quranReciter))settings.quranReciter='Husary_128kbps';
    return c;
  }
  function saveCfg(force=false){
    Q.prefsDirty=true;
    clearTimeout(Q.prefsTimer);
    const commit=()=>{
      if(!Q.prefsDirty)return;
      Q.prefsDirty=false;
      try{g.__IMAM_BASE__?.save?.();}catch(_){}
    };
    if(force){commit();return;}
    Q.prefsTimer=setTimeout(()=>{
      Q.prefsTimer=null;
      if(typeof g.requestIdleCallback==='function')g.requestIdleCallback(commit,{timeout:900});
      else setTimeout(commit,0);
    },500);
  }
  function currentRange(){return V8?.quranRange||g.quranRangeFromNew?.()||null;}
  function currentReciter(){return document.getElementById('quranReciter')?.value||settings.quranReciter||'Husary_128kbps';}
  function reciterLabel(id=currentReciter()){return RECITERS.find(x=>x.id===id)?.label||id;}
  function audioKey(reciter,chapter,ayah){return `quran-audio:${reciter}:${chapter}:${ayah}`;}
  function manifestKey(reciter,chapter){return `quran-audio-manifest:${reciter}:${chapter}`;}
  function remoteURL(reciter,chapter,ayah){
    if(typeof legacy.everyAyahURL==='function')return legacy.everyAyahURL(reciter,chapter,ayah);
    return `https://everyayah.com/data/${encodeURIComponent(reciter)}/${String(chapter).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;
  }
  function revokeObjectUrl(){if(Q.objectUrl){try{URL.revokeObjectURL(Q.objectUrl);}catch(_){}Q.objectUrl='';}}
  async function sourceFor(reciter,chapter,ayah){
    try{
      const blob=await g.mediaGet?.(audioKey(reciter,chapter,ayah));
      if(blob&&blob.size){revokeObjectUrl();Q.objectUrl=URL.createObjectURL(blob);return{src:Q.objectUrl,offline:true};}
    }catch(_){}
    return{src:remoteURL(reciter,chapter,ayah),offline:false};
  }
  function updateSelectedUI(){
    const content=document.getElementById('quranVerseContent');
    if(Q.lastSelectedEl&&Q.lastSelectedEl.isConnected)Q.lastSelectedEl.classList.remove('selected');
    const next=content?.querySelector(`.quran-ayah[data-ayah="${Number(Q.selectedAyah)||0}"]`)||null;
    next?.classList.add('selected');Q.lastSelectedEl=next;
    const out=document.getElementById('quranSelectedAyahLabel');if(out)out.textContent=Q.selectedAyah?`الآية ${Q.selectedAyah}`:'اختر آية من النص';
  }
  function selectAyah(n,play=false){
    const r=currentRange();n=Math.round(Number(n)||0);if(!r||n<r.from||n>r.to)return;
    Q.selectedAyah=n;updateSelectedUI();if(play)playSelectedAyah();
  }
  function syncControlsToSettings(){
    const c=cfg();
    c.playMode=document.getElementById('quranPlayMode')?.value==='ayah'?'ayah':'range';
    c.ayahRepeat=Math.round(clamp(document.getElementById('quranAyahRepeat')?.value,1,50,c.ayahRepeat));
    c.rangeRepeat=Math.round(clamp(document.getElementById('quranRangeRepeat')?.value,1,20,c.rangeRepeat));
    c.tutorPauseSec=clamp(document.getElementById('quranTutorPause')?.value,0,60,c.tutorPauseSec);
    c.speed=clamp(document.getElementById('quranEngineSpeed')?.value,.5,1.5,c.speed);
    const rec=currentReciter();if(reciterIds.has(rec))settings.quranReciter=rec;
    settings.v9=settings.v9||{};settings.v9.quranRepeat=c.ayahRepeat;settings.v9.tutorDelay=c.tutorPauseSec;settings.v9.quranSpeed=c.speed;
    saveCfg();updateModeUI();
  }
  function updateModeUI(){
    const mode=document.getElementById('quranPlayMode')?.value||cfg().playMode;
    const range=document.getElementById('quranRangeRepeat');if(range)range.disabled=mode==='ayah';
    const label=document.getElementById('quranEnginePlayLabel');if(label)label.textContent=mode==='ayah'?'تشغيل الآية المحددة':'تشغيل النطاق';
  }
  function reciterOptions(){return RECITERS.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');}
  function enhanceModal(){
    const box=document.querySelector('#quranTextModal .quran-box');if(!box)return;
    const c=cfg();
    const oldAdvanced=box.querySelector('.v9-quran-advanced');
    if(oldAdvanced){
      oldAdvanced.classList.add('quran-engine-controls');
      oldAdvanced.innerHTML=`
        <div class="quran-controls-head"><b>إعدادات التلاوة والتلقين</b><small>خفيفة وسريعة — يتم الحفظ في الخلفية</small></div>
        <div class="fld"><label>طريقة التشغيل</label><select id="quranPlayMode" onchange="quranEngineControlsChanged()"><option value="range">النص كاملًا</option><option value="ayah">آية محددة</option></select></div>
        <div class="fld"><label>سرعة التلاوة</label><select id="quranEngineSpeed" onchange="quranEngineControlsChanged()"><option value="0.75">0.75×</option><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option><option value="1.25">1.25×</option></select></div>
        <div class="fld"><label>تكرار كل آية</label><input id="quranAyahRepeat" type="number" min="1" max="50" step="1" inputmode="numeric" onchange="quranEngineControlsChanged()"></div>
        <div class="fld"><label>تكرار النص كاملًا</label><input id="quranRangeRepeat" type="number" min="1" max="20" step="1" inputmode="numeric" onchange="quranEngineControlsChanged()"></div>
        <div class="fld quran-control-wide"><label>فاصل التلقين <span>بالثواني</span></label><input id="quranTutorPause" type="number" min="0" max="60" step="0.5" inputmode="decimal" onchange="quranEngineControlsChanged()"></div>
        <div class="quran-selected-box"><div class="quran-selected-info"><b id="quranSelectedAyahLabel">اختر آية من النص</b><span>لمسة واحدة للتحديد</span></div><button class="quran-compact-btn" onclick="playSelectedQuranAyah()" type="button"><span>▶</span> تشغيل</button></div>`;
    }
    const toolbar=box.querySelector('.quran-toolbar');if(toolbar){toolbar.classList.add('quran-engine-toolbar');toolbar.innerHTML=`<div class="fld quran-reciter-field"><label>القارئ</label><select id="quranReciter" onchange="quranReciterChanged()">${reciterOptions()}</select></div><div class="quran-play-actions"><button class="quran-action quran-action-primary" id="quranEnginePlayBtn" onclick="playQuranRange()" type="button"><span class="quran-action-icon">▶</span><span id="quranEnginePlayLabel">تشغيل النطاق</span></button><button class="quran-action quran-action-secondary" onclick="stopQuranAudio()" type="button"><span class="quran-action-icon">■</span><span>إيقاف</span></button></div>`;}
    let offline=document.getElementById('quranOfflineTools');if(!offline){offline=document.createElement('details');offline.id='quranOfflineTools';offline.className='quran-offline-tools';toolbar?.insertAdjacentElement('afterend',offline);}
    offline.innerHTML=`<summary><span><b>الصوت دون إنترنت</b><small>تنزيل اختياري للسورة والقارئ الحالي</small></span><span id="quranOfflineStatus">جارٍ الفحص…</span></summary><div class="quran-offline-body"><div class="quran-offline-actions"><button class="quran-action quran-action-soft" id="quranDownloadSurahBtn" onclick="downloadCurrentSurahAudio()" type="button"><span>↓</span><span>تنزيل السورة</span></button><button class="quran-action quran-action-danger-soft" onclick="deleteCurrentSurahAudio()" type="button"><span>×</span><span>حذف التنزيل</span></button></div><div class="quran-download-progress"><i id="quranDownloadProgress"></i></div></div>`;
    const rec=document.getElementById('quranReciter');if(rec)rec.value=settings.quranReciter;
    const mode=document.getElementById('quranPlayMode');if(mode)mode.value=c.playMode;
    const ar=document.getElementById('quranAyahRepeat');if(ar)ar.value=String(c.ayahRepeat);
    const rr=document.getElementById('quranRangeRepeat');if(rr)rr.value=String(c.rangeRepeat);
    const tp=document.getElementById('quranTutorPause');if(tp)tp.value=String(c.tutorPauseSec);
    const sp=document.getElementById('quranEngineSpeed');if(sp)sp.value=String(c.speed);
    const content=document.getElementById('quranVerseContent');
    if(content&&!content.dataset.quranEngineBound){content.dataset.quranEngineBound='1';content.addEventListener('click',e=>{const ay=e.target.closest('.quran-ayah');if(ay)selectAyah(ay.dataset.ayah,false);},{passive:true});}
    if(content&&!content.dataset.quranEngineObserved){content.dataset.quranEngineObserved='1';new MutationObserver(()=>{const r=currentRange();if(r&&(!Q.selectedAyah||Q.selectedAyah<r.from||Q.selectedAyah>r.to))Q.selectedAyah=r.from;updateSelectedUI();refreshOfflineStatus();}).observe(content,{childList:true,subtree:false});}
    updateModeUI();updateSelectedUI();refreshOfflineStatus();
  }
  async function open(){
    const pending=typeof legacy.open==='function'?Promise.resolve(legacy.open()):Promise.resolve();
    enhanceModal();
    const first=currentRange();if(first&&(!Q.selectedAyah||Q.selectedAyah<first.from||Q.selectedAyah>first.to))Q.selectedAyah=first.from;
    updateSelectedUI();
    try{await pending;}catch(err){console.warn('[quran open]',err);}
    enhanceModal();
    const r=currentRange();if(r&&(!Q.selectedAyah||Q.selectedAyah<r.from||Q.selectedAyah>r.to))Q.selectedAyah=r.from;
    updateSelectedUI();refreshOfflineStatus();
    requestAnimationFrame(()=>{const content=document.getElementById('quranVerseContent');if(content)content.scrollTop=0;});
  }
  function close(){saveCfg(true);stop();if(typeof legacy.close==='function')legacy.close();else document.getElementById('quranTextModal')?.classList.remove('open');}
  function buildQueue(mode){
    const r=currentRange();if(!r)return[];
    if(mode==='ayah'){
      if(!Q.selectedAyah||Q.selectedAyah<r.from||Q.selectedAyah>r.to)Q.selectedAyah=r.from;
      return[{ayah:Q.selectedAyah,url:remoteURL(currentReciter(),r.chapter,Q.selectedAyah)}];
    }
    const q=[];for(let a=r.from;a<=r.to;a++)q.push({ayah:a,url:remoteURL(currentReciter(),r.chapter,a)});return q;
  }
  function playRange(forceMode){
    const r=currentRange();if(!r)return toast('لا يوجد نطاق آيات للتشغيل','error');
    syncControlsToSettings();const c=cfg(),mode=forceMode||c.playMode;Q.lastMode=mode;
    V8.quranAudioQueue=buildQueue(mode);V8.quranAudioIndex=-1;Q.rangeLoopsLeft=mode==='ayah'?1:c.rangeRepeat;Q.itemRepeatsLeft=0;
    clearTimeout(Q.advanceTimer);advance(true);
  }
  function playSelectedAyah(){const r=currentRange();if(!r)return toast('لا يوجد نص مفتوح','error');if(!Q.selectedAyah)Q.selectedAyah=r.from;const mode=document.getElementById('quranPlayMode');if(mode)mode.value='ayah';syncControlsToSettings();playRange('ayah');}
  async function advance(increment=true){
    clearTimeout(Q.advanceTimer);const c=cfg(),q=V8.quranAudioQueue||[];
    if(increment)V8.quranAudioIndex++;
    if(V8.quranAudioIndex>=q.length){
      Q.rangeLoopsLeft--;
      if(Q.rangeLoopsLeft>0){V8.quranAudioIndex=0;Q.itemRepeatsLeft=0;}else{stop(false);try{g.renderMiniPlayer?.('اكتمل التشغيل');}catch(_){}return;}
    }
    const item=q[V8.quranAudioIndex];if(!item)return stop(false);
    Q.itemRepeatsLeft=Math.max(1,c.ayahRepeat);
    await playItem(item);
  }
  async function playItem(item){
    const r=currentRange(),audio=document.getElementById('quranAudioPlayer');if(!r||!audio)return;
    document.querySelectorAll('.quran-ayah').forEach(x=>x.classList.toggle('playing',Number(x.dataset.ayah)===Number(item.ayah)));
    const active=document.querySelector(`.quran-ayah[data-ayah="${item.ayah}"]`),content=document.getElementById('quranVerseContent');
    if(active&&content){const a=active.getBoundingClientRect(),c=content.getBoundingClientRect();if(a.top<c.top+8||a.bottom>c.bottom-8)active.scrollIntoView({behavior:'auto',block:'center'});}
    Q.selectedAyah=item.ayah;updateSelectedUI();
    const source=await sourceFor(currentReciter(),r.chapter,item.ayah);audio.src=source.src;audio.playbackRate=cfg().speed;
    audio.dataset.quranOffline=source.offline?'1':'0';
    try{await audio.play();try{g.renderMiniPlayer?.(`${reciterLabel()} · ${source.offline?'Offline':'Online'}`);}catch(_){}}catch(err){toast('تعذر تشغيل الصوت. تحقق من الاتصال أو نزّل السورة للعمل Offline.','error');console.error(err);}
  }
  function ended(){
    const c=cfg(),q=V8.quranAudioQueue||[],item=q[V8.quranAudioIndex];if(!item)return stop(false);
    Q.itemRepeatsLeft--;
    const wait=Math.max(0,c.tutorPauseSec)*1000;
    if(Q.itemRepeatsLeft>0){Q.advanceTimer=setTimeout(()=>playItem(item),wait);return;}
    Q.advanceTimer=setTimeout(()=>advance(true),wait);
  }
  function stop(clear=true){
    clearTimeout(Q.advanceTimer);Q.advanceTimer=null;const a=document.getElementById('quranAudioPlayer');if(a){a.pause();a.removeAttribute('src');try{a.load();}catch(_){}}
    revokeObjectUrl();document.querySelectorAll('.quran-ayah.playing').forEach(x=>x.classList.remove('playing'));
    if(clear&&V8){V8.quranAudioQueue=[];V8.quranAudioIndex=-1;}try{g.renderMiniPlayer?.();}catch(_){}
  }
  async function getManifest(reciter,chapter){try{const raw=await g.idbKvGet?.(manifestKey(reciter,chapter));const m=JSON.parse(raw||'{}');return m&&typeof m==='object'?m:{};}catch(_){return{};}}
  async function refreshOfflineStatus(){
    const r=currentRange(),status=document.getElementById('quranOfflineStatus'),bar=document.getElementById('quranDownloadProgress');if(!status||!r)return;
    const m=await getManifest(currentReciter(),r.chapter),total=Number(S?.[r.chapter-1]?.a||r.max||0),count=Math.min(total,Number(m.count||0));
    status.textContent=count>=total&&total?`✓ السورة محفوظة كاملة (${count} آية)`:(count?`${count} من ${total} آية محفوظة`:'غير منزلة على هذا الجهاز');if(bar)bar.style.width=total?`${Math.round(count/total*100)}%`:'0%';
  }
  async function downloadSurah(){
    const r=currentRange();if(!r)return toast('افتح نص سورة أولاً','error');
    if(Q.downloading){Q.cancelDownload=true;return toast('سيتم إيقاف التنزيل بعد الملف الحالي','info');}
    syncControlsToSettings();const rec=currentReciter(),total=Number(S?.[r.chapter-1]?.a||r.max||0),btn=document.getElementById('quranDownloadSurahBtn'),bar=document.getElementById('quranDownloadProgress');if(!total)return;
    Q.downloading=true;Q.cancelDownload=false;if(btn){btn.disabled=true;const label=btn.querySelector('span:last-child');if(label)label.textContent='جارٍ التنزيل…';}
    try{
      await navigator.storage?.persist?.().catch(()=>false);await g.fetchQpcHafsChapter?.(r.chapter).catch(()=>null);
      let count=0,bytes=0;for(let a=1;a<=total;a++){
        if(Q.cancelDownload)break;
        const key=audioKey(rec,r.chapter,a);const existing=await g.mediaGet?.(key).catch(()=>null);if(existing?.size){count++;bytes+=existing.size||0;}else{
          const res=await fetch(remoteURL(rec,r.chapter,a),{mode:'cors',cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);const blob=await res.blob();if(!blob.size)throw new Error('empty audio');await g.mediaPut?.(key,blob);count++;bytes+=blob.size;
        }
        if(bar)bar.style.width=`${Math.round(count/total*100)}%`;const status=document.getElementById('quranOfflineStatus');if(status)status.textContent=`جارٍ التنزيل ${count} / ${total}`;
      }
      await g.idbKvPut?.(manifestKey(rec,r.chapter),JSON.stringify({reciter:rec,chapter:r.chapter,count,total,bytes,complete:count===total,downloadedAt:now()}));
      if(Q.cancelDownload)toast(`توقف التنزيل عند ${count} من ${total} آية`,'info');else toast(`تم تنزيل سورة ${r.surah} كاملة للعمل Offline`,'success');
    }catch(err){Q.lastError=String(err?.message||err);toast('تعذر تنزيل الصوت Offline من المصدر الحالي. يمكنك المتابعة Online والمحاولة لاحقًا.','error');console.error('[quran offline]',err);}finally{Q.downloading=false;Q.cancelDownload=false;if(btn){btn.disabled=false;const label=btn.querySelector('span:last-child');if(label)label.textContent='تنزيل السورة';}refreshOfflineStatus();}
  }
  async function deleteSurah(){
    const r=currentRange();if(!r)return;if(!confirm(`حذف الصوت المحفوظ لسورة ${r.surah} للقارئ الحالي من هذا الجهاز؟`))return;stop();const rec=currentReciter(),total=Number(S?.[r.chapter-1]?.a||r.max||0);for(let a=1;a<=total;a++)await g.mediaDelete?.(audioKey(rec,r.chapter,a)).catch(()=>{});await g.idbKvPut?.(manifestKey(rec,r.chapter),'{}').catch(()=>{});toast('تم حذف صوت السورة من الجهاز فقط','success');refreshOfflineStatus();
  }
  function reciterChanged(){syncControlsToSettings();stop();refreshOfflineStatus();}
  function controlsChanged(){syncControlsToSettings();const a=document.getElementById('quranAudioPlayer');if(a)a.playbackRate=cfg().speed;}
  async function init(){
    if(Q.inited)return;Q.inited=true;cfg();saveCfg();
    enhanceModal();const audio=document.getElementById('quranAudioPlayer');if(audio){try{audio.removeEventListener('ended',g.v9QuranEnded);}catch(_){}try{audio.removeEventListener('ended',g.playNextQuranAudio);}catch(_){}audio.addEventListener('ended',ended);audio.addEventListener('error',()=>{if(audio.dataset.quranOffline==='1')toast('تعذر قراءة الملف Offline. أعد تنزيل السورة.','error');});}
  }
  root.QuranEngine=Object.freeze({RECITERS,init,open,close,playRange,playSelectedAyah,selectAyah,stop,downloadSurah,deleteSurah,refreshOfflineStatus,controlsChanged,reciterChanged,state:Q});
  g.initQuranEngine=init;
  root.Legacy?.override?.('openQuranTextModal',open,'quran-engine-10.3.1');
  root.Legacy?.override?.('closeQuranTextModal',close,'quran-engine-10.3.1');
  root.Legacy?.override?.('playQuranRange',()=>playRange(),'quran-engine-10.3.1');
  root.Legacy?.override?.('playNextQuranAudio',()=>advance(true),'quran-engine-10.3.1');
  root.Legacy?.override?.('stopQuranAudio',stop,'quran-engine-10.3.1');
  root.Legacy?.override?.('repeatCurrentRange',()=>playRange('range'),'quran-engine-10.3.1');
  g.playSelectedQuranAyah=playSelectedAyah;
  g.quranSelectAyah=selectAyah;
  g.quranEngineControlsChanged=controlsChanged;
  g.quranReciterChanged=reciterChanged;
  g.downloadCurrentSurahAudio=downloadSurah;
  g.deleteCurrentSurahAudio=deleteSurah;
})(globalThis);
