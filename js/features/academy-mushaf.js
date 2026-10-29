/* Public read-only Mushaf — Original academy pages + optional Madani HD pages.
   No modification of Qur'an text, student data, assessment, or registration flows. */
(function(g){'use strict';const d=g.document,el=id=>d.getElementById(id);let current=1,surahs=[],juz=[],source='classic',zoom=100,night=false,focus=false;
 const KEY='imam.public.mushaf.lastpage.v1';const PREF='imam.public.mushaf.reader.v2';
 const MAX=604,fmt=n=>String(n).replace(/[0-9]/g,x=>'٠١٢٣٤٥٦٧٨٩'[Number(x)]);
 const classicUrl=n=>n<=2?`assets/kfgqpc/mushaf604/page-${String(n).padStart(3,'0')}.png`:`https://cdn.quran.ws/svg/pages/v1.1.1/hafs-kfqc/${String(n).padStart(3,'0')}.svg`;
 const hdUrl=n=>`https://raw.githubusercontent.com/akram-seid/quran-hd-images/main/images/${String(n).padStart(3,'0')}.jpg`;
 const imageUrl=(n,mode)=>mode==='hd'?hdUrl(n):classicUrl(n);
 function status(text){el('amStatus').textContent=text}
 function get(k){try{return g.localStorage.getItem(k)}catch(e){return null}}
 function put(k,v){try{g.localStorage.setItem(k,v)}catch(e){}}
 function readPage(){const n=Number(get(KEY));return Number.isInteger(n)&&n>=1&&n<=MAX?n:1}
 function prefs(){try{const x=JSON.parse(get(PREF)||'{}');if(x.source==='hd')source='hd';if(Number.isFinite(x.zoom))zoom=Math.max(80,Math.min(160,x.zoom));night=!!x.night}catch(e){}}
 function savePrefs(){put(PREF,JSON.stringify({source,zoom,night}))}
 function syncReader(){d.body.classList.toggle('am-night',night);d.body.classList.toggle('am-focus',focus);
  el('amTheme').setAttribute('aria-pressed',String(night));el('amTheme').textContent=night?'☼ القراءة النهارية':'☾ القراءة الليلية';
  el('amFocus').setAttribute('aria-pressed',String(focus));el('amFocus').textContent=focus?'↩ إظهار التفاصيل':'⛶ التركيز';
  el('amZoomValue').textContent=fmt(zoom)+'٪';el('amMushafPage').style.width=zoom+'%';
  d.querySelectorAll('[data-mushaf-source]').forEach(b=>{const active=b.dataset.mushafSource===source;b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-selected',active)});
 }
 function change(n){n=Number(n);if(!Number.isInteger(n)||n<1||n>MAX){status('اختر رقم صفحة صحيحًا من ١ إلى ٦٠٤.');return}
  current=n;el('amPageNumber').value=n;el('amCounter').textContent=`صفحة ${fmt(n)} من ٦٠٤`;
  el('amPrev').disabled=n===1;el('amNext').disabled=n===MAX;
  el('amPageProgress').style.width=((n/MAX)*100).toFixed(2)+'%';
  const img=el('amMushafPage');img.alt=`صفحة ${fmt(n)} من مصحف المدينة برواية حفص`;
  // The independent HD view is a distinct display source, never a replacement for the canonical app text engine.
  img.dataset.page=String(n);img.dataset.source=source;img.src=imageUrl(n,source);
  status(source==='hd'?`جارٍ عرض صفحة ${fmt(n)} من المصحف عالي الدقة…`:`جارٍ عرض صفحة ${fmt(n)} من المصدر الأصلي…`);
  put(KEY,String(n));
 }
 function sourceChange(next){if(next!==source&&(next==='classic'||next==='hd')){source=next;savePrefs();syncReader();change(current)}}
 function zoomChange(delta){zoom=Math.max(80,Math.min(160,zoom+delta));syncReader();savePrefs()}
 function keyboard(e){const t=e.target;if(t?.closest?.('input,select,textarea,button,a,[contenteditable="true"]'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();change(Math.min(MAX,current+1))}else if(e.key==='ArrowRight'){e.preventDefault();change(Math.max(1,current-1))}}
 async function init(){prefs();syncReader();
  d.querySelectorAll('[data-mushaf-source]').forEach(b=>b.addEventListener('click',()=>sourceChange(b.dataset.mushafSource)));
  el('amTheme').addEventListener('click',()=>{night=!night;syncReader();savePrefs()});
  el('amFocus').addEventListener('click',()=>{focus=!focus;syncReader()});
  el('amZoomIn').addEventListener('click',()=>zoomChange(10));el('amZoomOut').addEventListener('click',()=>zoomChange(-10));
  el('amMushafPage').addEventListener('load',()=>status(`صفحة ${fmt(current)} جاهزة للقراءة ${source==='hd'?'(عالية الدقة)':''}.`));
  el('amMushafPage').addEventListener('error',()=>{
   if(source==='hd'){source='classic';savePrefs();syncReader();status('تعذّر تحميل النسخة عالية الدقة؛ جارٍ العودة إلى المصدر الأصلي.');change(current)}
   else status('تعذّر تحميل الصفحة من المصدر الأصلي. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.');
  });
  d.addEventListener('keydown',keyboard);
  try{const r=await fetch('assets/kfgqpc/mushaf-meta.json');if(!r.ok)throw Error('meta');const obj=await r.json();if(obj.pageCount!==MAX||obj.surahs?.length!==114||obj.juz?.length!==30)throw Error('structure');surahs=obj.surahs;juz=obj.juz;
   for(const [list,target,field] of [[surahs,el('amSurah'),'id'],[juz,el('amJuz'),'number']])list.forEach(item=>{const o=d.createElement('option');o.value=item.startPage;o.textContent=field==='id'?`${fmt(item.id)} · ${item.name}`:item.name;target.append(o)});
   el('amGo').onclick=()=>change(el('amPageNumber').value);
   el('amSurah').onchange=()=>change(el('amSurah').value);
   el('amJuz').onchange=()=>change(el('amJuz').value);
   el('amPrev').onclick=()=>change(current-1);el('amNext').onclick=()=>change(current+1);
   el('amBookmark').onclick=()=>{put(KEY,String(current));status(`تم حفظ موضع القراءة على هذا الجهاز: صفحة ${fmt(current)}.`)};
   el('amPageNumber').addEventListener('keydown',e=>{if(e.key==='Enter')change(e.target.value)});
   change(readPage());
  }catch(e){status('تعذّر تحميل فهرس المصحف، يرجى تحديث التطبيق أو الاتصال بالإنترنت.')}
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
