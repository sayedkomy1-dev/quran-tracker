'use strict';
/* RC16 — guardian home-recitation upload and timestamped teacher feedback.
   Parent access is phone+PIN session only; no public snapshot/live-link uploads. */
(function guardianHomeRecitation(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const BUCKET='guardian-recitation-media';
  const $=id=>g.document?.getElementById?.(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let context=null,recorder=null,stream=null,chunks=[],startedAt=0,elapsedMs=0,timer=null,pendingBlob=null,pendingUrl='',pendingUpload=null,requestId=0,captureId=0,outboxDbPromise=null,flushRunning=false;
  const OUTBOX_DB='imam-guardian-home-recitation-outbox-v1',OUTBOX_STORE='items';
  const urls=new Set();
  function say(text,kind='info'){const el=$('portalHomeRecitationStatus');if(el){el.textContent=text;el.dataset.kind=kind;}}
  function releaseUrls(){for(const url of urls)try{URL.revokeObjectURL(url);}catch(_){}urls.clear();pendingUrl='';}
  function clearCapture(){captureId++;pendingUpload=null;if(timer){clearInterval(timer);timer=null;}if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch(_){}}recorder=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}chunks=[];pendingBlob=null;pendingUpload=null;elapsedMs=0;releaseUrls();const preview=$('portalHomeRecitationPreview');if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview.hidden=true;}updateControls();}
  function updateControls(){const active=!!recorder&&recorder.state==='recording',ready=!!pendingBlob;const start=$('portalHomeRecitationStart'),stop=$('portalHomeRecitationStop'),send=$('portalHomeRecitationSend');if(start)start.disabled=active||!!pendingBlob||!context?.studentRef||!context?.assignment;if(stop)stop.disabled=!active;if(send)send.disabled=!ready;const clock=$('portalHomeRecitationClock');if(clock)clock.textContent=active||ready?formatTime(active?Date.now()-startedAt:elapsedMs):'00:00';}
  function formatTime(ms){const sec=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  async function rpc(name,args){const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(args||{})});let data=null;try{data=await res.json();}catch(_){}if(!res.ok)throw new Error(data?.message||data?.error||`PORTAL_HTTP_${res.status}`);return Array.isArray(data)?data[0]:data;}
  function outboxDb(){if(!g.indexedDB)return Promise.reject(Error('OUTBOX_STORAGE_UNAVAILABLE'));if(!outboxDbPromise)outboxDbPromise=new Promise((resolve,reject)=>{const req=g.indexedDB.open(OUTBOX_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(OUTBOX_STORE)){const store=req.result.createObjectStore(OUTBOX_STORE,{keyPath:'id'});store.createIndex('studentRef','studentRef');store.createIndex('createdAt','createdAt');}};req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();outboxDbPromise=null;};resolve(db);};req.onerror=()=>reject(req.error||Error('OUTBOX_STORAGE_OPEN'));}).catch(e=>{outboxDbPromise=null;throw e;});return outboxDbPromise;}
  async function outboxPut(item){const db=await outboxDb();return new Promise((resolve,reject)=>{const tx=db.transaction(OUTBOX_STORE,'readwrite');tx.objectStore(OUTBOX_STORE).put(item);tx.oncomplete=()=>resolve(item);tx.onerror=()=>reject(tx.error||Error('OUTBOX_WRITE'));tx.onabort=()=>reject(tx.error||Error('OUTBOX_ABORT'));});}
  async function outboxGet(id){const db=await outboxDb();return new Promise((resolve,reject)=>{const tx=db.transaction(OUTBOX_STORE,'readonly'),req=tx.objectStore(OUTBOX_STORE).get(String(id));req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error);});}
  async function outboxAll(studentRef){const db=await outboxDb();return new Promise((resolve,reject)=>{const tx=db.transaction(OUTBOX_STORE,'readonly'),req=tx.objectStore(OUTBOX_STORE).getAll();req.onsuccess=()=>resolve((req.result||[]).filter(x=>String(x.studentRef)===String(studentRef)).sort((a,b)=>Number(a.createdAt)-Number(b.createdAt)));req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error);});}
  async function outboxDelete(id){const db=await outboxDb();return new Promise((resolve,reject)=>{const tx=db.transaction(OUTBOX_STORE,'readwrite');tx.objectStore(OUTBOX_STORE).delete(String(id));tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  function localId(){try{return g.crypto.randomUUID();}catch(_){return `hrr-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}}
  function sameAssignment(a,b){return !!a&&!!b&&String(a.surah)===String(b.surah)&&Number(a.number)===Number(b.number)&&Number(a.from)===Number(b.from)&&Number(a.to)===Number(b.to);}
  async function renderOutbox(){const host=$('portalHomeRecitationOutbox');if(!host)return;if(!context?.studentRef){host.hidden=true;host.replaceChildren();return;}try{const rows=await outboxAll(context.studentRef);host.hidden=!rows.length;if(!rows.length){host.replaceChildren();return;}host.innerHTML=`<div class="hrr-outbox-head"><b>التسجيلات المحفوظة على هذا الجهاز</b><span>${rows.length}</span></div>${rows.map(x=>{const pending=x.status==='needs_review',online=g.navigator?.onLine!==false&&!!context?.sessionToken;const label=pending?'التكليف تغيّر — يحتاج مراجعة':online?'جاهز للرفع إلى المحفظ':'محفوظ محليًا — بانتظار الاتصال';return `<article class="hrr-outbox-item"><div><b>سورة ${esc(x.assignment?.surah||'—')} · الآيات ${Number(x.assignment?.from)||1}–${Number(x.assignment?.to)||1}</b><small>${esc(new Date(x.createdAt||Date.now()).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}))} · ${formatTime(x.durationMs||0)} · ${label}</small></div><div><button type="button" data-hrr-outbox-send="${esc(x.id)}" ${pending||!online?'disabled':''}>إرسال الآن</button><button type="button" class="danger" data-hrr-outbox-delete="${esc(x.id)}">حذف</button></div></article>`;}).join('')}`;}catch(err){console.warn('[home recitation outbox]',err);host.hidden=false;host.textContent='تعذر قراءة قائمة التسجيلات المحلية على هذا الجهاز.';}}
  async function flushItem(id){
    if(g.navigator?.onLine===false||!context?.sessionToken||!context?.studentRef)return false;
    let item=await outboxGet(id);if(!item||String(item.studentRef)!==String(context.studentRef))return false;
    const current=assignment();if(!sameAssignment(item.assignment,current)){item.status='needs_review';item.lastError='ASSIGNMENT_NOT_CURRENT';await outboxPut(item);await renderOutbox();return false;}
    const btn=$('portalHomeRecitationSend');if(btn)btn.disabled=true;
    try{
      const mime=mimeBase(item.blob?.type||item.mime)||'audio/webm';
      if(!item.upload||Date.now()-Number(item.upload.createdAt||0)>25*60*1000){
        const begun=await rpc('guardian_home_recitation_begin_upload',{p_session:context.sessionToken,p_student_ref:context.studentRef,p_mime_type:mime,p_file_size_bytes:item.blob.size,p_duration_ms:Math.max(1000,Math.min(180000,Number(item.durationMs)||1000)),p_surah:item.assignment.surah,p_surah_number:item.assignment.number,p_from_ayah:item.assignment.from,p_to_ayah:item.assignment.to});
        if(!begun?.ok||!begun.object_path||!begun.upload_token)throw new Error('UPLOAD_NOT_AUTHORIZED');
        item.upload={id:begun.id,object_path:begun.object_path,upload_token:begun.upload_token,uploaded:false,mime,createdAt:Date.now()};await outboxPut(item);
      }
      if(!item.upload.uploaded){const ok=await upload(item.upload.object_path,item.blob,item.upload.mime);if(!ok)throw new Error('UPLOAD_TRANSPORT_FAILED');item.upload.uploaded=true;await outboxPut(item);}
      let completed=null;try{completed=await rpc('guardian_home_recitation_complete_upload',{p_session:context.sessionToken,p_student_ref:context.studentRef,p_upload_token:item.upload.upload_token});}catch(completeError){const listed=await rpc('guardian_home_recitation_session_list',{p_session:context.sessionToken,p_student_ref:context.studentRef}).catch(()=>null);if(Array.isArray(listed?.recordings)&&listed.recordings.some(x=>String(x.id)===String(item.upload.id)))completed={ok:true};else throw completeError;}
      if(!completed?.ok)throw new Error('UPLOAD_CONFIRMATION_FAILED');await outboxDelete(item.id);say('تم رفع التسميع للمحفظ بنجاح.','success');await loadList();await renderOutbox();return true;
    }catch(err){console.warn('[home recitation queued upload]',err);const message=String(err?.message||err);if(/ASSIGNMENT_NOT_CURRENT|INVALID_ASSIGNMENT_RANGE/.test(message)){item.status='needs_review';item.lastError='ASSIGNMENT_NOT_CURRENT';await outboxPut(item);say('التكليف المنشور تغيّر. احتفظنا بالتسجيل محليًا؛ راجعه مع المحفظ قبل الإرسال.','warn');}else if(/DAILY_UPLOAD_LIMIT/.test(message)){say('وصلت إلى الحد اليومي. التسجيل محفوظ ويمكن إعادة المحاولة لاحقًا.','warn');}else{say(g.navigator?.onLine===false?'انقطع الاتصال. التسجيل محفوظ وسيُعاد رفعه عند عودة الإنترنت.':'تعذر الرفع. التسجيل محفوظ ويمكن إعادة المحاولة.','warn');}await renderOutbox();return false;}
    finally{if(btn)btn.disabled=!pendingBlob;updateControls();}
  }
  async function flushOutbox(){if(flushRunning||g.navigator?.onLine===false||!context?.sessionToken||!context?.studentRef)return;flushRunning=true;try{const rows=await outboxAll(context.studentRef);for(const item of rows){if(g.navigator?.onLine===false)break;if(item.status==='needs_review')continue;await flushItem(item.id);}}catch(err){console.warn('[home recitation flush]',err);}finally{flushRunning=false;await renderOutbox();}}
  function storageUrl(path){return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${String(path||'').split('/').map(encodeURIComponent).join('/')}`;}
  async function upload(path,blob,mime){try{const res=await fetch(storageUrl(path),{method:'POST',headers:{'apikey':PUBLISHABLE_KEY,'Authorization':`Bearer ${PUBLISHABLE_KEY}`,'Content-Type':mime,'x-upsert':'false'},body:blob});return !!res.ok;}catch(err){console.warn('[home recitation upload transport]',err);return false;}}
  async function fetchMedia(path){const res=await fetch(storageUrl(path),{headers:{'apikey':PUBLISHABLE_KEY,'Authorization':`Bearer ${PUBLISHABLE_KEY}`},cache:'no-store'});if(!res.ok)throw new Error('MEDIA_READ_FAILED');const url=URL.createObjectURL(await res.blob());urls.add(url);return url;}
  function assignment(){const a=context?.assignment;if(!a?.surah)return null;const from=Math.max(1,Number(a.from)||1),to=Math.max(from,Number(a.to)||from),number=Number(a.surahNumber)||Number(a.surahId)||0;return{surah:String(a.surah),number,from,to};}
  function mimeBase(value){return String(value||'').split(';')[0].trim().toLowerCase();}
  function chooseMime(){if(typeof MediaRecorder==='undefined')return '';const choices=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'];return choices.find(x=>MediaRecorder.isTypeSupported?.(x))||'';}
  async function start(){
    if(!context?.studentRef)return say('افتح بوابة الطالب/ولي الأمر واختر الطالب أولًا.','warn');
    const a=assignment();if(!a||!a.number)return say('لا يوجد تكليف حفظ جديد منشور يمكن ربط التسجيل به. اطلب من المحفظ تحديث التكليف أولًا.','warn');
    if(!g.navigator?.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')return say('هذا المتصفح لا يدعم التسجيل الصوتي. استخدم متصفحًا حديثًا على اتصال آمن.','error');
    try{
      releaseUrls();pendingBlob=null;pendingUpload=null;const preview=$('portalHomeRecitationPreview');if(preview){preview.hidden=true;preview.removeAttribute('src');}
      stream=await g.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      const mime=chooseMime(),thisCapture=++captureId;recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];startedAt=Date.now();elapsedMs=0;
      recorder.addEventListener('dataavailable',e=>{if(e.data?.size&&thisCapture===captureId)chunks.push(e.data);});
      recorder.addEventListener('stop',()=>{
        if(thisCapture!==captureId)return;
        elapsedMs=Math.min(180000,Math.max(0,Date.now()-startedAt));
        const type=mimeBase(recorder?.mimeType||chunks[0]?.type||mime||'audio/webm');pendingBlob=new Blob(chunks,{type});
        if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}recorder=null;chunks=[];
        if(pendingBlob.size>15728640){pendingBlob=null;say('حجم التسجيل تجاوز 15 ميجابايت. قصّر التسجيل ثم أعد المحاولة.','error');}
        else if(pendingBlob.size<1024||elapsedMs<1000){pendingBlob=null;say('التسجيل قصير جدًا أو فارغ. أعد التسجيل.','warn');}
        else{pendingUrl=URL.createObjectURL(pendingBlob);urls.add(pendingUrl);if(preview){preview.src=pendingUrl;preview.hidden=false;}say(`التسجيل جاهز للمراجعة والإرسال (${formatTime(elapsedMs)}). لن يُرسل قبل ضغطك على «إرسال للمحفظ».`,'success');}
        updateControls();
      },{once:true});
      recorder.start(1000);say('جارٍ التسجيل… اقرأ التكليف بوضوح، ثم أوقف التسجيل عند الانتهاء.','recording');
      timer=setInterval(()=>{updateControls();if(Date.now()-startedAt>=180000)stop();},500);updateControls();
    }catch(err){console.warn('[home recitation recorder]',err);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}recorder=null;updateControls();say(err?.name==='NotAllowedError'?'لم تسمح باستخدام الميكروفون. فعّل إذن الميكروفون ثم أعد المحاولة.':'تعذر بدء التسجيل على هذا الجهاز.','error');}
  }
  function stop(){if(timer){clearInterval(timer);timer=null;}if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch(_){}}else updateControls();}
  async function send(){
    if(!pendingBlob||!context?.studentRef)return;
    const a=assignment();if(!a)return say('التكليف الحالي غير متاح.','error');
    const btn=$('portalHomeRecitationSend');if(btn)btn.disabled=true;say('جارٍ حفظ التسجيل محليًا في قائمة الإرسال…');
    const item={id:localId(),studentRef:String(context.studentRef),studentName:String(context.studentName||''),assignment:a,blob:pendingBlob,mime:mimeBase(pendingBlob.type)||'audio/webm',durationMs:Math.max(1000,Math.min(180000,elapsedMs)),createdAt:Date.now(),status:'queued',upload:null};
    try{
      await outboxPut(item);try{await g.navigator?.storage?.persist?.();}catch(_){}
      pendingBlob=null;pendingUpload=null;elapsedMs=0;releaseUrls();const preview=$('portalHomeRecitationPreview');if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview.hidden=true;}
      updateControls();await renderOutbox();
      if(g.navigator?.onLine!==false&&context?.sessionToken)await flushItem(item.id);
      else say('تم حفظ التسجيل على هذا الجهاز. سيُرفع للمحفظ عند عودة الإنترنت وتوفر جلسة الدخول.','success');
    }catch(err){console.warn('[home recitation outbox save]',err);say('تعذر حفظ التسجيل محليًا. لا تغلق الصفحة حتى تعيد المحاولة.','error');}
    finally{if(btn)btn.disabled=!pendingBlob;updateControls();}
  }
  function statusLabel(v){return v==='reviewed'?'تمت المراجعة':v==='needs_retry'?'يحتاج إعادة تسجيل':'وصل للمحفظ';}
  function timeLabel(ms){return formatTime(ms);}
  async function loadList(){
    const id=++requestId,host=$('portalHomeRecitationList');if(!host||!context?.sessionToken||!context?.studentRef)return;
    host.textContent='جارٍ تحميل التسجيلات…';
    try{const data=await rpc('guardian_home_recitation_session_list',{p_session:context.sessionToken,p_student_ref:context.studentRef});if(id!==requestId||!context)return;const rows=Array.isArray(data?.recordings)?data.recordings:[];
      if(!rows.length){host.innerHTML='<p class="hrr-empty">لم ترسل تسجيلات منزلية بعد.</p>';return;}
      host.innerHTML=rows.map(r=>`<article class="hrr-record" data-hrr-record="${esc(r.id)}"><header><b>سورة ${esc(r.assignment_surah)} · الآيات ${Number(r.assignment_from_ayah)||1}–${Number(r.assignment_to_ayah)||1}</b><span>${esc(statusLabel(r.status))}</span></header><small>${esc(new Date(r.created_at).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}))} · ${timeLabel(r.duration_ms)}</small><audio controls preload="none" data-hrr-audio="${esc(r.id)}"></audio><div class="hrr-comments">${(r.comments||[]).map(c=>`<div class="hrr-comment"><button type="button" data-hrr-seek="${esc(r.id)}" data-hrr-ms="${Number(c.at_ms)||0}">▶ ${timeLabel(c.at_ms)}${c.ayah_number?` · الآية ${Number(c.ayah_number)}`:''}</button>${c.body?`<p>${esc(c.body)}</p>`:''}${c.audio_path?`<button type="button" data-hrr-comment-audio="${esc(c.id)}" data-hrr-path="${esc(c.audio_path)}">🎙️ استمع إلى الملاحظة الصوتية</button>`:''}</div>`).join('')||'<small>لا توجد ملاحظات من المحفظ حتى الآن.</small>'}</div></article>`).join('');
      for(const r of rows){try{const url=await fetchMedia(r.object_path);const audio=host.querySelector(`[data-hrr-audio="${CSS.escape(String(r.id))}"]`);if(audio&&id===requestId)audio.src=url;}catch(err){console.warn('[home recitation media]',err);}}
      for(const c of rows.flatMap(r=>r.comments||[]).filter(x=>x.audio_path)){try{const url=await fetchMedia(c.audio_path);const btn=host.querySelector(`[data-hrr-comment-audio="${CSS.escape(String(c.id))}"]`);if(btn&&id===requestId){btn.dataset.objectUrl=url;}}catch(_){}}
    }catch(err){if(id===requestId){console.warn('[home recitation list]',err);host.textContent='تعذر تحميل التسجيلات. تأكد من تنفيذ تحديث قاعدة البيانات والاتصال بالإنترنت.';}}
  }
  function bind(){const host=$('portalHomeRecitationList');if(host&&!host.dataset.bound){host.dataset.bound='1';host.addEventListener('click',e=>{const seek=e.target.closest('[data-hrr-seek]');if(seek){const audio=host.querySelector(`[data-hrr-audio="${CSS.escape(seek.dataset.hrrSeek)}"]`);if(audio){audio.currentTime=Math.max(0,Number(seek.dataset.hrrMs)||0)/1000;audio.play().catch(()=>{});}return;}const voice=e.target.closest('[data-hrr-comment-audio]');if(voice){const url=voice.dataset.objectUrl;if(!url)return say('تعذر تحميل الملاحظة الصوتية.','error');let audio=$('portalHrrVoicePreview');if(!audio){audio=g.document.createElement('audio');audio.id='portalHrrVoicePreview';audio.controls=true;$('portalHomeRecitationCard')?.append(audio);}audio.src=url;audio.play().catch(()=>{});}});}
    $('portalHomeRecitationStart')?.addEventListener('click',start);$('portalHomeRecitationStop')?.addEventListener('click',stop);$('portalHomeRecitationSend')?.addEventListener('click',send);$('portalHomeRecitationRefresh')?.addEventListener('click',loadList);const outbox=$('portalHomeRecitationOutbox');outbox?.addEventListener('click',e=>{const sendBtn=e.target.closest('[data-hrr-outbox-send]');if(sendBtn)void flushItem(sendBtn.dataset.hrrOutboxSend);const delBtn=e.target.closest('[data-hrr-outbox-delete]');if(delBtn){if(g.confirm?.('حذف هذا التسجيل المحفوظ من هذا الجهاز؟'))void outboxDelete(delBtn.dataset.hrrOutboxDelete).then(renderOutbox);}});g.addEventListener?.('online',()=>{updateControls();void flushOutbox();});g.addEventListener?.('offline',()=>{updateControls();void renderOutbox();});
  }
  function setContext(value){
    const next=value&&typeof value==='object'?value:null;const changed=context?.sessionToken!==next?.sessionToken||context?.studentRef!==next?.studentRef;
    if(changed){requestId++;clearCapture();}
    context=next;
    const card=$('portalHomeRecitationCard');if(card)card.hidden=!context?.studentRef;
    const nav=$('portalRecitationNav');if(nav)nav.hidden=!!card?.hidden;
    const assignmentBox=$('portalHomeRecitationAssignment');const a=assignment();if(assignmentBox)assignmentBox.textContent=a?`التكليف الحالي: سورة ${a.surah} · الآيات ${a.from}–${a.to}`:'لا يوجد تكليف حفظ جديد منشور حاليًا.';
    const note=$('portalHomeRecitationPrivacy');if(note)note.textContent='التسجيل خاص بالطالب وولي الأمر والمحفظ المرتبط به. لا يراه أولياء أمور آخرون، ولا يُحلل آليًا أو يُمنح درجة تلقائية. يُحفظ دون إنترنت ثم يُرفع عند عودة الاتصال.';
    updateControls();void renderOutbox();if(context?.sessionToken&&context?.studentRef){loadList();void flushOutbox();}else{const list=$('portalHomeRecitationList');if(list)list.textContent='يمكنك حفظ تسجيلك محليًا الآن، وسيُرفع بعد تسجيل الدخول عند توفر الإنترنت.';}
  }
  function clear(){setContext(null);}
  function init(){bind();}
  g.ImamGuardianHomeRecitation={setContext,clear,refresh:loadList,start,stop,send,flushOutbox,renderOutbox};
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
