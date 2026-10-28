/* Public reading only: canonical pages from existing KFG metadata & Quran.wS assets.
   No student IDs, session writes, donation recording or editable Qur'an text. */
(function(g){'use strict';const d=g.document;const el=id=>d.getElementById(id);let current=1, surahs=[],juz=[];
 const KEY='imam.public.mushaf.lastpage.v1';const fmt=n=>String(n).replace(/[0-9]/g,x=>'٠١٢٣٤٥٦٧٨٩'[Number(x)]);
 function update(status){el('amStatus').textContent=status}
 function readPage(){try{const n=Number(g.localStorage.getItem(KEY));return Number.isInteger(n)&&n>=1&&n<=604?n:1}catch(e){return 1}}
 function savePage(n){try{g.localStorage.setItem(KEY,String(n))}catch(e){}}
 function change(n){n=Number(n);if(!Number.isInteger(n)||n<1||n>604){update('اختر رقم صفحة صحيحًا من ١ إلى ٦٠٤.');return}current=n;el('amPageNumber').value=n;el('amCounter').textContent=`صفحة ${fmt(n)} من ٦٠٤`;el('amPrev').disabled=n===1;el('amNext').disabled=n===604;
  const img=el('amMushafPage');img.alt=`صفحة ${fmt(n)} من مصحف المدينة`;
  // Existing bundled pages are used first; remaining pages use the same publisher URL as the original reader.
  img.src=n<=2?`assets/kfgqpc/mushaf604/page-${String(n).padStart(3,'0')}.png`:`https://cdn.quran.ws/svg/pages/v1.1.1/hafs-kfqc/${String(n).padStart(3,'0')}.svg`;
  update(n<=2?'الصفحة متوفرة ضمن ملفات التطبيق.':'جارٍ تحميل الصفحة من مصدر المصحف المعتمد في التطبيق…');savePage(n);
 }
 async function init(){try{const r=await fetch('assets/kfgqpc/mushaf-meta.json');if(!r.ok)throw Error('meta');const obj=await r.json();if(obj.pageCount!==604||obj.surahs?.length!==114||obj.juz?.length!==30)throw Error('structure');surahs=obj.surahs;juz=obj.juz;
   for(const [list,target,field] of [[surahs,el('amSurah'),'id'],[juz,el('amJuz'),'number']])list.forEach(item=>{const o=d.createElement('option');o.value=item.startPage;o.textContent=field==='id'?`${fmt(item.id)} · ${item.name}`:item.name;target.append(o)});
   el('amGo').onclick=()=>change(el('amPageNumber').value);
   el('amSurah').onchange=()=>change(el('amSurah').value);
   el('amJuz').onchange=()=>change(el('amJuz').value);
   el('amPrev').onclick=()=>change(current-1);
   el('amNext').onclick=()=>change(current+1);
   el('amBookmark').onclick=()=>{savePage(current);update(`تم حفظ موضع القراءة على هذا الجهاز: صفحة ${fmt(current)}.`)};
   el('amPageNumber').addEventListener('keydown',e=>{if(e.key==='Enter')change(e.target.value)});
   el('amMushafPage').addEventListener('load',()=>update(`صفحة ${fmt(current)} جاهزة للقراءة.`));
   el('amMushafPage').addEventListener('error',()=>update('تعذر تحميل الصفحة. قد تحتاج اتصالًا بالإنترنت أو قد يتعذر الوصول إلى مصدر المصحف الآن.'));change(readPage());
 }catch(e){update('تعذر تحميل فهرس المصحف، يرجى تحديث التطبيق أو الاتصال بالإنترنت.')}}
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
