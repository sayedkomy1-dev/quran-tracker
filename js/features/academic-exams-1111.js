'use strict';
/* Imam Academy 11.11.0: locally recorded, human-verified Quran examinations,
 * internal ijazah tracking, performance analysis and manual guardian contact.
 * Student-owned additive records; no automatic religious authorization. */
(function(g){
  const root=g.ImamApp||(g.ImamApp={});
  const $=id=>g.document?.getElementById?.(id);
  const esc=v=>root.Utils?.escapeHtml?.(v)??String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state=()=>root.State||{};
  const examKinds={surah:'اختبار سورة',juz:'اختبار جزء',khatm:'اختبار ختم القرآن',tajweed:'اختبار أحكام التجويد'};
  const gradeMap={'ممتاز':'passed','جيد جداً':'passed','جيد جدًا':'passed','جيد':'passed','ضعيف':'not_passed','إعادة':'repeat'};
  const gradeLabels={passed:'اجتاز',repeat:'إعادة الاختبار',not_passed:'لم يجتز'};
  const isoDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const validDate=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'))&&new Date(d+'T12:00:00').toISOString().slice(0,10)===d;
  const id=()=>root.Utils?.makeId?.('exam')||`exam-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const students=()=>Array.isArray(state().students)?state().students:[];
  const sessions=()=>Array.isArray(state().sessions)?state().sessions:[];
  const surahs=()=>Array.isArray(g.S)?g.S:(typeof S!=='undefined'&&Array.isArray(S)?S:[]);
  const stById=studentId=>students().find(x=>String(x.id)===String(studentId));
  const activeUser=()=>g.WeLiveQuranAuth?.getAccess?.()||{};
  const role=()=>String(activeUser().role||'').toLowerCase();
  const canTeach=()=>!['guest','visitor','guardian','parent','student','ضيف','ولي أمر'].includes(role()) && !(g.WeLiveQuranAuth?.isActive?.()===false&&role());
  const isOwner=()=>g.WeLiveQuranAuth?.isOwner?.()===true||role()==='owner';
  const userId=()=>String(activeUser().user_id||activeUser().user?.id||root.Auth?.currentUser?.()?.id||'');
  function validateExam(x, quran=surahs()){
    const errors=[];
    if(!x||!examKinds[x.kind])errors.push('نوع الاختبار غير صحيح');
    if(!String(x?.studentId||'').trim())errors.push('اختر الطالب');
    if(!validDate(x?.date)||x.date>isoDay())errors.push('تاريخ الاختبار غير صحيح');
    if(!Object.prototype.hasOwnProperty.call(gradeMap,String(x?.grade||'')))errors.push('حدد تقدير المحفظ');
    if(!Array.isArray(x?.committee)||!x.committee.length||x.committee.length>8||x.committee.some(n=>typeof n!=='string'||!n.trim()||n.length>100))errors.push('حدد عضو لجنة حقيقيًا واحدًا على الأقل');
    if(x?.score!==null&&x?.score!==undefined&&(!Number.isFinite(Number(x.score))||Number(x.score)<0||Number(x.score)>100))errors.push('النسبة خارج المدى من صفر إلى مئة');
    if(x?.kind==='surah'){
      const n=Number(x.surahId),from=Number(x.from),to=Number(x.to),max=quran[n-1]?.a;
      if(!Number.isInteger(n)||n<1||n>quran.length||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>max)errors.push('موضع السورة والآيات غير صحيح');
    }
    if(x?.kind==='juz'&&(!Number.isInteger(Number(x.juz))||Number(x.juz)<1||Number(x.juz)>30))errors.push('اختر جزءًا صحيحًا');
    if((x?.kind==='khatm'||x?.kind==='tajweed')&&!String(x.evidence||'').trim())errors.push('اكتب أدلة الاختبار والمستوى الذي تحقق منه المحفظ');
    if(x?.kind==='khatm'&&x.grade==='ممتاز'&&!String(x.evidence||'').trim())errors.push('شهادة الختم تحتاج دليلًا');
    return errors;
  }
  function validateLicense(x, exam, owner){
    const errs=[];
    if(!owner)errs.push('اعتماد الإجازة الداخلية للمالك فقط');
    if(!exam||exam.status!=='passed')errs.push('اختبار ناجح ومثبت مطلوب');
    if(!['khatm','tajweed'].includes(exam?.kind))errs.push('حدد اختبارًا مناسبًا للإجازة');
    if(!String(x?.narration||'').trim())errs.push('حدد الرواية');
    if(!String(x?.sanad||'').trim())errs.push('يلزم تدوين تفاصيل السند الفعلية');
    if(!String(x?.issuer||'').trim())errs.push('حدد المجيز الحقيقي');
    if(!x?.confirmed)errs.push('يلزم تأكيد التحقق البشري من الرواية والسند والمجيز');
    return errs;
  }
  function auditEntry(action,recordId,studentId){return {id:id(),action,recordId,studentId,actorId:userId()||null,at:new Date().toISOString()};}
  function saveStudentRecord(st,key,record,action){
    if(!canTeach()||!st)return {ok:false,error:'لا توجد صلاحية أو طالب'};
    const before=st[key],beforeUpdated=st.updatedAt,beforeAudit=st.academicAudit1111;
    if((before||[]).some(x=>x.id===record.id))return {ok:false,error:'السجل مسجل بالفعل'};
    st[key]=[...(Array.isArray(before)?before:[]),record];st.academicAudit1111=[...(beforeAudit||[]),auditEntry(action,record.id,st.id)].slice(-500);st.updatedAt=new Date().toISOString();
    try{if(typeof g.save!=='function'||g.save()!==true)throw Error('NOT_SAVED');return {ok:true,record};}
    catch(_){st[key]=before;st.academicAudit1111=beforeAudit;st.updatedAt=beforeUpdated;return {ok:false,error:'تعذر تأكيد الحفظ، لم تُعتمد النتيجة'};}
  }
  function createExam(st,input){
    const errors=validateExam(input);if(!st||String(st.id)!==String(input?.studentId))errors.push('الطالب غير معروف');
    if(errors.length)return {ok:false,error:errors.join('؛ ')};
    // Prevent rapid duplicate clicks, not legitimate repeat attempts later.
    const duplicate=(st.academicExams1111||[]).some(x=>x.kind===input.kind&&x.date===input.date&&x.grade===input.grade&&
      String(x.surahId||'')===String(input.surahId||'')&&String(x.juz||'')===String(input.juz||'')&&
      Number.isFinite(Date.parse(x.createdAt))&&Date.now()-Date.parse(x.createdAt)>=0&&Date.now()-Date.parse(x.createdAt)<15000);
    if(duplicate)return {ok:false,error:'هذه النتيجة سُجلت للتو؛ راجع سجل الاختبارات قبل الإعادة'};
    const record={id:id(),kind:input.kind,date:input.date,studentId:st.id,surahId:Number(input.surahId)||null,from:input.kind==='surah'?Number(input.from):null,to:input.kind==='surah'?Number(input.to):null,juz:input.kind==='juz'?Number(input.juz):null,grade:input.grade,status:gradeMap[input.grade],score:input.score==null?null:Number(input.score),committee:input.committee.map(s=>String(s).trim()),evidence:String(input.evidence||'').slice(0,2000),notes:String(input.notes||'').slice(0,1000),sessionId:String(input.sessionId||''),approvedBy:userId()||null,approvedAt:new Date().toISOString(),source:'human-exam',createdAt:new Date().toISOString()};
    return saveStudentRecord(st,'academicExams1111',record,'exam-approved');
  }
  function createLicense(st,examId,input){
    const exam=(st?.academicExams1111||[]).find(x=>x.id===examId);const errors=validateLicense(input,exam,isOwner());
    if(errors.length)return {ok:false,error:errors.join('؛ ')};
    if((st.academicLicenses1111||[]).some(x=>x.examId===exam.id&&x.narration===String(input.narration).trim()&&x.status==='internal-approved'))
      return {ok:false,error:'هذا الاعتماد الداخلي موجود بالفعل؛ لا يمكن تكراره لنفس الاختبار والرواية'};
    const record={id:id(),examId:exam.id,studentId:st.id,narration:String(input.narration).trim().slice(0,200),sanad:String(input.sanad).trim().slice(0,2000),issuer:String(input.issuer).trim().slice(0,160),note:String(input.note||'').slice(0,500),approvedBy:userId(),approvedAt:new Date().toISOString(),status:'internal-approved',label:'سجل إجازة داخلي — غير قابل للتحقق العام',createdAt:new Date().toISOString()};
    return saveStudentRecord(st,'academicLicenses1111',record,'license-internal-approved');
  }
  function uniqueDates(list){return new Set(list.map(x=>String(x.sessionDate||x.date||'').slice(0,10)).filter(Boolean)).size;}
  function weekBounds(period){
    if(!/^\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/.test(period))return null;
    const [year,week]=period.split('-W').map(Number);
    const jan4=new Date(Date.UTC(year,0,4));const jan4Day=(jan4.getUTCDay()+6)%7;
    const monday=new Date(Date.UTC(year,0,4-jan4Day+(week-1)*7));
    const sunday=new Date(monday);sunday.setUTCDate(sunday.getUTCDate()+6);
    return [monday.toISOString().slice(0,10),sunday.toISOString().slice(0,10)];
  }
  function currentWeek(){const d=new Date(),current=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));current.setUTCDate(current.getUTCDate()+4-(current.getUTCDay()||7));const year=current.getUTCFullYear();const yearStart=new Date(Date.UTC(year,0,1));return `${year}-W${String(Math.ceil((((current-yearStart)/86400000)+1)/7)).padStart(2,'0')}`;}
  function inPeriod(day,period){if(typeof day!=='string'||day.length<10)return false;
    if(/^\d{4}-\d{2}$/.test(period))return day.slice(0,7)===period;
    const bounds=weekBounds(period);return !!bounds&&day>=bounds[0]&&day<=bounds[1];
  }
  function summary(studentId,month=isoDay().slice(0,7),s=sessions(),sts=students()){
    if(!/^\d{4}-\d{2}$/.test(month)&&!weekBounds(month))return null;
    const st=sts.find(x=>String(x.id)===String(studentId));if(!st)return null;
    const range=s.filter(x=>String(x.studentId)===String(studentId)&&inPeriod(String(x.sessionDate||x.date||'').slice(0,10),month));
    const present=range.filter(x=>x.status==='حضر'),absent=range.filter(x=>x.status==='غاب'&&x.absenceExcused!==true),excused=range.filter(x=>x.status==='إجازة'||x.absenceExcused===true);
    const exams=(st.academicExams1111||[]).filter(x=>inPeriod(x.date,month));
    const grades=range.flatMap(x=>Object.values(x.prevGrades||{})).filter(x=>gradeMap[x]);
    return {month,studentId:st.id,name:st.name,recordedDays:uniqueDates(range),presentDays:uniqueDates(present),absentDays:uniqueDates(absent),excusedDays:uniqueDates(excused),unassessedDays:0,tests:exams.length,passed:exams.filter(x=>x.status==='passed').length,repeat:exams.filter(x=>x.status==='repeat'||x.status==='not_passed').length,graded:grades.length,mastered:grades.filter(x=>gradeMap[x]==='passed').length,errors:range.reduce((n,x)=>n+(x.recitationErrors?.length||0),0)};
  }
  function summarizeGroup(group,month,sts=students(),s=sessions()){
    const arr=sts.filter(st=>(String(st.group||'').trim()||'بدون مجموعة')===group).map(st=>summary(st.id,month,s,sts)).filter(Boolean);
    return {students:arr.length,sessions:arr.reduce((a,b)=>a+b.recordedDays,0),attendances:arr.reduce((a,b)=>a+b.presentDays,0),confirmedAbsences:arr.reduce((a,b)=>a+b.absentDays,0),exams:arr.reduce((a,b)=>a+b.tests,0),passed:arr.reduce((a,b)=>a+b.passed,0),needsFollowup:arr.filter(x=>x.absentDays>0||x.repeat>0).length};
  }
  function contactMessage(st,month){const x=summary(st.id,month);if(!x)return '';return `السلام عليكم ورحمة الله وبركاته\n\nمتابعة الطالب: ${st.name}\nالفترة: ${month}\nأيام الحضور المسجلة: ${x.presentDays}\nالغياب المؤكد دون عذر: ${x.absentDays}\nأيام العذر/الإجازة: ${x.excusedDays}\nالاختبارات المسجلة: ${x.tests} (اجتاز: ${x.passed}، يحتاج إعادة أو متابعة: ${x.repeat})\nأخطاء التسميع المسجلة: ${x.errors}\n\nهذا الملخص من السجلات التي دوّنها المحفظ، ولا يُعد غياب تسجيل الحصة دليلًا على الغياب.\nجزاكم الله خيرًا.`;}
  function contactEvent(st,month,status){
    if(!['open_attempted','confirmed_sent','not_sent'].includes(status))return {ok:false,error:'حالة التواصل غير صحيحة'};
    const record={id:id(),studentId:st.id,month,status,actorId:userId()||null,at:new Date().toISOString(),channel:'whatsapp',proof:'user-declaration'};
    return saveStudentRecord(st,'guardianContact1111',record,'guardian-contact-'+status);
  }
  let ui={studentId:'',tab:'exams',month:isoDay().slice(0,7),contactPeriod:'month',kind:'surah'};
  const opts=(list,val)=>list.map(([k,v])=>`<option value="${esc(k)}" ${String(k)===String(val)?'selected':''}>${esc(v)}</option>`).join('');
  function chosen(){return stById(ui.studentId);}
  function draw(){const host=$('ac1111Panel'),st=chosen();if(!host)return;
    $('ac1111Student').innerHTML=opts([['','— اختر الطالب —'],...students().map(s=>[s.id,s.name])],ui.studentId);
    $('ac1111Month').value=ui.month;
    $('ac1111Tabs')?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===ui.tab));
    if(!st){host.innerHTML='<div class="ac1111-empty">اختر طالبًا لعرض الاختبارات والنتائج والسند والمتابعة.</div>';return;}
    host.innerHTML=ui.tab==='exams'?examPanel(st):ui.tab==='licenses'?licensePanel(st):ui.tab==='analytics'?analyticsPanel(st):contactPanel(st);
  }
  function examPanel(st){const records=(st.academicExams1111||[]).slice().reverse();const surahOpts=surahs().map((x,i)=>[String(i+1),`${i+1} — ${x.n}`]);
    return `<div class="ac1111-layout"><section class="card"><h3>تسجيل اختبار قرآني</h3><p class="ac1111-hint">تقييم بشري مستقل يستخدم سلم تقديرات المراجعات الحالي؛ لا يتحول آليًا إلى إجازة أو شهادة.</p><div class="ac1111-form"><label>نوع الاختبار<select id="acKind">${opts(Object.entries(examKinds),ui.kind)}</select></label><div id="acSurahFields" class="ac1111-row"><label>السورة<select id="acSurah">${opts(surahOpts,'1')}</select></label><label>من آية<input id="acFrom" type="number" min="1" value="1"></label><label>إلى آية<input id="acTo" type="number" min="1" value="7"></label><button type="button" data-action="read">📖 النص</button></div><div id="acJuzFields" hidden><label>الجزء<select id="acJuz">${opts(Array.from({length:30},(_,i)=>[String(i+1),`الجزء ${i+1}`]),'1')}</select></label><label>ربع الجزء للمعاينة<select id="acJuzQuarter">${opts(Array.from({length:8},(_,i)=>[String(i+1),`الربع ${i+1}`]),'1')}</select></label><button type="button" class="btn btn-out" data-action="read-juz">📖 معاينة نص ربع الجزء</button></div><label>التقدير<select id="acGrade">${opts([['','— حدد التقدير —'],['ممتاز','ممتاز ⭐⭐⭐'],['جيد جداً','جيد جدًا ⭐⭐'],['جيد','جيد ⭐'],['ضعيف','يحتاج متابعة / لم يجتز'],['إعادة','إعادة الاختبار']],'')}</select></label><label>النسبة من ١٠٠ (اختياري)<input id="acScore" type="number" min="0" max="100"></label><label>أسماء أعضاء اللجنة (سطر لكل عضو)<textarea id="acCommittee" rows="2" maxlength="800" placeholder="الشيخ الممتحن"></textarea></label><label>الأدلة وملاحظات الاختبار<textarea id="acEvidence" rows="3" maxlength="2000" placeholder="ما تم سماعه فعلاً وملاحظات اللجنة"></textarea></label><label>تاريخ الاختبار<input id="acDate" type="date" value="${isoDay()}"></label><button type="button" class="btn btn-g" data-action="exam-save">اعتماد نتيجة الاختبار</button></div></section><section class="card"><h3>سجل الاختبارات</h3>${records.map(x=>`<div class="ac1111-record"><b>${esc(examKinds[x.kind]||x.kind)}</b> <span>${esc(x.grade)} — ${esc(gradeLabels[x.status]||'')}</span><small>${esc(x.date)} · اللجنة: ${esc((x.committee||[]).join('، '))}</small><small>${esc(x.evidence||'')}</small></div>`).join('')||'<p>لا توجد اختبارات مسجلة بعد.</p>'}</section></div>`;}
  function licensePanel(st){const exams=(st.academicExams1111||[]).filter(x=>x.status==='passed'&&['khatm','tajweed'].includes(x.kind));const rec=st.academicLicenses1111||[];return `<div class="ac1111-layout"><section class="card"><h3>سجل الإجازات والأسانيد</h3><p class="ac1111-hint">هذا سجل داخلي فقط، لا يُثبت صحة السند ولا يصدر إجازة عامة. الاعتماد بعد التحقق البشري الحقيقي وبصلاحية المالك.</p><label>الاختبار المعتمد<select id="acLicenseExam">${opts([['','— اختر اختبارًا ناجحًا —'],...exams.map(x=>[x.id,`${examKinds[x.kind]} — ${x.date}`])],'')}</select></label><label>الرواية<input id="acNarration" maxlength="200" placeholder="الرواية التي ثبتت فعلاً"></label><label>نص السند / بياناته<textarea id="acSanad" maxlength="2000" rows="4"></textarea></label><label>المجيز<input id="acIssuer" maxlength="160"></label><label>ملاحظة<input id="acLicenseNote" maxlength="500"></label><label class="ac1111-check"><input type="checkbox" id="acConfirmLicense"> أؤكد التحقق البشري من صحة الرواية والسند وهوية المجيز</label><button type="button" class="btn btn-g" data-action="license-save" ${isOwner()?'':'disabled'}>حفظ الاعتماد الداخلي</button>${isOwner()?'':'<small>الاعتماد الداخلي للمالك فقط.</small>'}</section><section class="card"><h3>السجل التاريخي</h3>${rec.map(x=>`<div class="ac1111-record"><b>${esc(x.narration)}</b><span>داخلي — تحقق بشري</span><small>${esc(x.issuer)} · ${esc(x.approvedAt?.slice(0,10))}</small><small>${esc(x.sanad)}</small></div>`).join('')||'<p>لا توجد إجازات موثقة داخليًا.</p>'}</section></div>`;}
  function analyticsPanel(st){const x=summary(st.id,ui.month);const group=String(st.group||'').trim()||'بدون مجموعة',y=summarizeGroup(group,ui.month);return `<section class="card"><h3>مؤشرات الطالب — ${esc(ui.month)}</h3><p class="ac1111-hint">مؤشرات سجلات موجودة فقط؛ أيام غياب التسجيل غير محتسبة غيابًا.</p><div class="ac1111-metrics"><div><b>${x.recordedDays}</b><small>أيام مسجلة</small></div><div><b>${x.presentDays}</b><small>حضور</small></div><div><b>${x.absentDays}</b><small>غياب مؤكد</small></div><div><b>${x.tests}</b><small>اختبارات</small></div><div><b>${x.passed}</b><small>اجتاز</small></div><div><b>${x.errors}</b><small>أخطاء موثقة</small></div></div></section><section class="card"><h3>ملخص الحلقة: ${esc(group)}</h3><div class="ac1111-metrics"><div><b>${y.students}</b><small>طلاب</small></div><div><b>${y.attendances}</b><small>حضور مسجل</small></div><div><b>${y.confirmedAbsences}</b><small>غياب مؤكد</small></div><div><b>${y.needsFollowup}</b><small>بحاجة لمتابعة</small></div><div><b>${y.exams}</b><small>اختبارات مسجلة</small></div></div></section>`;}
  function contactPanel(st){const logs=(st.guardianContact1111||[]).slice().reverse(),period=ui.contactPeriod==='week'?currentWeek():ui.month;return `<section class="card"><h3>تقرير متابعة ولي الأمر — ${esc(period)}</h3><div class="ac1111-buttons"><button type="button" data-action="period-month" aria-pressed="${ui.contactPeriod==='month'}">شهري</button><button type="button" data-action="period-week" aria-pressed="${ui.contactPeriod==='week'}">أسبوعي</button></div><p class="ac1111-hint">اضغط المعاينة قبل فتح واتساب. فتح التطبيق لا يعني الإرسال؛ سجل حالة التواصل يدويًا بصدق.</p><textarea id="acContactPreview" rows="12" readonly>${esc(contactMessage(st,period))}</textarea><div class="ac1111-buttons"><button type="button" class="btn btn-out" data-action="contact-open">فتح واتساب للمراجعة</button><button type="button" class="btn btn-g" data-action="contact-sent">تأكيد الإرسال يدويًا</button><button type="button" class="btn btn-out" data-action="contact-unsent">تسجيل لم يُرسل</button></div></section><section class="card"><h3>سجل التواصل</h3>${logs.map(x=>`<div class="ac1111-record"><b>${esc(x.month)}</b><span>${x.status==='confirmed_sent'?'أكّد المحفظ الإرسال':x.status==='open_attempted'?'محاولة فتح واتساب':'لم يُرسل'}</span><small>${esc(x.at?.slice(0,16)||'')} · إدخال يدوي، وليس إثبات تسليم</small></div>`).join('')||'<p>لا يوجد سجل تواصل بعد.</p>'}</section>`;}
  function onClick(event){const b=event.target.closest('button');if(!b)return;
    if(b.dataset.tab){ui.tab=b.dataset.tab;draw();return;}const a=b.dataset.action,st=chosen();if(!st)return;
    if(a==='read'){const s=surahs()[Number($('acSurah')?.value)-1];g.openQuranRangeText?.({surah:s?.n,from:Number($('acFrom')?.value),to:Number($('acTo')?.value)});return;}
    if(a==='read-juz'){const j=Number($('acJuz')?.value),r=Number($('acJuzQuarter')?.value),seg=root.RevisionQuranText?.segments?.(j,r)||[];if(!seg.length)return g.toast?.('نص الربع غير متاح حاليًا','error');g.openQuranRangeText?.({surah:seg[0].surah,from:seg[0].from,to:seg[0].to});if(seg.length>1)g.toast?.('هذا الربع يمتد بين سور؛ افتح المصحف لاستكمال بقية النطاق','info');return;}
    if(a==='exam-save'){const kind=$('acKind').value,input={kind,studentId:st.id,grade:$('acGrade').value,date:$('acDate').value,score:$('acScore').value.trim()===''?null:Number($('acScore').value),surahId:$('acSurah')?.value,from:$('acFrom')?.value,to:$('acTo')?.value,juz:$('acJuz')?.value,committee:$('acCommittee').value.split(/\n|،/).map(x=>x.trim()).filter(Boolean),evidence:$('acEvidence').value,notes:''};const res=createExam(st,input);g.toast?.(res.ok?'تم حفظ الاختبار بعد تأكيد الكتابة':res.error,res.ok?'success':'error');if(res.ok)draw();return;}
    if(a==='license-save'){const res=createLicense(st,$('acLicenseExam').value,{narration:$('acNarration').value,sanad:$('acSanad').value,issuer:$('acIssuer').value,note:$('acLicenseNote').value,confirmed:$('acConfirmLicense').checked});g.toast?.(res.ok?'سُجل الاعتماد الداخلي بعد حفظه':res.error,res.ok?'success':'error');if(res.ok)draw();return;}
    if(a==='period-month'||a==='period-week'){ui.contactPeriod=a==='period-week'?'week':'month';draw();return;}
    if(a==='contact-open'){const period=ui.contactPeriod==='week'?currentWeek():ui.month,msg=contactMessage(st,period);if(!g.confirm?.(`راجع الرسالة ثم افتح واتساب يدويًا:\n\n${msg}`))return;root.SessionIntelligence?.playGuardianWarning?.(false);const result=contactEvent(st,period,'open_attempted');if(!result.ok)return g.toast?.(result.error,'error');g.openWhatsApp?.(st,msg);draw();return;}
    if(a==='contact-sent'||a==='contact-unsent'){const status=a==='contact-sent'?'confirmed_sent':'not_sent';if(!g.confirm?.(status==='confirmed_sent'?'هل أرسلت الرسالة بنفسك فعلًا؟':'هل تريد تسجيل أن الرسالة لم تُرسل؟'))return;const result=contactEvent(st,ui.contactPeriod==='week'?currentWeek():ui.month,status);g.toast?.(result.ok?'تم تسجيل الحالة يدويًا':result.error,result.ok?'success':'error');if(result.ok)draw();}
  }
  function bind(){const host=$('pg-academic-exams');if(!host||host.dataset.bound)return;host.dataset.bound='1';host.addEventListener('click',onClick);
    $('ac1111Student').addEventListener('change',e=>{ui.studentId=e.target.value;draw();});$('ac1111Month').addEventListener('change',e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){ui.month=e.target.value;draw();}});
    host.addEventListener('change',e=>{if(e.target.id==='acKind'){ui.kind=e.target.value;$('acSurahFields').hidden=ui.kind!=='surah';$('acJuzFields').hidden=ui.kind!=='juz';}if(e.target.id==='acSurah'){const limit=surahs()[Number(e.target.value)-1]?.a||1;$('acTo').value=String(limit);$('acTo').max=limit;}});
  }
  function drawOpen(studentId){if(!canTeach())return g.toast?.('ليس لديك إذن لإدارة الاختبارات','error');if(studentId)ui.studentId=String(studentId);else if(!stById(ui.studentId))ui.studentId=students()[0]?.id||'';g.goPage?.('academic-exams');draw();}
  function install(){bind();if(!root.Legacy||typeof g.goPage!=='function')return false;const prev=g.goPage;root.Legacy.override('goPage',function(p,...args){if(p==='academic-exams'&&!canTeach())return g.toast?.('ليست لديك صلاحية لهذا التبويب','error');const res=prev.call(this,p,...args);if(p==='academic-exams'){$('ac1111Nav')?.classList.add('on');if($('hdrTitle'))$('hdrTitle').textContent='الاختبارات والإجازات';draw();}return res;},'v11.11-exams');return true;}
  root.AcademicExams={open:drawOpen,validateExam,validateLicense,createExam,createLicense,summary,summarizeGroup,contactMessage,contactEvent,gradeMap,currentWeek,weekBounds};
  if(typeof module!=='undefined'&&module.exports)module.exports={validateExam,validateLicense,summary,summarizeGroup,contactMessage,gradeMap,currentWeek,weekBounds};
  if(g.document){const boot=()=>{if(!install())g.setTimeout?.(boot,250);};if(g.document.readyState==='loading')g.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}
})(typeof globalThis!=='undefined'?globalThis:this);
