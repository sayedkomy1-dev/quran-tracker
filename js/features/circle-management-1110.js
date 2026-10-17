'use strict';
/* Imam Academy 11.10.0 — local-account circle administration.
 * Reuses existing students[].group/scheduleDays/scheduleTime and sessions[].
 * No tenant changes, server schema changes, or automatic guardian messages. */
(function(g){
  const root=g.ImamApp||(g.ImamApp={});
  const state=()=>root.State||{};
  const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
  const esc=v=>root.Utils?.escapeHtml?.(v)??String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const GRADES=['ممتاز','جيد جداً','جيد','ضعيف','إعادة']; // Same stored grades as existing review engine
  const TYPES={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة'};
  const DEFAULT_POLICY=[2,4,6,8];
  const localDay=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const validDay=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime())&&localDay(new Date(s+'T12:00:00'))===s;
  const makeId=()=>root.Utils?.makeId?.('circle')||`circle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const groupName=st=>String(st?.group||'').trim()||'بدون مجموعة';
  const quran=()=>Array.isArray(g.S)?g.S:(typeof S!=='undefined'?S:[]);
  const students=()=>Array.isArray(state().students)?state().students:[];
  const sessions=()=>Array.isArray(state().sessions)?state().sessions:[];
  const groups=()=>[...new Set(students().map(groupName))].sort((a,b)=>a.localeCompare(b,'ar'));
  const roster=grp=>students().filter(st=>groupName(st)===grp&&(!st.studentStatus||st.studentStatus==='active'));
  const dayOf=s=>new Date(s+'T12:00:00').getDay();
  const sesDay=s=>String(s?.sessionDate||s?.date||'').slice(0,10);
  const enrolled=(st,day)=>validDay(day)&&validDay(st.startDate||day)&&day>=(st.startDate||day);
  const scheduled=(st,day)=>enrolled(st,day)&&Array.isArray(st.scheduleDays)&&st.scheduleDays.includes(dayOf(day));
  const entry=(sid,day)=>sessions().filter(s=>s.studentId===sid&&sesDay(s)===day).sort((a,b)=>String(a.updatedAt||a.date||'').localeCompare(String(b.updatedAt||b.date||''))).at(-1)||null;
  const validClock=s=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(s||''));
  const mins=s=>validClock(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
  const duration=st=>Math.min(180,Math.max(15,Number(st.sessionDuration)||30));
  function conflictPairs(all=students()){
    const out=[],seen=new Set();
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      const a=all[i],b=all[j];if(a.studentStatus&&a.studentStatus!=='active'||b.studentStatus&&b.studentStatus!=='active')continue;
      // Pupils from one named circle are expected to attend at the same time.
      if(groupName(a)===groupName(b)&&groupName(a)!=='بدون مجموعة')continue;
      const ma=mins(a.scheduleTime),mb=mins(b.scheduleTime);if(ma===null||mb===null)continue;
      if(!(ma<mb+duration(b)&&mb<ma+duration(a)))continue;
      for(const day of (a.scheduleDays||[]))if((b.scheduleDays||[]).includes(day)){
        const key=[a.id,b.id,day].join('|');if(!seen.has(key)){seen.add(key);out.push({a:a.id,b:b.id,day,groups:[groupName(a),groupName(b)]});}
      }
    }
    return out;
  }
  function absencesFor(student,through=localDay(),days=30,records=sessions()){
    if(!validDay(through))return {count:0,unknown:0,excused:0,expected:0,rate:null,dates:[]};
    const start=new Date(through+'T12:00:00');start.setDate(start.getDate()-Math.max(1,days)+1);
    let count=0,unknown=0,excused=0,expected=0;const dates=[];
    for(let d=new Date(start);localDay(d)<=through;d.setDate(d.getDate()+1)){
      const date=localDay(d);
      // Only explicitly scheduled days are used. Missing marks are UNKNOWN, not absence.
      if(!scheduled(student,date))continue;
      expected++;
      const s=records.filter(x=>x.studentId===student.id&&sesDay(x)===date).sort((x,y)=>String(x.updatedAt||'').localeCompare(String(y.updatedAt||''))).at(-1);
      if(!s){unknown++;continue;}
      if(s.status==='غاب'){
        if(s.absenceExcused===true){excused++;continue;}
        count++;dates.push(date);
      }else if(s.status==='إجازة'||s.status==='معذور'){excused++;}
      else if(s.status!=='حضر')unknown++;
    }
    const known=expected-unknown;
    return {count,unknown,excused,expected,rate:known?Math.round(count/known*100):null,dates};
  }
  function policy(values){
    const v=Array.isArray(values)?values.map(Number):DEFAULT_POLICY;
    return v.length===4&&v.every((x,i)=>Number.isInteger(x)&&x>0&&(!i||x>v[i-1]))?v:DEFAULT_POLICY.slice();
  }
  const LEVELS=['لا يوجد إنذار','تنبيه','إنذار أول','إنذار نهائي','مراجعة إدارية'];
  function disciplineLevel(count,thresholds=DEFAULT_POLICY){const th=policy(thresholds);let level=0;th.forEach((n,i)=>{if(count>=n)level=i+1;});return {level,label:LEVELS[level],thresholds:th};}
  function previewPolicy(student,through,thresholds){const stats=absencesFor(student,through);return {...stats,...disciplineLevel(stats.count,thresholds)};}
  function collectRecitation(row, quran){
    const section={},errors=[];
    for(const k of Object.keys(TYPES)){
      const surahId=Number(row[k]?.surahId||0),from=Number(row[k]?.from),to=Number(row[k]?.to);
      if(!surahId&&!row[k]?.grade)continue;
      const src=quran[surahId-1];
      if(!src||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>src.a){errors.push(`نطاق ${TYPES[k]} غير صحيح`);continue;}
      const grade=String(row[k]?.grade||'');if(!GRADES.includes(grade)){errors.push(`حدد تقدير ${TYPES[k]}`);continue;}
      section[k]={surahId,surah:src.n,from,to,grade,full:from===1&&to===src.a};
    }
    return {section,errors};
  }
  function buildBatchChanges({date,group,rows,allStudents,allSessions,quran,batchId,now}){
    const errors=[],updates=[];
    if(!validDay(date)||date>localDay())errors.push('تاريخ الحصة غير صالح أو في المستقبل');
    if(!group)errors.push('اختر الحلقة');
    const allowed=new Map(allStudents.filter(st=>groupName(st)===group).map(st=>[String(st.id),st]));
    const seen=new Set();
    for(const row of rows||[]){
      const sid=String(row.studentId||'');if(seen.has(sid)){errors.push('تكرار الطالب في نفس الدفعة');continue;}seen.add(sid);
      const student=allowed.get(sid);if(!student){errors.push('طالب خارج الحلقة الحالية');continue;}
      const status=String(row.status||'');
      if(!status){if(Object.keys(TYPES).some(k=>row[k]?.surahId&&Number(row[k].surahId)>0))errors.push(`حدد حالة حضور ${student.name} قبل تسميعه`);continue;}
      if(!['حضر','غاب','إجازة'].includes(status)){errors.push(`حالة غير صحيحة للطالب ${student.name}`);continue;}
      const sameDay=allSessions.filter(x=>x.studentId===sid&&sesDay(x)===date);
      if(sameDay.length>1){errors.push(`يوجد أكثر من سجل للطالب ${student.name} في هذا اليوم؛ راجعه يدويًا أولًا`);continue;}
      const existing=sameDay[0]||null;
      if(existing&&(existing.completed||existing.new||existing.rec||existing.far||existing.juz||existing.surahReview||existing.actualRecitation||existing.recitationErrors?.length||existing.teacher119?.extra?.length)){errors.push(`حصة ${student.name} تحتوي على تسميع أو تقييم سابق؛ تُعدّل من شاشة الحصة الفردية فقط`);continue;}
      const {section,errors:sectionErrs}=collectRecitation(row,quran||[]);
      sectionErrs.forEach(x=>errors.push(`${student.name}: ${x}`));
      if(status!=='حضر'&&Object.keys(section).length){errors.push(`لا يمكن تسميع الطالب ${student.name} وهو غير حاضر`);continue;}
      if(status==='غاب'&&row.excused&&!String(row.excuseReason||'').trim())errors.push(`حدد عذر غياب ${student.name}`);
      const old=existing?{...existing}:null;
      const next={...(existing||{}),id:existing?.id||`${batchId}-${sid}`,studentId:sid,sessionDate:date,date:existing?.date||`${date}T12:00:00.000Z`,status,source:existing?.source==='session'?'session':'group-checkin',createdAt:existing?.createdAt||now,updatedAt:now,groupBatchId:batchId};
      if(status==='غاب'){next.absenceExcused=!!row.excused;next.excuseReason=next.absenceExcused?String(row.excuseReason||'').trim().slice(0,300):'';}
      else {next.absenceExcused=false;next.excuseReason='';}
      const keys=Object.keys(section);
      if(status==='حضر'&&keys.length){
        next.source='group-recitation';next.completed=true;
        next.actualRecitation={...(existing?.actualRecitation||{}),...section};
        next.prevGrades={...(existing?.prevGrades||{}),...Object.fromEntries(keys.map(k=>[k,section[k].grade]))};
        const former=Array.isArray(existing?.teacher119?.extra)?existing.teacher119.extra:[];
        const additions=keys.map(k=>({...section[k],id:`${batchId}-${sid}-${k}`,type:k,score:null,decision:['ممتاز','جيد جداً','جيد'].includes(section[k].grade)?'mastered':section[k].grade==='ضعيف'?'stabilize':'repeat',notes:'',fromGroupBatch:true}));
        next.teacher119={...(existing?.teacher119||{}),kind:keys.includes('new')&&(keys.includes('rec')||keys.includes('far'))?'mixed':keys.includes('new')?'new':'review',extra:[...former.filter(x=>!x.fromGroupBatch),...additions]};
        next.summary=`تسميع جماعي: ${keys.map(k=>`${TYPES[k]}: ${section[k].surah} (${section[k].from}–${section[k].to}) — ${section[k].grade}`).join('؛ ')}`;
      }else if(!existing?.completed){next.completed=false;next.summary=status;}
      if(String(row.notes||'').trim())next.notes=(existing?.notes?existing.notes+'\n':'')+String(row.notes).trim().slice(0,500);
      updates.push({student,previous:old,next});
    }
    return {errors,updates};
  }
  const ui={tab:'group',group:'',date:localDay(),period:30,batchDraft:new Map(),selectedStudent:'',alerts:[],expanded:false};
  function canManage(){
    const auth=g.WeLiveQuranAuth;const role=String(auth?.getAccess?.()?.role||'');
    return !['guardian','parent','guest','visitor','student','ولي أمر','ضيف'].includes(role.toLowerCase());
  }
  function writeChanges(mutator){
    if(!canManage())return {ok:false,error:'ليس لديك صلاحية'};
    const a=sessions(),backup=a.slice();const settings=state().settings||{};
    try{const result=mutator();if(g.save?.()!==true)throw new Error('لم ينجح حفظ البيانات المحلية');return {ok:true,result};}
    catch(err){a.splice(0,a.length,...backup);try{g.save?.();}catch(_){}return {ok:false,error:err.message||'خطأ في الحفظ'};}
  }
  function home(){if(!ui.group||!groups().includes(ui.group))ui.group=groups()[0]||'';}
  function showToast(m,kind='info'){g.toast?.(m,kind);}
  function open(tab){if(!canManage())return showToast('إدارة الحلقات للمحفظ والإدارة فقط','error');home();if(tab)ui.tab=tab;g.goPage?.('circle-manager');draw();}
  function draw(){
    const page=$('pg-circle-manager');if(!page)return;home();
    const menu=$('cmTabs');if(menu)menu.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===ui.tab);b.setAttribute('aria-pressed',String(b.dataset.tab===ui.tab));});
    const gsel=$('cmGroup');if(gsel){gsel.innerHTML=groups().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')||'<option value="">لا توجد حلقات مسجلة</option>';gsel.value=ui.group;}
    if($('cmDate'))$('cmDate').value=ui.date;
    if($('cmPanel'))$('cmPanel').innerHTML=ui.tab==='group'?groupPanel():ui.tab==='attendance'?attendancePanel():ui.tab==='discipline'?disciplinePanel():schedulePanel();
  }
  const options=(items,v='')=>items.map(([key,label])=>`<option value="${esc(key)}" ${String(key)===String(v)?'selected':''}>${esc(label)}</option>`).join('');
  const gradeOptions=v=>options([['','— اختر التقدير —'],...GRADES.map(g=>[g,g==='ضعيف'?'يحتاج متابعة':g])],v);
  function groupPanel(){const list=roster(ui.group);if(!list.length)return '<p class="cm-empty">اختر حلقة بها طلاب نشطون. يمكنك تحديد المجموعة من ملف الطالب.</p>';
    const surahs=quran();
    const surahOptions=(v=0)=>options([['0','— لا يوجد موضع —'],...surahs.map((x,i)=>[String(i+1),`${i+1} · ${x.n}`])],v);
    const locked=old=>!!(old&&(old.completed||old.new||old.rec||old.far||old.juz||old.surahReview||old.actualRecitation||old.recitationErrors?.length||old.teacher119?.extra?.length));
    const oldCount=list.filter(s=>locked(entry(s.id,ui.date))).length;
    return `<div class="cm-explainer">سجّل حضور وتسميع طلاب الحلقة في عملية حفظ واحدة. لا يُستبدل أي تسميع معتمد، وتظل لكل طالب حصة مستقلة.</div><div class="cm-meta">عدد الطلاب: ${list.length} · حصص معتمدة مسبقًا: ${oldCount} · غير المحدد لا يُسجل غائبًا</div><div class="cm-students">${list.map(st=>{
      const old=entry(st.id,ui.date),saved=locked(old);const draft=ui.batchDraft.get(st.id)||{};
      return `<article class="cm-student" data-student="${esc(st.id)}"><header><b>${esc(st.name)}</b><small>${old?`مسجل: ${esc(old.status)}${saved?' — حصة معتمدة':''}`:'لا يوجد تسجيل بعد'}</small><button type="button" class="btn btn-out btn-sm" data-action="detail" data-student="${esc(st.id)}">✍️ التصحيح التفصيلي للكلمات والحروف</button></header>${saved?'<div class="cm-locked">تم اعتماد حصة هذا الطالب؛ تعديلها من شاشة الحصة الفردية حفاظًا على التصحيحات السابقة.</div>':`<label>الحالة <select data-field="status">${options([['','— لا تغيير —'],['حضر','حضر'],['غاب','غاب'],['إجازة','إجازة']],draft.status||'')}</select></label><div class="cm-student-detail"><label><input type="checkbox" data-field="excused" ${draft.excused?'checked':''}> غياب بعذر</label><label>سبب العذر<input data-field="excuseReason" maxlength="300" value="${esc(draft.excuseReason||'')}" placeholder="يُطلب عند تحديد غياب بعذر"></label><details><summary>📖 مواضع التسميع والتقييم (اختياري إذا سجّلت حضورًا فقط)</summary>${Object.entries(TYPES).map(([k,title])=>{const r=draft[k]||{};return `<div class="cm-range" data-range="${k}"><b>${title}</b><div class="cm-row"><label>السورة<select data-field="${k}-surahId">${surahOptions(r.surahId||0)}</select></label><label>من آية<input data-field="${k}-from" type="number" min="1" value="${esc(r.from||1)}"></label><label>إلى آية<input data-field="${k}-to" type="number" min="1" value="${esc(r.to||1)}"></label><label>التقدير<select data-field="${k}-grade">${gradeOptions(r.grade||'')}</select></label></div><button type="button" class="btn btn-out btn-sm" data-action="view-range">📖 عرض النص القرآني</button></div>`;}).join('')}<label>ملاحظة الحصة<input data-field="notes" maxlength="500" value="${esc(draft.notes||'')}"></label></details></div>`}</article>`;
    }).join('')}</div><button type="button" class="btn btn-g cm-primary" data-action="save-group">💾 حفظ تسميع الحلقة وحضورها</button><p class="cm-hint">يُظهر التطبيق رسالة نجاح فقط بعد تأكيد حفظ السجلات محليًا. إرسال رسائل ولي الأمر خطوة منفصلة وتحتاج مراجعة.</p>`;
  }
  function viewRange(button){
    const row=button.closest('[data-range]'),kind=row?.dataset.range;
    const id=Number(row?.querySelector(`[data-field="${kind}-surahId"]`)?.value||0);
    const from=Number(row?.querySelector(`[data-field="${kind}-from"]`)?.value||0);
    const to=Number(row?.querySelector(`[data-field="${kind}-to"]`)?.value||0);
    const surah=quran()[id-1];
    if(!surah||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>surah.a)return showToast('اختر السورة ونطاق الآيات الصحيح أولًا','error');
    readDraft();
    g.openQuranRangeText?.({surah:surah.n,from,to});
  }
  function readDraft(){
    const page=$('pg-circle-manager');if(!page)return;
    page.querySelectorAll('.cm-student').forEach(card=>{
      const id=card.dataset.student,prev=ui.batchDraft.get(id)||{},row={...prev};
      card.querySelectorAll('[data-field]').forEach(el=>{
        const key=el.dataset.field;if(el.type==='checkbox')row[key]=el.checked;else row[key]=el.value;
      });
      for(const k of Object.keys(TYPES))row[k]={surahId:row[k+'-surahId'],from:row[k+'-from'],to:row[k+'-to'],grade:row[k+'-grade']};
      ui.batchDraft.set(id,row);
    });
  }
  function saveGroup(){readDraft();const rows=roster(ui.group).map(st=>({...ui.batchDraft.get(st.id),studentId:st.id}));
    const batch=buildBatchChanges({date:ui.date,group:ui.group,rows,allStudents:students(),allSessions:sessions(),quran:quran(),batchId:makeId(),now:new Date().toISOString()});
    if(batch.errors.length)return showToast(batch.errors.slice(0,3).join('؛ ')+(batch.errors.length>3?'…':''),'error');
    if(!batch.updates.length)return showToast('حدد الطلاب الذين تريد تسجيلهم أولًا','info');
    if(!g.confirm?.(`اعتماد تسجيل ${batch.updates.length} طالب في ${ui.group} بتاريخ ${ui.date}؟\nلن يتم تعديل الحصص المعتمدة سابقًا.`))return;
    const result=writeChanges(()=>{const arr=sessions();for(const change of batch.updates){const i=arr.findIndex(x=>x.id===change.next.id);if(i<0)arr.push(change.next);else arr[i]=change.next;}return batch.updates.length;});
    if(!result.ok)return showToast(`تعذر الحفظ: ${result.error}`,'error');
    ui.batchDraft.clear();draw();g.renderHome?.();showToast(`تم حفظ ${result.result} سجلًا دون تكرار ✓`,'success');
  }
  function attendancePanel(){const list=roster(ui.group),scheduledList=list.filter(st=>scheduled(st,ui.date));
    return `<p class="cm-explainer">الحضور يعتمد على الجداول المسجلة، ولا يُحسب عدم التسجيل غيابًا. لتسجيل حصة جماعية استخدم تبويب التسميع الجماعي.</p><div class="cm-meta">المتوقع حضورهم وفق الجدول: ${scheduledList.length} · الإجمالي: ${list.length}</div><div class="cm-att-grid">${list.map(st=>{const s=entry(st.id,ui.date);return `<div><b>${esc(st.name)}</b><span>${s?esc(s.status+(s.status==='غاب'&&s.absenceExcused?' — بعذر':'')):scheduled(st,ui.date)?'لم يسجل — غير محسوب غيابًا':'غير مجدول'}</span><small>${esc(st.scheduleTime||'موعد غير محدد')}</small></div>`;}).join('')}</div>`;
  }
  function disciplinePanel(){const list=roster(ui.group),p=policy(state().settings?.circleDiscipline?.thresholds);return `<div class="cm-explainer">التنبيهات مقترحات للمحفظ ولا تُرسل تلقائيًا. الغياب بلا تسجيل يُعرض «مجهول»، ولا يُحسب غيابًا. الغياب بعذر والإجازات مستثناة.</div><div class="cm-policy"><b>حدود الإنذارات للغياب المؤكد (خلال آخر ٣٠ يومًا)</b><div class="cm-row">${p.map((n,i)=>`<label>${LEVELS[i+1]}<input type="number" min="1" max="50" data-threshold="${i}" value="${n}"></label>`).join('')}</div><button class="btn btn-out btn-sm" data-action="save-policy">حفظ حدود الإنذارات</button></div><div class="cm-att-grid">${list.map(st=>{const x=previewPolicy(st,ui.date,p);return `<div class="cm-disciplinary"><b>${esc(st.name)}</b><span>${esc(x.label)}</span><small>غياب مؤكد: ${x.count} · بعذر/إجازة: ${x.excused} · لم يُسجل: ${x.unknown}</small>${(st.circleDisciplineHistory||[]).length?`<small>آخر إجراء موثق: ${esc(st.circleDisciplineHistory.at(-1).grade||'—')} (${esc(st.circleDisciplineHistory.at(-1).date||'')})</small>`:''}<div class="cm-card-actions"><button class="btn btn-out btn-sm" data-action="warn" data-student="${esc(st.id)}">تسجيل إجراء</button><button class="btn btn-out btn-sm" data-action="contact" data-student="${esc(st.id)}">معاينة رسالة ولي الأمر</button></div></div>`;}).join('')}</div>`;}
  function schedulePanel(){const list=roster(ui.group),pairs=conflictPairs(),ownPairs=pairs.filter(x=>list.some(st=>[x.a,x.b].includes(st.id)));
    const dayButtons=DAYS.map((name,i)=>`<label><input type="checkbox" data-sday="${i}" ${list.length&&list.every(st=>(st.scheduleDays||[]).includes(i))?'checked':''}>${name}</label>`).join('');
    return `<p class="cm-explainer">الجداول الحالية مسجلة في ملفات الطلاب. يمكن تحديث موعد كل طلاب الحلقة في خطوة واحدة. تداخل طلاب الحلقة نفسها طبيعي، والتداخل بين حلقتين مختلفتين يحتاج مراجعة.</p><div class="cm-schedule"><div class="cm-daypick">${dayButtons}</div><div class="cm-row"><label>بداية الحصة<input id="cmScheduleTime" type="time" value="${esc(list[0]?.scheduleTime||'')}" ></label><label>المدة (دقيقة)<input id="cmDuration" type="number" min="10" max="180" value="${duration(list[0])||30}"></label></div><button class="btn btn-g" data-action="save-schedule">حفظ جدول الحلقة للطلاب الحاليين</button></div><h3>الجداول المسجلة</h3><div class="cm-att-grid">${list.map(st=>`<div><b>${esc(st.name)}</b><small>${esc((st.scheduleDays||[]).map(i=>DAYS[i]).filter(Boolean).join('، ')||'دون جدول')} · ${esc(st.scheduleTime||'—')} · ${duration(st)} دقيقة</small></div>`).join('')}</div>${ownPairs.length?`<div class="cm-warning"><b>تداخلات محتملة بين الحلقات (${ownPairs.length})</b>${ownPairs.slice(0,12).map(x=>`<p>${esc(DAYS[x.day])} — ${esc(x.groups.join(' مع '))}</p>`).join('')}</div>`:'<p class="cm-ok">لا توجد تداخلات مسجلة بين الحلقات حسب جداول الطلاب.</p>'}`;
  }
  function savePolicy(){const values=[...$('pg-circle-manager').querySelectorAll('[data-threshold]')].map(el=>Number(el.value));if(policy(values).some((v,i)=>v!==values[i]))return showToast('يجب أن تكون الحدود أرقامًا تصاعدية صحيحة','error');const settings=state().settings||{},old=settings.circleDiscipline;settings.circleDiscipline={...(old||{}),thresholds:values};if(g.save?.()!==true){settings.circleDiscipline=old;return showToast('تعذر حفظ الحدود','error');}showToast('تم حفظ سياسة الإنذارات محليًا','success');draw();}
  function saveSchedule(){const list=roster(ui.group);if(!list.length)return;const days=[...$('pg-circle-manager').querySelectorAll('[data-sday]:checked')].map(x=>Number(x.dataset.sday)),time=$('cmScheduleTime').value,dur=Number($('cmDuration').value);
    if(!days.length||!validClock(time)||!Number.isInteger(dur)||dur<15||dur>180||mins(time)+dur>1440)return showToast('حدد أيامًا ووقتًا ومدة صحيحة للحصة','error');
    const ids=new Set(list.map(x=>x.id));const hypothetical=students().map(st=>ids.has(st.id)?{...st,scheduleDays:days,scheduleTime:time,sessionDuration:dur}:st);
    const collisions=conflictPairs(hypothetical).filter(x=>ids.has(x.a)||ids.has(x.b));
    if(collisions.length&&!g.confirm?.(`يوجد ${collisions.length} تعارضًا محتملًا بين حلقات مختلفة. هل تريد تسجيل الجدول رغم ذلك؟`))return;
    if(!g.confirm?.(`تحديث جدول ${list.length} طالب في ${ui.group}؟ سيتم الاحتفاظ بالحضور والحصص القديمة.`))return;
    const backup=list.map(s=>({s,days:s.scheduleDays,time:s.scheduleTime,dur:s.sessionDuration,updatedAt:s.updatedAt}));
    const now=new Date().toISOString();
    for(const st of list){st.scheduleDays=[...days];st.scheduleTime=time;st.sessionDuration=dur;st.updatedAt=now;}
    if(g.save?.()!==true){backup.forEach(x=>{x.s.scheduleDays=x.days;x.s.scheduleTime=x.time;x.s.sessionDuration=x.dur;x.s.updatedAt=x.updatedAt;});return showToast('تعذر حفظ الجدول، وتمت استعادة القيم السابقة','error');}
    draw();showToast('تم تحديث جدول الحلقة ✓','success');
  }
  function createWarning(studentId){const st=students().find(s=>String(s.id)===String(studentId));if(!st)return;const pol=policy(state().settings?.circleDiscipline?.thresholds),review=previewPolicy(st,ui.date,pol);
    if(!review.count)return showToast('لا يوجد غياب غير معذور مؤكد لهذا الطالب','info');
    const prompt=g.prompt?.(`إجراء الطالب ${st.name} — ${review.count} غياب مؤكد، والحالة المقترحة «${review.label}».\nاكتب ملاحظة المتابعة أو سبب الإجراء:`,'');if(!String(prompt||'').trim())return;
    const log=Array.isArray(st.circleDisciplineHistory)?st.circleDisciplineHistory:[],previous=st.circleDisciplineHistory,previousUpdatedAt=st.updatedAt;
    if(log.some(x=>x.date===ui.date&&x.grade===review.label&&Number(x.confirmedAbsences)===review.count))return showToast('هذا الإجراء مسجل بالفعل لهذه الحالة في هذا اليوم','info');
    const user=g.WeLiveQuranAuth?.getAccess?.()?.user||{};
    st.circleDisciplineHistory=[...log,{id:makeId(),date:ui.date,at:new Date().toISOString(),grade:review.label,confirmedAbsences:review.count,unknownDays:review.unknown,notes:String(prompt).slice(0,500),actorId:user.id||null}];
    st.updatedAt=new Date().toISOString();
    if(g.save?.()!==true){st.circleDisciplineHistory=previous;st.updatedAt=previousUpdatedAt;return showToast('تعذر حفظ الإجراء','error');}draw();showToast('حُفظ الإجراء في سجل الطالب، ولم تُرسل أي رسالة','success');
  }
  function contact(studentId){const st=students().find(s=>String(s.id)===String(studentId));if(!st)return;
    const review=previewPolicy(st,ui.date,policy(state().settings?.circleDiscipline?.thresholds));
    if(!review.count)return showToast('لا توجد غيابات غير معذورة مؤكدة في فترة المتابعة','info');
    const msg=`السلام عليكم ورحمة الله وبركاته\n\nولي أمر الطالب ${st.name}، نود التواصل معكم بشأن متابعة الانتظام في الحلقات.\nعدد مرات الغياب غير المعذور المسجلة خلال ٣٠ يومًا: ${review.count}.\nالحالة المقترحة: ${review.label}.\nيرجى التواصل مع المحفظ لمراجعة الظروف وتأكيد البيانات.\nجزاكم الله خيرًا.`;
    if(!g.confirm?.(`معاينة رسالة ولي الأمر:\n\n${msg}\n\nهل ترغب في فتح واتساب الآن؟ (لن نعتبر الرسالة مرسلة)`))return;
    root.SessionIntelligence?.playGuardianWarning?.(false);g.openWhatsApp?.(st,msg);
  }
  function openDetailedCorrection(studentId){
    const st=students().find(x=>String(x.id)===String(studentId));
    if(!st)return showToast('الطالب غير موجود','error');
    if(!canManage())return showToast('لا توجد صلاحية للتصحيح','error');
    // One existing session editor: do not create a second correction ledger.
    g.goPage?.('session');
    const student=$('sesSt'),date=$('sesDate');
    if(student)student.value=st.id;
    if(date)date.value=ui.date;
    if(typeof g.onSesSt==='function')g.onSesSt();
    else showToast('تعذر تحميل محرر التصحيح الحالي','error');
  }
  function bindEvents(){const host=$('pg-circle-manager');if(!host||host.dataset.bound)return;host.dataset.bound='1';
    host.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.tab){readDraft();ui.tab=b.dataset.tab;draw();return;}
      const action=b.dataset.action;
      if(action==='detail')openDetailedCorrection(b.dataset.student);if(action==='view-range')viewRange(b);if(action==='save-group')saveGroup();if(action==='save-schedule')saveSchedule();if(action==='save-policy')savePolicy();if(action==='warn')createWarning(b.dataset.student);if(action==='contact')contact(b.dataset.student);
    });
    host.addEventListener('change',ev=>{
      if(ev.target.id==='cmGroup'){readDraft();ui.group=ev.target.value;ui.batchDraft.clear();draw();return;}
      if(ev.target.id==='cmDate'){readDraft();ui.date=ev.target.value;ui.batchDraft.clear();draw();return;}
      if(ev.target.matches('[data-field$="-surahId"]')){const row=ev.target.closest('[data-range]'),kind=row?.dataset.range,surah=quran()[Number(ev.target.value)-1];const to=row?.querySelector(`[data-field="${kind}-to"]`);if(surah&&to&&Number(to.value)<=1)to.value=String(surah.a);}
      if(ev.target.matches('[data-field]'))readDraft();
    });
    host.addEventListener('input',ev=>{if(ev.target.matches('[data-field]'))readDraft();});
  }
  function install(){bindEvents();const legacy=root.Legacy,go=g.goPage;
    if(legacy&&typeof go==='function')legacy.override('goPage',function(page,...args){if(page==='circle-manager'&&!canManage())return showToast('ليس لديك صلاحية لإدارة الحلقات','error');const out=go.call(this,page,...args);if(page==='circle-manager'){$('cmNavTab')?.classList.add('on');const title=$('hdrTitle');if(title)title.textContent='إدارة الحلقات';draw();}return out;},'v11.10-circle-manager');
  }
  root.CircleManager={open,draw,groups,roster,entry,scheduled,absencesFor,policy,disciplineLevel,previewPolicy,conflictPairs,collectRecitation,buildBatchChanges,canManage,openDetailedCorrection};
  if(typeof module!=='undefined'&&module.exports)module.exports={scheduled,absencesFor,policy,disciplineLevel,conflictPairs,collectRecitation,buildBatchChanges,validDay,groupName};
  if(typeof document!=='undefined'){
    const boot=()=>{try{if(!root.Legacy||typeof g.goPage!=='function'){setTimeout(boot,200);return;}install();}catch(err){console.error('[CircleManager] failed:',err);}};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
})(typeof globalThis!=='undefined'?globalThis:this);
