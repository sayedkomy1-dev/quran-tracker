import {getOne,put} from '../core/db.js';
import {modal,$,toast,escapeHtml,bytes} from '../core/utils.js';
import {surahByNumber} from '../data/quran-meta.js';

const TEXT_API=n=>`https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`;
const RECITERS={
  husary:{name:'الشيخ محمود خليل الحصري',edition:'ar.husary'},
  mishary:{name:'الشيخ مشاري راشد العفاسي',edition:'ar.alafasy'}
};
const AUDIO_CACHE='imam-quran-audio-v1';
let player={audio:null,objectUrl:'',queue:[],index:0,repeat:1,repeatDone:0,gap:0,timer:null,stopped:false};

export async function getSurahText(surahNumber){
  const id=`surah-${surahNumber}`;const cached=await getOne('quran',id);if(cached?.ayahs?.length)return cached;
  const res=await fetch(TEXT_API(surahNumber));if(!res.ok)throw new Error('تعذر تحميل النص القرآني');
  const json=await res.json();const row={id,surahNumber:Number(surahNumber),name:json.data.name,ayahs:json.data.ayahs.map(a=>({number:a.number,numberInSurah:a.numberInSurah,text:a.text,page:a.page,juz:a.juz})),cachedAt:new Date().toISOString()};
  await put('quran',row);return row;
}
function audioUrl(globalAyah,reciter){return `https://cdn.islamic.network/quran/audio/128/${RECITERS[reciter]?.edition||RECITERS.husary.edition}/${globalAyah}.mp3`}
async function audioSource(globalAyah,reciter){
  const url=audioUrl(globalAyah,reciter);if(!('caches'in window))return{src:url,revoke:false};
  try{const cache=await caches.open(AUDIO_CACHE);const hit=await cache.match(url);if(hit){const blob=await hit.blob();return{src:URL.createObjectURL(blob),revoke:true}}}catch{}
  return{src:url,revoke:false};
}
function clearAudioObject(){if(player.objectUrl){URL.revokeObjectURL(player.objectUrl);player.objectUrl=''}}
export function stopQuranPlayer(){clearTimeout(player.timer);player.stopped=true;player.audio?.pause();player.audio=null;clearAudioObject();player.queue=[];player.index=0;document.querySelectorAll('.ayah.playing').forEach(x=>x.classList.remove('playing'))}
function highlight(global){document.querySelectorAll('.ayah.playing').forEach(x=>x.classList.remove('playing'));document.querySelector(`[data-global-ayah="${global}"]`)?.classList.add('playing')}
async function playCurrent(reciter,rate,gap){
  if(player.stopped||player.index>=player.queue.length){stopQuranPlayer();return}
  const ayah=player.queue[player.index];highlight(ayah.number);clearAudioObject();const source=await audioSource(ayah.number,reciter);if(player.stopped){if(source.revoke)URL.revokeObjectURL(source.src);return}
  const audio=new Audio(source.src);player.audio=audio;if(source.revoke)player.objectUrl=source.src;audio.playbackRate=rate;audio.onended=()=>{
    clearAudioObject();player.repeatDone++;
    if(player.repeatDone<player.repeat){player.timer=setTimeout(()=>playCurrent(reciter,rate,gap),gap*1000);return}
    player.repeatDone=0;player.index++;player.timer=setTimeout(()=>playCurrent(reciter,rate,gap),gap*1000);
  };
  audio.onerror=()=>{toast('تعذر تشغيل الصوت. تحقق من الإنترنت أو نزّل الصوت مسبقًا.','error');stopQuranPlayer()};
  audio.play().catch(()=>toast('اضغط تشغيل مرة أخرى للسماح بالصوت.','warning'));
}
async function cacheAudioRange(ayahs,reciter,onProgress){
  if(!('caches'in window))throw new Error('التخزين الصوتي غير مدعوم في هذا المتصفح');
  const cache=await caches.open(AUDIO_CACHE);let done=0,totalBytes=0;
  for(const ayah of ayahs){const url=audioUrl(ayah.number,reciter);let hit=await cache.match(url);if(!hit){const res=await fetch(url);if(!res.ok)throw new Error(`تعذر تنزيل الآية ${ayah.numberInSurah}`);const blob=await res.clone().blob();totalBytes+=blob.size;await cache.put(url,res)}done++;onProgress?.(done,ayahs.length,totalBytes)}
  return{count:done,bytes:totalBytes};
}
export async function openQuranText({surah,from=1,to,sourceLabel='التسميع'}){
  const meta=surahByNumber(surah);if(!meta)return toast('اختر السورة أولًا','warning');to=Math.min(Number(to||from||1),meta.ayahs);from=Math.max(1,Number(from||1));if(to<from)[from,to]=[to,from];
  const close=modal({title:`${sourceLabel}: سورة ${meta.name} ${from}–${to}`,wide:true,body:`<div class="empty" id="quranLoading"><strong>جارٍ تحميل النص...</strong></div>`,onMount:async(root)=>{
    try{
      const data=await getSurahText(meta.number);const ayahs=data.ayahs.filter(a=>a.numberInSurah>=from&&a.numberInSurah<=to);const body=root.querySelector('.modal__body');body.innerHTML=`
        <div class="quran-focus-head"><div><strong>سورة ${escapeHtml(meta.name)}</strong><div class="page-subtitle">من الآية ${from} إلى ${to}</div></div><span class="badge badge-muted">الرسم العثماني</span></div>
        <div class="quran-text">${ayahs.map(a=>`<span class="ayah" data-global-ayah="${a.number}">${escapeHtml(a.text)} <span class="ayah-number">﴿${a.numberInSurah}﴾</span></span>`).join(' ')}</div>
        <div class="player-bar">
          <select class="select" id="qReciter"><option value="husary">${RECITERS.husary.name}</option><option value="mishary">${RECITERS.mishary.name}</option></select>
          <select class="select" id="qRate"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select>
          <select class="select" id="qRepeat"><option value="1">مرة</option><option value="3">3 مرات</option><option value="5">5 مرات</option></select>
          <select class="select" id="qGap"><option value="0">بدون توقف</option><option value="3">تلقين 3 ث</option><option value="5">تلقين 5 ث</option><option value="8">تلقين 8 ث</option></select>
          <button class="btn btn-primary" id="qPlay">تشغيل</button><button class="btn btn-secondary" id="qStop">إيقاف</button><button class="btn btn-secondary" id="qMushafPage">صفحة المصحف</button>
        </div>
        <details class="accordion" style="margin-top:12px"><summary>العمل بدون إنترنت <span class="badge badge-muted">اختياري</span></summary><div class="accordion__body"><p class="page-subtitle">نزّل صوت الآيات المحددة للقارئ المختار على هذا الجهاز. النص يُخزن تلقائيًا بعد أول فتح.</p><button class="btn btn-soft" id="qCacheAudio">تنزيل صوت هذا النطاق</button><div class="progress-wrap" id="qCacheProgress" hidden style="margin-top:10px"><div class="progress"><span id="qCacheBar"></span></div><div class="progress-meta"><span id="qCachePct">0%</span><span id="qCacheBytes"></span></div></div></div></details>`;
      $('#qPlay',root).onclick=()=>{stopQuranPlayer();player.stopped=false;player.queue=ayahs;player.index=0;player.repeat=Number($('#qRepeat',root).value)||1;player.repeatDone=0;playCurrent($('#qReciter',root).value,Number($('#qRate',root).value)||1,Number($('#qGap',root).value)||0)};
      $('#qStop',root).onclick=stopQuranPlayer;$('#qMushafPage',root).onclick=async()=>{const page=ayahs[0]?.page||1;const {openMushafAtPage}=await import('./mushaf.js');await openMushafAtPage(page)};
      $('#qCacheAudio',root).onclick=async()=>{const btn=$('#qCacheAudio',root),wrap=$('#qCacheProgress',root),bar=$('#qCacheBar',root),pct=$('#qCachePct',root),size=$('#qCacheBytes',root);btn.disabled=true;wrap.hidden=false;try{await cacheAudioRange(ayahs,$('#qReciter',root).value,(done,total,b)=>{const p=Math.round(done/total*100);bar.style.width=`${p}%`;pct.textContent=`${p}%`;size.textContent=b?bytes(b):`${done}/${total}`});toast('تم حفظ صوت النطاق للعمل بدون إنترنت','success')}catch(e){toast(e.message||'تعذر حفظ الصوت','error')}finally{btn.disabled=false}};
    }catch(e){root.querySelector('.modal__body').innerHTML=`<div class="empty"><strong>تعذر تحميل النص</strong><p>${escapeHtml(e.message)}</p></div>`}
  }});
  const observer=new MutationObserver(()=>{if(!document.body.contains(document.querySelector('[data-modal-backdrop]'))){stopQuranPlayer();observer.disconnect()}});observer.observe(document.querySelector('#modalRoot'),{childList:true});return close;
}
