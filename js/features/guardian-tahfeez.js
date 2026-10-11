'use strict';
/* Imam Academy v11.1.0 — Guardian/Student Tahfeez Center, Stage 1.
   Read-only learning player: range/single/group repetition, talaqqin mode,
   full transport controls, QPC Hafs text cache, and optional offline audio. */
(function guardianTahfeezFeature(g){
  const SURAS=[
    ['الفاتحة',7],['البقرة',286],['آل عمران',200],['النساء',176],['المائدة',120],['الأنعام',165],['الأعراف',206],['الأنفال',75],['التوبة',129],['يونس',109],['هود',123],['يوسف',111],['الرعد',43],['إبراهيم',52],['الحجر',99],['النحل',128],['الإسراء',111],['الكهف',110],['مريم',98],['طه',135],['الأنبياء',112],['الحج',78],['المؤمنون',118],['النور',64],['الفرقان',77],['الشعراء',227],['النمل',93],['القصص',88],['العنكبوت',69],['الروم',60],['لقمان',34],['السجدة',30],['الأحزاب',73],['سبأ',54],['فاطر',45],['يس',83],['الصافات',182],['ص',88],['الزمر',75],['غافر',85],['فصلت',54],['الشورى',53],['الزخرف',89],['الدخان',59],['الجاثية',37],['الأحقاف',35],['محمد',38],['الفتح',29],['الحجرات',18],['ق',45],['الذاريات',60],['الطور',49],['النجم',62],['القمر',55],['الرحمن',78],['الواقعة',96],['الحديد',29],['المجادلة',22],['الحشر',24],['الممتحنة',13],['الصف',14],['الجمعة',11],['المنافقون',11],['التغابن',18],['الطلاق',12],['التحريم',12],['الملك',30],['القلم',52],['الحاقة',52],['المعارج',44],['نوح',28],['الجن',28],['المزمل',20],['المدثر',56],['القيامة',40],['الإنسان',31],['المرسلات',50],['النبأ',40],['النازعات',46],['عبس',42],['التكوير',29],['الانفطار',19],['المطففين',36],['الانشقاق',25],['البروج',22],['الطارق',17],['الأعلى',19],['الغاشية',26],['الفجر',30],['البلد',20],['الشمس',15],['الليل',21],['الضحى',11],['الشرح',8],['التين',8],['العلق',19],['القدر',5],['البينة',8],['الزلزلة',8],['العاديات',11],['القارعة',11],['التكاثر',8],['العصر',3],['الهمزة',9],['الفيل',5],['قريش',4],['الماعون',7],['الكوثر',3],['الكافرون',6],['النصر',3],['المسد',5],['الإخلاص',4],['الفلق',5],['الناس',6]
  ];
  const RECITERS=[
    ['Husary_128kbps','الشيخ محمود خليل الحصري — مرتل'],
    ['Husary_Muallim_128kbps','الشيخ محمود خليل الحصري — معلم'],
    ['Minshawy_Murattal_128kbps','الشيخ محمد صديق المنشاوي — مرتل'],
    ['Minshawy_Teacher_128kbps','الشيخ محمد صديق المنشاوي — معلم'],
    ['Alafasy_128kbps','الشيخ مشاري راشد العفاسي'],
    ['MaherAlMuaiqly128kbps','الشيخ ماهر المعيقلي']
  ];
  const PREF_KEY='imam:guardian-tahfeez:prefs:v1';
  const TEXT_INDEX='imam:guardian-tahfeez:text-index:v1';
  const TEXT_PREFIX='imam:guardian-tahfeez:text:';
  const AUDIO_CACHE='imam-guardian-tahfeez-audio-v1';
  const $=id=>document.getElementById(id);
  const clamp=(v,min,max,def=min)=>{v=Number(v);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):def;};
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const state={
    context:null,assignment:null,open:false,repeatMode:'range',verses:[],selectedAyah:1,
    sequence:[],sequenceIndex:0,cycle:1,itemLoop:1,playing:false,paused:false,timer:null,
    objectUrl:'',fetchController:null,downloading:false,downloadCancel:false,historyPushed:false
  };
  function toast(msg){
    let el=$('tahfeezToast');
    if(!el){el=document.createElement('div');el.id='tahfeezToast';el.className='tahfeez-toast';document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),1900);
  }
  function readPrefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(_){return{};}}
  function savePrefs(){
    const p={
      surah:Number($('tahfeezSurah')?.value||1),from:Number($('tahfeezFrom')?.value||1),to:Number($('tahfeezTo')?.value||1),
      reciter:$('tahfeezReciter')?.value||RECITERS[0][0],speed:Number($('tahfeezSpeed')?.value||1),repeat:Number($('tahfeezRepeat')?.value||1),
      repeatMode:state.repeatMode,tutor:!!$('tahfeezTutor')?.checked,tutorRepeat:Number($('tahfeezTutorRepeat')?.value||3),tutorPause:Number($('tahfeezTutorPause')?.value||2),volume:Number($('tahfeezVolume')?.value||1)
    };
    try{localStorage.setItem(PREF_KEY,JSON.stringify(p));}catch(_){}
  }
  function surahName(ch){return SURAS[ch-1]?.[0]||'الفاتحة';}
  function surahAyahs(ch){return SURAS[ch-1]?.[1]||7;}
  function currentChapter(){return clamp($('tahfeezSurah')?.value,1,114,1);}
  function currentRange(){
    const ch=currentChapter(),max=surahAyahs(ch);let from=clamp($('tahfeezFrom')?.value,1,max,1),to=clamp($('tahfeezTo')?.value,1,max,max);
    if(to<from)[from,to]=[to,from];return{chapter:ch,surah:surahName(ch),from,to,max};
  }
  function remoteAudio(rec,ch,ayah){return `https://everyayah.com/data/${encodeURIComponent(rec)}/${String(ch).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;}
  function revokeObject(){if(state.objectUrl){try{URL.revokeObjectURL(state.objectUrl);}catch(_){}state.objectUrl='';}}
  function optionRows(from,to,selected){let s='';for(let i=from;i<=to;i++)s+=`<option value="${i}" ${i===selected?'selected':''}>${i}</option>`;return s;}
  function fillAyahSelectors(preserve=true){
    const r=currentRange(),max=r.max;
    const old={from:Number($('tahfeezFrom')?.value||1),to:Number($('tahfeezTo')?.value||max),single:Number($('tahfeezSingle')?.value||1),gf:Number($('tahfeezGroupFrom')?.value||1),gt:Number($('tahfeezGroupTo')?.value||max)};
    const f=clamp(preserve?old.from:1,1,max,1),t=clamp(preserve?old.to:max,1,max,max);
    $('tahfeezFrom').innerHTML=optionRows(1,max,f);$('tahfeezTo').innerHTML=optionRows(1,max,Math.max(f,t));
    const lo=Math.min(f,Math.max(f,t)),hi=Math.max(f,t);
    $('tahfeezSingle').innerHTML=optionRows(lo,hi,clamp(old.single,lo,hi,lo));
    $('tahfeezGroupFrom').innerHTML=optionRows(lo,hi,clamp(old.gf,lo,hi,lo));
    $('tahfeezGroupTo').innerHTML=optionRows(lo,hi,clamp(old.gt,lo,hi,hi));
    updateLabels();
  }
  function updateTargetSelectors(){
    const r=currentRange(),lo=r.from,hi=r.to;
    const vals={single:clamp($('tahfeezSingle')?.value,lo,hi,lo),gf:clamp($('tahfeezGroupFrom')?.value,lo,hi,lo),gt:clamp($('tahfeezGroupTo')?.value,lo,hi,hi)};
    $('tahfeezSingle').innerHTML=optionRows(lo,hi,vals.single);$('tahfeezGroupFrom').innerHTML=optionRows(lo,hi,vals.gf);$('tahfeezGroupTo').innerHTML=optionRows(lo,hi,Math.max(vals.gf,vals.gt));
    updateLabels();renderText();savePrefs();
  }
  function updateLabels(){
    const r=currentRange();
    if($('tahfeezSurahLabel'))$('tahfeezSurahLabel').textContent=`سورة ${r.surah}`;
    if($('tahfeezRangeLabel'))$('tahfeezRangeLabel').textContent=`الآيات ${r.from}–${r.to}`;
    if($('tahfeezNowSurah'))$('tahfeezNowSurah').textContent=`سورة ${r.surah}`;
  }
  function repeatBounds(){
    const r=currentRange();
    if(state.repeatMode==='single'){const a=clamp($('tahfeezSingle')?.value,r.from,r.to,r.from);return{from:a,to:a};}
    if(state.repeatMode==='group'){
      let from=clamp($('tahfeezGroupFrom')?.value,r.from,r.to,r.from),to=clamp($('tahfeezGroupTo')?.value,r.from,r.to,r.to);if(to<from)[from,to]=[to,from];return{from,to};
    }
    return{from:r.from,to:r.to};
  }
  function setRepeatMode(mode){
    state.repeatMode=['range','single','group'].includes(mode)?mode:'range';
    document.querySelectorAll('#tahfeezRepeatMode button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.repeatMode));
    const controls=$('tahfeezTargetControls');controls.hidden=state.repeatMode==='range';
    $('tahfeezSingleWrap').hidden=state.repeatMode!=='single';$('tahfeezGroupFromWrap').hidden=state.repeatMode!=='group';$('tahfeezGroupToWrap').hidden=state.repeatMode!=='group';
    renderText();savePrefs();
  }
  function tutorChanged(){const on=!!$('tahfeezTutor').checked;$('tahfeezTutorOptions').hidden=!on;updateLoopState();savePrefs();}
  function updateLoopState(){
    const repeat=clamp($('tahfeezRepeat')?.value,1,30,1),tutor=!!$('tahfeezTutor')?.checked,tutorR=clamp($('tahfeezTutorRepeat')?.value,1,20,3);
    let target=state.repeatMode==='range'?'النص':state.repeatMode==='single'?'الآية المختارة':'مجموعة الآيات';
    $('tahfeezLoopState').textContent=tutor?`${target} ×${repeat} · تلقين كل آية ×${tutorR}`:`${target} ×${repeat}`;
  }
  function textCacheKey(ch){return `${TEXT_PREFIX}${ch}`;}
  function textFromCache(ch){try{const d=JSON.parse(localStorage.getItem(textCacheKey(ch))||'null');return Array.isArray(d)&&d.length?d:null;}catch(_){return null;}}
  function saveTextCache(ch,arr){
    try{
      localStorage.setItem(textCacheKey(ch),JSON.stringify(arr));
      let idx=JSON.parse(localStorage.getItem(TEXT_INDEX)||'[]');idx=Array.isArray(idx)?idx.filter(x=>Number(x)!==ch):[];idx.push(ch);
      while(idx.length>8){const old=idx.shift();localStorage.removeItem(textCacheKey(old));}
      localStorage.setItem(TEXT_INDEX,JSON.stringify(idx));
    }catch(_){}
  }
  async function fetchText(ch,force=false){
    if(!force){const cached=textFromCache(ch);if(cached)return cached;}
    if(state.fetchController)state.fetchController.abort();state.fetchController=new AbortController();
    const sig=state.fetchController.signal;
    const endpoints=[`https://api.quran.com/api/v4/quran/verses/qpc_hafs?chapter_number=${ch}`,`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${ch}`];
    let last;
    for(const url of endpoints){
      try{
        const res=await fetch(url,{signal:sig,headers:{Accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);
        const d=await res.json(),rows=Array.isArray(d.verses)?d.verses:[];
        const arr=rows.map((v,i)=>({ayah:Number(v.verse_key?.split(':')[1]||v.verse_number||i+1),text:v.text_qpc_hafs||v.text_uthmani||v.text||''})).filter(v=>v.ayah&&v.text);
        if(arr.length){saveTextCache(ch,arr);return arr;}
      }catch(e){last=e;if(e?.name==='AbortError')throw e;}
    }
    throw last||new Error('Quran text unavailable');
  }
  async function loadText(force=false){
    const r=currentRange();updateLabels();const el=$('tahfeezText');el.innerHTML='<div class="tahfeez-loading"><i></i><span>جارٍ تحميل النص العثماني…</span></div>';
    try{state.verses=await fetchText(r.chapter,force);if(state.selectedAyah<r.from||state.selectedAyah>r.to)state.selectedAyah=r.from;renderText();}
    catch(e){if(e?.name==='AbortError')return;const cached=textFromCache(r.chapter);if(cached){state.verses=cached;renderText();return;}el.innerHTML='<div class="tahfeez-empty"><b>تعذر تحميل النص الآن</b><span>يمكن تشغيل الصوت إذا كان محفوظًا على الجهاز، أو المحاولة عند توفر الإنترنت.</span></div>';}
  }
  function renderText(){
    const r=currentRange(),bounds=repeatBounds(),rows=state.verses.filter(v=>v.ayah>=r.from&&v.ayah<=r.to),el=$('tahfeezText');if(!el)return;
    if(!rows.length){el.innerHTML='<div class="tahfeez-empty">سيظهر النص العثماني هنا بعد التحميل.</div>';return;}
    el.innerHTML=rows.map(v=>`<button type="button" class="tahfeez-ayah ${v.ayah===state.selectedAyah?'selected':''} ${v.ayah>=bounds.from&&v.ayah<=bounds.to?'target':''}" data-ayah="${v.ayah}"><span>${esc(v.text)}</span><i>${v.ayah}</i></button>`).join('');
    el.querySelectorAll('.tahfeez-ayah').forEach(btn=>btn.addEventListener('click',()=>selectAyah(Number(btn.dataset.ayah),false)));
  }
  function selectAyah(a,play=false){
    const r=currentRange();state.selectedAyah=clamp(a,r.from,r.to,r.from);$('tahfeezNowAyah').textContent=`الآية ${state.selectedAyah}`;
    document.querySelectorAll('.tahfeez-ayah').forEach(x=>x.classList.toggle('selected',Number(x.dataset.ayah)===state.selectedAyah));
    document.querySelector(`.tahfeez-ayah[data-ayah="${state.selectedAyah}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
    if(play)playSingle(state.selectedAyah);
  }
  function setPlayingAyah(a){
    state.selectedAyah=a;$('tahfeezNowAyah').textContent=`الآية ${a}`;document.querySelectorAll('.tahfeez-ayah').forEach(x=>{const same=Number(x.dataset.ayah)===a;x.classList.toggle('playing',same);x.classList.toggle('selected',same);});
    document.querySelector(`.tahfeez-ayah[data-ayah="${a}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function buildSequence(){const b=repeatBounds(),arr=[];for(let a=b.from;a<=b.to;a++)arr.push(a);return arr;}
  async function audioSource(ch,ayah,rec){
    const url=remoteAudio(rec,ch,ayah);revokeObject();
    try{const cache=await caches.open(AUDIO_CACHE),hit=await cache.match(url);if(hit){const blob=await hit.blob();if(blob.size){state.objectUrl=URL.createObjectURL(blob);return{src:state.objectUrl,offline:true};}}}catch(_){}
    return{src:url,offline:false};
  }
  async function playCurrentItem(resetTime=true){
    clearTimeout(state.timer);state.timer=null;
    const a=state.sequence[state.sequenceIndex];if(!a){finishPlayback();return;}
    const r=currentRange(),rec=$('tahfeezReciter').value,audio=$('tahfeezAudio');setPlayingAyah(a);$('tahfeezPlaybackState').textContent=`الدورة ${state.cycle} · الآية ${a}`;
    try{
      const src=await audioSource(r.chapter,a,rec);audio.playbackRate=clamp($('tahfeezSpeed').value,.5,1.5,1);audio.volume=clamp($('tahfeezVolume').value,0,1,1);audio.src=src.src;audio.dataset.offline=src.offline?'1':'0';if(resetTime)audio.currentTime=0;await audio.play();state.playing=true;state.paused=false;updatePlayButton();
    }catch(e){state.playing=false;state.paused=false;updatePlayButton();$('tahfeezPlaybackState').textContent=navigator.onLine===false?'الصوت غير محفوظ لهذا الموضع':'تعذر تشغيل الصوت';toast(navigator.onLine===false?'نزّل التكليف أولًا للاستماع دون إنترنت':'تعذر تشغيل الصوت الآن');}
  }
  async function playSingle(a){
    stop(false);state.sequence=[a];state.sequenceIndex=0;state.cycle=1;state.itemLoop=1;await playCurrentItem();
  }
  function startPlayback(){
    savePrefs();state.sequence=buildSequence();if(!state.sequence.length)return toast('اختر نطاقًا صحيحًا أولًا');
    state.sequenceIndex=0;state.cycle=1;state.itemLoop=1;playCurrentItem();updateLoopState();
  }
  function audioEnded(){
    const tutor=!!$('tahfeezTutor').checked,itemMax=tutor?clamp($('tahfeezTutorRepeat').value,1,20,3):1,pause=tutor?clamp($('tahfeezTutorPause').value,0,30,2)*1000:150;
    if(state.itemLoop<itemMax){state.itemLoop++;$('tahfeezPlaybackState').textContent=`ردد الآية ${state.sequence[state.sequenceIndex]} · ${state.itemLoop}/${itemMax}`;state.timer=setTimeout(()=>playCurrentItem(),pause);return;}
    state.itemLoop=1;
    if(state.sequenceIndex<state.sequence.length-1){state.sequenceIndex++;state.timer=setTimeout(()=>playCurrentItem(),pause);return;}
    const cycles=clamp($('tahfeezRepeat').value,1,30,1);
    if(state.cycle<cycles){state.cycle++;state.sequenceIndex=0;state.timer=setTimeout(()=>playCurrentItem(),pause);return;}
    finishPlayback();
  }
  function finishPlayback(){state.playing=false;state.paused=false;clearTimeout(state.timer);state.timer=null;$('tahfeezPlaybackState').textContent='اكتمل التشغيل';updatePlayButton();document.querySelectorAll('.tahfeez-ayah.playing').forEach(x=>x.classList.remove('playing'));}
  function playPause(){
    const audio=$('tahfeezAudio');
    if(!state.playing&&!state.paused){startPlayback();return;}
    // During a talaqqin pause there is no audio to resume; skip the remaining
    // wait and continue the already-scheduled repetition/next ayah instead.
    if(state.timer){clearTimeout(state.timer);state.timer=null;playCurrentItem();return;}
    if(audio.paused){audio.play().then(()=>{state.playing=true;state.paused=false;updatePlayButton();$('tahfeezPlaybackState').textContent=`الآية ${state.selectedAyah}`;}).catch(()=>{});}else{audio.pause();state.playing=false;state.paused=true;updatePlayButton();$('tahfeezPlaybackState').textContent='متوقف مؤقتًا';}
  }
  function stop(clearSequence=true){
    clearTimeout(state.timer);state.timer=null;const audio=$('tahfeezAudio');if(audio){audio.pause();audio.removeAttribute('src');try{audio.load();}catch(_){}}
    revokeObject();state.playing=false;state.paused=false;if(clearSequence)state.sequence=[];document.querySelectorAll('.tahfeez-ayah.playing').forEach(x=>x.classList.remove('playing'));if($('tahfeezPlaybackState'))$('tahfeezPlaybackState').textContent='جاهز';if($('tahfeezSeek'))$('tahfeezSeek').value='0';if($('tahfeezCurrentTime'))$('tahfeezCurrentTime').textContent='0:00';if($('tahfeezDuration'))$('tahfeezDuration').textContent='0:00';updatePlayButton();
  }
  function updatePlayButton(){const b=$('tahfeezPlayBtn');if(!b)return;const active=state.playing&&!$('tahfeezAudio').paused;b.textContent=active?'Ⅱ':'▶';b.setAttribute('aria-label',active?'إيقاف مؤقت':'تشغيل');}
  function jumpAyah(delta){const r=currentRange(),next=clamp(state.selectedAyah+delta,r.from,r.to,r.from);selectAyah(next,false);playSingle(next);}
  function seekBy(sec){const audio=$('tahfeezAudio');if(!audio||!Number.isFinite(audio.duration))return;audio.currentTime=clamp(audio.currentTime+sec,0,audio.duration,0);}
  function fmtTime(n){n=Math.max(0,Number(n)||0);return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;}
  function syncSeek(){const a=$('tahfeezAudio'),range=$('tahfeezSeek');if(!a||!range)return;const d=Number(a.duration)||0,c=Number(a.currentTime)||0;range.value=d?String(Math.round(c/d*1000)):'0';$('tahfeezCurrentTime').textContent=fmtTime(c);$('tahfeezDuration').textContent=fmtTime(d);}
  function seekInput(){const a=$('tahfeezAudio'),range=$('tahfeezSeek');if(a&&Number.isFinite(a.duration)&&a.duration>0)a.currentTime=(Number(range.value)||0)/1000*a.duration;}
  function toggleMute(){const a=$('tahfeezAudio');a.muted=!a.muted;$('tahfeezMuteBtn').textContent=a.muted?'🔇':'🔊';}
  async function cacheAudioRange(from,to,chapter,rec){
    const cache=await caches.open(AUDIO_CACHE),bar=$('tahfeezDownloadBar');state.downloading=true;state.downloadCancel=false;let done=0,total=to-from+1;
    for(let a=from;a<=to;a++){
      if(state.downloadCancel)break;const url=remoteAudio(rec,chapter,a);const hit=await cache.match(url);
      if(!hit){const res=await fetch(url,{mode:'cors',cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);await cache.put(url,res.clone());}
      done++;if(bar)bar.style.width=`${Math.round(done/total*100)}%`;$('tahfeezOfflineStatus').textContent=`تم تنزيل ${done} من ${total}`;
    }
    state.downloading=false;return{done,total};
  }
  async function downloadRange(){
    if(state.downloading)return toast('يوجد تنزيل جارٍ بالفعل');const r=currentRange(),b=repeatBounds(),rec=$('tahfeezReciter').value;
    if(navigator.onLine===false)return toast('شغّل الإنترنت لتنزيل الصوت أول مرة');
    try{const x=await cacheAudioRange(b.from,b.to,r.chapter,rec);toast(`تم حفظ ${x.done} آية للاستماع دون إنترنت`);await refreshOfflineStatus();}catch(e){state.downloading=false;toast('تعذر تنزيل الصوت من المصدر الحالي');await refreshOfflineStatus();}
  }
  async function downloadSurah(){
    if(state.downloading)return toast('يوجد تنزيل جارٍ بالفعل');const r=currentRange(),rec=$('tahfeezReciter').value;if(navigator.onLine===false)return toast('شغّل الإنترنت لتنزيل الصوت أول مرة');
    try{const x=await cacheAudioRange(1,r.max,r.chapter,rec);toast(`تم حفظ سورة ${r.surah} (${x.done} آية)`);await refreshOfflineStatus();}catch(e){state.downloading=false;toast('تعذر إكمال تنزيل السورة');await refreshOfflineStatus();}
  }
  async function clearDownloads(){
    const r=currentRange(),rec=$('tahfeezReciter').value,cache=await caches.open(AUDIO_CACHE);let n=0;for(let a=1;a<=r.max;a++){if(await cache.delete(remoteAudio(rec,r.chapter,a)))n++;}toast(n?`تم حذف ${n} ملفًا صوتيًا من الجهاز`:'لا توجد ملفات محفوظة لهذه السورة');refreshOfflineStatus();
  }
  async function refreshOfflineStatus(){
    const r=currentRange(),rec=$('tahfeezReciter')?.value;if(!rec)return;try{const cache=await caches.open(AUDIO_CACHE);let count=0;for(let a=1;a<=r.max;a++)if(await cache.match(remoteAudio(rec,r.chapter,a)))count++;$('tahfeezOfflineStatus').textContent=count===r.max?`✓ السورة محفوظة كاملة (${count} آية)`:count?`${count} من ${r.max} آية محفوظة`:'يمكن تنزيل التكليف على هذا الجهاز';}catch(_){$('tahfeezOfflineStatus').textContent='التنزيل غير متاح في هذا المتصفح';}
  }
  function setNet(){const el=$('tahfeezNetState');if(!el)return;const on=navigator.onLine!==false;el.textContent=on?'متصل':'دون إنترنت';el.classList.toggle('offline',!on);}
  function configureAssignment(data){
    state.context=data||null;state.assignment=data?.learning?.newAssignment||null;if($('tahfeezStudentName'))$('tahfeezStudentName').textContent=data?.student?.name||'الطالب';const btn=$('tahfeezUseAssignment');if(btn)btn.hidden=!state.assignment;
  }
  function loadAssignment(){
    const a=state.assignment;if(!a)return toast('لا يوجد تكليف حفظ جديد من المحفظ حاليًا');const idx=SURAS.findIndex(x=>x[0]===a.surah);if(idx<0)return toast('تعذر تحديد السورة من التكليف');
    $('tahfeezSurah').value=String(idx+1);fillAyahSelectors(false);const max=surahAyahs(idx+1),from=a.full?1:clamp(a.from,1,max,1),to=a.full?max:clamp(a.to,from,max,from);$('tahfeezFrom').value=String(from);$('tahfeezTo').value=String(to);updateTargetSelectors();state.selectedAyah=from;loadText();toast('تم تحميل تكليف المحفظ');
  }
  function open(){
    const shell=$('guardianTahfeez');if(!shell)return;state.open=true;shell.hidden=false;shell.setAttribute('aria-hidden','false');document.body.classList.add('tahfeez-open');setNet();
    if(!state.historyPushed){history.pushState({guardianTahfeez:true},'',location.href);state.historyPushed=true;}
    if(state.assignment&&!shell.dataset.assignmentOpened){shell.dataset.assignmentOpened='1';loadAssignment();}else loadText();refreshOfflineStatus();
  }
  function close(fromPop=false){
    if(!state.open)return;stop();state.open=false;$('guardianTahfeez').hidden=true;$('guardianTahfeez').setAttribute('aria-hidden','true');document.body.classList.remove('tahfeez-open');
    if(!fromPop&&state.historyPushed){state.historyPushed=false;history.back();}else state.historyPushed=false;
  }
  function toggleSettings(){const el=$('tahfeezSettings');if(el)el.classList.toggle('collapsed');}
  function init(){
    const surah=$('tahfeezSurah'),rec=$('tahfeezReciter');if(!surah||!rec)return;
    surah.innerHTML=SURAS.map((x,i)=>`<option value="${i+1}">${i+1}. سورة ${x[0]}</option>`).join('');rec.innerHTML=RECITERS.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');
    const p=readPrefs();surah.value=String(clamp(p.surah,1,114,1));fillAyahSelectors(false);if(p.from)$('tahfeezFrom').value=String(clamp(p.from,1,surahAyahs(currentChapter()),1));if(p.to)$('tahfeezTo').value=String(clamp(p.to,1,surahAyahs(currentChapter()),surahAyahs(currentChapter())));updateTargetSelectors();
    if(RECITERS.some(x=>x[0]===p.reciter))rec.value=p.reciter;if(p.speed)$('tahfeezSpeed').value=String(p.speed);if(p.repeat)$('tahfeezRepeat').value=String(clamp(p.repeat,1,30,1));if(p.tutorRepeat)$('tahfeezTutorRepeat').value=String(clamp(p.tutorRepeat,1,20,3));if(p.tutorPause)$('tahfeezTutorPause').value=String(p.tutorPause);if(Number.isFinite(Number(p.volume)))$('tahfeezVolume').value=String(clamp(p.volume,0,1,1));$('tahfeezTutor').checked=!!p.tutor;setRepeatMode(p.repeatMode||'range');tutorChanged();
    surah.addEventListener('change',()=>{stop();fillAyahSelectors(false);state.selectedAyah=1;loadText();refreshOfflineStatus();savePrefs();});
    $('tahfeezFrom').addEventListener('change',()=>{const r=currentRange();if(Number($('tahfeezTo').value)<r.from)$('tahfeezTo').value=String(r.from);updateTargetSelectors();state.selectedAyah=r.from;loadText();});
    $('tahfeezTo').addEventListener('change',()=>{updateTargetSelectors();const r=currentRange();if(state.selectedAyah>r.to)state.selectedAyah=r.to;loadText();});
    document.querySelectorAll('#tahfeezRepeatMode button').forEach(btn=>btn.addEventListener('click',()=>setRepeatMode(btn.dataset.mode)));
    ['tahfeezSingle','tahfeezGroupFrom','tahfeezGroupTo','tahfeezRepeat','tahfeezTutorRepeat','tahfeezTutorPause'].forEach(id=>$(id)?.addEventListener('change',()=>{if(id==='tahfeezGroupFrom'&&Number($('tahfeezGroupTo').value)<Number($('tahfeezGroupFrom').value))$('tahfeezGroupTo').value=$('tahfeezGroupFrom').value;renderText();updateLoopState();savePrefs();}));
    $('tahfeezTutor').addEventListener('change',tutorChanged);$('tahfeezSpeed').addEventListener('change',()=>{const a=$('tahfeezAudio');a.playbackRate=Number($('tahfeezSpeed').value)||1;savePrefs();});$('tahfeezReciter').addEventListener('change',()=>{stop();refreshOfflineStatus();savePrefs();});
    $('tahfeezVolume').addEventListener('input',()=>{const a=$('tahfeezAudio');a.volume=Number($('tahfeezVolume').value)||0;savePrefs();});
    const audio=$('tahfeezAudio');audio.addEventListener('ended',audioEnded);audio.addEventListener('timeupdate',syncSeek);audio.addEventListener('loadedmetadata',syncSeek);audio.addEventListener('play',()=>{state.playing=true;state.paused=false;updatePlayButton();});audio.addEventListener('pause',()=>{if(audio.ended)return;updatePlayButton();});audio.addEventListener('error',()=>{if(state.open&&audio.src){$('tahfeezPlaybackState').textContent=navigator.onLine===false?'هذا الصوت غير محفوظ Offline':'حدث خطأ في ملف الصوت';}});$('tahfeezSeek').addEventListener('input',seekInput);
    window.addEventListener('online',()=>{setNet();refreshOfflineStatus();});window.addEventListener('offline',setNet);window.addEventListener('popstate',()=>{if(state.open)close(true);});
    updateLabels();updateLoopState();setNet();
  }
  g.ImamGuardianTahfeez={setContext:configureAssignment,open,close,loadAssignment,loadText};
  g.openGuardianTahfeez=open;g.closeGuardianTahfeez=close;g.tahfeezToggleSettings=toggleSettings;g.tahfeezLoadAssignment=loadAssignment;g.tahfeezLoadText=loadText;g.tahfeezPlayPause=playPause;g.tahfeezStop=()=>stop();g.tahfeezPreviousAyah=()=>jumpAyah(-1);g.tahfeezNextAyah=()=>jumpAyah(1);g.tahfeezSeekBy=seekBy;g.tahfeezToggleMute=toggleMute;g.tahfeezDownloadRange=downloadRange;g.tahfeezDownloadSurah=downloadSurah;g.tahfeezClearDownloads=clearDownloads;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
