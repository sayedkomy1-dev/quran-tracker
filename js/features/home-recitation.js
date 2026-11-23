'use strict';
(function homeRecitationModule(g){
  const Core=g.ImamHomeRecitationCore;
  if(!Core)return;
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const ANON_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const EDGE_URL=SUPABASE_URL+'/functions/v1/guardian-recitation';
  const DB_NAME='imam-home-recitation-queue-v1';
  const STORE_NAME='pending';
  const $=id=>g.document?.getElementById(id)||null;
  let portalContext=null,dbPromise=null,portalRecorder=null,portalStream=null,portalChunks=[],portalStartedAt=0,portalTimer=null;
  let portalUploading=false,portalDraftUrl='',teacherModal=null,teacherState=null,teacherRecorder=null,teacherStream=null,teacherChunks=[],teacherTimer=null,teacherFeedbackBlob=null,teacherFeedbackFile=null;

  function setText(id,value){const el=$(id);if(el)el.textContent=String(value??'');}
  function portalStatus(message,kind='info'){const el=$('hrcPortalStatus');if(el){el.textContent=message||'';el.dataset.kind=kind;}}
  function teacherStatus(message,kind='info'){const el=$('hrcTeacherStatus');if(el){el.textContent=message||'';el.dataset.kind=kind;}}
  function surahs(){return Array.isArray(g.ImamOfflineAudio?.SURAHS)?g.ImamOfflineAudio.SURAHS:[];}
  function fillSurahSelect(selected=1){
    const select=$('hrcSurah');if(!select)return;
    const rows=surahs();select.replaceChildren();
    rows.forEach((row,index)=>{const option=g.document.createElement('option');option.value=String(index+1);option.textContent=(index+1)+'. '+String(row[0]);select.append(option);});
    select.value=String(Math.max(1,Math.min(rows.length||1,Number(selected)||1)));
    updateAyahInputs();
  }
  function updateAyahInputs(){
    const select=$('hrcSurah'),from=$('hrcAyahFrom'),to=$('hrcAyahTo');if(!select||!from||!to)return;
    const row=surahs()[Number(select.value)-1],max=Number(row?.[1])||1;
    from.min='1';from.max=String(max);to.min='1';to.max=String(max);
    if(!Number(from.value)||Number(from.value)>max)from.value='1';
    if(!Number(to.value)||Number(to.value)>max)to.value=String(max);
  }
  function currentRange(){
    const surahNo=Number($('hrcSurah')?.value||1),from=Number($('hrcAyahFrom')?.value||1),to=Number($('hrcAyahTo')?.value||from);
    if(!Core.validSurahRange(surahNo,from,to,surahs()))throw new Error('راجع السورة ونطاق الآيات.');
    return{surahNo,from,to,surahName:String(surahs()[surahNo-1]?.[0]||'')};
  }
  function selectedStudentName(){return String(portalContext?.studentName||'الطالب');}
  function samePortalContext(ctx){return !!portalContext&&portalContext.sessionToken===ctx.sessionToken&&portalContext.studentRef===ctx.studentRef;}
  function idb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!g.indexedDB){reject(new Error('التخزين المحلي غير متاح على هذا المتصفح.'));return;}
      const request=g.indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME)){
          const store=db.createObjectStore(STORE_NAME,{keyPath:'id'});
          store.createIndex('studentRef','studentRef',{unique:false});
          store.createIndex('createdAt','createdAt',{unique:false});
        }
      };
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db);};
      request.onerror=()=>reject(request.error||new Error('تعذر فتح مساحة التسجيلات المعلقة.'));
      request.onblocked=()=>reject(new Error('أغلق نسخة أخرى من البوابة ثم أعد المحاولة.'));
    }).catch(error=>{dbPromise=null;throw error;});
    return dbPromise;
  }
  async function allPending(){
    const db=await idb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly'),request=tx.objectStore(STORE_NAME).getAll();
      request.onsuccess=()=>resolve(Array.isArray(request.result)?request.result:[]);
      request.onerror=()=>reject(request.error||new Error('تعذر قراءة التسجيلات المعلقة.'));
    });
  }
  async function savePending(item){
    const db=await idb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||new Error('تعذر حفظ التسجيل محليًا.'));
      tx.onabort=()=>reject(tx.error||new Error('تم إلغاء حفظ التسجيل.'));
    });
  }
  async function deletePending(id){
    const db=await idb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||new Error('تعذر تحديث قائمة التسجيلات.'));
    });
  }
  async function pendingFor(studentRef){
    return (await allPending()).filter(row=>row.studentRef===studentRef).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  async function queueBlob(blob,durationMs,fileName){
    if(!portalContext)throw new Error('سجّل الدخول أولًا لربط التسجيل بملف الطالب.');
    if(!blob||!Core.fileAllowed(blob))throw new Error('الملف الصوتي غير مدعوم أو حجمه أكبر من 20 ميجابايت.');
    if(!Core.validDuration(Math.round(durationMs||0)))throw new Error('مدة التسجيل تجاوزت 20 دقيقة.');
    const range=currentRange(),note=Core.cleanText($('hrcStudentNote')?.value||'',500);
    const rows=await pendingFor(portalContext.studentRef);
    const totalBytes=rows.reduce((sum,row)=>sum+(Number(row.fileSize)||0),0);
    if(!Core.canQueue(rows.length,totalBytes,blob.size))throw new Error('مساحة التسجيلات المعلقة ممتلئة. أرسل التسجيلات الموجودة أولًا أو احذف تسجيلًا غير مرسل.');
    try{
      const estimate=await g.navigator?.storage?.estimate?.();
      if(estimate?.quota&&estimate?.usage!==undefined&&estimate.quota-estimate.usage<blob.size+5*1024*1024){
        throw new Error('المساحة المتاحة على الهاتف غير كافية لحفظ التسجيل مؤقتًا. أرسل التسجيلات السابقة أو وفر مساحة.');
      }
    }catch(error){if(String(error?.message||'').includes('غير كافية'))throw error;}
    const item={
      id:g.crypto?.randomUUID?.()||('hrc-'+Date.now()+'-'+Math.random().toString(36).slice(2,9)),
      studentRef:portalContext.studentRef,studentName:selectedStudentName(),
      surahNo:range.surahNo,surahName:range.surahName,ayahFrom:range.from,ayahTo:range.to,
      studentNote:note,durationMs:Math.round(durationMs||0),mimeType:Core.normalizeMime(blob.type),
      fileSize:blob.size,fileName:String(fileName||'recitation'),blob,createdAt:new Date().toISOString()
    };
    await savePending(item);
    renderPending();
    if(portalDraftUrl){try{g.URL.revokeObjectURL(portalDraftUrl);}catch(_){}portalDraftUrl='';}
    const preview=$('hrcPortalPreview');
    if(preview){preview.replaceChildren();const audio=g.document.createElement('audio');audio.controls=true;audio.preload='metadata';portalDraftUrl=g.URL.createObjectURL(blob);audio.src=portalDraftUrl;preview.append(audio);}
    portalStatus('تم حفظ التسجيل مؤقتًا على هذا الجهاز. جارٍ إرساله للمحفظ…','success');
    if(g.navigator?.onLine!==false)await syncPending();
    else portalStatus('تم حفظ التسجيل دون إنترنت. سيُرسل تلقائيًا عند عودة الاتصال.','warning');
  }
  function getRecorderMime(){
    const candidates=['audio/webm;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/ogg;codecs=opus','audio/webm','audio/mp4'];
    if(typeof g.MediaRecorder?.isTypeSupported!=='function')return'';
    return candidates.find(type=>g.MediaRecorder.isTypeSupported(type))||'';
  }
  async function startPortalRecording(){
    if(!portalContext)return portalStatus('افتح البوابة بتسجيل الدخول أولًا.','warning');
    if(typeof g.MediaRecorder!=='function'||!g.navigator?.mediaDevices?.getUserMedia){
      return portalStatus('التسجيل المباشر غير مدعوم هنا. استخدم اختيار ملف صوتي موجود.','warning');
    }
    try{
      try{portalStream=await g.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}
      catch(_){portalStream=await g.navigator.mediaDevices.getUserMedia({audio:true});}
      const mime=getRecorderMime(),options=mime?{mimeType:mime}:undefined;
      portalRecorder=new g.MediaRecorder(portalStream,options);portalChunks=[];portalStartedAt=Date.now();
      portalRecorder.ondataavailable=event=>{if(event.data?.size)portalChunks.push(event.data);};
      portalRecorder.onerror=()=>{portalStatus('حدث خطأ أثناء التسجيل. لم يُنشأ تسجيل بديل.','error');stopPortalTracks();};
      portalRecorder.onstop=async()=>{
        const duration=Math.max(0,Date.now()-portalStartedAt),type=portalRecorder?.mimeType||portalChunks[0]?.type||'';
        const blob=new Blob(portalChunks,{type});portalChunks=[];portalRecorder=null;stopPortalTracks();
        const start=$('hrcRecordStart'),stop=$('hrcRecordStop');if(start)start.disabled=false;if(stop)stop.hidden=true;
        if(!blob.size){portalStatus('لم يصل صوت من الميكروفون. لم يتم حفظ تسجيل وهمي.','error');return;}
        try{await queueBlob(blob,duration,'microphone-recording');}
        catch(error){portalStatus(error.message||'تعذر حفظ التسجيل.','error');}
      };
      portalRecorder.start(1000);
      const start=$('hrcRecordStart'),stop=$('hrcRecordStop');if(start)start.disabled=true;if(stop)stop.hidden=false;
      portalStatus('جارٍ التسجيل… اقرأ بوضوح ثم اضغط إيقاف وحفظ.','info');
      portalTimer=g.setTimeout(()=>stopPortalRecording(),Core.MAX_DURATION_MS);
    }catch(error){
      stopPortalTracks();
      portalStatus(error?.name==='NotAllowedError'?'لم تسمح باستخدام الميكروفون. يمكنك اختيار ملف صوتي بدلًا من ذلك.':'تعذر تشغيل الميكروفون على هذا الجهاز.','error');
    }
  }
  function stopPortalTracks(){
    if(portalTimer){g.clearTimeout(portalTimer);portalTimer=null;}
    if(portalStream){try{portalStream.getTracks().forEach(track=>track.stop());}catch(_){}portalStream=null;}
  }
  function stopPortalRecording(){
    if(portalRecorder&&portalRecorder.state!=='inactive'){try{portalRecorder.stop();}catch(_){stopPortalTracks();}}
  }
  function audioDuration(file){
    return new Promise(resolve=>{
      let url='';
      try{
        url=g.URL.createObjectURL(file);
        const audio=new Audio();audio.preload='metadata';
        audio.onloadedmetadata=()=>{const value=Number.isFinite(audio.duration)?Math.round(audio.duration*1000):0;g.URL.revokeObjectURL(url);resolve(value);};
        audio.onerror=()=>{g.URL.revokeObjectURL(url);resolve(0);};
        audio.src=url;
      }catch(_){if(url)try{g.URL.revokeObjectURL(url);}catch(__){}resolve(0);}
    });
  }
  async function acceptPortalFile(file){
    if(!file)return;
    if(!Core.fileAllowed(file)){portalStatus('اختر ملفًا صوتيًا مدعومًا لا يتجاوز 20 ميجابايت.','error');return;}
    const duration=await audioDuration(file);
    if(duration>Core.MAX_DURATION_MS){portalStatus('مدة الملف تتجاوز 20 دقيقة.','error');return;}
    try{await queueBlob(file,duration,file.name);}
    catch(error){portalStatus(error.message||'تعذر حفظ الملف الصوتي.','error');}
    const input=$('hrcAudioFile');if(input)input.value='';
  }
  function apiHeaders(token=ANON_KEY){
    return{apikey:ANON_KEY,Authorization:'Bearer '+token};
  }
  async function parseResponse(response){
    let data={};try{data=await response.json();}catch(_){}
    if(!response.ok||data.ok===false)throw new Error(data.message||data.error||'تعذر الاتصال بخدمة التسجيلات.');
    return data;
  }
  async function callStudentApi(route,payload){
    const response=await g.fetch(EDGE_URL+'/'+route,{method:'POST',headers:{...apiHeaders(), 'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return parseResponse(response);
  }
  async function uploadPendingItem(item,ctx){
    const form=new FormData();
    form.append('session_token',ctx.sessionToken);form.append('student_ref',ctx.studentRef);
    form.append('submission_id',item.id);form.append('surah_no',String(item.surahNo));
    form.append('ayah_from',String(item.ayahFrom));form.append('ayah_to',String(item.ayahTo));
    form.append('student_note',item.studentNote||'');form.append('duration_ms',String(item.durationMs||0));
    form.append('file',item.blob,'recitation.'+Core.extensionForMime(item.mimeType));
    const response=await g.fetch(EDGE_URL+'/student/upload',{method:'POST',headers:apiHeaders(),body:form});
    return parseResponse(response);
  }
  async function syncPending(){
    if(portalUploading||!portalContext||g.navigator?.onLine===false)return;
    portalUploading=true;
    try{
      const ctx={...portalContext},rows=await pendingFor(ctx.studentRef);
      for(const item of rows){
        if(!samePortalContext(ctx))break;
        portalStatus('جارٍ إرسال تسجيل '+item.surahName+'…','info');
        try{
          await uploadPendingItem(item,ctx);
          await deletePending(item.id);
          portalStatus('وصل التسجيل إلى المحفظ بنجاح.','success');
          if(portalDraftUrl){try{g.URL.revokeObjectURL(portalDraftUrl);}catch(_){}portalDraftUrl='';}
        }catch(error){
          portalStatus(error.message||'تعذر رفع التسجيل. احتفظنا به على الجهاز لإعادة المحاولة.','warning');
          break;
        }
      }
      renderPending();
      if(samePortalContext(ctx))await refreshStudentSubmissions(ctx);
    }catch(error){portalStatus(error.message||'تعذر قراءة التسجيلات المعلقة. لم نحذف أي ملف.','warning');}
    finally{portalUploading=false;}
  }
  function makeStatusLabel(status){
    return status==='feedback_ready'?'تم إرسال التصحيح':status==='reviewing'?'قيد المراجعة':status==='submitted'?'وصل إلى المحفظ':status==='uploading'?'جارٍ الرفع':'تم الإرسال';
  }
  async function renderPending(){
    const host=$('hrcPendingList');if(!host)return;
    host.replaceChildren();
    if(!portalContext)return;
    let rows=[];try{rows=await pendingFor(portalContext.studentRef);}catch(error){portalStatus(error.message,'error');return;}
    if(!rows.length){const empty=g.document.createElement('p');empty.className='hrc-empty';empty.textContent='لا توجد تسجيلات معلقة على هذا الجهاز.';host.append(empty);return;}
    const title=g.document.createElement('b');title.textContent='تسجيلات تنتظر الإرسال';host.append(title);
    rows.forEach(item=>{
      const card=g.document.createElement('article');card.className='hrc-pending-item';
      const info=g.document.createElement('div');
      const heading=g.document.createElement('b');heading.textContent='سورة '+item.surahName+' — الآيات '+item.ayahFrom+'–'+item.ayahTo;
      const meta=g.document.createElement('small');meta.textContent=Core.formatBytes(item.fileSize)+' · '+Core.formatTime(item.durationMs)+' · '+new Date(item.createdAt).toLocaleString('ar-EG');
      info.append(heading,meta);
      const remove=g.document.createElement('button');remove.type='button';remove.className='hrc-secondary';remove.textContent='حذف النسخة غير المرسلة';
      remove.addEventListener('click',async()=>{if(!g.confirm('حذف التسجيل غير المرسل من هذا الجهاز؟'))return;await deletePending(item.id);renderPending();});
      card.append(info,remove);host.append(card);
    });
  }
  async function refreshStudentSubmissions(ctx=portalContext){
    if(!ctx||g.navigator?.onLine===false)return;
    try{
      const data=await callStudentApi('student/list',{session_token:ctx.sessionToken,student_ref:ctx.studentRef});
      if(!samePortalContext(ctx))return;
      renderStudentSubmissions(data.submissions||[]);
    }catch(error){
      if(samePortalContext(ctx))setText('hrcSubmittedStatus','تعذر تحميل سجل التصحيحات الآن. '+(error.message||''));
    }
  }
  function renderStudentSubmissions(rows){
    const host=$('hrcSubmittedList'),status=$('hrcSubmittedStatus');if(!host)return;
    host.replaceChildren();if(status)status.textContent='';
    if(!rows.length){const empty=g.document.createElement('p');empty.className='hrc-empty';empty.textContent='لا توجد تسجيلات سابقة لهذا الطالب.';host.append(empty);return;}
    const title=g.document.createElement('b');title.textContent='التسجيلات المرسلة للمحفظ';host.append(title);
    rows.forEach(row=>{
      const card=g.document.createElement('article');card.className='hrc-submission-item';
      const heading=g.document.createElement('b');heading.textContent='سورة '+(surahs()[Number(row.surah_no)-1]?.[0]||row.surah_no)+' — الآيات '+row.ayah_from+'–'+row.ayah_to;
      const meta=g.document.createElement('small');meta.textContent=makeStatusLabel(row.status)+' · '+new Date(row.created_at).toLocaleString('ar-EG');
      card.append(heading,meta);
      let recording=null;
      if(row.audio_url){recording=g.document.createElement('audio');recording.controls=true;recording.preload='none';recording.src=row.audio_url;card.append(recording);}
      if(row.feedback){
        const feedback=g.document.createElement('div');feedback.className='hrc-student-feedback';
        const feedbackTitle=g.document.createElement('b');feedbackTitle.textContent='ملاحظات المحفظ المعتمدة';feedback.append(feedbackTitle);
        if(row.feedback.student_feedback){const text=g.document.createElement('p');text.textContent=row.feedback.student_feedback;feedback.append(text);}
        if(row.feedback.audio_url){const audio=g.document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=row.feedback.audio_url;feedback.append(audio);}
        (Array.isArray(row.feedback.annotations)?row.feedback.annotations:[]).forEach(mark=>{
          const button=g.document.createElement('button');button.type='button';button.className='hrc-mark-link';
          button.textContent='▶ '+Core.formatTime(mark.time_ms)+' — '+(mark.ayah_no?'الآية '+mark.ayah_no+' · ':'')+String(mark.note||'');
          button.addEventListener('click',()=>{if(!recording)return;recording.currentTime=Math.max(0,Number(mark.time_ms)||0)/1000;recording.play().catch(()=>{});});
          feedback.append(button);
        });
        card.append(feedback);
      }
      host.append(card);
    });
  }
  function setStudentContext(value){
    const card=$('homeRecitationCard');
    if(!value||!value.sessionToken||!/^[0-9a-f]{64}$/.test(String(value.studentRef||''))){
      portalContext=null;if(card)card.hidden=true;stopPortalRecording();return;
    }
    portalContext={
      sessionToken:String(value.sessionToken),studentRef:String(value.studentRef),
      studentName:String(value.studentName||'الطالب'),assignment:value.assignment||null
    };
    if(card)card.hidden=false;
    const assignment=portalContext.assignment||{};
    const surahIndex=surahs().findIndex(row=>row[0]===String(assignment.surah||''));
    fillSurahSelect(surahIndex>=0?surahIndex+1:1);
    if(assignment.surah){
      const from=Math.max(1,Number(assignment.from)||1),to=Math.max(from,Number(assignment.to)||from);
      if($('hrcAyahFrom'))$('hrcAyahFrom').value=String(from);
      if($('hrcAyahTo'))$('hrcAyahTo').value=String(to);
      updateAyahInputs();
    }
    setText('hrcPortalStudentName',portalContext.studentName);
    renderPending();refreshStudentSubmissions(portalContext);
    if(g.navigator?.onLine!==false)syncPending();
  }
  function initPortal(){
    if(!$('homeRecitationCard'))return;
    fillSurahSelect(1);
    $('hrcSurah')?.addEventListener('change',updateAyahInputs);
    $('hrcRecordStart')?.addEventListener('click',startPortalRecording);
    $('hrcRecordStop')?.addEventListener('click',stopPortalRecording);
    $('hrcSend')?.addEventListener('click',syncPending);
    $('hrcAudioFile')?.addEventListener('change',event=>acceptPortalFile(event.target.files?.[0]));
    const recordSupported=typeof g.MediaRecorder==='function'&&!!g.navigator?.mediaDevices?.getUserMedia;
    if(!recordSupported&&$('hrcRecordStart'))$('hrcRecordStart').hidden=true;
    renderPending();
  }

  function teacherPanel(){
    return '<section class="hrc-teacher-entry"><div><b>🎙️ التسميع المنزلي</b><small>استقبل تسجيلات الطالب، واستمع إليها، واربط التصحيح بموضعه الفعلي.</small></div><button type="button" data-hrc-teacher-open>فتح التسجيلات</button></section>';
  }
  async function sha256Hex(value){
    if(!g.crypto?.subtle)throw new Error('متصفحك لا يدعم التحقق الآمن من هوية الطالب.');
    const digest=await g.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function callTeacherApi(route,payload,token){
    const response=await g.fetch(EDGE_URL+'/'+route,{method:'POST',headers:{...apiHeaders(token),'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return parseResponse(response);
  }
  async function callTeacherForm(route,form,token){
    const response=await g.fetch(EDGE_URL+'/'+route,{method:'POST',headers:apiHeaders(token),body:form});
    return parseResponse(response);
  }
  function ensureTeacherModal(){
    if(teacherModal&&teacherModal.isConnected)return teacherModal;
    teacherModal=g.document.createElement('div');teacherModal.id='hrcTeacherModal';teacherModal.className='hrc-modal';teacherModal.hidden=true;
    teacherModal.innerHTML='<div class="hrc-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="hrcTeacherTitle"><header><div><b id="hrcTeacherTitle">🎙️ مراجعة التسميع المنزلي</b><small id="hrcTeacherStudentName"></small></div><button type="button" data-hrc-close aria-label="إغلاق">×</button></header><p id="hrcTeacherStatus" role="status"></p><div class="hrc-teacher-layout"><div id="hrcTeacherList" class="hrc-teacher-list"></div><div id="hrcTeacherDetail" class="hrc-teacher-detail"><p class="hrc-empty">اختر تسجيلًا من القائمة لبدء المراجعة.</p></div></div></div>';
    g.document.body.append(teacherModal);
    teacherModal.querySelector('[data-hrc-close]')?.addEventListener('click',closeTeacherModal);
    teacherModal.addEventListener('click',event=>{if(event.target===teacherModal)closeTeacherModal();});
    return teacherModal;
  }
  function closeTeacherModal(){
    if(teacherRecorder&&teacherRecorder.state!=='inactive'){try{teacherRecorder.stop();}catch(_){}}
    stopTeacherTracks();
    if(teacherModal)teacherModal.hidden=true;
  }
  function stopTeacherTracks(){
    if(teacherTimer){g.clearTimeout(teacherTimer);teacherTimer=null;}
    if(teacherStream){try{teacherStream.getTracks().forEach(track=>track.stop());}catch(_){}teacherStream=null;}
  }
  function teacherAuthToken(){
    return Promise.resolve(g.WeLiveQuranAuth?.getAccessToken?.()||'');
  }
  async function openTeacherInbox(studentId){
    const modal=ensureTeacherModal();modal.hidden=false;
    const status=$('hrcTeacherStatus'),list=$('hrcTeacherList'),detail=$('hrcTeacherDetail');
    if(list)list.replaceChildren();if(detail)detail.innerHTML='<p class="hrc-empty">جارٍ تحميل التسجيلات…</p>';
    teacherStatus('جارٍ التحقق من صلاحية المحفظ…','info');
    try{
      const auth=g.WeLiveQuranAuth?.getAccess?.(),token=await teacherAuthToken();
      if(!auth?.user_id||!token)throw new Error('سجّل دخول المحفظ بالإنترنت ثم أعد المحاولة.');
      const studentRef=await sha256Hex('guardian-portal-v1|'+auth.user_id+'|'+String(studentId));
      teacherState={studentId:String(studentId),studentRef,token,rows:[],selectedId:'',annotations:[],record:null};
      setText('hrcTeacherStudentName',(g.ImamApp?.State?.students||[]).find(x=>String(x.id)===String(studentId))?.name||'ملف الطالب');
      await loadTeacherRows();
    }catch(error){teacherStatus(error.message||'تعذر فتح التسجيلات.','error');}
  }
  async function loadTeacherRows(){
    if(!teacherState)return;
    teacherStatus('جارٍ تحميل تسجيلات الطالب…','info');
    try{
      const data=await callTeacherApi('teacher/list',{student_ref:teacherState.studentRef},teacherState.token);
      teacherState.rows=Array.isArray(data.submissions)?data.submissions:[];
      renderTeacherRows();
      teacherStatus(teacherState.rows.length?'تم تحميل التسجيلات.':'لا توجد تسجيلات منزلية لهذا الطالب حتى الآن.','success');
      if(teacherState.selectedId){
        const current=teacherState.rows.find(row=>row.id===teacherState.selectedId);
        if(current)renderTeacherDetail(current);
      }
    }catch(error){teacherStatus(error.message||'تعذر تحميل التسجيلات.','error');}
  }
  function renderTeacherRows(){
    const host=$('hrcTeacherList');if(!host)return;host.replaceChildren();
    if(!teacherState?.rows?.length){const empty=g.document.createElement('p');empty.className='hrc-empty';empty.textContent='لا توجد تسجيلات حتى الآن.';host.append(empty);return;}
    teacherState.rows.forEach(row=>{
      const button=g.document.createElement('button');button.type='button';button.className='hrc-teacher-row'+(row.id===teacherState.selectedId?' active':'');
      const name=g.document.createElement('b');name.textContent='سورة '+(surahs()[Number(row.surah_no)-1]?.[0]||row.surah_no);
      const range=g.document.createElement('span');range.textContent='الآيات '+row.ayah_from+'–'+row.ayah_to;
      const meta=g.document.createElement('small');meta.textContent=new Date(row.created_at).toLocaleString('ar-EG')+' · '+makeStatusLabel(row.status);
      button.append(name,range,meta);button.addEventListener('click',()=>{teacherState.selectedId=row.id;renderTeacherRows();renderTeacherDetail(row);});
      host.append(button);
    });
  }
  function element(tag,cls,text){
    const el=g.document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;
  }
  function renderTeacherDetail(row){
    if(!teacherState)return;
    teacherState.record=row;teacherState.selectedId=row.id;
    teacherState.annotations=Array.isArray(row.feedback?.annotations)?row.feedback.annotations.map(x=>({...x})):[];
    teacherFeedbackBlob=null;teacherFeedbackFile=null;
    const host=$('hrcTeacherDetail');if(!host)return;host.replaceChildren();
    const heading=element('h3','', 'سورة '+(surahs()[Number(row.surah_no)-1]?.[0]||row.surah_no)+' — الآيات '+row.ayah_from+'–'+row.ayah_to);host.append(heading);
    if(row.student_note)host.append(element('p','hrc-student-note','ملاحظة الطالب: '+row.student_note));
    const audio=element('audio','hrc-review-audio');audio.controls=true;audio.preload='metadata';audio.src=row.audio_url||'';audio.id='hrcTeacherAudio';host.append(audio);
    const markerBox=element('section','hrc-marker-box');
    markerBox.append(element('b','','إضافة علامة عند موضع التصحيح'));
    const markerNote=element('textarea','');markerNote.id='hrcMarkerNote';markerNote.rows=2;markerNote.maxLength=300;markerNote.placeholder='اكتب ما يحتاج الطالب إلى مراجعته…';markerBox.append(markerNote);
    const markerAyah=element('input','');markerAyah.id='hrcMarkerAyah';markerAyah.type='number';markerAyah.min=String(row.ayah_from);markerAyah.max=String(row.ayah_to);markerAyah.placeholder='رقم الآية (اختياري)';markerBox.append(markerAyah);
    const add=element('button','hrc-secondary','＋ إضافة علامة عند الموضع الحالي');add.type='button';add.addEventListener('click',()=>{
      const note=Core.cleanText(markerNote.value,300),time=Number(audio.currentTime);
      if(!Number.isFinite(time)||!Number.isFinite(Number(audio.duration))||Number(audio.duration)<=0){teacherStatus('شغّل التسجيل حتى تظهر مدته، ثم أضف العلامة عند موضع التصحيح.','warning');return;}
      const ayah=markerAyah.value===''?null:Number(markerAyah.value);
      const checked=Core.validAnnotation({id:g.crypto?.randomUUID?.()||'',time_ms:Math.round(time*1000),ayah_no:ayah,note},{from:row.ayah_from,to:row.ayah_to},Math.round(audio.duration*1000));
      if(!checked.ok){teacherStatus(checked.reason==='time'?'توقيت العلامة خارج مدة التسجيل.':checked.reason==='ayah'?'رقم الآية خارج نطاق التكليف.':'اكتب ملاحظة للعلامة.','warning');return;}
      teacherState.annotations.push(checked.value);markerNote.value='';renderTeacherAnnotations();teacherStatus('أضيفت العلامة عند '+Core.formatTime(checked.value.time_ms)+'.','success');
    });
    markerBox.append(add);host.append(markerBox);
    const marks=element('div','hrc-annotation-list');marks.id='hrcTeacherAnnotations';host.append(marks);renderTeacherAnnotations();
    const feedback=element('label','hrc-field','التصحيح الذي سيظهر للطالب وولي الأمر');
    const feedbackText=element('textarea','');feedbackText.id='hrcStudentFeedback';feedbackText.rows=3;feedbackText.maxLength=2000;feedbackText.placeholder='اكتب التصحيح أو التوجيه التعليمي…';feedbackText.value=row.feedback?.student_feedback||'';feedback.append(feedbackText);host.append(feedback);
    const privateField=element('label','hrc-field','ملاحظة داخلية للمحفظ فقط');
    const privateText=element('textarea','');privateText.id='hrcTeacherPrivateNote';privateText.rows=2;privateText.maxLength=2000;privateText.placeholder='لن تظهر هذه الملاحظة للطالب أو ولي الأمر.';privateText.value=row.feedback?.teacher_private_note||'';privateField.append(privateText);host.append(privateField);
    const voice=element('section','hrc-voice-feedback');voice.append(element('b','','تعليق صوتي من المحفظ (اختياري)'));
    const voiceActions=element('div','hrc-actions');
    const recordButton=element('button','hrc-primary','🎙️ تسجيل تعليق صوتي');recordButton.type='button';recordButton.id='hrcTeacherRecordFeedback';voiceActions.append(recordButton);
    const fileInput=element('input','');fileInput.type='file';fileInput.accept='audio/*';fileInput.id='hrcTeacherFeedbackFile';voiceActions.append(fileInput);
    recordButton.addEventListener('click',toggleTeacherFeedbackRecording);
    fileInput.addEventListener('change',()=>{teacherFeedbackFile=fileInput.files?.[0]||null;setText('hrcTeacherVoiceStatus',teacherFeedbackFile?'تم اختيار ملف صوتي: '+teacherFeedbackFile.name:'');});
    voice.append(voiceActions,element('small','','يمكنك تسجيل ملاحظة صوتية أو اختيار ملف حقيقي من الجهاز.'),element('p','',''));const voiceStatus=element('small','');voiceStatus.id='hrcTeacherVoiceStatus';voice.append(voiceStatus);host.append(voice);
    const visibility=element('label','hrc-publish-check');
    const checkbox=element('input','');checkbox.type='checkbox';checkbox.id='hrcStudentVisible';checkbox.checked=!!row.feedback?.student_visible;
    visibility.append(checkbox,element('span','','اعتماد التصحيح وإظهاره للطالب وولي الأمر'));host.append(visibility);
    const actions=element('div','hrc-actions');
    const save=element('button','hrc-primary','حفظ المراجعة');save.type='button';save.addEventListener('click',saveTeacherFeedback);actions.append(save);
    const archive=element('button','hrc-secondary','أرشفة التسجيل');archive.type='button';archive.addEventListener('click',()=>archiveTeacherSubmission(row.id));actions.append(archive);
    host.append(actions);
    if(row.feedback?.audio_url){const old=element('section','hrc-existing-voice');old.append(element('b','','آخر تعليق صوتي محفوظ'));const oldAudio=element('audio','');oldAudio.controls=true;oldAudio.src=row.feedback.audio_url;old.append(oldAudio);host.append(old);}
  }
  function renderTeacherAnnotations(){
    const host=$('hrcTeacherAnnotations');if(!host)return;host.replaceChildren();
    if(!teacherState?.annotations?.length){host.append(element('p','hrc-empty','لم تُضف علامات تصحيح بعد.'));return;}
    teacherState.annotations.forEach((mark,index)=>{
      const row=element('div','hrc-annotation-row');
      const label=element('span','',Core.formatTime(mark.time_ms)+' · '+(mark.ayah_no?'الآية '+mark.ayah_no+' · ':'')+mark.note);
      const remove=element('button','hrc-secondary','إزالة');remove.type='button';remove.addEventListener('click',()=>{teacherState.annotations.splice(index,1);renderTeacherAnnotations();});
      row.append(label,remove);host.append(row);
    });
  }
  async function toggleTeacherFeedbackRecording(){
    const button=$('hrcTeacherRecordFeedback');
    if(teacherRecorder&&teacherRecorder.state!=='inactive'){try{teacherRecorder.stop();}catch(_){}return;}
    if(typeof g.MediaRecorder!=='function'||!g.navigator?.mediaDevices?.getUserMedia){
      teacherStatus('التسجيل الصوتي غير مدعوم هنا. استخدم اختيار ملف صوتي.','warning');return;
    }
    try{
      try{teacherStream=await g.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}
      catch(_){teacherStream=await g.navigator.mediaDevices.getUserMedia({audio:true});}
      const mime=getRecorderMime();teacherRecorder=new g.MediaRecorder(teacherStream,mime?{mimeType:mime}:undefined);teacherChunks=[];
      teacherRecorder.ondataavailable=event=>{if(event.data?.size)teacherChunks.push(event.data);};
      teacherRecorder.onerror=()=>{teacherStatus('تعذر تسجيل التعليق الصوتي.','error');stopTeacherTracks();};
      teacherRecorder.onstop=()=>{
        const type=teacherRecorder?.mimeType||teacherChunks[0]?.type||'';
        teacherFeedbackBlob=new Blob(teacherChunks,{type});teacherChunks=[];teacherRecorder=null;stopTeacherTracks();
        if(button){button.textContent='🎙️ تسجيل تعليق صوتي';button.disabled=false;}
        if(teacherFeedbackBlob.size<128||!Core.fileAllowed(teacherFeedbackBlob)){teacherFeedbackBlob=null;setText('hrcTeacherVoiceStatus','لم يتم إنشاء تعليق صوتي صالح.');}
        else{teacherFeedbackFile=null;setText('hrcTeacherVoiceStatus','تم تسجيل تعليق صوتي حقيقي ('+Core.formatBytes(teacherFeedbackBlob.size)+').');}
      };
      teacherRecorder.start(1000);
      if(button){button.textContent='إيقاف التسجيل';button.disabled=false;}
      teacherTimer=g.setTimeout(()=>{if(teacherRecorder&&teacherRecorder.state!=='inactive')teacherRecorder.stop();},Core.MAX_DURATION_MS);
      setText('hrcTeacherVoiceStatus','جارٍ تسجيل تعليق المحفظ…');
    }catch(error){stopTeacherTracks();teacherStatus('لم تسمح باستخدام الميكروفون أو تعذر تشغيله.','error');}
  }
  async function saveTeacherFeedback(){
    if(!teacherState?.record)return;
    const saveButton=$('hrcTeacherDetail')?.querySelector('.hrc-primary');
    if(saveButton)saveButton.disabled=true;
    try{
      const form=new FormData();
      form.append('submission_id',teacherState.record.id);
      form.append('student_feedback',$('hrcStudentFeedback')?.value||'');
      form.append('teacher_private_note',$('hrcTeacherPrivateNote')?.value||'');
      form.append('student_visible',$('hrcStudentVisible')?.checked?'true':'false');
      form.append('annotations',JSON.stringify(teacherState.annotations||[]));
      const audioFile=teacherFeedbackFile;
      if(teacherFeedbackBlob)form.append('audio_file',teacherFeedbackBlob,'teacher-feedback.'+Core.extensionForMime(teacherFeedbackBlob.type));
      else if(audioFile&&Core.fileAllowed(audioFile))form.append('audio_file',audioFile,audioFile.name||'teacher-feedback');
      const result=await callTeacherForm('teacher/feedback',form,teacherState.token);
      teacherFeedbackBlob=null;teacherFeedbackFile=null;
      teacherStatus(result.student_visible?'تم حفظ التصحيح واعتماده للطالب.':'تم حفظ المراجعة كملاحظة داخلية للمحفظ.','success');
      await loadTeacherRows();
    }catch(error){teacherStatus(error.message||'تعذر حفظ المراجعة.','error');}
    finally{if(saveButton)saveButton.disabled=false;}
  }
  async function archiveTeacherSubmission(id){
    if(!teacherState||!g.confirm('أرشفة هذا التسجيل؟ سيظل محفوظًا ويمكن استرجاعه لاحقًا من سجل الأرشيف.'))return;
    try{
      await callTeacherApi('teacher/archive',{submission_id:id},teacherState.token);
      teacherState.selectedId='';teacherStatus('تمت أرشفة التسجيل دون حذف الملف.','success');await loadTeacherRows();
      const detail=$('hrcTeacherDetail');if(detail)detail.innerHTML='<p class="hrc-empty">تمت أرشفة التسجيل. اختر تسجيلًا آخر.</p>';
    }catch(error){teacherStatus(error.message||'تعذرت أرشفة التسجيل.','error');}
  }

  g.ImamHomeRecitation=Object.freeze({
    setStudentContext,renderTeacherPanel:teacherPanel,openTeacherInbox,closeTeacherModal,
    refreshStudentSubmissions:()=>refreshStudentSubmissions()
  });
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',initPortal,{once:true});else initPortal();
  g.addEventListener?.('online',()=>{if(portalContext)syncPending();});
})(globalThis);
