'use strict';
/* RC16 — evidence-based student learning profile.
   Read-only analysis of teacher-entered session data; no diagnosis, storage, network, or automatic grading. */
(function attachStudentLearningProfile(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.ImamApp=root.ImamApp||{};root.ImamApp.StudentLearningProfile=api;}
})(typeof globalThis==='object'?globalThis:null,function(){
  const SECTION_LABELS={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة',review:'مراجعة السور والأجزاء'};
  const OBSERVATION_CATEGORIES=Object.freeze({
    repetition:'الاستجابة للتكرار',chunking:'التقسيم والتدرج',recall:'استدعاء المحفوظ',
    selfCorrection:'التصحيح الذاتي',attention:'الانتباه أثناء التسميع',
    pronunciation:'ضبط التلاوة والمخارج',linking:'الربط بين الآيات',
    independence:'استقلالية الأداء',revision:'المراجعة والتثبيت',other:'ملاحظة عامة'
  });
  const clean=(value,max=140)=>String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
  const esc=(value,max=500)=>clean(value,max).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function validDay(value){
    const day=String(value??'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return '';
    const date=new Date(day+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day?day:'';
  }
  function localDay(){
    const date=new Date();
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function nextDay(day){
    const date=new Date(day+'T12:00:00Z');
    date.setUTCDate(date.getUTCDate()+1);
    return date.toISOString().slice(0,10);
  }
  function sessionDay(session){
    return validDay(session?.sessionDate)||validDay(session?.date)||validDay(session?.createdAt);
  }
  function numericScore(value){
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const number=Number(value);
    return Number.isFinite(number)?Math.max(0,Math.min(100,Math.round(number))):null;
  }
  function average(values){
    const rows=values.filter(Number.isFinite);
    return rows.length?Math.round(rows.reduce((sum,value)=>sum+value,0)/rows.length):null;
  }
  function build(input={}){
    const student=input.student;
    if(!student||student.id===undefined||student.id===null||String(student.id)==='')return null;
    const today=validDay(input.referenceDay)||localDay();
    const id=String(student.id);
    const visibleRows=Array.isArray(input.progress?.rows)?input.progress.rows:(Array.isArray(input.sessions)?input.sessions:[]);
    const rows=visibleRows.filter(session=>{
      const day=sessionDay(session);
      return session&&String(session.studentId)===id&&day&&day<=today&&['حضر','غاب'].includes(String(session.status||''));
    }).slice().sort((a,b)=>sessionDay(a).localeCompare(sessionDay(b))||String(a.id||'').localeCompare(String(b.id||'')));
    const present=rows.filter(session=>session.status==='حضر');
    const absent=rows.filter(session=>session.status==='غاب');
    const sectionRows={new:[],rec:[],far:[],review:[]};
    const sessionAverages=[];
    const assessedSessionIds=new Set();
    let scoredItems=0;
    for(let index=0;index<present.length;index++){
      const session=present[index];
      const sessionId=String(session.id||sessionDay(session)+'#'+index);
      const scores=session.assessmentScores&&typeof session.assessmentScores==='object'?session.assessmentScores:{};
      const sessionValues=[];
      for(const key of ['new','rec','far']){
        const score=numericScore(scores[key]);
        if(score===null)continue;
        sectionRows[key].push({score,sessionId});
        sessionValues.push(score);
        scoredItems++;
        assessedSessionIds.add(sessionId);
      }
      let reviewItemCount=0;
      for(const group of Array.isArray(session.reviewResults)?session.reviewResults:[]){
        for(const item of Array.isArray(group?.items)?group.items:[]){
          const score=numericScore(item?.score);
          if(score===null)continue;
          sectionRows.review.push({score,sessionId});
          sessionValues.push(score);
          reviewItemCount++;
          scoredItems++;
          assessedSessionIds.add(sessionId);
        }
      }
      if(!reviewItemCount){
        for(const key of ['juz','surahReview']){
          const score=numericScore(scores[key]);
          if(score===null)continue;
          sectionRows.review.push({score,sessionId});
          sessionValues.push(score);
          scoredItems++;
          assessedSessionIds.add(sessionId);
        }
      }
      if(sessionValues.length)sessionAverages.push({day:sessionDay(session),value:average(sessionValues)});
    }
    const sections=Object.keys(SECTION_LABELS).map(key=>{
      const samples=sectionRows[key];
      const sessionsCount=new Set(samples.map(item=>item.sessionId)).size;
      return {key,label:SECTION_LABELS[key],average:average(samples.map(item=>item.score)),samples:samples.length,sessions:sessionsCount};
    });
    const strengths=sections.filter(section=>section.average!==null&&section.average>=85&&section.samples>=3&&section.sessions>=2);
    const support=sections.filter(section=>section.average!==null&&section.average<=65&&section.samples>=2&&section.sessions>=2);
    const eligible=present.length+absent.length;
    const attendance=eligible>=4?Math.round(present.length/eligible*100):null;
    let trend=null;
    if(sessionAverages.length>=4){
      const split=Math.floor(sessionAverages.length/2);
      const earlier=average(sessionAverages.slice(0,split).map(item=>item.value));
      const recent=average(sessionAverages.slice(split).map(item=>item.value));
      if(earlier!==null&&recent!==null){
        const delta=recent-earlier;
        trend={delta,label:delta>=5?'تحسن':delta<=-5?'تراجع':'مستقر',earlier,recent};
      }
    }
    let openErrors=null;
    const allHistory=(Array.isArray(input.sessions)?input.sessions:visibleRows).filter(session=>{
      const day=sessionDay(session);
      return session&&String(session.studentId)===id&&day&&day<=today;
    });
    try{
      if(typeof input.errorEngine?.buildQueue==='function'){
        const queue=input.errorEngine.buildQueue(allHistory,id,nextDay(today),'');
        const safeQueue=Array.isArray(queue)?queue:[];
        openErrors={
          count:safeQueue.length,
          recurring:safeQueue.filter(item=>Number(item?.occurrences)>=2).length,
          first:safeQueue[0]?{type:clean(safeQueue[0].type,70),where:clean(safeQueue[0].where,120)}:null
        };
      }
    }catch(_){openErrors=null;}
    const assessedSessions=assessedSessionIds.size;
    const evidence=assessedSessions>=6?'مؤشرات أوضح':assessedSessions>=3?'مؤشرات أولية':'بيانات محدودة';
    const nextSteps=[];
    if(openErrors?.count){
      nextSteps.push('ابدأ بسؤال قصير في مواضع الأخطاء المفتوحة، وسجّل نتيجة المتابعة داخل الحصة قبل إغلاق أي موضع.');
    }
    if(support.length){
      nextSteps.push('خصص جزءًا من الحصة لمراجعة '+support.map(section=>section.label).join(' و')+'، ثم أعد التقييم قبل زيادة التكليف.');
    }
    if(eligible>=4&&attendance!==null&&attendance<=70){
      nextSteps.push('راجع انتظام الحضور والتكليف السابق، ولا ترفع جرعة الحفظ قبل التأكد من استعادة الاستمرارية.');
    }
    if(trend?.label==='تراجع'){
      nextSteps.push('قارن آخر تقييمين مع مواضع الأخطاء المسجلة قبل تعديل خطة الطالب.');
    }
    if(!nextSteps.length&&assessedSessions>=3){
      nextSteps.push('حافظ على التدرج الحالي، وأعد قياس الأداء دوريًا للتأكد من ثبات المستوى.');
    }
    if(assessedSessions<3){
      nextSteps.push('سجّل تقييمات فعلية في حصتين أو أكثر قبل استنتاج نقاط قوة أو احتياج ثابت.');
    }
    return {
      studentId:id,date:today,rangeSessions:rows.length,present:present.length,absent:absent.length,
      attendance,assessedSessions,scoredItems,evidence,sections,strengths,support,trend,openErrors,
      nextSteps:nextSteps.slice(0,3)
    };
  }
  function render(result){
    if(!result)return '';
    const strengthHtml=result.strengths.length
      ?'<ul>'+result.strengths.map(item=>'<li><b>'+esc(item.label)+'</b><span>'+item.average+'% · '+item.sessions+' حصص مقيمة</span></li>').join('')+'</ul>'
      :'<p class="slp-empty">لا توجد بيانات كافية لإثبات نقطة قوة مستقرة حتى الآن.</p>';
    const supportHtml=result.support.length
      ?'<ul>'+result.support.map(item=>'<li><b>'+esc(item.label)+'</b><span>'+item.average+'% · '+item.sessions+' حصص مقيمة</span></li>').join('')+'</ul>'
      :'<p class="slp-empty">لا توجد منطقة دعم مؤكدة وفق حدّ البيانات الحالي.</p>';
    const attendanceText=result.attendance===null?'بيانات غير كافية':result.attendance+'%';
    const errorsText=result.openErrors===null?'غير متاح':String(result.openErrors.count);
    const steps=result.nextSteps.map(step=>'<li>'+esc(step)+'</li>').join('');
    const errorDetail=result.openErrors?.first
      ?'<p class="slp-error-note">أحد مواضع المتابعة: <b>'+esc(result.openErrors.first.type)+'</b>'+(result.openErrors.first.where?' · '+esc(result.openErrors.first.where):'')+'</p>'
      :'';
    return '<section class="slp-profile" aria-label="الملف التعليمي للطالب">'+
      '<div class="slp-head"><div><b>🧠 الملف التعليمي</b><small>مؤشرات من تقييمات الحصص المسجلة — للمحفظ فقط</small></div><span class="slp-evidence">'+esc(result.evidence)+'</span></div>'+
      '<div class="slp-stats">'+
        '<div><small>حصص بتقييمات رقمية</small><strong>'+result.assessedSessions+'</strong></div>'+
        '<div><small>الحضور في الفترة</small><strong>'+attendanceText+'</strong></div>'+
        '<div><small>أخطاء مفتوحة</small><strong>'+errorsText+'</strong></div>'+
      '</div>'+errorDetail+
      '<div class="slp-columns">'+
        '<section><h4>نقاط قوة موثقة</h4>'+strengthHtml+'</section>'+
        '<section><h4>احتياجات دعم محتملة</h4>'+supportHtml+'</section>'+
      '</div>'+
      (result.trend?'<p class="slp-trend">اتجاه النتائج المسجلة: <b>'+esc(result.trend.label)+'</b> ('+(result.trend.delta>0?'+':'')+result.trend.delta+' نقطة)</p>':'')+
      '<div class="slp-next"><b>مقترح للحصة القادمة</b><ul>'+steps+'</ul></div>'+
      '<p class="slp-foot">تعتمد درجات الأقسام والحضور على الفترة المختارة، بينما تُقرأ الأخطاء المفتوحة من سجل المتابعة التاريخي المتاح. المؤشرات على تقييم المحفظ؛ لا تصنّف الطالب إلى نمط تعلم ثابت ولا تصدر تشخيصًا أو درجة تلقائية ولا تغيّر الخطة أو السجلات.</p>'+
    '</section>';
  }
  function createObservation(input={}){
    const category=String(input.category||'');
    if(!Object.prototype.hasOwnProperty.call(OBSERVATION_CATEGORIES,category))return {ok:false,error:'اختر نوع الملاحظة من القائمة.'};
    const date=validDay(input.date),today=validDay(input.today)||localDay();
    if(!date||date>today)return {ok:false,error:'تاريخ الملاحظة غير صحيح أو يقع في المستقبل.'};
    const evidence=clean(input.evidence,400),nextStep=clean(input.nextStep,400),id=clean(input.id,100);
    if(!id)return {ok:false,error:'تعذر إنشاء معرّف للملاحظة. حاول مرة أخرى.'};
    if(evidence.length<12)return {ok:false,error:'اكتب ما لاحظته فعليًا في 12 حرفًا على الأقل.'};
    if(nextStep.length<8)return {ok:false,error:'اكتب خطوة تعليمية واضحة وقابلة للتنفيذ.'};
    const now=clean(input.now,40)||new Date().toISOString();
    return {ok:true,record:{id,category,date,evidence,nextStep,createdAt:now,updatedAt:now,archivedAt:''}};
  }
  function renderObservations(student){
    const raw=Array.isArray(student?.learningObservations)?student.learningObservations:[];
    const rows=raw.filter(item=>item&&item.id&&validDay(item.date)).slice().sort((a,b)=>
      String(b.date).localeCompare(String(a.date))||
      String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
    const active=rows.filter(item=>!item.archivedAt),archived=rows.filter(item=>!!item.archivedAt);
    const options=Object.entries(OBSERVATION_CATEGORIES).map(([key,label])=>
      '<option value="'+esc(key,40)+'">'+esc(label,80)+'</option>').join('');
    const card=(item,isArchived)=>{
      const label=OBSERVATION_CATEGORIES[item.category]||OBSERVATION_CATEGORIES.other;
      const id=esc(item.id,100);
      return '<article class="slp-observation-item'+(isArchived?' is-archived':'')+'">'+
        '<div class="slp-observation-meta"><b>'+esc(label,80)+'</b><time datetime="'+esc(item.date,10)+'">'+esc(item.date,10)+'</time></div>'+
        '<p><b>ما لوحظ فعليًا</b><span>'+esc(item.evidence,420)+'</span></p>'+
        '<p><b>خطوة التدريس القادمة</b><span>'+esc(item.nextStep,420)+'</span></p>'+
        '<button type="button" class="slp-observation-toggle" data-slp-observation-toggle="'+id+'" data-archived="'+(isArchived?'1':'0')+'">'+(isArchived?'استعادة الملاحظة':'أرشفة الملاحظة')+'</button>'+
      '</article>';
    };
    return '<section class="slp-observations" aria-label="ملاحظات تربوية خاصة بالمحفظ">'+
      '<div class="slp-observations-head"><div><b>📝 سجل الملاحظات التربوية</b><small>سلوك تعليمي شاهدته أثناء الحصة، وليس تصنيفًا ثابتًا للطالب</small></div><span>'+active.length+' نشطة</span></div>'+
      '<div class="slp-observation-form">'+
        '<div class="slp-observation-fields">'+
          '<label>نوع الملاحظة<select id="slpObservationCategory">'+options+'</select></label>'+
          '<label>تاريخ الملاحظة<input id="slpObservationDate" type="date" value="'+localDay()+'" max="'+localDay()+'" required></label>'+
        '</div>'+
        '<label>ما الذي لاحظته؟<textarea id="slpObservationEvidence" rows="2" maxlength="400" placeholder="مثال: استدعى الآية بعد تكرارها مرتين دون تلميح." required></textarea></label>'+
        '<label>ما الخطوة التعليمية القادمة؟<textarea id="slpObservationNextStep" rows="2" maxlength="400" placeholder="مثال: ابدأ بآيتين ثم زد المقطع تدريجيًا بعد التأكد من الإتقان." required></textarea></label>'+
        '<button type="button" class="btn btn-g btn-sm" data-slp-observation-save>حفظ الملاحظة الخاصة</button>'+
      '</div>'+
      '<div class="slp-observation-list">'+(active.length?active.map(item=>card(item,false)).join(''):'<p class="slp-empty">لا توجد ملاحظات تربوية مسجلة لهذا الطالب حتى الآن.</p>')+'</div>'+
      (archived.length?'<details class="slp-observation-archive"><summary>الملاحظات المؤرشفة ('+archived.length+') — يمكن استعادتها</summary><div class="slp-observation-list">'+archived.map(item=>card(item,true)).join('')+'</div></details>':'')+
      '<p class="slp-observation-privacy">هذه الملاحظات داخلية للمحفظ فقط، ولا تظهر في بوابة الطالب أو ولي الأمر. لا تُحذف نهائيًا؛ يمكن أرشفتها أو استعادتها.</p>'+
    '</section>';
  }
  return Object.freeze({build,render,validDay,createObservation,renderObservations});
});