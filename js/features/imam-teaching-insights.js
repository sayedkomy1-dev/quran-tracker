'use strict';
/* Imam Academy — evidence-based, READ-ONLY teaching intervention insights.
 * The only source of error truth is the session-backed ImamErrorFollowup engine.
 * No new database, automatic grade, external AI service, or student record writes. */
(function attachTeachingInsights(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImamTeachingInsights=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const esc=v=>String(v??'').slice(0,350).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function validDay(value){
    const s=String(value??'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
    const d=new Date(s+'T12:00:00Z');
    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:'';
  }
  function localDay(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  function plusDay(value){const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
  function differenceDays(later,earlier){const a=Date.parse(later+'T12:00:00Z'),b=Date.parse(earlier+'T12:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((a-b)/86400000)):0;}
  function safeStudents(rows){
    const seen=new Set();return (Array.isArray(rows)?rows:[]).filter(r=>{
      const s=r?.st||r, id=String(s?.id??'');
      if(!id||seen.has(id)||s?.studentStatus==='archived'||s?.studentStatus==='stopped')return false;
      seen.add(id);return true;
    }).map(r=>r?.st||r);
  }
  // Supplied rows are already constrained by the existing center's visibility filters.
  // Never look up additional students here or expand access beyond the caller.
  function build(records,visibleRows,referenceDay=localDay(),engine=globalThis.ImamErrorFollowup){
    const today=validDay(referenceDay)||localDay();
    const available=typeof engine?.buildQueue==='function';
    const people=safeStudents(visibleRows), byStudent=new Map(),byId=new Map(),types=new Map();
    let open=0, recurring=0, aged=0, peopleWithErrors=0;
    const source=Array.isArray(records)?records:[];
    const allowed=new Set(people.map(s=>String(s.id)));
    for(const ses of source){
      if(!ses||!allowed.has(String(ses.studentId??'')))continue;
      const id=String(ses.studentId);if(!byStudent.has(id))byStudent.set(id,[]);
      byStudent.get(id).push(ses);
    }
    const focus=[];
    for(const student of people){
      const id=String(student.id),history=byStudent.get(id)||[];
      // Engine's queue excludes its target day; tomorrow includes completed events today
      // and still excludes future-dated sessions (which must not close follow-ups).
      let queue=[];
      try{if(typeof engine?.buildQueue==='function')queue=engine.buildQueue(history,id,plusDay(today),'');}catch(_){queue=[];}
      const items=(Array.isArray(queue)?queue:[]).map(q=>{
        const count=Math.max(1,Math.floor(Number(q.occurrences)||1));
        const last=validDay(q.lastChecked)||validDay(q.lastSeen)||'';
        const age=last?differenceDays(today,last):0;
        const repeated=count>=2,old=age>=14;
        const priority=(count>=3?4:repeated?2:0)+(old?2:0)+(age>=7?1:0);
        return {key:String(q.key||''),type:String(q.type||'غير مصنّف').slice(0,90),where:String(q.where||'').slice(0,160),section:String(q.section||'').slice(0,80),occurrences:count,age,old,repeated,priority,lastSeen:validDay(q.lastSeen)};
      }).sort((a,b)=>b.priority-a.priority||b.occurrences-a.occurrences||b.age-a.age||a.key.localeCompare(b.key));
      const summary={studentId:id,name:String(student.name||''),items,open:items.length,recurring:items.filter(x=>x.repeated).length,aged:items.filter(x=>x.old).length};
      byId.set(id,summary);
      if(items.length)peopleWithErrors++;
      open+=summary.open;recurring+=summary.recurring;aged+=summary.aged;
      for(const item of items){
        const label=item.type||'غير مصنّف';types.set(label,(types.get(label)||0)+1);
      }
      if(items.length)focus.push(summary);
    }
    focus.sort((a,b)=>b.recurring-a.recurring||b.aged-a.aged||b.open-a.open||a.name.localeCompare(b.name,'ar'));
    return {date:today,available,students:people.length,peopleWithErrors,open,recurring,aged,byId,focus,
      types:[...types].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ar')).slice(0,6)};
  }
  function studentFocusCard(student){
    const item=student?.items?.[0];if(!item)return '';
    const detail=[item.type,item.where,item.occurrences>=2?`تكرر ${item.occurrences} مرات`:'',item.old?`آخر تسجيل أو متابعة منذ ${item.age} يومًا`:'' ].filter(Boolean).join(' · ');
    return `<div class="iti-next" role="note"><b>🎯 سؤال مقترح للحصة القادمة</b><span>${esc(detail)}</span><small>مقترح من سجلات الأخطاء، وقرار التقييم للمحفظ وحده.</small></div>`;
  }
  function copySummary(result){
    // Aggregate counts only: error.type is free text and might include personal data.
    // Never copy names, phone numbers, or unreviewed free-text types to management.
    return `ملخص التدخل التعليمي — ${result.date}\nالطلاب في نطاق العرض: ${result.students}\nطلاب لديهم أخطاء مفتوحة: ${result.peopleWithErrors}\nمواضع خطأ مفتوحة: ${result.open}\nأخطاء متكررة: ${result.recurring}\nمواضع آخر تسجيل أو متابعة لها منذ 14 يومًا فأكثر: ${result.aged}\nعدد أنواع الأخطاء المسجلة: ${result.types.length}\nبيانات محلية من مركز المتابعة؛ لا تعني اعتماد إتقان ولا تؤكد اكتمال المزامنة.`;
  }
  function render(result){
    const cards=result.focus.slice(0,6).map(s=>{
      const first=s.items[0];
      return `<li><span><strong>${esc(s.name)}</strong><small>${esc(first.type)}${first.where?' · '+esc(first.where):''}</small></span><span>${s.open} مفتوح · ${s.recurring} متكرر</span></li>`;
    }).join('');
    const types=result.types.map(t=>`<span>${esc(t.label)} <strong>${t.count}</strong></span>`).join('');
    if(!result.available)return '<div class="iti-panel iti-unavailable" role="status">تعذر تحميل محرك متابعة الأخطاء. لا يمكن عرض تحليل موثوق حاليًا، مع استمرار بقية أدوات المتابعة.</div>';
    return `<details class="iti-panel"><summary><span><b>🧭 خطة التدخل التعليمي</b><small>من الأخطاء المفتوحة في سجلات التسميع والمتابعة</small></span><strong>${result.peopleWithErrors} طالب يحتاج سؤالًا</strong></summary>
    <div class="iti-body"><div class="iti-kpis"><span><b>${result.open}</b><small>أخطاء مفتوحة</small></span><span><b>${result.recurring}</b><small>أخطاء متكررة</small></span><span><b>${result.aged}</b><small>آخر متابعة منذ ١٤ يومًا</small></span></div>
    <h4>أبرز أنواع الأخطاء المسجّلة</h4><div class="iti-types">${types||'<small>لا توجد أخطاء مصنّفة مفتوحة.</small>'}</div>
    <h4>أقرب أولويات السؤال للمحفظ</h4>${cards?`<ol class="iti-list">${cards}</ol>`:'<p class="iti-empty">لا توجد أخطاء مفتوحة للطلاب المعروضين حاليًا.</p>'}
    <button type="button" class="btn btn-out btn-sm iti-copy" data-iti-copy>📋 نسخ ملخص إجمالي للإدارة (دون أسماء)</button>
    <p class="iti-copy-status" role="status" aria-live="polite"></p>
    <p class="iti-note">النتائج تعتمد على سجل الحصص المتاح على هذا الجهاز، وتراعي فلتر مركز المتابعة الحالي. العد حسب موضع الخطأ المفتوح، لا عدد مرات التسجيل. التكرار لا يُغلق إلا بتقييم المحفظ، ولا تُرسل أي بيانات إلى خدمات خارجية.</p></div></details>`;
  }
  function renderInto(host,records,visibleRows,referenceDay,engine){
    if(!host)return null;
    const result=build(records,visibleRows,referenceDay,engine);
    // Preserve the disclosure state while filters update.
    const opened=!!host.querySelector?.('details[open]');
    host.innerHTML=render(result);
    const details=host.querySelector?.('details');if(details&&opened)details.open=true;
    const button=host.querySelector?.('[data-iti-copy]');
    button?.addEventListener('click',async()=>{
      const status=host.querySelector?.('.iti-copy-status');
      try{
        const text=copySummary(result);
        if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
        else if(typeof document!=='undefined'){
          const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(area);area.select();
          const success=document.execCommand?.('copy');area.remove();if(!success)throw Error('copy unavailable');
        }else throw Error('copy unavailable');
        if(status)status.textContent='تم نسخ الإحصاءات الإجمالية فقط دون أسماء أو بيانات نصية حرّة.';
      }catch(_){if(status)status.textContent='تعذر النسخ تلقائيًا. يمكنك الاستعانة بالملخص المعروض.';}
    });
    return result;
  }
  return Object.freeze({build,render,renderInto,studentFocusCard,copySummary,validDay});
});
