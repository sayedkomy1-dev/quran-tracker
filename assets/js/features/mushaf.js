import {state} from '../core/store.js';
import {getOne,put,remove} from '../core/db.js';
import {$,bytes,toast,modal,escapeHtml,clamp} from '../core/utils.js';

const FILE_ID='mushaf-pdf';
const EXPECTED_SIZE=219879463;
let activeController=null;
let downloadState={url:'',chunks:[],received:0,total:0,paused:false,active:false};
function renderStatus(installed,size=0){return installed?`<span class="badge badge-success">متاح بدون إنترنت${size?` · ${bytes(size)}`:''}</span>`:`<span class="badge badge-muted">غير مُثبّت</span>`}
async function storageInfo(){try{const x=await navigator.storage?.estimate?.();return x||{}}catch{return{}}}
export async function renderMushaf(){
  const main=$('#main');const file=await getOne('files',FILE_ID);const storage=await storageInfo();const free=(storage.quota||0)-(storage.usage||0);
  main.innerHTML=`<section class="page">
    <header class="page-header"><div><h1 class="page-title">مصحف المدينة</h1><div class="page-subtitle">حفص عن عاصم · 604 صفحات · قراءة محلية بعد التنزيل.</div></div>${renderStatus(!!file?.blob,file?.size)}</header>
    <section class="card mushaf-download-card">
      <div class="mushaf-source"><img src="assets/icons/academy-badge.png" alt="" width="56" height="56"><div><strong>مصحف المدينة — النسخة الكاملة</strong><div class="page-subtitle">ملف PDF كامل، الحجم التقريبي ${bytes(EXPECTED_SIZE)}. التنزيل مرة واحدة فقط.</div></div></div>
      ${storage.quota?`<div class="storage-line"><span>المساحة المتاحة للتطبيق</span><strong>${bytes(Math.max(0,free))}</strong></div>`:''}
      <div class="progress-wrap" id="mushafProgress" hidden><div class="progress progress--large"><span id="mushafBar"></span></div><div class="progress-meta"><span id="mushafPct">0%</span><span id="mushafBytes">0 MB</span></div><div class="page-subtitle" id="mushafProgressNote">لا تغلق التطبيق أثناء التنزيل.</div></div>
      <div class="toolbar" style="margin-top:14px">
        <button class="btn btn-primary" id="downloadMushaf">${file?.blob?'إعادة تنزيل المصحف':'تنزيل المصحف كاملًا'}</button>
        <button class="btn btn-secondary" id="stopMushaf" hidden>إيقاف مؤقت</button>
        <button class="btn btn-secondary" id="resumeMushaf" hidden>متابعة</button>
        <button class="btn btn-danger" id="cancelMushaf" hidden>إلغاء</button>
        <a class="btn btn-secondary" id="externalMushaf" href="${escapeHtml(state.settings.mushafUrl)}" target="_blank" rel="noopener">رابط التنزيل المباشر</a>
        <button class="btn btn-secondary" id="importMushaf">استيراد ملف PDF</button>
      </div>
      <input type="file" accept="application/pdf,.pdf" id="mushafFile" hidden>
      <details class="accordion" style="margin-top:14px"><summary>إذا تعذر التنزيل داخل التطبيق</summary><div class="accordion__body"><ol class="help-steps"><li>اضغط «رابط التنزيل المباشر».</li><li>بعد اكتمال الملف اختر «استيراد ملف PDF».</li><li>اختر الملف مرة واحدة، وسيصبح المصحف متاحًا Offline داخل البرنامج.</li></ol></div></details>
    </section>
    ${file?.blob?`<section class="card" style="margin-top:14px"><div class="toolbar toolbar--between"><div><strong>قارئ المصحف</strong><div class="page-subtitle">آخر صفحة: ${file.lastPage||1}</div></div><span class="badge badge-success">Offline</span></div><div class="mushaf-reader-launch"><label class="field"><span class="label">الصفحة</span><input class="input" id="mushafPage" type="number" min="1" max="604" value="${file.lastPage||1}"></label><label class="field"><span class="label">طريقة العرض</span><select class="select" id="mushafMode"><option value="single">صفحة واحدة</option><option value="spread">صفحتان متقابلتان</option></select></label><button class="btn btn-primary" id="openMushaf">فتح المصحف</button><button class="btn btn-danger" id="deleteMushaf">حذف الملف فقط</button></div></section>`:''}
  </section>`;
  $('#downloadMushaf').onclick=()=>{resetDownloadState();downloadMushaf(storage)};
  $('#stopMushaf').onclick=()=>pauseDownload();
  $('#resumeMushaf').onclick=()=>downloadMushaf(storage,true);
  $('#cancelMushaf').onclick=()=>cancelDownload();
  $('#importMushaf').onclick=()=>$('#mushafFile').click();
  $('#mushafFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf'))return toast('اختر ملف PDF صحيحًا','error');if(f.size<10_000_000&&!confirm('حجم الملف أصغر من المتوقع لمصحف كامل. هل تريد تثبيته رغم ذلك؟'))return;try{await put('files',{id:FILE_ID,blob:f,size:f.size,name:f.name,lastPage:1,source:'manual-import',installedAt:new Date().toISOString()});toast('تم تثبيت المصحف بنجاح','success');renderMushaf()}catch(err){toast('تعذر تخزين الملف: '+(err.message||err),'error')}};
  $('#openMushaf')?.addEventListener('click',()=>openReader(file,Number($('#mushafPage').value)||1,$('#mushafMode').value));
  $('#deleteMushaf')?.addEventListener('click',async()=>{if(confirm('حذف ملف المصحف من الجهاز؟ بيانات الطلاب والحصص لن تتأثر.')){await remove('files',FILE_ID);toast('تم حذف ملف المصحف','success');renderMushaf()}});
}
function resetDownloadState(){downloadState={url:'',chunks:[],received:0,total:0,paused:false,active:false}}
function downloadUi(){return{wrap:$('#mushafProgress'),bar:$('#mushafBar'),pct:$('#mushafPct'),meta:$('#mushafBytes'),note:$('#mushafProgressNote'),pause:$('#stopMushaf'),resume:$('#resumeMushaf'),cancel:$('#cancelMushaf'),btn:$('#downloadMushaf')}}
function paintDownloadProgress(){const {bar,pct,meta}=downloadUi(),total=downloadState.total||EXPECTED_SIZE,received=downloadState.received||0,p=clamp(Math.round(received/total*100),0,99);if(bar)bar.style.width=`${p}%`;if(pct)pct.textContent=`${p}%`;if(meta)meta.textContent=`${bytes(received)} من ${bytes(total)}`}
function pauseDownload(){if(!downloadState.active)return;downloadState.paused=true;activeController?.abort();const {pause,resume,note}=downloadUi();if(pause)pause.hidden=true;if(resume)resume.hidden=false;if(note)note.textContent='تم إيقاف التنزيل مؤقتًا. يمكنك المتابعة من نفس النقطة إذا كان المصدر يدعم الاستكمال.';toast('تم إيقاف التنزيل مؤقتًا','warning')}
function cancelDownload(){downloadState.paused=false;activeController?.abort();resetDownloadState();const {wrap,pause,resume,cancel,btn}=downloadUi();if(wrap)wrap.hidden=true;if(pause)pause.hidden=true;if(resume)resume.hidden=true;if(cancel)cancel.hidden=true;if(btn)btn.disabled=false;toast('تم إلغاء التنزيل','warning')}
async function downloadMushaf(storage={},resume=false){
  const url=state.settings.mushafUrl;const {wrap,bar,pct,meta,note,pause,resume:resumeBtn,cancel,btn}=downloadUi();
  const free=(storage.quota||0)-(storage.usage||0);if(!resume&&free&&free<EXPECTED_SIZE*1.15&&!confirm(`المساحة المتاحة المقدرة ${bytes(free)} وقد لا تكفي. هل تريد المحاولة؟`))return;
  if(!resume||downloadState.url!==url){resetDownloadState();downloadState.url=url}
  wrap.hidden=false;pause.hidden=false;resumeBtn.hidden=true;cancel.hidden=false;btn.disabled=true;downloadState.paused=false;downloadState.active=true;activeController=new AbortController();
  if(!resume){bar.style.width='0%';pct.textContent='0%';meta.textContent='بدء الاتصال…'}else paintDownloadProgress();note.textContent=resume?'جارٍ استكمال التنزيل…':'لا تغلق التطبيق أثناء التنزيل.';
  try{
    const headers={};if(downloadState.received>0)headers.Range=`bytes=${downloadState.received}-`;
    const res=await fetch(url,{signal:activeController.signal,cache:'no-store',headers});if(!res.ok)throw new Error(`تعذر الاتصال بالمصدر (HTTP ${res.status})`);
    if(downloadState.received>0&&res.status!==206){downloadState.chunks=[];downloadState.received=0;note.textContent='المصدر لا يدعم الاستكمال؛ بدأ التنزيل من البداية.'}
    const partTotal=Number(res.headers.get('content-length'))||0;const range=res.headers.get('content-range');const rangeTotal=range?Number(range.split('/').pop()):0;downloadState.total=rangeTotal||(downloadState.received+partTotal)||EXPECTED_SIZE;
    const reader=res.body?.getReader();if(!reader)throw new Error('المتصفح لا يتيح متابعة تقدم التنزيل');let lastUi=0;
    while(true){const {done,value}=await reader.read();if(done)break;downloadState.chunks.push(value);downloadState.received+=value.byteLength;const now=performance.now();if(now-lastUi>120){paintDownloadProgress();lastUi=now}}
    bar.style.width='100%';pct.textContent='100%';meta.textContent=`${bytes(downloadState.received)} مكتمل`;note.textContent='جارٍ تثبيت الملف داخل التطبيق…';
    const blob=new Blob(downloadState.chunks,{type:'application/pdf'});if(blob.size<10_000_000)throw new Error('الملف المستلم أصغر من المتوقع');await put('files',{id:FILE_ID,blob,size:blob.size,name:'Madinah-Mushaf-Hafs-604.pdf',lastPage:1,source:url,installedAt:new Date().toISOString()});resetDownloadState();toast('اكتمل تنزيل المصحف وأصبح متاحًا بدون إنترنت','success');setTimeout(renderMushaf,300);
  }catch(e){if(e.name==='AbortError'){if(downloadState.paused)return;note.textContent='تم إلغاء التنزيل.';return}console.warn(e);note.textContent='تعذر التنزيل داخل التطبيق. استخدم الرابط المباشر ثم استورد الملف.';toast(e.message||'تعذر تنزيل المصحف داخل التطبيق','warning')}
  finally{activeController=null;downloadState.active=false;if(!downloadState.paused){pause.hidden=true;resumeBtn.hidden=true;cancel.hidden=true;btn.disabled=false}else{pause.hidden=true;resumeBtn.hidden=false;cancel.hidden=false;btn.disabled=true}}
}
export async function openMushafAtPage(page=1){const file=await getOne('files',FILE_ID);if(!file?.blob){toast('نزّل المصحف أو استورده أولًا من قسم المصحف','warning');return false}await openReader(file,page,'single');return true}
async function openReader(file,page=1,mode='single'){
  page=clamp(Number(page)||1,1,604);await put('files',{...file,lastPage:page});const url=URL.createObjectURL(file.blob);let current=page,currentMode=mode;
  const close=modal({title:'مصحف المدينة — القراءة',wide:true,body:`<div class="mushaf-reader-toolbar"><button class="btn btn-secondary" id="mPrev">السابق</button><label class="field mushaf-page-field"><span class="sr-only">رقم الصفحة</span><input class="input" id="mPage" type="number" min="1" max="604" value="${page}"></label><button class="btn btn-secondary" id="mNext">التالي</button><select class="select" id="mMode"><option value="single" ${mode==='single'?'selected':''}>صفحة واحدة</option><option value="spread" ${mode==='spread'?'selected':''}>صفحتان</option></select><button class="btn btn-soft" id="mFull">ملء الشاشة</button></div><div class="mushaf-viewer" id="mViewer"></div>`,onMount:(root)=>{
    const viewer=$('#mViewer',root),pageInput=$('#mPage',root),modeInput=$('#mMode',root);const paint=async()=>{current=clamp(Number(current)||1,1,604);pageInput.value=current;const pages=currentMode==='spread'?[current,Math.min(604,current+1)]:[current];viewer.classList.toggle('spread',currentMode==='spread');viewer.innerHTML=pages.map(n=>`<iframe title="مصحف المدينة صفحة ${n}" src="${url}#page=${n}&zoom=page-fit&toolbar=0&navpanes=0" loading="eager"></iframe>`).join('');await put('files',{...file,lastPage:current})};
    $('#mPrev',root).onclick=()=>{current=Math.max(1,current-(currentMode==='spread'?2:1));paint()};$('#mNext',root).onclick=()=>{current=Math.min(604,current+(currentMode==='spread'?2:1));paint()};pageInput.onchange=()=>{current=pageInput.value;paint()};modeInput.onchange=()=>{currentMode=modeInput.value;paint()};$('#mFull',root).onclick=()=>viewer.requestFullscreen?.();paint();
  }});
  const root=document.querySelector('#modalRoot');const observer=new MutationObserver(()=>{if(!root.children.length){URL.revokeObjectURL(url);observer.disconnect()}});observer.observe(root,{childList:true});return close;
}
