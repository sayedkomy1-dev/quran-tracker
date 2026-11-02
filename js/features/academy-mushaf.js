/* Public read-only Mushaf — Madani HD pages only.
   This viewer never changes the canonical Quran text engine, student records, or assessment. */
(function(g){'use strict';
 const d=g.document,el=id=>d.getElementById(id);
 let current=1,zoom=100,night=false,focus=false;
 const KEY='imam.public.mushaf.lastpage.v1';
 const PREF='imam.public.mushaf.reader.v2';
 const MAX=604,fmt=n=>String(n).replace(/[0-9]/g,x=>'٠١٢٣٤٥٦٧٨٩'[Number(x)]);
 const hdUrl=n=>`https://raw.githubusercontent.com/akram-seid/quran-hd-images/main/images/${String(n).padStart(3,'0')}.jpg`;
 function status(text){el('amStatus').textContent=text}
 function get(k){try{return g.localStorage.getItem(k)}catch(e){return null}}
 function put(k,v){try{g.localStorage.setItem(k,v)}catch(e){}}
 function readPage(){const n=Number(get(KEY));return Number.isInteger(n)&&n>=1&&n<=MAX?n:1}
 function launchPage(){const n=Number(new URLSearchParams(g.location.search).get('page'));return Number.isInteger(n)&&n>=1&&n<=MAX?n:readPage()}
 // Any previously saved source preference is ignored: the reader has one HD source.
 function prefs(){try{const x=JSON.parse(get(PREF)||'{}');if(Number.isFinite(x.zoom))zoom=Math.max(80,Math.min(160,x.zoom));night=!!x.night}catch(e){}}
 function savePrefs(){put(PREF,JSON.stringify({zoom,night}))}
 function syncReader(){
  d.body.classList.toggle('am-night',night);d.body.classList.toggle('am-focus',focus);
  el('amTheme').setAttribute('aria-pressed',String(night));el('amTheme').textContent=night?'☼ القراءة النهارية':'☾ القراءة الليلية';
  el('amFocus').setAttribute('aria-pressed',String(focus));el('amFocus').textContent=focus?'↩ إظهار التفاصيل':'⛶ التركيز';
  el('amZoomValue').textContent=fmt(zoom)+'٪';el('amMushafPage').style.width=zoom+'%';
 }
 function change(n,retry=false){
  n=Number(n);if(!Number.isInteger(n)||n<1||n>MAX){status('اختر رقم صفحة صحيحًا من ١ إلى ٦٠٤.');return}
  current=n;el('amPageNumber').value=n;el('amCounter').textContent=`صفحة ${fmt(n)} من ٦٠٤`;
  el('amPrev').disabled=n===1;el('amNext').disabled=n===MAX;
  el('amPageProgress').style.width=((n/MAX)*100).toFixed(2)+'%';
  const img=el('amMushafPage');img.alt=`صفحة ${fmt(n)} من مصحف المدينة عالي الدقة برواية حفص`;
  img.hidden=false;el('amRetry').hidden=true;
  img.dataset.page=String(n);
  // A cache-busting query is used only after an explicit user retry, not for normal navigation.
  img.src=hdUrl(n)+(retry?'?retry='+Date.now():'');
  status(`جارٍ تحميل صفحة ${fmt(n)} من مصحف المدينة عالي الدقة…`);
  put(KEY,String(n));
 }
 function zoomChange(delta){zoom=Math.max(80,Math.min(160,zoom+delta));syncReader();savePrefs()}
 function keyboard(e){const t=e.target;if(t?.closest?.('input,select,textarea,button,a,[contenteditable="true"]'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();change(Math.min(MAX,current+1))}
  else if(e.key==='ArrowRight'){e.preventDefault();change(Math.max(1,current-1))}}
 async function init(){if(new URLSearchParams(g.location.search).get('embedded')==='1')d.body.classList.add('am-embedded');prefs();syncReader();
  el('amTheme').addEventListener('click',()=>{night=!night;syncReader();savePrefs()});
  el('amFocus').addEventListener('click',()=>{focus=!focus;syncReader()});
  el('amZoomIn').addEventListener('click',()=>zoomChange(10));
  el('amZoomOut').addEventListener('click',()=>zoomChange(-10));
  el('amRetry').addEventListener('click',()=>change(current,true));
  el('amMushafPage').addEventListener('load',()=>{
   el('amMushafPage').hidden=false;el('amRetry').hidden=true;
   status(`صفحة ${fmt(current)} من مصحف المدينة جاهزة للقراءة.`);
  });
  el('amMushafPage').addEventListener('error',()=>{
   el('amMushafPage').hidden=true;el('amRetry').hidden=false;
   status(`تعذّر تحميل صفحة ${fmt(current)}. تحقق من اتصال الإنترنت ثم اضغط «إعادة محاولة تحميل الصفحة».`);
  });
  d.addEventListener('keydown',keyboard);
  try{
   const r=await fetch('assets/kfgqpc/mushaf-meta.json');if(!r.ok)throw Error('meta');
   const obj=await r.json();if(obj.pageCount!==MAX||obj.surahs?.length!==114||obj.juz?.length!==30)throw Error('structure');
   for(const [list,target,field] of [[obj.surahs,el('amSurah'),'id'],[obj.juz,el('amJuz'),'number']]){
    list.forEach(item=>{const o=d.createElement('option');o.value=item.startPage;
      o.textContent=field==='id'?`${fmt(item.id)} · ${item.name}`:item.name;target.append(o)});
   }
   el('amGo').onclick=()=>change(el('amPageNumber').value);
   el('amSurah').onchange=()=>change(el('amSurah').value);
   el('amJuz').onchange=()=>change(el('amJuz').value);
   el('amPrev').onclick=()=>change(current-1);el('amNext').onclick=()=>change(current+1);
   el('amBookmark').onclick=()=>{put(KEY,String(current));status(`تم حفظ موضع القراءة على هذا الجهاز: صفحة ${fmt(current)}.`)};
   el('amPageNumber').addEventListener('keydown',e=>{if(e.key==='Enter')change(e.target.value)});
   change(launchPage());
  }catch(e){status('تعذّر تحميل فهرس المصحف، يرجى تحديث التطبيق أو الاتصال بالإنترنت.')}
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
