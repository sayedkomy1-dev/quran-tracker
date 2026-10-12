'use strict';
/* Imam Academy v11.2.0 Stage 4 — guardian audio help.
   Assignment MP3: Mishary/Husary/Muaiqly. Correction pronunciation: Mishary only. */
(function guardianAudioAssist(g){
  const SURAS=['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
  const TIMING_BASE='https://cdn.jsdelivr.net/gh/spa5k/quran-timings-api@main/data';const timingCache=new Map();let context=null,wordAudio=null,wordStopTimer=null;
  const $=id=>document.getElementById(id);
  function toast(msg){if(typeof g.portalToast==='function')return g.portalToast(msg);let t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}
  function chapterOf(name){const n=String(name||'').replace(/^سورة\s+/,'').trim();const i=SURAS.indexOf(n);return i<0?0:i+1;}
  function normalizeArabic(v){return String(v||'').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^ء-ي]/g,'');}
  async function shareAssignmentAudio(){
    const a=context?.learning?.newAssignment;if(!a)return toast('لا يوجد تكليف حفظ جديد لإرساله صوتيًا');const chapter=chapterOf(a.surah);if(!chapter)return toast('تعذر تحديد سورة التكليف');if(navigator.onLine===false)return toast('يلزم الإنترنت لتجهيز ملف الصوت أول مرة');
    const select=$('portalAudioReciter'),reciter=select?.value||'mishary',btn=$('portalAudioShareBtn'),status=$('portalAudioStatus');if(btn)btn.disabled=true;
    try{
      status.textContent='جارٍ تجهيز ملف الصوت…';const file=await g.ImamQuranAudioExport.buildFile({chapter,surah:a.surah,from:a.full?1:a.from,to:a.full?(context?.learning?.newAssignment?.to||a.to):a.to,reciter},p=>{if(status&&p.total)status.textContent=`جارٍ تجهيز الصوت ${Math.min(p.done+1,p.total)}/${p.total}…`;});
      const out=await g.ImamQuranAudioExport.shareFile(file,{title:`تكليف ${context?.student?.name||'الطالب'}`,text:`التكليف الصوتي — سورة ${a.surah} ${a.from||1}–${a.to||a.from||1}`});status.textContent=out.downloaded?'تم تنزيل الملف؛ أرسله عبر WhatsApp من الملفات.':'تم فتح المشاركة — اختر WhatsApp.';
    }catch(err){if(err?.name==='AbortError'){status.textContent='تم إلغاء المشاركة';}else{console.warn('[guardian assignment audio]',err);status.textContent='تعذر تجهيز الملف الآن';toast(/TOO_LARGE/.test(String(err))?'التكليف طويل جدًا لملف واحد؛ قلل نطاق الآيات':'تعذر تجهيز ملف الصوت؛ حاول مع اتصال أقوى');}}
    finally{if(btn)btn.disabled=false;}
  }
  async function timingSlug(){
    if(timingCache.has('slug'))return timingCache.get('slug');
    const guesses=['eya_alafasy_128kbps','eya_mishary_rashid_alafasy_128kbps','eya_mishary_alafasy_128kbps'];
    try{const res=await fetch(`${TIMING_BASE}/reciters.json`,{cache:'force-cache'});if(res.ok){const data=await res.json(),found=[];const walk=(x,d=0)=>{if(d>5||x==null)return;if(Array.isArray(x)){x.forEach(v=>walk(v,d+1));return;}if(typeof x==='object'){const s=JSON.stringify(x);if(/alafasy/i.test(s)){for(const k of ['slug','id','reciter_slug','key'])if(typeof x[k]==='string'&&/alafasy/i.test(x[k]))found.push(x[k]);}Object.values(x).forEach(v=>walk(v,d+1));}};walk(data);guesses.unshift(...found);}}catch(_){}
    const uniq=[...new Set(guesses)];timingCache.set('slugCandidates',uniq);return uniq;
  }
  async function wordTiming(chapter,ayah,wordIndex,word){
    const key=`${chapter}:${ayah}`;let payload=timingCache.get(key);
    if(payload===undefined){payload=null;const slugs=await timingSlug();for(const slug of slugs){try{const r=await fetch(`${TIMING_BASE}/api/reciters/${encodeURIComponent(slug)}/surahs/${chapter}/timings.json`,{cache:'force-cache'});if(!r.ok)continue;const d=await r.json();if(Array.isArray(d?.words)&&d.words.length){payload=d;timingCache.set('workingSlug',slug);break;}}catch(_){}}timingCache.set(key,payload);}
    if(!payload)return null;const target=Number(wordIndex)+1,rows=payload.words.filter(x=>Number(x.ayah)===Number(ayah));let row=rows.find(x=>Number(x.word_index_in_ayah)===target);if(!row&&word){const n=normalizeArabic(word);row=rows.find(x=>normalizeArabic(x.text_norm||x.text_uthmani)===n);}if(!row)return null;const start=Number(row.start_s),end=Number(row.end_s);return Number.isFinite(start)&&Number.isFinite(end)&&end>start?{start,end}:null;
  }
  function getWordAudio(){if(wordAudio)return wordAudio;wordAudio=document.createElement('audio');wordAudio.id='guardianWordAudio';wordAudio.preload='metadata';document.body.appendChild(wordAudio);return wordAudio;}
  async function pronounce(input){
    const chapter=Number(input?.chapter)||chapterOf(input?.surah),ayah=Math.max(1,Number(input?.ayah)||1),wordIndex=Math.max(0,Number(input?.wordIndex)||0),word=String(input?.word||'');if(!chapter)return toast('تعذر تحديد السورة لهذا الموضع');
    if(navigator.onLine===false)return toast('نطق الكلمات يحتاج الإنترنت أول مرة');const audio=getWordAudio();clearTimeout(wordStopTimer);audio.pause();audio.src=g.ImamQuranAudioExport.audioUrl('Alafasy_128kbps',chapter,ayah);audio.playbackRate=1;
    try{
      const timing=await wordTiming(chapter,ayah,wordIndex,word);await new Promise((resolve,reject)=>{if(audio.readyState>=1)return resolve();const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(new Error('AUDIO_LOAD'));},cleanup=()=>{audio.removeEventListener('loadedmetadata',ok);audio.removeEventListener('error',bad);};audio.addEventListener('loadedmetadata',ok,{once:true});audio.addEventListener('error',bad,{once:true});audio.load();});
      if(timing){audio.currentTime=Math.max(0,timing.start-.12);await audio.play();const stopAt=timing.end+.22;const guard=()=>{if(audio.currentTime>=stopAt){audio.pause();audio.removeEventListener('timeupdate',guard);}};audio.addEventListener('timeupdate',guard);wordStopTimer=setTimeout(()=>{audio.pause();audio.removeEventListener('timeupdate',guard);},Math.max(800,(stopAt-Math.max(0,timing.start-.12))*1300));toast(`🔊 ${word||'الكلمة'} — بصوت الشيخ مشاري`);}
      else{audio.currentTime=0;await audio.play();toast(`تعذر قص الكلمة بدقة؛ تم تشغيل الآية ${ayah} بصوت الشيخ مشاري`);}
    }catch(err){console.warn('[guardian word pronunciation]',err);toast('تعذر تشغيل النطق الآن');}
  }
  function setContext(data){context=data||null;const box=$('portalAudioAssist');if(box)box.hidden=!context?.learning?.newAssignment;}
  g.ImamGuardianAudio={setContext,shareAssignmentAudio,pronounce};g.guardianShareAssignmentAudio=shareAssignmentAudio;g.guardianPronounceCorrection=pronounce;
})(globalThis);
