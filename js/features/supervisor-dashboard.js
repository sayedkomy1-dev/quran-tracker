'use strict';
/* v11.7.4.4 — owner academy oversight; automatic private teacher roster refresh. */
(function supervision(g){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={punctuality:'الالتزام',teaching:'التعليم',followup:'المتابعة',kindness:'التعامل',benefit:'الاستفادة',clarity:'الوضوح'};
  let allowed=false,isOwner=false,teachers=[],busy=false,accessCheck=null,accessHint='جارٍ التحقق من الصلاحية…',requestSeq=0;
  // Auto-publish is nonblocking, bound to the active account, and NEVER replaces a published roster with empty/partial data.
  let autoStarted=false,autoTimer=null,autoPoll=null,publishInFlight=null,lastPublishedSignature='',lastPublishedAccount='',retryAfter=0;
  const AUTO_DELAY=3500,MIN_RETRY_MS=60000;
  function rosterMessage(value){const el=$('supervisorRosterSyncStatus');if(el)el.textContent=value;}
  function currentActor(){return String(g.WeLiveQuranAuth?.getAccess?.()?.user_id||'');}
  function authenticatedTeacher(){
    const access=g.WeLiveQuranAuth?.getAccess?.();
    return Boolean(access?.user_id&&access?.status==='active'&&['owner','teacher'].includes(access?.role));
  }
  function canAutoSync(){return autoStarted&&authenticatedTeacher()&&g.navigator?.onLine!==false&&Boolean(client());}
  function scheduleAutoRosterSync(reason='change',delay=AUTO_DELAY){
    if(!canAutoSync())return;
    if(autoTimer!==null)g.clearTimeout(autoTimer);
    const wait=Math.max(delay,retryAfter-Date.now(),0);
    autoTimer=g.setTimeout(()=>{autoTimer=null;void syncRoster(true);},wait);
  }
  function startAutoRosterSync(){
    if(autoStarted)return;
    autoStarted=true;
    g.document?.addEventListener?.('imam:local-save',()=>scheduleAutoRosterSync('save'));
    g.document?.addEventListener?.('visibilitychange',()=>{if(g.document.visibilityState==='visible')scheduleAutoRosterSync('resume',800);});
    g.addEventListener?.('online',()=>scheduleAutoRosterSync('online',1200));
    // Recovery for changes from external modules that do not call the shared save hook.
    autoPoll=g.setInterval?.(()=>scheduleAutoRosterSync('periodic',700),120000);
    scheduleAutoRosterSync('ready',2000);
  }
  function client(){return g.WeLiveQuranAuth?.getClient?.();}
  async function rpc(name,args={}){
    if(g.navigator?.onLine===false||!g.WeLiveQuranAuth?.isActive?.()||!client())throw Error('INTERNET_LOGIN_REQUIRED');
    const {data,error}=await client().rpc(name,args);if(error)throw error;return data;
  }
  function status(text){if($('supervisorStatus'))$('supervisorStatus').textContent=text;}
  function formatDate(value){if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('ar-EG'):'—';}
  function metric(value){return value==null?'—':esc(value);}
  function ensure(){if($('supervisionDialog'))return;
    const el=document.createElement('section');el.id='supervisionDialog';el.hidden=true;el.className='supervision-overlay';
    el.innerHTML=`<div class="supervision-dialog" role="dialog" aria-modal="true" aria-labelledby="supervisionHeading" dir="rtl">
      <div class="supervision-head"><h2 id="supervisionHeading">🛡️ لوحة الإشراف والأكاديمية</h2><button type="button" data-supervision="close" aria-label="إغلاق">✕</button></div>
      <p class="supervision-note">المالك يشرف على جميع المحفظين. المشرف يرى فقط المحفظين والأقسام التي منحه إياها المالك. كشف الطلاب يُزامَن تلقائيًا بعد تحميل بيانات المحفظ وعند تعديلها. مؤشرات البوابة قد لا تكون لحظية.</p>
      <div class="supervision-toolbar"><button type="button" data-supervision="verify">↻ التحقق من الصلاحية</button><button type="button" data-supervision="reload">↻ تحديث</button><button type="button" data-supervision="analytics">📊 التحليلات المتقدمة</button><button id="supervisionAuditButton" type="button" data-supervision="audit" hidden>📜 سجل الاطلاع — للمالك</button></div>
      <p id="supervisorStatus" role="status"></p><div id="supervisorOverview"></div><div id="supervisorRows"></div><div id="supervisorDetail" hidden></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click',async event=>{
      if(event.target===el||event.target.closest('[data-supervision="close"]'))return close();
      const btn=event.target.closest('[data-supervision]');if(!btn||busy)return;
      const action=btn.dataset.supervision,id=btn.dataset.teacher;
      if(action==='verify'||action==='reload')return authorizeAndReload();
      if(action==='audit')return audit();
      if(action==='analytics')return g.ImamApp?.AcademyAnalytics?.open?.();
      if(action==='students-close'){const h=inlineHost(btn.closest('.supervisor-row'));if(h)h.hidden=true;return;}
      if(action==='students'||action==='ratings')return detail(id,action,btn.closest('.supervisor-row'));
      if(action==='progress')return g.ImamApp?.ProgressBridge?.detail?.(id,btn.closest('.supervisor-row'));
      if(action==='scope')return scopes(id,btn.closest('.supervisor-row'));
      if(action==='scope-save')return saveScope(id,btn.dataset.target,btn.closest('.supervisor-row'));
      if(action==='grant'||action==='revoke')return grant(id,action==='grant');
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)close();});
  }
  const ROSTER_FRESH_MS=24*60*60*1000;
  const ROSTER_STALE_MS=72*60*60*1000;
  function rosterSyncState(t,clock=Date.now()){
    if(t.can_students===false)return {kind:'hidden',label:'كشف الطلاب خارج نطاق الصلاحية'};
    if(!t.roster_synced_at)return {kind:'missing',label:'لم يصل كشف الطلاب بعد'};
    const timestamp=new Date(t.roster_synced_at).getTime();
    if(!Number.isFinite(timestamp))return {kind:'missing',label:'تاريخ مزامنة غير صالح'};
    const age=Math.max(0,clock-timestamp);
    return age>=ROSTER_STALE_MS?{kind:'stale',label:'مزامنة متأخرة أكثر من ٣ أيام'}:
      age>=ROSTER_FRESH_MS?{kind:'delayed',label:'آخر مزامنة منذ أكثر من يوم'}:
      {kind:'fresh',label:'الكشف محدّث خلال آخر يوم'};
  }
  function dateTime(value){if(!value)return 'لم يُزامَن';const dt=new Date(value);return Number.isFinite(dt.getTime())?dt.toLocaleString('ar-EG',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'غير معروف';}
  function teacherSummary(t){
    const synced=t.roster_synced_at!=null;
    const count=Number(t.roster_students)||0,published=Number(t.published_students)||0;
    return t.can_students===false?'الطلاب خارج نطاق صلاحيتك':synced?
      `كشف متزامن: ${count} طالبًا · منشورون لولي الأمر: ${published}`:
      `منشورون لولي الأمر: ${published} · بانتظار أول مزامنة تلقائية لكشف الطلاب`;
  }
  function render(){const host=$('supervisorRows');if(!host)return;
    const viewable=teachers.filter(t=>t.can_students!==false);
    const rosterSum=viewable.filter(t=>t.roster_synced_at).reduce((n,t)=>n+(Number(t.roster_students)||0),0);
    const overview=$('supervisorOverview');if(overview)overview.innerHTML=`<div class="supervisor-overview">
      <div><strong>${teachers.length}</strong><small>محفظون في نطاق المتابعة</small></div>
      <div><strong>${rosterSum}</strong><small>طلاب في الكشوف المتزامنة</small></div>
      <div><strong>${viewable.filter(t=>t.roster_synced_at).length} / ${viewable.length}</strong><small>محفظون زامنوا كشف الطلاب</small></div>
    </div>${isOwner?'<p class="supervision-note">المالك: يمكنك إدارة نطاق كل مشرف، ومراجعة التقييمات الخاصة، والاطلاع على سجل الإشراف. لا يمكن فتح بيانات محلية لم يزامنها المحفظ.</p>':''}`;
    if(overview&&isOwner){
      const missing=teachers.filter(t=>rosterSyncState(t).kind==='missing');
      const late=teachers.filter(t=>['delayed','stale'].includes(rosterSyncState(t).kind));
      overview.insertAdjacentHTML('beforeend',`<section class="supervision-sync-health" aria-label="حالة مزامنة الأكاديمية">
        <h3>🛰️ حالة مزامنة الأكاديمية</h3>
        <p>آخر كشف طلاب وصل من كل محفظ. الرقم صفر لا يعني أن المحفظ ليس لديه طلاب إذا لم يصل كشفه.</p>
        <div class="supervision-sync-counters"><b>لم يصل كشف: ${missing.length}</b><b>بيانات متأخرة: ${late.length}</b><b>كشف حديث: ${teachers.filter(t=>rosterSyncState(t).kind==='fresh').length}</b></div>
        <div class="supervision-sync-list">${teachers.map(t=>{const state=rosterSyncState(t);return `<div class="supervision-sync-entry ${state.kind}"><strong>${esc(t.name||'محفظ')}</strong><span>${esc(state.label)}</span><small>آخر مزامنة: ${esc(dateTime(t.roster_synced_at))}</small><small>عدد الطلاب المتزامنين: ${t.roster_synced_at?metric(t.roster_students):'غير معروف'}</small></div>`;}).join('')}</div>
        <small>إذا لم يكن جهاز المحفظ متصلًا بالإنترنت، فلا يمكن سحب بياناته المحلية عن بُعد. يُعاد النشر عند فتح التطبيق واتصال الحساب.</small>
      </section>`);
    }
    const auditButton=$('supervisionAuditButton');if(auditButton)auditButton.hidden=!isOwner;
    host.innerHTML=teachers.map(t=>`<article class="supervisor-row" data-supervision-row="${esc(t.id)}">
      <div class="supervisor-row-title"><b>${esc(t.name||'محفظ')}</b>${t.supervisor?'<small>مشرف مفعّل</small>':(t.role==='owner'?'<small>المالك</small>':'')}</div>
      <p class="supervision-roster-hint">${esc(teacherSummary(t))} · ${esc(rosterSyncState(t).label)} · آخر كشف: ${esc(dateTime(t.roster_synced_at))}</p>
      <div class="supervisor-stats"><span>طلاب منشورون <b>${metric(t.published_students)}</b></span><span>كشف الطلاب <b>${t.roster_synced_at==null?'لم يُزامَن':metric(t.roster_students)}</b></span><span>رسائل <b>${metric(t.messages)}</b></span><span>تقييمات <b>${metric(t.rated_guardians)}</b></span><span>متوسط التقييم <b>${t.rating_average==null?'—':esc(t.rating_average)+' / 5'}</b></span></div>
      <div class="supervision-buttons">${t.can_students!==false?`<button data-supervision="students" data-teacher="${esc(t.id)}">👥 عرض أسماء الطلاب</button>`:''}
      ${t.can_progress===true?`<button data-supervision="progress" data-teacher="${esc(t.id)}">📈 نتائج التسميع المنشورة</button>`:''}
      ${t.can_ratings!==false?`<button data-supervision="ratings" data-teacher="${esc(t.id)}">⭐ التقييمات الخاصة</button>`:''}
      ${isOwner&&t.role!=='owner'?`<button data-supervision="${t.supervisor?'revoke':'grant'}" data-teacher="${esc(t.id)}">${t.supervisor?'إلغاء صفة المشرف':'منح صفة المشرف'}</button>${t.supervisor?`<button data-supervision="scope" data-teacher="${esc(t.id)}">⚙️ صلاحيات ونطاق المشرف</button>`:''}`:''}</div>
      <div class="supervisor-inline-detail" data-supervision-detail hidden></div>
    </article>`).join('')||'<p>لا يوجد محفظون في نطاق صلاحيتك. يحدد المالك المحفظين والأقسام المسموح لك بمتابعتها.</p>';
  }
  async function reload(){status('جارٍ تحميل بيانات الإشراف…');const seq=++requestSeq;
    try{const d=await rpc('app_supervision_dashboard');if(seq!==requestSeq)return;
      teachers=Array.isArray(d?.teachers)?d.teachers:[];render();
      status(isOwner?'تم التحديث. جميع الصلاحيات الإدارية تخضع للتحقق من الخادم.':'تم التحديث. تظهر لك الصلاحيات التي حددها المالك فقط.');
    }catch(err){status('تعذر تحميل بيانات الإشراف. راجع اتصال الإنترنت وتنفيذ SQL الجديد وصلاحية الحساب.');console.warn('[supervision dashboard]',err?.message||err);}
  }
  function inlineHost(row){return row?.querySelector?.('[data-supervision-detail]')||$('supervisorDetail');}
  function inlineNotice(host,text){host.hidden=false;host.textContent=text;}
  function reveal(host){host.hidden=false;host.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
  async function detail(id,kind,row){if(!teachers.some(t=>t.id===id))return;
    const host=inlineHost(row);if(!host)return;busy=true;inlineNotice(host,'جارٍ تحميل البيانات…');
    try{const d=await rpc(kind==='ratings'?'app_supervision_rating_details':'app_supervision_students',{p_teacher_id:id});
      const heading=kind==='ratings'?'⭐ التقييمات الخاصة بالإدارة':'👥 كشف الطلاب لدى المحفظ';
      const records=kind==='ratings'?(d?.ratings||[]):(d?.students||[]);
      const content=kind==='ratings'?records.map(r=>`<article class="supervisor-detail-row"><b>${esc(formatDate(r.updated_at))}</b><p>${Object.entries(labels).map(([key,l])=>`${l}: ${Number(r.scores?.[key])||0}/5`).join(' · ')}</p>${r.note?`<p>${esc(r.note)}</p>`:''}</article>`).join(''):
      records.map((s,i)=>`<article class="supervisor-student-row"><div class="supervisor-student-top"><strong>${i+1}. ${esc(s.name||'طالب')}</strong><small>${s.roster?'ضمن الكشف المتزامن':'منشور لولي الأمر فقط'}</small></div>
      ${s.group||s.level?`<p>${s.group?'المجموعة: '+esc(s.group):''} ${s.level?' · المستوى: '+esc(s.level):''}</p>`:''}
      <div class="supervisor-student-metrics"><span>الحضور: ${s.present==null?'—':metric(s.present)}</span><span>الغياب: ${s.absent==null?'—':metric(s.absent)}</span><span>الإتقان: ${metric(s.mastery)}</span><span>نسبة الحضور المنشورة: ${metric(s.attendance)}</span><span>الإعادات: ${metric(s.repeats)}</span><span>آيات جديدة: ${metric(s.new_ayat)}</span></div>
      <small>آخر تحديث: ${esc(formatDate(s.updated_at))}</small></article>`).join('');
      host.innerHTML=`<div class="supervision-subhead"><h3>${heading} (${records.length})</h3><button type="button" data-supervision="students-close" aria-label="طي التفاصيل">إغلاق</button></div>
      <p class="supervision-note">${kind==='students'?(d?.roster_synced_at?'آخر مزامنة لكشف المحفظ: '+esc(formatDate(d.roster_synced_at))+' · مؤشرات ولي الأمر من آخر نسخة منشورة.':'لم يصل كشف الطلاب بعد؛ ستظهر الأسماء المنشورة فقط. تتجدد المزامنة تلقائيًا عند تشغيل حساب المحفظ مع الإنترنت، ويمكنه الضغط على «مزامنة الآن».'):'التقييمات خاصة بالمالك أو المشرف المخوّل بهذه الصلاحية.'}</p>
      ${content||'<p class="supervision-no-data">لا توجد بيانات متاحة. لو عدد الطلاب المنشورين أكبر من صفر، حدّث الصفحة وأعد المحاولة.</p>'}`;
      // Use the SAME teacher card so the user doesn't need to scroll to the end of all teachers.
      reveal(host);
    }catch(err){inlineNotice(host,'تعذر تحميل كشف البيانات. تحقق من اتصال الإنترنت وصلاحية الحساب وتشغيل تحديث قاعدة البيانات.');console.warn('[supervision details]',err?.message||err);}
    finally{busy=false;}
  }
  async function scopes(id,row){if(!isOwner)return;const host=inlineHost(row);if(!host)return;busy=true;inlineNotice(host,'جارٍ تحميل صلاحيات المشرف…');
    try{const d=await rpc('app_supervisor_scope_get',{p_supervisor_user_id:id});
      const items=Array.isArray(d?.teachers)?d.teachers:[];
      host.innerHTML=`<h3>⚙️ نطاق المشرف وصلاحياته</h3><p class="supervision-note">اختر المحفظين المسموح بمتابعتهم، ثم حدد الصلاحيات لكل محفظ. بدون تحديد صلاحيات لن تظهر بياناته للمشرف. التقييمات مغلقة افتراضيًا، وسجل الإدارة والمالية غير متاحين للمشرف.</p>`+
      (items.map(t=>`<div class="supervision-scope-row"><strong>${esc(t.name||'محفظ')}</strong><div class="supervision-scope-options">
      <label><input type="checkbox" data-cap="students" ${t.students?'checked':''}> الطلاب</label>
      <label><input type="checkbox" data-cap="progress" ${t.progress?'checked':''}> مؤشرات التقدم</label>
      <label><input type="checkbox" data-cap="ratings" ${t.ratings?'checked':''}> التقييمات الخاصة</label>
      <label><input type="checkbox" data-cap="messages" ${t.messages?'checked':''}> عدد الرسائل</label>
      </div><button type="button" data-supervision="scope-save" data-teacher="${esc(id)}" data-target="${esc(t.teacher_id)}">حفظ صلاحيات هذا المحفظ</button></div>`).join('')||'<p>لا يوجد محفظون نشطون آخرون لتخصيصهم للمشرف.</p>');
      reveal(host);
    }catch(err){inlineNotice(host,'تعذر تحميل قائمة الصلاحيات. تأكد من تنفيذ SQL الجديد.');}finally{busy=false;}
  }
  async function saveScope(supervisorId,teacherId,row){if(!isOwner)return;
    const host=inlineHost(row),button=[...(host?.querySelectorAll?.('[data-supervision="scope-save"]')||[])].find(x=>x.dataset.target===teacherId);
    const container=button?.closest('.supervision-scope-row');if(!container)return;
    const value={};for(const name of ['students','progress','ratings','messages'])value[name]=Boolean(container.querySelector(`[data-cap="${name}"]`)?.checked);
    if(value.progress&&!value.students){status('مؤشرات التقدم تتطلب أيضًا صلاحية عرض الطلاب.');return;}
    busy=true;try{const d=await rpc('app_supervisor_scope_set',{p_supervisor_user_id:supervisorId,p_teacher_user_id:teacherId,p_permissions:value});
      if(d?.ok!==true)throw Error('UNCONFIRMED');status('تم حفظ صلاحيات المحفظ من الخادم.');button.textContent='✓ تم الحفظ';}
    catch(err){status('تعذر حفظ الصلاحيات. تأكد من اتصال الإنترنت وصلاحية المالك.');}finally{busy=false;}
  }
  async function grant(id,enabled){if(!isOwner||!teachers.some(t=>t.id===id))return;
    if(!g.confirm?.(enabled?'منح صفة مشرف لهذا الحساب؟ لن يطّلع على أي محفظ قبل أن تحدد نطاقه وصلاحياته.':'إلغاء صلاحية الإشراف؟ ستُحجب بيانات الإدارة فورًا.'))return;
    busy=true;try{const result=await rpc('app_supervisor_assign',{p_user_id:id,p_enabled:enabled});if(!result?.ok)throw Error('FAILED');await reload();
      status(enabled?'تم منح صفة المشرف. افتح «صلاحيات ونطاق المشرف» لتحديد المحفظين.':'تم إلغاء صفة المشرف.');}
    catch(err){status('تعذر تغيير صلاحية المشرف.');}finally{busy=false;}
  }
  async function audit(){if(!isOwner)return;const host=$('supervisorDetail');host.hidden=false;host.textContent='جارٍ تحميل سجل الاطلاع…';
    try{const result=await rpc('app_supervision_audit_feed');host.innerHTML='<h3>📜 سجل الاطلاع — للمالك فقط</h3>'+(result.events||[]).map(e=>`<div class="supervisor-detail-row">${esc(e.actor||'إدارة')} · ${esc(({dashboard:'فتح لوحة الإشراف',students:'عرض كشف الطلاب',rating_details:'عرض التقييمات',grant:'منح صلاحية',revoke:'إلغاء صلاحية',audit:'سجل الاطلاع',scope_update:'تعديل نطاق المشرف'})[e.action]||e.action)} · ${esc(new Date(e.at).toLocaleString('ar-EG'))}</div>`).join('');reveal(host);}
    catch(err){host.textContent='تعذر تحميل سجل الإشراف.';}
  }
  function ensureShortcut(){
    // The Premium home intentionally hides legacy direct children; this card
    // gets an explicit CSS exemption and is placed before #v9Home.
    const isTrustedOwner=Boolean(g.WeLiveQuranAuth?.isOwner?.());
    if(!isTrustedOwner&&!allowed){$('supervisorShortcut')?.remove?.();return;}
    const home=$('pg-home');if(!home)return;
    let button=$('supervisorShortcut');
    if(!button){button=document.createElement('button');button.type='button';button.className='supervision-home-entry';button.id='supervisorShortcut';
      button.setAttribute('aria-label','فتح لوحة الإشراف والتقييمات');button.setAttribute('dir','rtl');
      button.innerHTML='<span class="supervision-home-icon" aria-hidden="true">🛡️</span><span class="supervision-home-copy"><strong>لوحة الإشراف</strong><span>المحفظون · الطلاب · التقييمات · الصلاحيات</span><small id="supervisorAccessHint" aria-live="polite"></small></span><span class="supervision-home-arrow" aria-hidden="true">←</span>';
      button.addEventListener('click',open);
    }
    if(home.firstElementChild!==button)home.insertBefore(button,home.firstChild);
    // Whichever feature loads last, do not render two supervision launchers.
    const hasCanonicalHub=Boolean($('roleHomeHub'));
    button.hidden=hasCanonicalHub;
    button.setAttribute('aria-hidden',hasCanonicalHub?'true':'false');
    button.tabIndex=hasCanonicalHub?-1:0;
    const hint=$('supervisorAccessHint');if(hint)hint.textContent=accessHint;
  }
  function clearPrivateView(){requestSeq++;const rows=$('supervisorRows'),detail=$('supervisorDetail');if(rows)rows.replaceChildren();if(detail){detail.hidden=true;detail.replaceChildren();}if($('supervisorOverview'))$('supervisorOverview').replaceChildren();teachers=[];}
  function accessFailure(err){const text=String(err?.message||'');
    if(/INTERNET_LOGIN_REQUIRED/i.test(text)||g.navigator?.onLine===false)return 'مطلوب اتصال بالإنترنت وجلسة دخول صالحة';
    if(/JWT|401|403|auth|session|token/i.test(text))return 'يلزم تجديد جلسة الدخول بجوجل';
    return 'تعذر التحقق، اضغط للمحاولة مجددًا';
  }
  function verifyAccess(){if(accessCheck)return accessCheck;
    accessHint='جارٍ التحقق من الصلاحية…';ensureShortcut();
    accessCheck=(async()=>{
      try{const result=await rpc('app_supervision_access');allowed=result?.allowed===true;isOwner=result?.owner===true;
        accessHint=allowed?'متاحة للإدارة':(g.WeLiveQuranAuth?.isOwner?.()?'تعذّر تأكيد صلاحية المالك':'غير مصرح');
        if(allowed&&!isOwner){const role=document.querySelector('#wlqUserMenu .wlq-user-pop span');if(role)role.textContent='مشرف';}
      }catch(err){allowed=false;isOwner=false;accessHint=accessFailure(err);console.warn('[supervision access]',err?.message||String(err));}
      if(!allowed){clearPrivateView();if(!g.WeLiveQuranAuth?.isOwner?.()){$('supervisorShortcut')?.remove?.();close();}}
      ensureShortcut();return allowed;
    })().finally(()=>{accessCheck=null;});return accessCheck;
  }
  async function authorizeAndReload(){status('جارٍ التأكد من صلاحية الإشراف…');const permitted=await verifyAccess();
    if(!permitted){clearPrivateView();status(accessHint+' — لا تُعرض بيانات الإدارة إلا بعد موافقة الخادم.');return;}
    await reload();
  }
  function open(){if(!g.WeLiveQuranAuth?.isOwner?.()&&!allowed)return;ensure();$('supervisionDialog').hidden=false;document.body.classList.add('supervision-open');authorizeAndReload();}
  function close(){if($('supervisionDialog'))$('supervisionDialog').hidden=true;document.body.classList.remove('supervision-open');}
  async function initialize(){ensureShortcut();if(!g.WeLiveQuranAuth?.isActive?.())return false;ensureRosterEntry();startAutoRosterSync();return verifyAccess();}
  function ensureRosterEntry(){const pg=$('pg-students');if(!pg||$('supervisorRosterSync'))return;
    const entry=document.createElement('div');entry.id='supervisorRosterSync';entry.className='supervision-roster-sync';entry.dir='rtl';
    entry.innerHTML='<details class="imam-roster-details"><summary>👥 حالة مزامنة كشف الطلاب للإدارة (تلقائية)</summary><div><small>يتحدث الكشف تلقائيًا عند فتح حساب المحفظ وعند تغيير الطلاب أو الحضور مع وجود الإنترنت. لا تُرسل الهواتف أو المالية أو رموز الدخول.</small><p id="supervisorRosterSyncStatus" role="status">ستبدأ المزامنة تلقائيًا عند تجهيز البيانات والاتصال بالإنترنت.</p></div><button type="button" id="supervisorRosterSyncButton">مزامنة الآن</button></details>';
    pg.insertBefore(entry,pg.firstChild);$('supervisorRosterSyncButton')?.addEventListener('click',()=>{void syncRoster(false);});
  }
  function getRosterData(){
    const state=g.ImamApp?.State||{},students=state.students??g.students,sessions=state.sessions??g.sessions;
    if(!Array.isArray(students)||!Array.isArray(sessions))return {error:'بيانات الطلاب لم تجهز بعد.'};
    if(students.length===0)return {error:'لا توجد بيانات طلاب جاهزة؛ لن نرسل كشفًا فارغًا أو نمس المزامنة السابقة.'};
    if(students.length>500)return {error:'كشف الطلاب أكبر من ٥٠٠ طالب؛ لن نرسل قائمة ناقصة.'};
    const counts=new Map();
    for(const session of sessions){
      const id=String(session?.studentId||'');if(!id)continue;
      if(!counts.has(id))counts.set(id,{present:0,absent:0});
      const c=counts.get(id);
      if(session.status==='حضر')c.present++;
      else if(session.status==='غاب')c.absent++;
    }
    const draft=[],seen=new Set();
    for(const student of students){
      if(!student?.id||!String(student.name||'').trim())return {error:'بعض ملفات الطلاب غير مكتملة؛ لم نرسل كشفًا جزئيًا.'};
      const id=String(student.id);if(seen.has(id))return {error:'يوجد تكرار بمعرّفات الطلاب؛ لم نرسل كشفًا جزئيًا.'};seen.add(id);
      const c=counts.get(id)||{present:0,absent:0};
      draft.push({id,name:String(student.name).trim().slice(0,120),group:String(student.group||'').slice(0,100),
        level:String(student.level||'').slice(0,80),present:Math.min(99999,c.present),absent:Math.min(99999,c.absent)});
    }
    // Stable order avoids unnecessary publishing on a reordered student list.
    draft.sort((a,b)=>a.id.localeCompare(b.id));
    return {draft,signature:JSON.stringify(draft)};
  }
  async function syncRoster(automatic=false){
    if(publishInFlight)return publishInFlight;
    if(g.navigator?.onLine===false||!authenticatedTeacher()||!client()){
      if(!automatic)rosterMessage('المزامنة تحتاج اتصالًا بالإنترنت وحساب محفظ نشط.');
      return false;
    }
    const actor=currentActor(),{draft,signature,error}=getRosterData();
    if(error){if(!automatic)rosterMessage(error);return false;}
    if(automatic&&actor===lastPublishedAccount&&signature===lastPublishedSignature)return true;
    if(automatic&&Date.now()<retryAfter){scheduleAutoRosterSync('retry',retryAfter-Date.now());return false;}
    const refFn=g.ImamApp?.GuardianPortal?.studentRef;
    if(typeof refFn!=='function'){if(!automatic)rosterMessage('خدمة تعريف الطلاب غير جاهزة.');return false;}
    const button=$('supervisorRosterSyncButton');if(button)button.disabled=true;
    rosterMessage(automatic?'جارٍ تحديث كشف الطلاب للإدارة تلقائيًا…':'جارٍ مزامنة كشف الطلاب للإدارة…');
    publishInFlight=(async()=>{
      try{
        const rows=[];
        for(const {id,...entry} of draft)rows.push({ref:await refFn(id),...entry});
        // Never publish one account's locally loaded data after switching account.
        if(actor!==currentActor()||!authenticatedTeacher())throw Error('ACCOUNT_CHANGED');
        const batch=g.crypto?.randomUUID?.();if(!batch)throw Error('CRYPTO_UNAVAILABLE');
        const result=await rpc('app_teacher_roster_publish',{p_students:rows,p_batch:batch});
        if(result?.ok!==true||Number(result.count)!==rows.length)throw Error('NOT_CONFIRMED');
        lastPublishedAccount=actor;lastPublishedSignature=signature;retryAfter=0;
        rosterMessage(`✅ مزامنة ${rows.length} طالبًا نجحت ${automatic?'تلقائيًا':'يدويًا'}. آخر تحديث: ${new Date().toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'})}.`);
        return true;
      }catch(err){
        console.warn('[supervision roster sync]',err?.message||err);
        if(automatic){retryAfter=Date.now()+MIN_RETRY_MS;rosterMessage('تعذرت المزامنة التلقائية مؤقتًا؛ ستُعاد المحاولة عند توفر الاتصال. بياناتك المحلية محفوظة.');}
        else rosterMessage('لم يتم تأكيد المزامنة. راجع الإنترنت وتحديث قاعدة البيانات ثم أعد المحاولة.');
        return false;
      }finally{if(button)button.disabled=false;}
    })();
    try{return await publishInFlight;}finally{
      publishInFlight=null;
      // A save that arrived while the request was in flight is checked again.
      if(automatic&&canAutoSync())scheduleAutoRosterSync('after-request',7000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{g.setTimeout?.(initialize,1500);g.setTimeout?.(initialize,6000);},{once:true});
  else{g.setTimeout?.(initialize,1500);g.setTimeout?.(initialize,6000);}
  g.addEventListener?.('online',initialize);
  g.ImamApp=g.ImamApp||{};g.ImamApp.Supervision={initialize,open,close,syncRoster,startAutoRosterSync,scheduleAutoRosterSync};
})(globalThis);
