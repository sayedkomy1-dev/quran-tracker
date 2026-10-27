'use strict';
/* Read-only follow-up-center summary of pending makeup plans and suspect links.
 * Uses the existing session ledger; no localStorage, server or mutations. */
(function attachAgenda(g,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(g)g.ImamMakeupAgenda=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>{const x=String(v??'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return '';const d=new Date(x+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x?x:'';};
  const day=s=>date(s?.sessionDate||s?.date);
  const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  function build(records,activeStudents,referenceDay=localToday()){
    const list=Array.isArray(records)?records:[];
    const people=new Map((Array.isArray(activeStudents)?activeStudents:[]).filter(s=>s&&s.id!=null).map(s=>[String(s.id),s]));
    const allowed=new Set(people.keys());
    const absenceById=new Map(list.filter(s=>s?.status==='غاب'&&s.id!=null).map(s=>[String(s.id),s]));
    const links=new Map(),issues=new Set();
    for(const s of list){
      if(s?.status!=='حضر'||!s.makeupForSessionId||!allowed.has(String(s.studentId)))continue;
      const ref=String(s.makeupForSessionId),absence=absenceById.get(ref);
      if(!absence||String(absence.studentId)!==String(s.studentId)||!day(absence)||!day(s)||day(s)<=day(absence)){
        issues.add(`invalid:${String(s.id||ref)}`);continue;
      }
      if(!links.has(ref))links.set(ref,[]);
      links.get(ref).push(s);
    }
    const pending=[];
    for(const a of list){
      if(a?.status!=='غاب'||!a.id||!allowed.has(String(a.studentId)))continue;
      const same=links.get(String(a.id))||[];
      if(same.length>1)issues.add(`duplicate:${a.id}`);
      if(same.length)continue;
      const kind=String(a.absenceArrangement||'');
      if(!['makeup','postponed'].includes(kind))continue;
      const planned=date(a.makeupPlannedDate),original=day(a);
      if(!planned||!original||planned<=original){issues.add(`invalid-date:${a.id}`);continue;}
      pending.push({studentId:String(a.studentId),studentName:String(people.get(String(a.studentId))?.name||'طالب'),absenceId:String(a.id),absenceDay:original,plannedDay:planned,kind,overdue:planned<referenceDay,dueToday:planned===referenceDay});
    }
    pending.sort((a,b)=>a.plannedDay.localeCompare(b.plannedDay)||a.studentName.localeCompare(b.studentName,'ar')||a.absenceId.localeCompare(b.absenceId));
    return {pending,overdue:pending.filter(x=>x.overdue).length,today:pending.filter(x=>x.dueToday).length,upcoming:pending.filter(x=>!x.overdue&&!x.dueToday).length,issues:issues.size};
  }
  function render(host,data){
    if(!host)return;
    if(!data){host.hidden=true;host.replaceChildren();return;}
    host.hidden=false;
    const shown=data.pending.slice(0,10),extra=data.pending.length-shown.length;
    host.innerHTML=`<details class="ima-agenda"><summary><span><b>📅 التعويضات المؤجلة والمتابعة</b><small>من الحصص المسجلة — للمتابعة فقط</small></span><strong>${data.pending.length} معلقة · ${data.overdue} متأخرة</strong></summary>
      <div class="ima-agenda-body"><div class="ima-agenda-metrics"><span>مستحقة اليوم: <b>${data.today}</b></span><span>قادمة: <b>${data.upcoming}</b></span><span>متأخرة: <b>${data.overdue}</b></span></div>
      ${shown.length?`<ul class="ima-agenda-list">${shown.map(x=>`<li><div><strong>${esc(x.studentName)}</strong><small>غياب ${esc(x.absenceDay)} · ${x.kind==='postponed'?'تأجيل التكليف':'تعويض مقترح'}</small></div><span class="${x.overdue?'ima-overdue':''}">${esc(x.plannedDay)}${x.overdue?' · متأخر':x.dueToday?' · اليوم':''}</span></li>`).join('')}</ul>${extra>0?`<p>و${extra} موعدًا آخر. استخدم فلتر الحلقة لتضييق النتائج.</p>`:''}`:'<p>لا توجد مواعيد تعويض أو تأجيل معلّقة للطلاب الظاهرين في المركز.</p>'}
      ${data.issues?`<p class="ima-agenda-warning">⚠️ هناك ${data.issues} إشارة إلى بيانات تعويض تحتاج مراجعة يدوية. لم يُصحح النظام أي سجل تلقائيًا.</p>`:''}
      <p class="ima-agenda-note">الاختيار هنا لا يُعد حجزًا في جدول الحلقة، ولا يثبت اكتمال الحفظ. السجلات المعروضة تتبع الطلاب الظاهرين وفق فلاتر المركز. لا يتم إرسال إشعارات خارجية.</p></div></details>`;
  }
  function renderInto(host,records,students,referenceDay){try{render(host,build(records,students,referenceDay||localToday()));}catch(_){if(host){host.hidden=false;host.textContent='تعذر عرض مواعيد التعويض حاليًا. سجلات الحصص الأصلية لم تتغير.';}}}
  return Object.freeze({build,render,renderInto,localToday});
});
