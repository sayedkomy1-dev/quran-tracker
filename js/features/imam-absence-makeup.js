'use strict';
/* Phase 2 — additive attendance/makeup controls bound to the existing session ledger.
   Planned dates are informational, NOT a second session, schedule reservation or progress. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImamAbsenceMakeup=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const validDay=v=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(v||'')))return false;const d=new Date(`${v}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;};
  const day=s=>String(s?.sessionDate||s?.date||'').slice(0,10);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=(v,n)=>String(v??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
  function linkedBy(absenceId,records,excludeId=''){
    return (Array.isArray(records)?records:[]).find(s=>s?.status==='حضر'&&String(s.makeupForSessionId||'')===String(absenceId)&&String(s.id)!==String(excludeId))||null;
  }
  function availableAbsences(studentId,onDay,records,currentId=''){
    return (Array.isArray(records)?records:[]).filter(s=>s&&String(s.studentId)===String(studentId)&&s.status==='غاب'&&s.id&&validDay(day(s))&&day(s)<onDay)
      .filter(s=>!linkedBy(s.id,records,currentId))
      .sort((a,b)=>day(b).localeCompare(day(a))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  }
  // A planned assignment range is NOT evidence that Quran was heard.
  // Only teacher-entered assessment, actual recitation or recorded correction qualifies.
  function hasRecitationEvidence(data){
    const grades=data?.prevGrades||{};
    const actual=data?.actualRecitation||{};
    const judged=['ممتاز','جيد جداً','جيد','ضعيف','إعادة'].some(g=>Object.values(grades).includes(g));
    return judged||Object.values(actual).some(x=>x&&typeof x==='object'&&x.surah)||
      (Array.isArray(data?.recitationErrors)&&data.recitationErrors.length>0)||
      (Array.isArray(data?.teacher119?.extra)&&data.teacher119.extra.length>0);
  }
  function validate(input){
    const {studentId,dateKey,status,record={},existing=null,records=[]}=input||{};
    if(!studentId||!validDay(dateKey))return {ok:false,error:'حدد الطالب وتاريخ حصة صحيحًا أولًا'};
    if(existing?.id&&existing.status==='غاب'&&status!=='غاب'&&linkedBy(existing.id,records,existing.id))return {ok:false,error:'هذه الحصة الغائبة مرتبطة بتعويض منفذ؛ راجع الربط أولًا ولا تغيّر حالتها'};
    if(status==='غاب'){
      const excused=record.absenceExcused===true;
      const reason=clean(record.excuseReason,300);
      const plan=['none','postponed','makeup'].includes(record.absenceArrangement)?record.absenceArrangement:'none';
      const target=plan==='none'?'':String(record.makeupPlannedDate||'');
      if(excused&&!reason)return {ok:false,error:'اكتب سبب الغياب عند اختيار «بعذر»'};
      if(plan!=='none'&&(!validDay(target)||target<=dateKey))return {ok:false,error:'اختر تاريخ تعويض أو تأجيل صحيحًا بعد يوم الغياب'};
      return {ok:true,fields:{absenceExcused:excused,excuseReason:excused?reason:'',absenceArrangement:plan,makeupPlannedDate:target,learningCompleted:false}};
    }
    if(status==='حضر'){
      const ref=String(record.makeupForSessionId||'');
      if(!ref)return {ok:true,fields:{}};
      const absence=(Array.isArray(records)?records:[]).find(s=>String(s.id)===ref);
      if(!absence||absence.status!=='غاب'||String(absence.studentId)!==String(studentId))return {ok:false,error:'حصة الغياب المرتبطة غير موجودة أو لا تخص هذا الطالب'};
      if(!validDay(day(absence))||day(absence)>=dateKey)return {ok:false,error:'يجب أن يكون التعويض بعد تاريخ الغياب الأصلي'};
      if(linkedBy(ref,records,existing?.id||''))return {ok:false,error:'تم ربط هذه الحصة الغائبة بتعويض آخر بالفعل'};
      return {ok:true,fields:{makeupForSessionId:ref}};
    }
    return {ok:true,fields:{}};
  }
  let state=null;
  const find=id=>typeof document==='undefined'?null:document.getElementById(id);
  function pickRecord(s){return {absenceExcused:s?.absenceExcused===true,excuseReason:clean(s?.excuseReason,300),absenceArrangement:['none','postponed','makeup'].includes(s?.absenceArrangement)?s.absenceArrangement:'none',makeupPlannedDate:validDay(s?.makeupPlannedDate)?s.makeupPlannedDate:'',makeupForSessionId:String(s?.makeupForSessionId||'')};}
  function reset(){state=null;const box=find('imamAbsenceMakeup');if(box){box.hidden=true;box.open=false;}}
  function setRecord(s){state=pickRecord(s);}
  function setDraft(d){if(d&&typeof d==='object')state={...pickRecord(state),...pickRecord(d)};}
  function read(){
    if(!find('iamAbsenceExcused'))return pickRecord(state);
    return {absenceExcused:!!find('iamAbsenceExcused').checked,excuseReason:find('iamAbsenceReason').value,
      absenceArrangement:find('iamArrangement').value,makeupPlannedDate:find('iamPlannedDate').value,
      makeupForSessionId:find('iamMakeupFor').value};
  }
  function capture(){return read();}
  function changed(){
    const excuse=find('iamAbsenceReasonWrap'),dateRow=find('iamPlannedDateWrap');
    if(excuse)excuse.hidden=!find('iamAbsenceExcused')?.checked;
    if(dateRow)dateRow.hidden=find('iamArrangement')?.value==='none';
    if(typeof scheduleDraftSave==='function')scheduleDraftSave();
  }
  function render({studentId,dateKey,status,records=[],existing=null}){
    const box=find('imamAbsenceMakeup');if(!box)return;
    const valid=!!studentId&&validDay(dateKey);
    box.hidden=!valid;if(!valid)return;
    const remembered=pickRecord(state||existing);state=remembered;
    const absences=availableAbsences(studentId,dateKey,records,existing?.id||'');
    // Keep the existing linked absence visible if its date is valid, even on editing.
    const current=remembered.makeupForSessionId;
    const choices=absences.map(s=>`<option value="${esc(s.id)}">${esc(day(s))} — ${s.absenceExcused?'بعذر':'غياب مسجل'}${s.makeupPlannedDate?' (موعد مقترح '+esc(s.makeupPlannedDate)+')':''}</option>`).join('');
    const related=existing?.id&&existing?.status==='غاب'?linkedBy(existing.id,records):null;
    box.innerHTML=`<summary>📅 تنظيم الغياب والتعويض <span class="iam-optional">اختياري</span></summary>
      <div class="iam-description">تنظيم إداري مرتبط بسجلات الحصص الحالية. الموعد المقترح لا يُنشئ حصة ولا يضيف حفظًا أو تقدمًا تلقائيًا.</div>
      <div id="iamAbsentFields" hidden>
        <label class="iam-check"><input type="checkbox" id="iamAbsenceExcused" onchange="ImamAbsenceMakeup.changed()"> الغياب بعذر</label>
        <label id="iamAbsenceReasonWrap" hidden>سبب العذر <input type="text" id="iamAbsenceReason" maxlength="300" placeholder="اكتب السبب" oninput="ImamAbsenceMakeup.changed()"></label>
        <label>التصرف بعد الغياب
          <select id="iamArrangement" onchange="ImamAbsenceMakeup.changed()">
            <option value="none">لا يوجد موعد محدد بعد</option><option value="postponed">تأجيل التكليف لموعد لاحق</option><option value="makeup">التخطيط لحصة تعويضية</option>
          </select>
        </label>
        <label id="iamPlannedDateWrap" hidden>الموعد الذي يعتمده المحفظ <input type="date" id="iamPlannedDate" min="${esc(dateKey)}" onchange="ImamAbsenceMakeup.changed()"></label>
        ${related?`<div class="iam-linked">✅ التعويض الفعلي مسجل في حصة بتاريخ ${esc(day(related))}، ومعرّف الغياب محفوظ.</div>`:''}
      </div>
      <div id="iamPresentFields" hidden>
        <label>هل هذه حصة تعويضية عن غياب سابق؟
          <select id="iamMakeupFor" onchange="ImamAbsenceMakeup.changed()">
            <option value="">لا، حصة عادية</option>${choices}
          </select>
        </label>
        <p class="iam-hint">لا تُعتبر الحصة تعويضًا مكتملًا إلا بعد حضور الطالب وحفظ الحصة الفعلي. لا يتغير سجل الغياب السابق.</p>
      </div>`;
    find('iamAbsenceExcused').checked=remembered.absenceExcused;
    find('iamAbsenceReason').value=remembered.excuseReason;
    find('iamArrangement').value=remembered.absenceArrangement;
    find('iamPlannedDate').value=remembered.makeupPlannedDate;
    find('iamMakeupFor').value=remembered.makeupForSessionId;
    updateStatus(status);changedSilent();
  }
  function changedSilent(){
    const reason=find('iamAbsenceReasonWrap'),dateRow=find('iamPlannedDateWrap');
    if(reason)reason.hidden=!find('iamAbsenceExcused')?.checked;
    if(dateRow)dateRow.hidden=find('iamArrangement')?.value==='none';
  }
  function updateStatus(status){
    const absent=find('iamAbsentFields'),present=find('iamPresentFields'),box=find('imamAbsenceMakeup');
    if(absent)absent.hidden=status!=='غاب';
    if(present)present.hidden=status!=='حضر';
    if(box)box.hidden=!find('sesSt')?.value||status==='إجازة';
  }
  function prepare(context){return validate({...context,record:read()});}
  return {validDay,day,availableAbsences,linkedBy,validate,hasRecitationEvidence,pickRecord,reset,setRecord,setDraft,render,updateStatus,read,capture,prepare,changed};
});
