'use strict';
/* Imam Academy — additive, read-only integration of teacher preparation, follow-up,
   cumulative indicators and absence planning. No second ledger or external AI calls. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImamIntegratedBrief=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const clean=(v,max=180)=>String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
  const escape=v=>clean(v,500).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const day=ses=>clean(ses?.sessionDate||ses?.date||ses?.createdAt,40).slice(0,10);
  const gradeText={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة',juz:'مراجعة الأجزاء',surahReview:'مراجعة السور'};
  function validDay(value){return /^\d{4}-\d\d-\d\d$/.test(String(value||''));}
  function rangeLabel(value){
    if(!value||typeof value!=='object')return '';
    const surah=clean(value.surah||value.surahName,90);
    if(!surah)return '';
    if(value.full)return `سورة ${surah} كاملة`;
    const from=Number(value.from),to=Number(value.to);
    return Number.isInteger(from)&&from>0&&Number.isInteger(to)&&to>=from?`سورة ${surah} (${from}–${to})`:`سورة ${surah}`;
  }
  function getScores(ses){
    const scores=ses?.assessmentScores||{},grades=ses?.prevGrades||{};
    return ['new','rec','far','juz','surahReview'].flatMap(k=>{
      const raw=scores[k];const numeric=raw!==undefined&&raw!==null&&String(raw).trim()!==''&&Number.isFinite(Number(raw))?Math.min(100,Math.max(0,Math.round(Number(raw)))):null;
      const grade=clean(grades[k]||ses?.[k]?.grade,30);
      return numeric!==null||grade?[{type:k,label:gradeText[k],value:numeric,grade}]:[];
    });
  }
  function readTasks(items,id,refDay){return (Array.isArray(items)?items:[])
    .filter(t=>String(t?.studentId||'')===String(id)&&!t.done)
    .filter(t=>!t.dueDate||!validDay(t.dueDate)||t.dueDate<=refDay)
    .slice().sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))).slice(0,8)
    .map(t=>({title:clean(t.title,150),due:validDay(t.dueDate)?t.dueDate:''}));}
  function integrate(student,allSessions,allTasks,refDay,options={}){
    if(!student||!student.id||!validDay(refDay))return null;
    const id=String(student.id),status=student.studentStatus||'active';
    if(status!=='active')return {inactive:true,id};
    const history=(Array.isArray(allSessions)?allSessions:[])
      .filter(s=>String(s?.studentId)===id&&validDay(day(s))&&day(s)<refDay)
      .slice().sort((a,b)=>day(a).localeCompare(day(b))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const latest=history.at(-1)||null;
    const attended=history.filter(s=>s.status==='حضر');
    const previous=attended.at(-1)||null;
    const past=history.slice(-12),absences=past.filter(s=>s.status==='غاب').length;
    const recentScores=attended.slice(-6).map(s=>{
      const numeric=getScores(s).map(x=>x.value).filter(Number.isFinite);
      return numeric.length?Math.round(numeric.reduce((a,b)=>a+b,0)/numeric.length):null;
    }).filter(Number.isFinite);
    const mean=recentScores.length?Math.round(recentScores.reduce((a,b)=>a+b,0)/recentScores.length):null;
    const trend=recentScores.length<2?null:recentScores.at(-1)-recentScores[0];
    const assignments=previous?['new','rec','far'].map(k=>({label:gradeText[k],value:rangeLabel(previous[k])})).filter(x=>x.value):[];
    const due=(Array.isArray(options.reviews)?options.reviews:[]).filter(x=>x&&String(x.due||'')&&x.due<=refDay)
      .slice(0,5).map(x=>({label:clean(x.label||x.surah||x.juzName||'مراجعة',130),due:clean(x.due,10)}));
    const pending=(Array.isArray(options.errors)?options.errors:[]).slice(0,12).map(x=>({
      label:clean(x.type,70),where:clean(x.where||x.section,160),occurrences:Number(x.occurrences)||1
    }));
    const todo=readTasks(allTasks,id,refDay);
    const alerts=[];
    if(latest?.status==='غاب')alerts.push('آخر حصة مسجلة كانت غيابًا؛ راجع التكليف السابق قبل اعتماد تكليف جديد.');
    if(pending.length)alerts.push(`${pending.length} خطأ سابقًا مفتوحًا يحتاج سؤال الطالب.`);
    if(due.length)alerts.push(`${due.length} مراجعة مستحقة وفق جدول المراجعة الموجود.`);
    if(todo.length)alerts.push(`${todo.length} مهمة مفتوحة مرتبطة بالطالب.`);
    if(mean!==null&&mean<70)alerts.push('متوسط النسب المسجلة مؤخرًا منخفض؛ راجع التفاصيل قبل تغيير الخطة.');
    if(!history.length)alerts.push('لا توجد حصص سابقة للطالب.');
    const distinct=[...new Set(alerts)];
    return {id,inactive:false,latest:latest?{day:day(latest),status:clean(latest.status,20),notes:clean(latest.notes,240)}:null,
      previous:previous?{day:day(previous),scores:getScores(previous),notes:clean(previous.notes,240)}:null,
      assignments,pending,due,todo,absences,recentCount:past.length,mean,trend,alerts:distinct,
      absencePlan:latest?.status==='غاب'&&assignments.length?
        'اقتراح للشيخ فقط: الاستماع إلى التكليف السابق أولًا، ثم تعديل خطة الحفظ بعد تقييم الطالب. لم تُسجّل حصة تعويضية أو يُعدّل أي تكليف.':null};
  }
  function render(host,result){
    if(!host)return;
    if(!result||result.inactive){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    const summary=[
      ['آخر حصة',result.latest?`${result.latest.day} · ${result.latest.status}`:'لا توجد حصة سابقة'],
      ['متوسط الأداء المسجّل',result.mean===null?'لا توجد نسب رقمية كافية':`${result.mean}%`],
      ['أخطاء للمتابعة',String(result.pending.length)],
      ['مراجعات مستحقة',String(result.due.length)],
      ['اتجاه الإتقان في النتائج المتاحة',result.trend===null?'بيانات غير كافية':result.trend>0?`تحسن +${result.trend} نقطة`:result.trend<0?`انخفاض ${Math.abs(result.trend)} نقطة`:'دون تغيير'],
      ['الغياب في آخر ١٢ سجلًا',`${result.absences} من ${result.recentCount}`],
    ];
    const entries=(array,format,empty)=>array.length?`<ul>${array.map(item=>`<li>${format(item)}</li>`).join('')}</ul>`:`<p class="itb-muted">${empty}</p>`;
    host.innerHTML=`<details class="itb-disclosure"><summary>🧭 الاستعداد للحصة <small>ملخص تعليمي من سجلات الطالب — قراءة فقط</small></summary>
      <div class="itb-body"><div class="itb-metrics">${summary.map(([label,value])=>`<div><small>${escape(label)}</small><strong>${escape(value)}</strong></div>`).join('')}</div>
      <div class="itb-sections">
        <section><h4>التكليف السابق</h4>${entries(result.assignments,x=>`<b>${escape(x.label)}:</b> ${escape(x.value)}`,'لا يوجد تكليف سابق محدد.')}</section>
        <section><h4>أخطاء مفتوحة</h4>${entries(result.pending,x=>`${escape(x.label)}${x.where?' · '+escape(x.where):''}${x.occurrences>1?' (تكرر '+x.occurrences+')':''}`,'لا توجد أخطاء سابقة مفتوحة.')}</section>
        <section><h4>المراجعات المستحقة</h4>${entries(result.due,x=>`${escape(x.label)} · ${escape(x.due)}`,'لا توجد مراجعات مستحقة في السجل المتاح.')}</section>
        <section><h4>مهام المحفظ المفتوحة</h4>${entries(result.todo,x=>`${escape(x.title)}${x.due?' · '+escape(x.due):''}`,'لا توجد مهام مستحقة مرتبطة بالطالب.')}</section>
      </div>${result.previous?.notes?`<p class="itb-note"><b>ملاحظة محفوظة من آخر حضور:</b> ${escape(result.previous.notes)}</p>`:''}
      ${result.absencePlan?`<p class="itb-attention">${escape(result.absencePlan)}</p>`:''}
      ${result.alerts.length?`<div class="itb-alerts" aria-label="تنبيهات تعليمية">${result.alerts.map(x=>`<p>• ${escape(x)}</p>`).join('')}</div>`:''}
      <p class="itb-footnote">موجز محسوب من السجلات المتاحة على هذا الجهاز. لا يثبت اكتمال المزامنة السحابية، ولا يعتمد درجات أو نتائج تلقائيًا.</p></div>
    </details>`;
  }
  function collectAndRender(){
    if(typeof document==='undefined')return;
    const host=document.getElementById('integratedTeacherBrief'),select=document.getElementById('sesSt');
    if(!host||!select)return;
    const id=select.value,selected=[...select.options].some(x=>x.value===id);
    if(!id||!selected){render(host,null);return;}
    try{
      const allStudents=typeof students!=='undefined'&&Array.isArray(students)?students:[];
      const student=allStudents.find(x=>String(x.id)===String(id));
      if(!student){render(host,null);return;}
      const history=typeof sessions!=='undefined'&&Array.isArray(sessions)?sessions:[];
      const allTasks=typeof tasks!=='undefined'&&Array.isArray(tasks)?tasks:[];
      const refDay=document.getElementById('sesDate')?.value||new Date().toISOString().slice(0,10);
      let errors=[],reviews=[];
      try{if(globalThis.ImamErrorFollowup?.buildQueue)errors=globalThis.ImamErrorFollowup.buildQueue(history,id,refDay,typeof editingSessionId!=='undefined'?editingSessionId:'');}catch(_){}
      try{if(typeof v1059SmartReviewItems==='function')reviews=v1059SmartReviewItems(id);}catch(_){}
      render(host,integrate(student,history,allTasks,refDay,{errors,reviews}));
    }catch(_){host.hidden=false;host.textContent='تعذر إعداد موجز الحصة الآن. وظائف التسميع والحفظ الأخرى لم تتغير.';}
  }
  let initialized=false;
  function init(){
    if(initialized||typeof document==='undefined')return;
    const el=document.getElementById('integratedTeacherBrief');if(!el)return;
    initialized=true;
    if(typeof globalThis.onSesSt==='function'){
      const original=globalThis.onSesSt;
      globalThis.onSesSt=function(...args){const value=original.apply(this,args);collectAndRender();return value;};
    }
    document.getElementById('sesDate')?.addEventListener('change',collectAndRender);
    collectAndRender();
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  }
  return {integrate,render,collectAndRender,rangeLabel,getScores,init};
});
