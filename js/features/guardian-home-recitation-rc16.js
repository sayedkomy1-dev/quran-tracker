'use strict';
/* RC16 — guardian home-recitation upload and timestamped teacher feedback.
   Parent access is phone+PIN session only; no public snapshot/live-link uploads. */
(function guardianHomeRecitation(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const BUCKET='guardian-recitation-media';
  const $=id=>g.document?.getElementById?.(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let context=null,recorder=null,stream=null,chunks=[],startedAt=0,elapsedMs=0,timer=null,pendingBlob=null,pendingUrl='',pendingUpload=null,requestId=0,captureId=0;
  const urls=new Set();
  function say(text,kind='info'){const el=$('portalHomeRecitationStatus');if(el){el.textContent=text;el.dataset.kind=kind;}}
  function releaseUrls(){for(const url of urls)try{URL.revokeObjectURL(url);}catch(_){}urls.clear();pendingUrl='';}
  function clearCapture(){captureId++;pendingUpload=null;if(timer){clearInterval(timer);timer=null;}if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch(_){}}recorder=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}chunks=[];pendingBlob=null;pendingUpload=null;elapsedMs=0;releaseUrls();const preview=$('portalHomeRecitationPreview');if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview.hidden=true;}updateControls();}
  function updateControls(){const active=!!recorder&&recorder.state==='recording',ready=!!pendingBlob;const start=$('portalHomeRecitationStart'),stop=$('portalHomeRecitationStop'),send=$('portalHomeRecitationSend');if(start)start.disabled=active||!!pendingBlob||!context?.sessionToken||!context?.studentRef||!context?.assignment||g.navigator?.onLine===false;if(stop)stop.disabled=!active;if(send)send.disabled=!ready||g.navigator?.onLine===false;const clock=$('portalHomeRecitationClock');if(clock)clock.textContent=active||ready?formatTime(active?Date.now()-startedAt:elapsedMs):'00:00';}
  function formatTime(ms){const sec=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
  async function rpc(name,args){const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(args||{})});let data=null;try{data=await res.json();}catch(_){}if(!res.ok)throw new Error(data?.message||data?.error||`PORTAL_HTTP_${res.status}`);return Array.isArray(data)?data[0]:data;}
  function storageUrl(path){return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${String(path||'').split('/').map(encodeURIComponent).join('/')}`;}
  async function upload(path,blob,mime){try{const res=await fetch(storageUrl(path),{method:'POST',headers:{'apikey':PUBLISHABLE_KEY,'Authorization':`Bearer ${PUBLISHABLE_KEY}`,'Content-Type':mime,'x-upsert':'false'},body:blob});return !!res.ok;}catch(err){console.warn('[home recitation upload transport]',err);return false;}}
  async function fetchMedia(path){const res=await fetch(storageUrl(path),{headers:{'apikey':PUBLISHABLE_KEY,'Authorization':`Bearer ${PUBLISHABLE_KEY}`},cache:'no-store'});if(!res.ok)throw new Error('MEDIA_READ_FAILED');const url=URL.createObjectURL(await res.blob());urls.add(url);return url;}
  function assignment(){const a=context?.assignment;if(!a?.surah)return null;const from=Math.max(1,Number(a.from)||1),to=Math.max(from,Number(a.to)||from),number=Number(a.surahNumber)||Number(a.surahId)||0;return{surah:String(a.surah),number,from,to};}
  function mimeBase(value){return String(value||'').split(';')[0].trim().toLowerCase();}
  function chooseMime(){if(typeof MediaRecorder==='undefined')return '';const choices=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'];return choices.find(x=>MediaRecorder.isTypeSupported?.(x))||'';}
  async function start(){
    if(!context?.sessionToken||!context?.studentRef)return say('تسجيل المنزل متاح بعد الدخول برقم الهاتف ورمز PIN فقط.','warn');
    const a=assignment();if(!a||!a.number)return say('لا يوجد تكليف حفظ جديد منشور يمكن ربط التسجيل به. اطلب من المحفظ تحديث التكليف أولًا.','warn');
    if(g.navigator?.onLine===false)return say('رفع التسجيل يحتاج اتصالًا بالإنترنت.','warn');
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
    if(!pendingBlob||!context?.sessionToken||!context?.studentRef)return;
    if(g.navigator?.onLine===false)return say('لا يوجد اتصال. التسجيل ما زال على هذه الصفحة ولم يُرفع.','warn');
    const a=assignment();if(!a)return say('التكليف الحالي غير متاح.','error');
    const btn=$('portalHomeRecitationSend');if(btn)btn.disabled=true;say('جارٍ تجهيز الرفع الآمن…');
    try{
      const mime=mimeBase(pendingBlob.type)||'audio/webm';
      if(!pendingUpload){
        const begun=await rpc('guardian_home_recitation_begin_upload',{p_session:context.sessionToken,p_student_ref:context.studentRef,p_mime_type:mime,p_file_size_bytes:pendingBlob.size,p_duration_ms:Math.max(1000,Math.min(180000,elapsedMs)),p_surah:a.surah,p_surah_number:a.number,p_from_ayah:a.from,p_to_ayah:a.to});
        if(!begun?.ok||!begun.object_path||!begun.upload_token)throw new Error('UPLOAD_NOT_AUTHORIZED');
        pendingUpload={id:begun.id,object_path:begun.object_path,upload_token:begun.upload_token,uploaded:false,mime};
      }
      if(!pendingUpload.uploaded){pendingUpload.uploaded=await upload(pendingUpload.object_path,pendingBlob,pendingUpload.mime);}
      let completed=null;try{completed=await rpc('guardian_home_recitation_complete_upload',{p_session:context.sessionToken,p_student_ref:context.studentRef,p_upload_token:pendingUpload.upload_token});}catch(completeError){const listed=await rpc('guardian_home_recitation_session_list',{p_session:context.sessionToken,p_student_ref:context.studentRef}).catch(()=>null);if(Array.isArray(listed?.recordings)&&listed.recordings.some(x=>String(x.id)===String(pendingUpload.id)))completed={ok:true};else throw completeError;}
      if(!completed?.ok)throw new Error('UPLOAD_CONFIRMATION_FAILED');
      pendingBlob=null;pendingUpload=null;elapsedMs=0;releaseUrls();const preview=$('portalHomeRecitationPreview');if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview.hidden=true;}
      say('تم إرسال التسجيل للمحفظ بنجاح. ستظهر ملاحظاته هنا بعد المراجعة.','success');updateControls();await loadList();
    }catch(err){console.warn('[home recitation upload]',err);say(/ASSIGNMENT_NOT_CURRENT|INVALID_ASSIGNMENT_RANGE/.test(String(err?.message))?'التكليف المنشور تغيّر. حدّث صفحة ولي الأمر ثم أعد المحاولة.':/DAILY_UPLOAD_LIMIT/.test(String(err?.message))?'وصلت إلى الحد اليومي للتسجيلات.':'تعذر رفع التسجيل أو تأكيده. لم يُسجل كإرسال ناجح؛ يمكنك المحاولة مرة أخرى.','error');}
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
    $('portalHomeRecitationStart')?.addEventListener('click',start);$('portalHomeRecitationStop')?.addEventListener('click',stop);$('portalHomeRecitationSend')?.addEventListener('click',send);$('portalHomeRecitationRefresh')?.addEventListener('click',loadList);g.addEventListener?.('online',updateControls);
  }
  function setContext(value){
    const next=value&&typeof value==='object'?value:null;const changed=context?.sessionToken!==next?.sessionToken||context?.studentRef!==next?.studentRef;
    if(changed){requestId++;clearCapture();}
    context=next;
    const card=$('portalHomeRecitationCard');if(card)card.hidden=!(context?.sessionToken&&context?.studentRef);
    const assignmentBox=$('portalHomeRecitationAssignment');const a=assignment();if(assignmentBox)assignmentBox.textContent=a?`التكليف الحالي: سورة ${a.surah} · الآيات ${a.from}–${a.to}`:'لا يوجد تكليف حفظ جديد منشور حاليًا.';
    const note=$('portalHomeRecitationPrivacy');if(note)note.textContent='التسجيل خاص بولي الأمر والمحفظ المرتبط بالطالب. لا يراه أولياء أمور آخرون، ولا يُحلل آليًا أو يُمنح درجة تلقائية.';
    updateControls();if(context?.sessionToken&&context?.studentRef)loadList();else{const list=$('portalHomeRecitationList');if(list)list.textContent='';}
  }
  function clear(){setContext(null);}
  function init(){bind();}
  g.ImamGuardianHomeRecitation={setContext,clear,refresh:loadList,start,stop,send};
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
