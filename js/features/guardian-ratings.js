'use strict';
/* v11.7 Stage 1 — private guardian -> academy teacher rating; no public link access. */
(function guardianRatings(g){
  const $=id=>document.getElementById(id);
  const criteria=[['punctuality','الالتزام بالمواعيد'],['teaching','أسلوب التعليم'],['followup','المتابعة'],['kindness','حسن التعامل'],['benefit','الاستفادة'],['clarity','وضوح الشرح']];
  let token='',studentRef='',request=0,busy=false;
  async function rpc(name,args){
    if(g.navigator?.onLine===false)throw Error('OFFLINE');
    const response=await fetch('https://svtcntalwfmexthcnvqe.supabase.co/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json','apikey':'sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j'},body:JSON.stringify(args)});
    if(!response.ok)throw Error('RATINGS_RPC_'+response.status);
    return response.json();
  }
  function clear(){request++;token='';studentRef='';const card=$('portalRatingCard'),nav=$('portalRatingNav');
    if(card)card.hidden=true;if(nav)nav.hidden=true;
    if($('portalRatingStatus'))$('portalRatingStatus').textContent='';
    if($('portalRatingNote'))$('portalRatingNote').value='';
    criteria.forEach(([key])=>{const input=$('portalRating_'+key);if(input)input.value='';});
  }
  function setContext(context){clear();if(!context?.sessionToken||!context?.studentRef)return;
    token=String(context.sessionToken);studentRef=String(context.studentRef);
    $('portalRatingCard').hidden=false;$('portalRatingNav').hidden=false;load();
  }
  async function load(){const id=++request,s=token,ref=studentRef;if(!s||!ref)return;
    const status=$('portalRatingStatus');status.textContent='جارٍ تحميل تقييمك الخاص…';
    try{const result=await rpc('guardian_teacher_rating_session_get',{p_session:s,p_student_ref:ref});
      if(id!==request||s!==token||ref!==studentRef)return;
      if(result?.rating){criteria.forEach(([key])=>{const input=$('portalRating_'+key);if(input)input.value=String(result.rating.scores?.[key]||5);});
        $('portalRatingNote').value=String(result.rating.note||'');status.textContent='يمكنك تعديل تقييمك السابق. التقييم لا يراه المحفظ.';
      }else status.textContent='تقييمك خاص بإدارة الأكاديمية ولا يراه المحفظ.';
    }catch(e){if(id===request)status.textContent='تعذر تحميل التقييم؛ تأكد من الإنترنت وجلسة الدخول.';}
  }
  async function send(){if(busy||!token||!studentRef)return;const status=$('portalRatingStatus'),btn=$('portalRatingSend');
    const scores=Object.fromEntries(criteria.map(([key])=>[key,Number($('portalRating_'+key)?.value)]));
    if(Object.values(scores).some(x=>!Number.isInteger(x)||x<1||x>5)){status.textContent='اختر تقييمًا لكل بند من 1 إلى 5.';return;}
    const note=String($('portalRatingNote')?.value||'').trim();if(note.length>800){status.textContent='الملاحظة أطول من 800 حرف.';return;}
    const s=token,ref=studentRef;busy=true;btn.disabled=true;
    try{const result=await rpc('guardian_teacher_rating_submit',{p_session:s,p_student_ref:ref,p_scores:scores,p_note:note});
      if(s!==token||ref!==studentRef)return;
      if(!result?.ok)throw Error('NO_CONFIRM');status.textContent='✅ تم حفظ تقييمك لدى الإدارة فقط. شكرًا لمساهمتك.';
    }catch(e){if(s===token&&ref===studentRef)status.textContent='لم يتم تأكيد حفظ التقييم. تأكد من الاتصال وأعد المحاولة.';}
    finally{busy=false;btn.disabled=false;}
  }
  g.ImamGuardianRatings={setContext,clear,load,send};
  function bind(){$('portalRatingSend')?.addEventListener('click',send);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
