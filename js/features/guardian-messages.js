'use strict';
/* v11.6 Stage 1 — guardian private messages; never available via #data= or #p= */
(function guardianMessages(g){
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories={educational:'تعليمية',absence:'اعتذار',finance:'مالية',schedule:'تعديل موعد',general:'عامة'};
  const status={new:'جديدة',read:'تمت القراءة',replied:'تم الرد'};
  let token='',studentRef='',requestId=0,busy=false;
  const date=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';};
  async function rpc(method,args){
    if(g.navigator?.onLine===false)throw new Error('OFFLINE');
    const res=await fetch('https://svtcntalwfmexthcnvqe.supabase.co/rest/v1/rpc/'+method,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':'sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j'},body:JSON.stringify(args)});
    if(!res.ok)throw new Error('MESSAGE_RPC_'+res.status);return res.json();
  }
  function clear(){requestId++;token='';studentRef='';const panel=$('portalMessageCard'),nav=$('portalMessageNav'),list=$('portalMessageList'),feedback=$('portalMessageFeedback');
    if(panel)panel.hidden=true;if(nav)nav.hidden=true;if(list)list.textContent='';if(feedback)feedback.textContent='';const body=$('portalMessageBody');if(body)body.value='';
  }
  function context(x){clear();if(!x?.sessionToken||!x.studentRef)return;token=String(x.sessionToken);studentRef=String(x.studentRef);
    if($('portalMessageCard'))$('portalMessageCard').hidden=false;if($('portalMessageNav'))$('portalMessageNav').hidden=false;load();
  }
  async function load(){const current=++requestId,s=token,r=studentRef,feedback=$('portalMessageFeedback');if(!s||!r)return;
    if(feedback)feedback.textContent='جارٍ تحميل الرسائل…';
    try{const data=await rpc('guardian_message_session_list',{p_session:s,p_student_ref:r});if(current!==requestId||s!==token||r!==studentRef)return;
      const rows=Array.isArray(data?.messages)?data.messages:[];$('portalMessageList').innerHTML=rows.slice(0,60).map(m=>`<article class="msg-item"><div class="msg-item-head"><b>${esc(categories[m.category]||'عامة')}</b><span class="msg-state ${esc(m.status)}">${esc(status[m.status]||'جديدة')}</span></div><small>${esc(date(m.created_at))}</small><p>${esc(m.message)}</p>${m.reply?`<div class="msg-reply"><b>رد المحفظ:</b><p>${esc(m.reply)}</p></div>`:''}</article>`).join('')||'<p class="msg-empty">لا توجد رسائل بعد. اكتب رسالتك الأولى للمحفظ.</p>';
      if(feedback)feedback.textContent=`${rows.length} رسالة · المحفظ يرد من صندوق الوارد الخاص به`;
    }catch(err){console.warn('[guardian messages]',err);if(current===requestId&&feedback)feedback.textContent='تعذر تحميل الرسائل. يلزم اتصال بالإنترنت وتفعيل دخول ولي الأمر.';}
  }
  async function send(){if(busy||!token||!studentRef)return;const category=$('portalMessageCategory')?.value,body=String($('portalMessageBody')?.value||'').trim(),feedback=$('portalMessageFeedback');
    if(!categories[category]||body.length<1||body.length>2000){if(feedback)feedback.textContent='اكتب رسالة صحيحة من 1 إلى 2000 حرف.';return;}
    busy=true;const btn=$('portalMessageSend');if(btn)btn.disabled=true;const s=token,r=studentRef;
    try{const data=await rpc('guardian_message_send',{p_session:s,p_student_ref:r,p_category:category,p_body:body});
      if(s!==token||r!==studentRef)return;if(!data?.ok)throw new Error('NOT_CONFIRMED');
      $('portalMessageBody').value='';if(feedback)feedback.textContent='✅ تم إرسال الرسالة داخل الأكاديمية';await load();
    }catch(err){console.warn('[guardian message send]',err);if(s===token&&r===studentRef&&feedback)feedback.textContent='لم يتم تأكيد الإرسال. تأكد من الاتصال أو انتظر قليلًا ثم حدّث سجل الرسائل قبل إعادة الإرسال.';
    }finally{busy=false;if(btn)btn.disabled=false;}
  }
  g.ImamGuardianMessages={setContext:context,clear,refresh:load,send};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{$('portalMessageSend')?.addEventListener('click',send);$('portalMessageRefresh')?.addEventListener('click',load);},{once:true});
  else{$('portalMessageSend')?.addEventListener('click',send);$('portalMessageRefresh')?.addEventListener('click',load);}
})(globalThis);
