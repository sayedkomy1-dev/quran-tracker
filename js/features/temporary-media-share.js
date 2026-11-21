'use strict';
/* A new explicit tap after asynchronous preparation preserves user activation. No download fallback. */
(function(g){
 let pending=null,cancelPending=null;
 function support(files){try{return typeof g.navigator?.share==='function'&&typeof g.navigator?.canShare==='function'&&g.navigator.canShare({files});}catch(_){return false;}}
 function share(files,{title='مشاركة الملف',text=''}={}){
  if(!Array.isArray(files)||!files.length)return Promise.reject(new Error('NO_MEDIA'));
  if(pending)return Promise.reject(new Error('MEDIA_SHARE_BUSY'));
  if(!support(files))return Promise.resolve({shared:false,downloaded:false,unsupported:true});
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='ia28-media-dialog';dialog.dir='rtl';dialog.innerHTML='<h3>الملف جاهز للمشاركة</h3><p data-description></p><p>اختر واتساب ثم محادثة المستلم. لن ينزّل التطبيق الملف تلقائيًا. إرسال واتساب يحتاج الإنترنت.</p><div class="ia28-actions"><button type="button" data-share>مشاركة الآن</button><button type="button" data-cancel>إلغاء</button></div><p data-status role="status"></p>';
   const description=dialog.querySelector('[data-description]');description.textContent=`${title} — ${files.length} ملف • ${(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(2)} ميجابايت`;
   const button=dialog.querySelector('[data-share]');const cancel=dialog.querySelector('[data-cancel]');let sharing=false;
   const finish=result=>{if(!pending)return;pending=null;cancelPending=null;dialog.remove();files=null;resolve({downloaded:false,...result});};pending=finish;cancelPending=()=>{if(!sharing)finish({shared:false,cancelled:true});};
   button.onclick=async()=>{if(sharing)return;sharing=true;button.disabled=cancel.disabled=true;try{await g.navigator.share({title,text,files});finish({shared:true});}catch(e){if(e?.name==='AbortError')finish({shared:false,cancelled:true});else{dialog.querySelector('[data-status]').textContent='لم تكتمل المشاركة. أعد المحاولة أو ألغِ العملية؛ لم يُنزّل أي ملف.';sharing=false;button.disabled=cancel.disabled=false;}}};
   cancel.onclick=()=>{if(!sharing)finish({shared:false,cancelled:true});};dialog.addEventListener('cancel',e=>{e.preventDefault();if(!sharing)finish({shared:false,cancelled:true});});document.body.append(dialog);try{dialog.showModal();}catch(_){dialog.setAttribute('open','');dialog.classList.add('ia28-media-fallback');}
  });
 }
 g.ImamTemporaryMedia={share,support,cancel:()=>cancelPending?.()};
})(globalThis);
