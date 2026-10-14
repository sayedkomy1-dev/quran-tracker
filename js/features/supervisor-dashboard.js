'use strict';
/* v11.7 Stage 1 — owner / supervisor only. All permissions enforced again inside SQL RPC. */
(function supervision(g){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={punctuality:'الالتزام',teaching:'التعليم',followup:'المتابعة',kindness:'التعامل',benefit:'الاستفادة',clarity:'الوضوح'};
  let allowed=false,isOwner=false,teachers=[],busy=false;
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
      <div class="supervision-toolbar"><button type="button" data-supervision="reload">↻ تحديث</button><button type="button" data-supervision="audit">📜 سجل الاطلاع</button></div>
      <p id="supervisorStatus" role="status"></p><div id="supervisorRows"></div><div id="supervisorDetail" hidden></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click',async event=>{
      if(event.target===el||event.target.closest('[data-supervision="close"]'))return close();
      const btn=event.target.closest('[data-supervision]');if(!btn||busy)return;
      const action=btn.dataset.supervision,id=btn.dataset.teacher;
      if(action==='reload')return reload();
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
  function open(){if(!allowed)return;ensure();$('supervisionDialog').hidden=false;document.body.classList.add('supervision-open');reload();}
  function close(){if($('supervisionDialog'))$('supervisionDialog').hidden=true;document.body.classList.remove('supervision-open');}
  async function initialize(){allowed=false;isOwner=false;
    if(!g.WeLiveQuranAuth?.isActive?.()||g.navigator?.onLine===false)return;
    try{const result=await rpc('app_supervision_access');allowed=!!result?.allowed;isOwner=!!result?.owner;
      if(!allowed)return;
      if(!isOwner){const role=document.querySelector('#wlqUserMenu .wlq-user-pop span');if(role)role.textContent='مشرف';}
      const home=$('teacherInboxHomeButton');if(!home||$('supervisorShortcut'))return;
      const b=document.createElement('button');b.type='button';b.className='quick-action';b.id='supervisorShortcut';b.innerHTML='<span>🛡️</span><b>لوحة الإشراف</b>';
      home.parentElement.appendChild(b);b.addEventListener('click',open);
    }catch(err){/* Remain hidden unless backend confirms role. */}
  }
  g.ImamApp=g.ImamApp||{};g.ImamApp.Supervision={initialize,open,close};
})(globalThis);
