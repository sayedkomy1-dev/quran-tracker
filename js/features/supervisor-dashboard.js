'use strict';
/* v11.7 Stage 1 — owner / supervisor only. All permissions enforced again inside SQL RPC. */
(function supervision(g){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={punctuality:'الالتزام',teaching:'التعليم',followup:'المتابعة',kindness:'التعامل',benefit:'الاستفادة',clarity:'الوضوح'};
  let allowed=false,isOwner=false,teachers=[],busy=false,accessCheck=null,accessHint="جارٍ التحقق من الصلاحية…";
  function client(){return g.WeLiveQuranAuth?.getClient?.();}
  async function rpc(name,args={}){if(g.navigator?.onLine===false||!g.WeLiveQuranAuth?.isActive?.()||!client())throw Error('INTERNET_LOGIN_REQUIRED');
    const {data,error}=await client().rpc(name,args);if(error)throw error;return data;
  }
  function status(text){if($('supervisorStatus'))$('supervisorStatus').textContent=text;}
  function ensure(){if($('supervisionDialog'))return;
    const el=document.createElement('section');el.id='supervisionDialog';el.hidden=true;el.className='supervision-overlay';
    el.innerHTML=`<div class="supervision-dialog" role="dialog" aria-modal="true" aria-labelledby="supervisionHeading" dir="rtl">
      <div class="supervision-head"><h2 id="supervisionHeading">🛡️ لوحة الإشراف</h2><button type="button" data-supervision="close" aria-label="إغلاق">✕</button></div>
      <p class="supervision-note">للمالك والمشرف المصرح به فقط. أرقام الطلاب مستمدة من آخر بيانات منشورة، وليست قراءة مباشرة لبيانات المحفظ المحلية.</p>
      <div class="supervision-toolbar"><button type="button" data-supervision="verify">↻ إعادة التحقق من الصلاحية</button><button type="button" data-supervision="reload">↻ تحديث</button><button type="button" data-supervision="audit">📜 سجل الاطلاع</button></div>
      <p id="supervisorStatus" role="status"></p><div id="supervisorRows"></div><div id="supervisorDetail" hidden></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click',async event=>{
      if(event.target===el||event.target.closest('[data-supervision="close"]'))return close();
      const btn=event.target.closest('[data-supervision]');if(!btn||busy)return;
      const action=btn.dataset.supervision,id=btn.dataset.teacher;
      if(action==='verify')return authorizeAndReload();
      if(action==='reload')return authorizeAndReload();
      if(action==='audit')return audit();
      if(action==='students')return detail(id,'students');
      if(action==='ratings')return detail(id,'ratings');
      if(action==='grant'||action==='revoke')return grant(id,action==='grant');
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)close();});
  }
  function render(){const host=$('supervisorRows');if(!host)return;
    host.innerHTML=teachers.map(t=>`<article class="supervisor-row">
      <div class="supervisor-row-title"><b>${esc(t.name||'محفظ')}</b>${t.supervisor?'<small>مشرف مفعّل</small>':(t.role==='owner'?'<small>المالك</small>':'')}</div>
      <div class="supervisor-stats"><span>طلاب منشورون <b>${Number(t.published_students)||0}</b></span><span>رسائل <b>${Number(t.messages)||0}</b></span><span>تقييمات <b>${Number(t.rated_guardians)||0}</b></span><span>متوسط <b>${t.rating_average==null?'—':esc(t.rating_average)+' / 5'}</b></span></div>
      <div class="supervision-buttons"><button data-supervision="students" data-teacher="${esc(t.id)}">عرض الطلاب</button><button data-supervision="ratings" data-teacher="${esc(t.id)}">التقييمات الخاصة</button>
      ${isOwner&&t.role!=='owner'?`<button data-supervision="${t.supervisor?'revoke':'grant'}" data-teacher="${esc(t.id)}">${t.supervisor?'إلغاء الإشراف':'منح الإشراف'}</button>`:''}</div>
      </article>`).join('')||'<p>لا توجد حسابات محفظين نشطة حاليًا.</p>';
  }
  async function reload(){status('جارٍ تحميل بيانات الإشراف…');$('supervisorDetail').hidden=true;
    try{const d=await rpc('app_supervision_dashboard');teachers=Array.isArray(d?.teachers)?d.teachers:[];render();status('تم التحديث. البيانات متاحة للإدارة فقط.');}
    catch(err){status('تعذر تحميل بيانات الإشراف. تحقق من الإنترنت وصلاحيات الحساب وتنفيذ SQL.');}
  }
  async function detail(id,kind){if(!teachers.some(t=>t.id===id))return;busy=true;const host=$('supervisorDetail');host.hidden=false;host.innerHTML='<p>جارٍ التحميل…</p>';
    try{const d=await rpc(kind==='ratings'?'app_supervision_rating_details':'app_supervision_students',{p_teacher_id:id});
      const heading=kind==='ratings'?'التقييمات الخاصة بالإدارة':'بيانات الطلاب المنشورة';
      const content=kind==='ratings'?(d.ratings||[]).map(r=>`<article class="supervisor-detail-row"><b>${esc(new Date(r.updated_at).toLocaleDateString('ar-EG'))}</b><div>${Object.entries(labels).map(([key,l])=>`${l}: ${Number(r.scores?.[key])||0}/5`).join(' · ')}</div>${r.note?`<p>${esc(r.note)}</p>`:''}</article>`).join(''):(d.students||[]).map(s=>`<article class="supervisor-detail-row"><b>${esc(s.name||'طالب')}</b><div>الإتقان: ${esc(s.mastery||'—')} · الحضور: ${esc(s.attendance||'—')} · الإعادات: ${esc(s.repeats||'—')} · آيات جديدة: ${esc(s.new_ayat||'—')}</div></article>`).join('');
      host.innerHTML=`<h3>${heading}</h3><p class="supervision-note">${kind==='students'?'مؤشرات آخر نسخة منشورة؛ قد تختلف عن السجلات المحلية المباشرة.':'لا تظهر هذه التقييمات للمحفظ.'}</p>${content||'<p>لا توجد بيانات منشورة.</p>'}`;
      host.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(err){host.textContent='تعذر تحميل التفاصيل؛ تأكد من الصلاحيات.';}finally{busy=false;}
  }
  async function grant(id,enabled){if(!isOwner||!teachers.some(t=>t.id===id))return;
    if(!g.confirm?.(enabled?'منح هذا الحساب صلاحية الإشراف على بيانات الأكاديمية؟':'إلغاء صلاحية الإشراف عن هذا الحساب؟'))return;
    busy=true;try{const result=await rpc('app_supervisor_assign',{p_user_id:id,p_enabled:enabled});if(!result?.ok)throw Error('FAILED');await reload();}
    catch(err){status('تعذر حفظ صلاحية المشرف.');}finally{busy=false;}
  }
  async function audit(){const host=$('supervisorDetail');host.hidden=false;host.textContent='جارٍ تحميل سجل الاطلاع…';
    try{const result=await rpc('app_supervision_audit_feed');host.innerHTML='<h3>سجل الإشراف</h3>'+(result.events||[]).map(e=>`<div class="supervisor-detail-row">${esc(e.actor||'إدارة')} · ${esc(e.action)} · ${esc(new Date(e.at).toLocaleString('ar-EG'))}</div>`).join('');}
    catch(err){host.textContent='تعذر تحميل سجل الإشراف.';}
  }
  function ensureShortcut(){
    // Owner label is used ONLY to show the entry point. Actual data access is
    // authorized by the Supabase RPC, never by the cached owner label.
    if(!g.WeLiveQuranAuth?.isOwner?.()&&!allowed)return;
    const home=$('teacherInboxHomeButton');if(!home)return;
    let button=$('supervisorShortcut');
    if(!button){
      button=document.createElement('button');button.type='button';
      button.className='quick-action supervision-shortcut';button.id='supervisorShortcut';
      button.innerHTML='<span aria-hidden="true">🛡️</span><b>لوحة الإشراف</b><small id="supervisorAccessHint" aria-live="polite"></small>';
      home.parentElement.prepend(button);
      button.addEventListener('click',open);
    }
    const hint=$('supervisorAccessHint');if(hint)hint.textContent=accessHint;
  }
  function clearPrivateView(){
    const rows=$('supervisorRows'),detail=$('supervisorDetail');
    if(rows)rows.replaceChildren();
    if(detail){detail.hidden=true;detail.replaceChildren();}
    teachers=[];
  }
  function accessFailure(err){
    const text=String(err?.message||'');
    if(/INTERNET_LOGIN_REQUIRED/i.test(text)||g.navigator?.onLine===false)
      return 'مطلوب اتصال بالإنترنت وجلسة دخول صالحة';
    if(/JWT|401|403|auth|session|token/i.test(text))
      return 'يلزم تجديد جلسة الدخول بجوجل';
    return 'تعذر التحقق، اضغط للمحاولة مجددًا';
  }
  function verifyAccess(){
    if(accessCheck)return accessCheck;
    accessHint='جارٍ التحقق من الصلاحية…';ensureShortcut();
    accessCheck=(async()=>{
      try{
        const result=await rpc('app_supervision_access');
        allowed=result?.allowed===true;isOwner=result?.owner===true;
        accessHint=allowed?'متاحة للإدارة':(g.WeLiveQuranAuth?.isOwner?.()?'تعذّر تأكيد صلاحية المالك':'غير مصرح');
        if(allowed&&!isOwner){const role=document.querySelector('#wlqUserMenu .wlq-user-pop span');if(role)role.textContent='مشرف';}
      }catch(err){
        allowed=false;isOwner=false;accessHint=accessFailure(err);
        console.warn('[supervision] access verification failed:',err?.message||String(err));
      }
      if(!allowed){
        clearPrivateView();
        if(!g.WeLiveQuranAuth?.isOwner?.()){
          $('supervisorShortcut')?.remove?.();close();
        }
      }
      ensureShortcut();return allowed;
    })().finally(()=>{accessCheck=null;});
    return accessCheck;
  }
  async function authorizeAndReload(){
    status('جارٍ التأكد من صلاحية الإشراف…');
    const permitted=await verifyAccess();
    if(!permitted){
      if($('supervisorRows'))$('supervisorRows').replaceChildren();
      if($('supervisorDetail')){$('supervisorDetail').hidden=true;$('supervisorDetail').replaceChildren();}
      status(accessHint+' — لا تُعرض بيانات الإدارة إلا بعد الموافقة من الخادم.');
      return;
    }
    await reload();
  }
  function open(){
    // A trusted owner may SEE this entry point even when connectivity is down.
    // No dashboard RPC or private records are displayed without server authorization.
    if(!g.WeLiveQuranAuth?.isOwner?.()&&!allowed)return;
    ensure();$('supervisionDialog').hidden=false;
    document.body.classList.add('supervision-open');authorizeAndReload();
  }
  function close(){if($('supervisionDialog'))$('supervisionDialog').hidden=true;document.body.classList.remove('supervision-open');}
  async function initialize(){
    ensureShortcut();
    if(!g.WeLiveQuranAuth?.isActive?.())return false;
    return verifyAccess();
  }
  // Also initialize when an older, cached auth bootstrap misses its afterAppInit
  // hook. The normal auth path still calls initialize immediately after login.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    g.setTimeout?.(initialize,1500);g.setTimeout?.(initialize,6000);
  },{once:true});
  else {g.setTimeout?.(initialize,1500);g.setTimeout?.(initialize,6000);}
  g.addEventListener?.('online',initialize);
  g.ImamApp=g.ImamApp||{};g.ImamApp.Supervision={initialize,open,close};

})(globalThis);
