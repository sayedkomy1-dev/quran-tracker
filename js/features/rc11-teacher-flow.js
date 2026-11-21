'use strict';
/* IMAM beta.28-rc.11: teacher-first compact workflow; safe progressive enhancement.
 * Reparents existing controls, never duplicates send/save or changes session/finance data.
 */
(function(g){
 const d=g.document;if(!d)return;
 const $=id=>d.getElementById(id);
 let mounted=false,cleanup=[];
 function compactStudent(){
  const card=$('ia21SessionStudent');if(!card||$('ia31StudentDetails'))return;
  const board=$('beta19SessionBoard'),date=$('sesDate'),draft=$('draftState');
  const row=date?.closest('.frow');
  if(!board&&!row)return;
  const details=d.createElement('details');details.id='ia31StudentDetails';details.className='ia31-student-details';
  const summary=d.createElement('summary');summary.textContent='التاريخ والسبورة والإعدادات';
  details.append(summary);
  if(row)details.append(row);
  if(board)details.append(board);
  // Keep existing ids, change handlers and draft persistence intact; this is a move, never a clone.
  card.append(details);
  if(draft){
    const status=d.createElement('small');status.id='ia31DraftStatus';status.className='ia31-draft-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    card.querySelector('.ch')?.insertAdjacentElement('afterend',status);
    const update=()=>{status.textContent='الحفظ التلقائي: '+(draft.textContent||'جارٍ الإعداد').trim();};update();
    if(g.MutationObserver){const obs=new g.MutationObserver(update);obs.observe(draft,{childList:true,characterData:true,subtree:true});cleanup.push(()=>obs.disconnect());}
  }
  // When the teacher taps a date-related validation issue, its containing DETAILS opens in focusMissing.
 }
 function explainError(kind){
  const health=g.ImamApp?.SaveHealth;
  if(health?.ok===false){
   if(/QuotaExceededError/i.test(health.error||''))return 'لم تُحفظ الحصة: مساحة تخزين المتصفح ممتلئة. حرّر مساحة آمنة دون حذف بيانات الطلاب، ثم أعد المحاولة.';
   return 'لم تُحفظ الحصة على الجهاز ('+(health.error||'خطأ في التخزين')+'). احتفظ بالمسودة وتحقق من مساحة التخزين ثم حاول مرة أخرى.';
  }
  if(!$('sesSt')?.value)return 'اختر الطالب أولًا، ثم أعد الحفظ.';
  if(!$('sesDate')?.value)return 'حدد تاريخ الحصة قبل الحفظ.';
  if(kind==='send'){
   const st=g.ImamApp?.State?.students?.find?.(s=>String(s.id)===String($('sesSt').value));
   if(!st)return 'الحصة قد تكون محفوظة، لكن الطالب غير متاح في الحساب الحالي. راجع الطالب أولًا.';
   if(!st.phone)return 'الحصة قد تكون محفوظة، لكن رقم ولي الأمر غير مسجل. افتح ملف الطالب وأضف الرقم.';
   return 'تعذر تجهيز واتساب. تحقق من رقم ولي الأمر والسماح بفتح الروابط، ثم أعد المشاركة. لا يعني هذا فقد الحصة.';
  }
  return 'تعذر اعتماد الحصة. راجع الحقول المظللة وحالة الحفظ المحلي. لم يتم تأكيد الحفظ.';
 }
 function status(text,type){
  const host=$('v9SessionFooter')||$('sesContent');if(!host)return;
  let item=$('ia31ActionStatus');if(!item){item=d.createElement('p');item.id='ia31ActionStatus';item.className='ia31-action-status';item.setAttribute('role','status');item.setAttribute('aria-live','polite');host.append(item);}
  item.className='ia31-action-status '+(type||'info');item.textContent=text;
 }
 function wrapAction(name,type){
  const original=g[name];if(typeof original!=='function'||original.__ia31Wrapped)return;
  const wrapped=function(...args){
   let result;try{result=original.apply(this,args);}catch(err){status('حدث خطأ أثناء '+(type==='send'?'تجهيز رسالة ولي الأمر':'حفظ الحصة')+': '+(err?.message||'خطأ غير معروف'),'error');throw err;}
   const feedback=ok=>{
    if(ok===false||ok==null)status(explainError(type),'error');
    else if(type==='send')status('حُفظت الحصة وجُهز فتح واتساب. راجع المحادثة واضغط «إرسال» بنفسك؛ التطبيق لا يؤكد التسليم.','success');
    else status('تم حفظ الحصة محليًا. المزامنة السحابية حالة مستقلة.','success');
    return ok;
   };
   return result&&typeof result.then==='function'?result.then(feedback,err=>{status('تعذر إتمام العملية: '+(err?.message||'تعطل غير متوقع'),'error');throw err;}):feedback(result);
  };
  wrapped.__ia31Wrapped=true;
  if(g.ImamApp?.Legacy?.override)g.ImamApp.Legacy.override(name,wrapped,'beta28-rc11-action-feedback');else g[name]=wrapped;
 }
 function bindSaveFeedback(){
  // Preserve the official footer and every original button. No floating send button.
  for(const [name,type] of [['saveSession','save'],['saveAndSendWA','send'],['saveAndSendWAMode','send']])wrapAction(name,type);
  // Save Health also reports failures from auto-save and recovery, not just send actions.
  d.addEventListener('imam:local-save-failed',()=>status(explainError('save'),'error'));
  d.addEventListener('imam:local-save',()=>{const item=$('ia31ActionStatus');if(item?.classList.contains('error'))status('تم حفظ البيانات محليًا بعد إعادة المحاولة.','success');});
 }
 function closeExtrasOnNewStudent(){
  $('sesSt')?.addEventListener('change',()=>{
   for(const id of ['ia29LessonExtras','ia31StudentDetails','ia29ViewOptions']){const el=$(id);if(el)el.open=false;}
   const s=$('ia31ActionStatus');if(s)s.textContent='';
  });
 }
 function init(){
  if(mounted)return true;
  const session=$('pg-session'),tabs=$('v9SessionSteps'),student=$('ia21SessionStudent');
  if(!session||!tabs||!student||!$('sesContent'))return false;
  compactStudent();bindSaveFeedback();closeExtrasOnNewStudent();
  session.classList.add('ia31-compact-lesson');mounted=true;return true;
 }
 function boot(){if(init())return;const host=$('pg-session');if(!host||!g.MutationObserver)return;const obs=new g.MutationObserver(()=>{if(init())obs.disconnect();});obs.observe(host,{childList:true,subtree:true});cleanup.push(()=>obs.disconnect());}
 g.ImamTeacherFlowRC11={init,compactStudent,explainError,status};
 g.addEventListener?.('pagehide',()=>cleanup.forEach(fn=>fn()),{once:true});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(globalThis);
