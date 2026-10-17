"use strict";
/* Role-focused quick actions; server access remains enforced by existing RPCs. */
(function(g){
  const $=id=>g.document?.getElementById?.(id);
  let lastRole='',checking=false;
  // Each workspace owns its actions; shared shortcuts in the old home are hidden visually, not deleted.
  const actions={
    owner:[['🌍','الأكاديميات','مساحات العمل والعضويات','academy'],['👥','طلابي المحليون','الملفات المسجلة على هذا الجهاز','students'],['🏫','إدارة الحلقات','التسميع الجماعي والحضور والجداول','circle-manager'],['📊','التقارير','مؤشرات الأكاديمية','reports'],['💬','صندوق الرسائل','رسائل أولياء الأمور','inbox'],['⚙️','الإعدادات','المظهر والحماية والمزامنة','settings'],['📿','ضيوف التحفيظ','إحصاءات الحسابات المرتبطة','guests']],
    supervisor:[['🏫','إدارة الحلقات','الحضور والجداول والتسميع','circle-manager'],['⚙️','إعدادات الحساب','المظهر وتفضيلات العمل','settings'],['📗','المصحف','القراءة والتنزيل','mushaf'],['📊','تقارير حلقتي','تقاريرك التعليمية المحلية','reports']],
    teacher:[['🏫','إدارة الحلقات','التسميع الجماعي والحضور والانضباط','circle-manager'],['📖','ابدأ حصة','التسميع والتكليف','session'],['✅','الحضور','تسجيل حضور طلاب الحلقة','checkin'],['👥','طلابي','الملفات والتقدم','students'],['🧠','مراجعة اليوم','الأخطاء والمراجعة الذكية','followup'],['💬','رسائل الأهالي','الوارد والردود','inbox'],['📊','التقارير','التقدم والحضور','reports'],['➕','طالب جديد','إضافة طالب للحلقة','add-student'],['📗','المصحف','القراءة والتنزيل','mushaf']]
  };
  let authorizedRole='teacher', workspaceChoice='';
  function switchRole(target){
    if(target==='teacher'&&(authorizedRole==='owner'||authorizedRole==='supervisor')){workspaceChoice='teacher';paint('teacher');return;}
    if(target===authorizedRole){workspaceChoice='';paint(authorizedRole);}
  }
  function trigger(code){
    if(code==='supervision')return g.ImamApp?.Supervision?.open?.();
    if(code==='academy'){g.goPage?.('settings');g.ImamApp?.AcademyTenancy?.initialize?.();$('academyWorkspaceFoundation')?.scrollIntoView?.({block:'start',behavior:'smooth'});return;}
    if(code==='inbox')return g.ImamApp?.TeacherInbox?.open?.();
    if(code==='add-student')return g.openAddSt?.();
    if(code==='guests')return showGuests();
    g.goPage?.(code);
  }
  async function showGuests(){
    if(!g.WeLiveQuranAuth?.isOwner?.())return;
    let modal=$('roleGuestReport');if(!modal){modal=g.document.createElement('div');modal.id='roleGuestReport';modal.className='role-report-modal';modal.dir='rtl';modal.innerHTML='<section class="role-report-card" role="dialog" aria-modal="true" aria-label="ضيوف التحفيظ"><div class="role-report-top"><h2>📿 ضيوف التحفيظ</h2><button type="button" id="roleGuestClose">إغلاق</button></div><p>يعرض مستخدمي جوجل الذين اختاروا ربط سجل التحفيظ فقط. الدخول المجهول لا يعرّف الأشخاص ولا يظهر هنا.</p><div id="roleGuestContent" role="status">جارٍ تحميل إحصائيات الضيوف…</div></section>';
      g.document.body.append(modal);$('roleGuestClose').addEventListener('click',()=>modal.hidden=true);modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});}
    modal.hidden=false;const el=$('roleGuestContent');el.textContent='جارٍ تحميل إحصائيات الضيوف…';
    try{const sb=g.WeLiveQuranAuth.getClient?.();if(!sb)throw Error('NO_SESSION');const {data,error}=await sb.rpc('quran_guest_usage_overview');if(error)throw error;
      el.replaceChildren();const summary=g.document.createElement('strong');summary.textContent=`${Number(data?.google_guests||0)} حساب جوجل · ${Number(data?.active_30d||0)} نشط آخر 30 يومًا`;el.append(summary);
      for(const person of Array.isArray(data?.recent)?data.recent:[]){const row=g.document.createElement('p');row.className='role-report-person';row.textContent=`${person.name||'ضيف'} · ${person.email||''} · ${new Date(person.last_seen).toLocaleDateString('ar-EG')}`;el.append(row);}
    }catch(_){el.textContent='تعذر قراءة سجل الضيوف. تأكد من صلاحية مالك المنصة وتنفيذ SQL للإصدار الجديد.';}
  }
  function paint(role){
    const home=$('pg-home');if(!home)return;
    if(!actions[role])role='teacher';
    let box=$('roleHomeHub');if(!box){box=g.document.createElement('section');box.id='roleHomeHub';box.className='role-home-hub';box.dir='rtl';home.prepend(box);}
    lastRole=role;
    home.dataset.workspaceRole=role;
    const title={owner:'الرئيسية — المالك',supervisor:'الرئيسية — المشرف',teacher:'مساحة المحفظ'}[role];
    const desc={owner:'إدارة الأكاديمية والصلاحيات من مكان واحد',supervisor:'متابعة نطاقك المصرح به فقط',teacher:'أهم أعمال الحلقة بضغطة واحدة'}[role];
    box.replaceChildren();
    const head=g.document.createElement('div');head.className='role-home-head';
    const intro=g.document.createElement('div');const h=g.document.createElement('h2');h.textContent=title;const s=g.document.createElement('small');s.textContent=desc;intro.append(h,s);
    const tools=g.document.createElement('div');tools.className='role-home-tools';
    const tag=g.document.createElement('span');tag.className='role-home-tag';tag.textContent={owner:'المالك',supervisor:'مشرف',teacher:'محفظ'}[role];tools.append(tag);
    if(authorizedRole!=='teacher'){
      const toggle=g.document.createElement('button');toggle.type='button';toggle.className='role-workspace-toggle';
      toggle.textContent=role==='teacher'?'العودة إلى الإدارة':'مساحة التحفيظ';toggle.title='تغيير مساحة العمل المعروضة دون تغيير صلاحيات حسابك';
      toggle.addEventListener('click',()=>switchRole(role==='teacher'?authorizedRole:'teacher'));tools.append(toggle);
    }
    const help=g.document.createElement('button');help.type='button';help.className='role-help-toggle';help.textContent='؟ دليل الأزرار';help.title='شرح اختصارات هذه الصفحة';help.addEventListener('click',()=>g.ImamUXGuide?.open?.(role));tools.append(help);
    head.append(intro,tools);box.append(head);
    const grid=g.document.createElement('div');grid.className='role-home-actions';
    for(const [icon,label,detail,code] of actions[role]){
      const btn=g.document.createElement('button');btn.type='button';btn.className='role-home-action';
      const mark=g.document.createElement('span');mark.className='role-icon';mark.textContent=icon;
      const text=g.document.createElement('span');const b=g.document.createElement('b');b.textContent=label;const small=g.document.createElement('small');small.textContent=detail;text.append(b,small);btn.append(mark,text);
      btn.title=detail;btn.setAttribute('aria-label',`${label}: ${detail}`);btn.dataset.helpText=detail;
      btn.addEventListener('click',()=>trigger(code));grid.append(btn);
    }
    box.append(grid);
    g.ImamUXGuide?.maybeOpen?.(role);
    if(role==='teacher'){
      const hint=g.document.createElement('p');hint.className='role-home-footnote';hint.textContent='للحصص والطلاب والمراجعة: اختر المهمة من هنا. بقية الأدوات موجودة في القائمة الجانبية.';box.append(hint);
    }
    const supervisorCard=$('supervisorShortcut');
    if(supervisorCard&&supervisorCard.parentElement===home)supervisorCard.insertAdjacentElement('afterend',box);
    else home.prepend(box);
  }
  async function refresh(){
    if(!g.WeLiveQuranAuth?.isActive?.())return;
    if(g.WeLiveQuranAuth.isOwner?.()){authorizedRole='owner';paint(workspaceChoice==='teacher'?'teacher':'owner');return;}
    authorizedRole='teacher';paint('teacher');
    if(checking||g.navigator?.onLine===false)return;
    checking=true;
    try{
      const client=g.WeLiveQuranAuth.getClient?.();
      if(!client)return;
      const {data,error}=await client.rpc('app_supervision_access');
      if(error)throw error;
      if(data?.allowed===true&&!data?.owner){authorizedRole='supervisor';paint(workspaceChoice==='teacher'?'teacher':'supervisor');}
    }catch(_){/* Fail closed; never unlock supervision based on UI. */}
    finally{checking=false;}
  }
  g.ImamApp=g.ImamApp||{};g.ImamApp.RoleHome={refresh};
  if(g.document.readyState==='loading')g.document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  g.addEventListener?.('online',refresh);
})(globalThis);
