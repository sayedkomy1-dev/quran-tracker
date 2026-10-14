'use strict';
/* v11.6.0: teacher inbox. Remote-only, private and independent of local student/session data. */
(function teacherInbox(g){
  const $=id=>document.getElementById(id), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={educational:'تعليمية',absence:'اعتذار',finance:'مالية',schedule:'تعديل موعد',general:'عامة'};
  const statuses={new:'جديدة',read:'تمت القراءة',replied:'تم الرد'};
  let rows=[],filter='all',studentId='',profileStudentId='',busy=false;
  const toast=(msg,type='info')=>g.toast?.(msg,type);
  const date=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';};
  function client(){return g.WeLiveQuranAuth?.getClient?.();}
  async function rpc(name,args){
    if(g.navigator?.onLine===false||!g.WeLiveQuranAuth?.isActive?.()||!client())throw new Error('OFFLINE_OR_AUTH');
    const r=await client().rpc(name,args);if(r.error)throw r.error;return r.data;
  }
  async function refForStudent(id){const fn=g.ImamApp?.GuardianPortal?.studentRef;if(typeof fn!=='function')throw new Error('GUARDIAN_ACCESS_NOT_READY');return fn(id);}
  function ensureModal(){
    if($('teacherInboxModal'))return $('teacherInboxModal');
    const el=document.createElement('section');el.id='teacherInboxModal';el.className='msg-overlay';el.hidden=true;el.innerHTML=`<div class="msg-dialog" role="dialog" aria-modal="true" aria-labelledby="teacherInboxTitle" dir="rtl">
      <div class="msg-head"><h2 id="teacherInboxTitle">💬 صندوق رسائل أولياء الأمور</h2><button type="button" data-msg="close" aria-label="إغلاق">✕</button></div>
      <p class="msg-hint">رسائل داخل الأكاديمية، مستقلة عن WhatsApp. تحتاج اتصال إنترنت وصلاحية محفظ نشطة.</p>
      <div class="msg-controls"><select id="teacherMsgFilter" aria-label="تصفية حسب الحالة"><option value="all">كل الرسائل</option><option value="new">جديدة</option><option value="read">تمت القراءة</option><option value="replied">تم الرد</option></select><button type="button" data-msg="refresh">↻ تحديث</button></div>
      <p id="teacherMsgStatus" class="msg-status" role="status"></p><div id="teacherMsgRows" class="msg-list"></div>
    </div>`;document.body.appendChild(el);
    el.addEventListener('click',async e=>{
      if(e.target===el||e.target.closest('[data-msg="close"]')){close();return;}
      if(e.target.closest('[data-msg="refresh"]')){await refresh();return;}
      const action=e.target.closest('[data-msg-action]');if(!action)return;
      const id=action.dataset.id,kind=action.dataset.msgAction;
      if(busy)return;
      if(kind==='read'){await act('guardian_message_mark_read',{p_message_id:id});return;}
      if(kind==='reply'){
        const input=el.querySelector(`[data-reply-id="${id}"]`),body=String(input?.value||'').trim();
        if(body.length<1||body.length>2000){toast('اكتب ردًا من 1 إلى 2000 حرف','error');return;}
        await act('guardian_message_reply',{p_message_id:id,p_body:body});
      }
    });
    $('teacherMsgFilter').addEventListener('change',e=>{filter=e.target.value;render();});
    return el;
  }
  function render(){
    const el=$('teacherMsgRows');if(!el)return;
    const displayed=rows.filter(x=>filter==='all'||x.status===filter);
    el.innerHTML=displayed.map(m=>`<article class="msg-item"><div class="msg-item-head"><b>${esc(m.student_name||'طالب')} · ${esc(labels[m.category]||'عامة')}</b><span class="msg-state ${esc(m.status)}">${esc(statuses[m.status]||'جديدة')}</span></div>
      <small>${esc(m.guardian_name||'ولي الأمر')} · ${esc(date(m.created_at))}</small><p>${esc(m.message)}</p>
      ${m.reply?`<div class="msg-reply"><b>رد المحفظ:</b><p>${esc(m.reply)}</p></div>`:
      `<div class="msg-reply-form">${m.status==='new'?`<button type="button" data-msg-action="read" data-id="${esc(m.id)}">✓ تمت القراءة</button>`:''}<label>رد داخل البوابة<textarea maxlength="2000" data-reply-id="${esc(m.id)}" rows="2" placeholder="اكتب ردك لولي الأمر..."></textarea></label><button class="msg-send" type="button" data-msg-action="reply" data-id="${esc(m.id)}">إرسال الرد</button></div>`}</article>`).join('')||'<p class="msg-empty">لا توجد رسائل في هذا القسم.</p>';
  }
  async function refresh(){
    const status=$('teacherMsgStatus');if(status)status.textContent='جارٍ تحميل الرسائل…';
    try{const ref=studentId?await refForStudent(studentId):null;const data=await rpc('guardian_message_teacher_list',{p_student_ref:ref});rows=Array.isArray(data?.messages)?data.messages:[];
      if(status)status.textContent=`${rows.filter(x=>x.status==='new').length} رسالة جديدة · ${rows.length} إجمالي`;render();
    }catch(err){console.warn('[teacher inbox]',err);if(status)status.textContent='تعذر تحميل الرسائل. تأكد من الإنترنت وتسجيل الدخول وتنفيذ SQL الجديد.';}
  }
  async function act(name,args){busy=true;try{await rpc(name,args);toast(name==='guardian_message_reply'?'تم إرسال الرد داخل بوابة ولي الأمر':'تم تحديث حالة الرسالة','success');await refresh();}catch(err){console.warn('[teacher inbox update]',err);toast('تعذر حفظ التغيير. لم يتم إرسال أي رد.','error');}finally{busy=false;}}
  function open(id=''){
    studentId=String(id||'');ensureModal().hidden=false;filter='all';$('teacherMsgFilter').value='all';
    document.body.classList.add('msg-modal-open');$('teacherInboxModal').querySelector('[data-msg="close"]')?.focus();refresh();
  }
  function close(){$('teacherInboxModal').hidden=true;document.body.classList.remove('msg-modal-open');studentId='';}
  function ensureStudentShortcut(){
    const hdr=$('profHdr');if(!hdr)return;
    let b=$('teacherInboxShortcut');if(!b){b=document.createElement('button');b.id='teacherInboxShortcut';b.type='button';b.className='msg-shortcut';b.innerHTML='<span>💬</span><strong>رسائل ولي الأمر</strong><small>الرسائل والردود داخل الأكاديمية</small>';
      b.addEventListener('click',()=>open(profileStudentId));const finance=$('studentFinanceShortcut');
      if(finance?.parentElement===hdr)finance.insertAdjacentElement('afterend',b);else hdr.appendChild(b);
    }
  }
  function install(){ $('teacherInboxHomeButton')?.addEventListener('click',()=>open());const old=g.openProf;if(typeof old==='function'){
    const hooked=function(...args){profileStudentId=String(args[0]||'');const result=old.apply(this,args);setTimeout(ensureStudentShortcut,0);return result;};
    if(g.ImamApp?.Legacy?.override)g.ImamApp.Legacy.override('openProf',hooked,'v11.6-teacher-messages');else g.openProf=hooked;
  }
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('teacherInboxModal')&&!$('teacherInboxModal').hidden)close();});
  }
  g.ImamApp=g.ImamApp||{};g.ImamApp.TeacherInbox={open,refresh,close};g.openTeacherInbox=open;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(globalThis);
