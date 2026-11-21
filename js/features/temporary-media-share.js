'use strict';
/* A new explicit tap after asynchronous preparation preserves user activation. No download fallback. */
(function(g){
 let pending=null,cancelPending=null;
 function support(files){try{return typeof g.navigator?.share==='function'&&typeof g.navigator?.canShare==='function'&&g.navigator.canShare({files});}catch(_){return false;}}
 function share(files,{title='مشاركة الملف',text='',recipient=null}={}){
  if(!Array.isArray(files)||!files.length)return Promise.reject(new Error('NO_MEDIA'));
  if(pending)return Promise.reject(new Error('MEDIA_SHARE_BUSY'));
  const supported=support(files);
  if(!supported&&!recipient?.phone)return Promise.resolve({shared:false,downloaded:false,unsupported:true});
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='ia28-media-dialog';dialog.dir='rtl';dialog.innerHTML='<h3>ملف التكليف جاهز</h3><p data-description></p><p data-recipient hidden></p><p data-guidance>اختر واتساب ثم محادثة ولي الأمر من قائمة مشاركة الجهاز. الملف لا يُحفظ تلقائيًا في التنزيلات؛ يتطلب إرسال واتساب اتصالًا بالإنترنت.</p><div class="ia28-actions"><button type="button" data-share>مشاركة MP3 عبر واتساب</button><button type="button" data-chat hidden>فتح محادثة ولي الأمر</button><button type="button" data-cancel>إلغاء</button></div><p data-status role="status"></p>';
   const description=dialog.querySelector('[data-description]');description.textContent=`${title} — ${files.length} ملف • ${(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(2)} ميجابايت`;
   const button=dialog.querySelector('[data-share]');const cancel=dialog.querySelector('[data-cancel]');let sharing=false;
   // A PWA cannot bind a local File attachment to a specific WhatsApp phone.
   // The native share sheet chooses the chat; click-to-chat opens the saved
   // guardian's number with text, but never pretends to attach the MP3.
   const phone=String(recipient?.phone||'');
   if(/^20(10|11|12|15)\d{8}$/.test(phone)){
     const label=dialog.querySelector('[data-recipient]');label.hidden=false;
     label.textContent=`ولي أمر ${String(recipient?.studentName||'الطالب')} — ${String(recipient?.name||'')} • +${phone}`;
     const chat=dialog.querySelector('[data-chat]');chat.hidden=false;
     chat.onclick=()=>{
       if(g.navigator?.onLine===false){dialog.querySelector('[data-status]').textContent='فتح محادثة الرقم يتطلب الإنترنت. يمكنك مشاركة الصوت عبر واتساب عند عودة الاتصال.';return;}
       const url=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
       const opened=g.open?.(url,'_blank','noopener');
       if(!opened)dialog.querySelector('[data-status]').textContent='إن لم تُفتح محادثة ولي الأمر، اسمح بالنوافذ الجديدة أو افتح الرابط من المتصفح. فتح المحادثة لا يرفق الملف الصوتي.';
     };
     dialog.querySelector('[data-guidance]').textContent='لإرسال الصوت، اختر مشاركة MP3 ثم واتساب ثم محادثة ولي الأمر المذكور. أو افتح محادثته مباشرة برسالة نصية؛ فتحها وحده لا يرفق الصوت.';
   }
   if(!supported){button.hidden=true;dialog.querySelector('[data-status]').textContent='المشاركة الصوتية غير مدعومة من هذا المتصفح. فتح محادثة ولي الأمر سيرسل نص التكليف فقط، دون ملف صوتي.';}
   const finish=result=>{if(!pending)return;pending=null;cancelPending=null;dialog.remove();files=null;resolve({downloaded:false,...result});};pending=finish;cancelPending=()=>{if(!sharing)finish({shared:false,cancelled:true});};
   button.onclick=async()=>{if(sharing||!supported)return;sharing=true;button.disabled=cancel.disabled=true;try{await g.navigator.share({title,text,files});finish({shared:true});}catch(e){if(e?.name==='AbortError')finish({shared:false,cancelled:true});else{dialog.querySelector('[data-status]').textContent='لم تكتمل المشاركة. أعد المحاولة أو ألغِ العملية؛ لم يُنزّل أي ملف.';sharing=false;button.disabled=cancel.disabled=false;}}};
   cancel.onclick=()=>{if(!sharing)finish({shared:false,cancelled:true});};dialog.addEventListener('cancel',e=>{e.preventDefault();if(!sharing)finish({shared:false,cancelled:true});});document.body.append(dialog);try{dialog.showModal();}catch(_){dialog.setAttribute('open','');dialog.classList.add('ia28-media-fallback');}
  });
 }
 g.ImamTemporaryMedia={share,support,cancel:()=>cancelPending?.()};
})(globalThis);
