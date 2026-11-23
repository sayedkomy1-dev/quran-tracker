'use strict';
/* RC13: share the prepared audio file through the Android share sheet only.
   The app never downloads an extra copy and never claims to attach a file to a
   specific WhatsApp chat. The teacher chooses WhatsApp and the recipient. */
(function(g){
 let pending=null;
 function support(files){try{if(typeof g.navigator?.share!=='function')return false;return typeof g.navigator.canShare!=='function'||g.navigator.canShare({files});}catch(_){return false;}}
 function share(files,{title='مشاركة ملف التكليف',text=''}={}){
  if(!Array.isArray(files)||!files.length)return Promise.reject(new Error('NO_MEDIA'));
  if(pending)return Promise.reject(new Error('MEDIA_SHARE_BUSY'));
  if(!support(files))return Promise.resolve({shared:false,downloaded:false,unsupported:true});
  return new Promise(resolve=>{
   const dialog=g.document.createElement('dialog');dialog.className='ia28-media-dialog';dialog.dir='rtl';
   dialog.innerHTML='<h3>ملف التكليف جاهز</h3><p data-description></p><p data-guidance>اختر واتساب من قائمة المشاركة، ثم اختر محادثة ولي الأمر. لا تُحفظ نسخة إضافية تلقائيًا في التنزيلات.</p><div class="ia28-actions"><button type="button" data-share>مشاركة الملف الصوتي</button><button type="button" data-cancel>إلغاء</button></div><p data-status role="status"></p>';
   const bytes=files.reduce((n,f)=>n+(Number(f?.size)||0),0);
   dialog.querySelector('[data-description]').textContent=`${title} — ${files.length} ملف • ${(bytes/1048576).toFixed(2)} ميجابايت`;
   const button=dialog.querySelector('[data-share]'),cancel=dialog.querySelector('[data-cancel]');let sharing=false,settled=false;
   const finish=result=>{if(settled)return;settled=true;pending=null;dialog.remove();resolve({downloaded:false,...result});};
   pending=finish;
   button.onclick=async()=>{
    if(sharing)return;sharing=true;button.disabled=cancel.disabled=true;
    try{await g.navigator.share({title,text,files});finish({shared:true});}
    catch(e){if(e?.name==='AbortError')finish({shared:false,cancelled:true});else{dialog.querySelector('[data-status]').textContent='لم تكتمل المشاركة. لم يتم تنزيل الملف؛ يمكنك إعادة المحاولة.';sharing=false;button.disabled=cancel.disabled=false;}}
   };
   cancel.onclick=()=>{if(!sharing)finish({shared:false,cancelled:true});};
   dialog.addEventListener('cancel',e=>{e.preventDefault();if(!sharing)finish({shared:false,cancelled:true});});
   g.document.body.append(dialog);try{dialog.showModal();}catch(_){dialog.setAttribute('open','');dialog.classList.add('ia28-media-fallback');}
  });
 }
 g.ImamTemporaryMedia={share,support,cancel:()=>pending?.({shared:false,cancelled:true})};
})(globalThis);
