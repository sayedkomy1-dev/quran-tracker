'use strict';
/* v11.12.0 Stage 1 — scoped, read-only academy drill-down.
 * Server RPCs enforce every permission. No local teacher data and no storage of read responses. */
(function academyAnalytics(g){
  const root=g.ImamApp||(g.ImamApp={});
  const $=id=>g.document?.getElementById?.(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const str=v=>String(v??'').trim();
  const nonnegative=v=>v!==null&&v!==undefined&&str(v)!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
  const pad=v=>v==null?'—':String(v);
  const actor=()=>str(g.WeLiveQuranAuth?.getAccess?.()?.user_id);
  const client=()=>g.WeLiveQuranAuth?.getClient?.();
  const isOnline=()=>g.navigator?.onLine!==false;
  let opened=false,nonce=0,sessionActor='',teachers=[],selectedTeacher='',selectedGroup='',selectedStudent=-1,rows=null,rosterTime=null,accountWatch=null;
  function safeDate(value){if(!value)return 'لم تصل مزامنة';const d=new Date(value);return Number.isFinite(+d)?d.toLocaleString('ar-EG'):'تاريخ غير صالح';}
  function rosterQuality(t){if(!t.roster_synced_at)return 'غير متزامن';let age=Date.now()-Date.parse(t.roster_synced_at);if(!Number.isFinite(age))return 'تاريخ غير صالح';return age>72*3600e3?'متأخر أكثر من ٣ أيام':age>24*3600e3?'متأخر أكثر من يوم':'متزامن حديثًا';}
  function summary(list){const visible=(Array.isArray(list)?list:[]).filter(x=>x&&typeof x==='object');return {
    teachers:visible.length,
    synced:visible.filter(x=>x.can_students!==false&&x.roster_synced_at).length,
    unsynced:visible.filter(x=>x.can_students!==false&&!x.roster_synced_at).length,
    students:visible.reduce((sum,x)=>sum+(x.can_students===false||!x.roster_synced_at?0:nonnegative(x.roster_students)||0),0)
  };}
  function groupsOf(students){
    const map=new Map();
    (Array.isArray(students)?students:[]).forEach((student,index)=>{
      const group=str(student?.group)||'بدون مجموعة محددة';
      if(!map.has(group))map.set(group,[]);
      map.get(group).push({...student,index});
    });
    return [...map.entries()].map(([name,list])=>({name,students:list})).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  }
  function ensure(){let modal=$('academyAnalytics112');if(modal)return modal;
    modal=g.document.createElement('section');modal.id='academyAnalytics112';modal.className='academy-analytics-overlay';modal.hidden=true;
    modal.innerHTML=`<div class="academy-analytics-panel" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="academyAnalyticsTitle">
      <header class="academy-analytics-head"><div><h2 id="academyAnalyticsTitle">📊 التحليلات المتقدمة للأكاديمية</h2><small>من الأكاديمية إلى المحفظ والمجموعة والطالب</small></div><button type="button" data-a112="close" aria-label="إغلاق التحليلات">✕</button></header>
      <p class="academy-analytics-note">قراءة إدارية من كشوف الطلاب التي وصلت للخادم، بصلاحيات المالك أو المشرف. مؤشرات الحضور في الكشوف تراكمية وليست تخص فترة محددة. لن تُعرض بيانات محلية لم يزامنها المحفظ.</p>
      <div class="academy-analytics-toolbar"><button type="button" data-a112="refresh">↻ تحديث من الخادم</button><span id="a112Updated"></span></div>
      <div id="a112Status" role="status" aria-live="polite"></div><div id="a112Summary"></div><nav id="a112Crumbs" aria-label="مستوى التحليل"></nav><div id="a112Content"></div>
    </div>`;
    g.document.body.appendChild(modal);
    modal.addEventListener('click',event=>{
      if(event.target===modal)return close();
      const btn=event.target.closest?.('[data-a112]');if(!btn)return;
      const action=btn.dataset.a112;
      if(action==='close')return close();
      if(action==='refresh')return load();
      if(action==='back-academy'){selectedTeacher='';rows=null;selectedGroup='';selectedStudent=-1;return draw();}
      if(action==='teacher'){selectTeacher(btn.dataset.id);return;}
      if(action==='groups'){selectedGroup='';selectedStudent=-1;return draw();}
      if(action==='group'){selectedGroup=btn.dataset.group;selectedStudent=-1;return draw();}
      if(action==='student'){const ix=Number(btn.dataset.index);if(Number.isInteger(ix)&&ix>=0){selectedStudent=ix;draw();}}
    });
    g.document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened)close();});
    return modal;
  }
  function status(value){const el=$('a112Status');if(el)el.textContent=value;}
  function guards(match){return opened&&match===nonce&&isOnline()&&actor()&&actor()===sessionActor&&g.WeLiveQuranAuth?.isActive?.();}
  async function rpc(method,args={}){
    if(!isOnline()||!actor()||!g.WeLiveQuranAuth?.isActive?.()||!client())throw Error('AUTH_ONLINE_REQUIRED');
    const {data,error}=await client().rpc(method,args);if(error)throw error;return data;
  }
  function cards(items){return `<div class="academy-analytics-metrics">${items.map(([value,label])=>`<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`;}
  function draw(){if(!opened)return;
    const summaryHost=$('a112Summary'),nav=$('a112Crumbs'),host=$('a112Content');if(!host)return;
    const total=summary(teachers);
    summaryHost.innerHTML=cards([[total.teachers,'محفظون في نطاق صلاحيتك'],[total.students,'قيود الطلاب في الكشوف المتزامنة'],[total.synced,'كشوف وصلت'],[total.unsynced,'كشوف لم تصل']]);
    const current=teachers.find(t=>str(t.id)===selectedTeacher);
    const grouped=rows?groupsOf(rows):[];
    const group=grouped.find(x=>x.name===selectedGroup);
    nav.innerHTML=`<button type="button" data-a112="back-academy">الأكاديمية</button>${current?`<span>←</span><button type="button" data-a112="groups">${esc(current.name||'محفظ')}</button>`:''}${group?`<span>←</span><span>${esc(group.name)}</span>`:''}`;
    if(!current){
      host.innerHTML=`<h3>المحفظون</h3>${teachers.length?teachers.map(t=>{
        const scoped=t.can_students===false,known=!!t.roster_synced_at;
        return `<button class="academy-analytics-teacher" data-a112="teacher" data-id="${esc(t.id)}" ${scoped?'disabled title="كشف الطلاب غير مسموح"':''}>
          <b>${esc(t.name||'محفظ')}</b><span>${scoped?'الطلاب خارج نطاق الصلاحية':known?`${pad(nonnegative(t.roster_students))} طالبًا في الكشف`:'عدد الطلاب غير معروف'}</span>
          <small>${esc(scoped?'غير مصرح بقراءة الطلاب':rosterQuality(t))} · آخر كشف: ${esc(safeDate(t.roster_synced_at))}</small>
        </button>`;}).join(''):'<p class="academy-analytics-empty">لا يوجد محفظون متاحون ضمن صلاحيتك.</p>'}`;
      return;
    }
    if(rows===null){host.innerHTML='<p class="academy-analytics-empty">جارٍ تحميل كشف الطلاب بعد التحقق من صلاحية هذا المحفظ…</p>';return;}
    if(!group){
      host.innerHTML=`<h3>المجموعات لدى ${esc(current.name||'المحفظ')}</h3><p class="academy-analytics-note">المجموعات حسب الاسم في كشف المحفظ، وليست بالضرورة الحلقات المسجلة في نظام إدارة الحلقات المحلي.</p>
        ${cards([[rows.length,'أسماء في الكشف المتاح'],[grouped.length,'مجموعات مسجلة'],[rows.filter(x=>x.roster===true).length,'طلاب في كشف المحفظ'],[rows.filter(x=>x.published===true).length,'طلاب لديهم بيانات منشورة']])}
        <p class="academy-analytics-note">آخر تحديث لكشف المحفظ: ${esc(safeDate(rosterTime))}</p>
        ${grouped.length?grouped.map(item=>`<button class="academy-analytics-group" data-a112="group" data-group="${esc(item.name)}"><b>${esc(item.name)}</b><span>${item.students.length} طالبًا</span></button>`).join(''):'<p class="academy-analytics-empty">لا توجد أسماء في كشف هذا المحفظ. راجع حالة المزامنة.</p>'}`;
      return;
    }
    if(selectedStudent>=0){
      const student=rows[selectedStudent];
      if(!student||!group.students.some(s=>s.index===selectedStudent)){selectedStudent=-1;return draw();}
      const attendance=nonnegative(student.present),absent=nonnegative(student.absent);
      const mastery=student.mastery==null||str(student.mastery)===''?'غير منشور':str(student.mastery);
      host.innerHTML=`<button type="button" data-a112="group" data-group="${esc(group.name)}">← العودة إلى أسماء الطلاب</button><h3>${esc(student.name||'طالب')}</h3>
        ${cards([[esc(student.level||'غير محدد'),'المستوى'],[pad(attendance),'حضور تراكمي'],[pad(absent),'غياب تراكمي'],[mastery,'مؤشر إتقان منشور']])}
        <p class="academy-analytics-note">${student.roster?'موجود في كشف المحفظ':'ليس في كشف المحفظ الحالي'} · ${student.published?'لديه بيانات منشورة لولي الأمر':'لا توجد بيانات منشورة'} · آخر تحديث متاح: ${esc(safeDate(student.updated_at))}.</p>
        <p class="academy-analytics-note">هذه مؤشرات قراءة فقط. لا تتضمن الدرجات التفصيلية أو أخطاء التلاوة غير المنشورة.</p>`;
      return;
    }
    const withCounts=group.students.filter(s=>nonnegative(s.present)!=null&&nonnegative(s.absent)!=null);
    const p=withCounts.reduce((sum,s)=>sum+nonnegative(s.present),0),a=withCounts.reduce((sum,s)=>sum+nonnegative(s.absent),0);
    host.innerHTML=`<h3>${esc(group.name)}</h3>${cards([[group.students.length,'طلاب في المجموعة'],[withCounts.length?String(p):'—','حضور تراكمي متاح'],[withCounts.length?String(a):'—','غياب تراكمي متاح']])}
       <p class="academy-analytics-note">الحضور والغياب إجمالي ما أرسله المحفظ من جهازه، وليس تقريرًا شهريًا. ظهور «—» يعني أن الصلاحية أو البيانات غير متاحة.</p>
       ${group.students.map(s=>`<button class="academy-analytics-student" data-a112="student" data-index="${s.index}"><b>${esc(s.name||'طالب')}</b><span>${esc(s.level||'بدون مستوى')} · حضور ${pad(nonnegative(s.present))} · غياب ${pad(nonnegative(s.absent))}</span></button>`).join('')}`;
  }
  async function selectTeacher(id){
    const t=teachers.find(x=>str(x.id)===str(id));if(!t||t.can_students===false)return;
    selectedTeacher=str(t.id);selectedGroup='';selectedStudent=-1;rows=null;draw();
    const token=++nonce;status('جارٍ تحميل كشف المحفظ…');
    try{
      const data=await rpc('app_supervision_students',{p_teacher_id:t.id});
      if(!guards(token)||selectedTeacher!==str(t.id))return;
      rows=Array.isArray(data?.students)?data.students:[];
      rosterTime=data?.roster_synced_at||t.roster_synced_at;
      status('تم تحميل كشف الطلاب بصلاحية القراءة فقط.');draw();
    }catch(err){if(!guards(token))return;rows=null;status('تعذر تحميل كشف الطلاب. تحقق من الاتصال أو صلاحية المشرف.');$('a112Content').innerHTML='<p class="academy-analytics-empty">لم تُعرض أي بيانات غير مؤكدة.</p>';}
  }
  async function load(){const token=++nonce;teachers=[];selectedTeacher='';selectedGroup='';selectedStudent=-1;rows=null;
    $('a112Updated').textContent='';status('جارٍ التأكد من الصلاحية وتحميل مؤشرات الأكاديمية…');draw();
    try{
      const access=await rpc('app_supervision_access');
      if(!guards(token))return;
      if(access?.allowed!==true)throw Error('NOT_AUTHORIZED');
      const response=await rpc('app_supervision_dashboard');
      if(!guards(token))return;
      teachers=Array.isArray(response?.teachers)?response.teachers:[];
      $('a112Updated').textContent='آخر قراءة من الخادم: '+new Date().toLocaleString('ar-EG');
      status(response?.owner?'عرض المالك: جميع المحفظين المتاحين خادميًا.':'عرض المشرف: المحفظون المسموح بهم فقط.');draw();
    }catch(err){if(!opened||token!==nonce||sessionActor!==actor())return;
      teachers=[];draw();status('تعذر تأكيد صلاحية الإدارة أو تحميل البيانات. يلزم اتصال نشط وحساب مالك أو مشرف مصرح له.');}
  }
  function open(){const modal=ensure();if(opened)close();sessionActor=actor();opened=true;modal.hidden=false;modal.querySelector('[data-a112="close"]')?.focus();
    accountWatch=g.setInterval?.(()=>{if(opened&&(!actor()||actor()!==sessionActor||!g.WeLiveQuranAuth?.isActive?.()))close();},1500);
    if(!sessionActor||!isOnline()||!g.WeLiveQuranAuth?.isActive?.()){teachers=[];draw();status('يلزم اتصال بالإنترنت وجلسة إدارية نشطة؛ لا توجد نسخة إدارية محفوظة محليًا.');return;}
    void load();
  }
  function close(){if(accountWatch!==null){g.clearInterval?.(accountWatch);accountWatch=null;}opened=false;nonce++;teachers=[];rows=null;selectedTeacher='';selectedGroup='';selectedStudent=-1;sessionActor='';const modal=$('academyAnalytics112');if(modal)modal.hidden=true;for(const id of ['a112Summary','a112Crumbs','a112Content','a112Status','a112Updated']){const section=$(id);if(section)section.replaceChildren?.();if(section)section.textContent='';}}
  g.addEventListener?.('offline',()=>{if(opened){nonce++;teachers=[];rows=null;draw();status('انقطع الاتصال؛ تم حجب المؤشرات الإدارية حتى التحقق مجددًا.');}});
  root.AcademyAnalytics={open,close,summary,groupsOf,rosterQuality};
})(globalThis);
