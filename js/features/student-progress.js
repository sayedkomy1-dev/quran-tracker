'use strict';
/* We Live Quran v10.10.0 — Student Progress Dashboard.
   Read-only analytics over the existing Schema 12 session history. */

const V107_PROGRESS={baseOpenProf:globalThis.openProf||null,range:'90'};

function v107Esc(value){
  if(globalThis.ImamApp?.Utils?.escapeHtml)return globalThis.ImamApp.Utils.escapeHtml(value??'');
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function v107Score(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Math.round(Number(value));
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}
function v107Grade(value){
  const g=String(value||'').trim().replace('جيد جدًا','جيد جداً');
  if(g==='ممتاز')return 'ممتاز';
  if(g==='جيد جداً')return 'جيد جداً';
  if(g==='جيد')return 'جيد';
  if(g==='ضعيف'||g==='يحتاج متابعة')return 'ضعيف';
  if(g==='إعادة')return 'إعادة';
  return '';
}
function v107GradeLabel(value){
  const g=v107Grade(value);
  return g==='جيد جداً'?'جيد جدًا':g==='ضعيف'?'يحتاج متابعة':g||'—';
}
function v107DateValue(ses){
  const raw=ses?.date||ses?.sessionDate||ses?.createdAt||'';
  const n=Date.parse(raw);
  return Number.isFinite(n)?n:0;
}
function v107DateText(ses){
  const n=v107DateValue(ses);if(!n)return '—';
  return new Date(n).toLocaleDateString('ar-EG',{day:'numeric',month:'short'});
}
function v107RangeDays(){
  const sel=document.getElementById('v107Range');
  const value=String(sel?.value||V107_PROGRESS.range||'90');
  V107_PROGRESS.range=value;
  return value==='all'?Infinity:Math.max(1,Number(value)||90);
}
function v107RangeLabel(){
  const value=String(document.getElementById('v107Range')?.value||V107_PROGRESS.range||'90');
  return value==='30'?'آخر 30 يومًا':value==='90'?'آخر 90 يومًا':'كل الفترة';
}
function v107StudentSessions(studentId,rangeDays=Infinity){
  const rows=(Array.isArray(sessions)?sessions:[]).filter(x=>x.studentId===studentId).slice().sort((a,b)=>v107DateValue(a)-v107DateValue(b));
  if(!Number.isFinite(rangeDays))return rows;
  const cutoff=Date.now()-(Math.max(1,rangeDays)-1)*86400000;
  return rows.filter(x=>v107DateValue(x)>=cutoff);
}
function v107ReviewItemLabel(item){
  try{if(typeof v1051ItemDisplay==='function')return v1051ItemDisplay(item);}catch(_){ }
  return String(item?.label||item?.surahName||item?.juzName||item?.name||item?.id||'مراجعة').trim();
}
function v107SessionScoreEntries(ses){
  const out=[];
  const scores=ses?.assessmentScores||{};
  for(const [key,label] of [['new','الحفظ'],['rec','المراجعة القريبة'],['far','المراجعة البعيدة']]){
    const n=v107Score(scores[key]);if(n!==null)out.push({section:key,label,score:n});
  }
  let itemScoreCount=0;
  for(const group of Array.isArray(ses?.reviewResults)?ses.reviewResults:[]){
    for(const item of Array.isArray(group?.items)?group.items:[]){
      const n=v107Score(item?.score);if(n===null)continue;
      itemScoreCount++;
      out.push({section:'review',label:v107ReviewItemLabel(item),score:n});
    }
  }
  if(!itemScoreCount){
    for(const key of ['juz','surahReview']){
      const n=v107Score(scores[key]);if(n!==null)out.push({section:'review',label:key==='juz'?'مراجعة الأجزاء':'مراجعة السور',score:n});
    }
  }
  return out;
}
function v107SessionAverage(ses){
  const vals=v107SessionScoreEntries(ses).map(x=>x.score);
  return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
}
function v107Avg(values){
  const vals=values.filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
}
function v107SectionShort(sec){
  if(!sec)return '';
  const surah=String(sec.surah||sec.surahName||'').trim();if(!surah)return '';
  if(sec.full)return `سورة ${surah} كاملة`;
  const from=Number(sec.from)||1,to=Number(sec.to)||from;
  return `سورة ${surah} ${from}–${to}`;
}
function v107GradeEntries(ses){
  const out=[],pg=ses?.prevGrades||{};
  for(const key of ['new','rec','far']){const grade=v107Grade(pg[key]);if(grade)out.push({section:key,grade});}
  let itemGradeCount=0;
  for(const group of Array.isArray(ses?.reviewResults)?ses.reviewResults:[]){
    for(const item of Array.isArray(group?.items)?group.items:[]){
      const grade=v107Grade(item?.grade||item?.evaluation);const status=String(item?.status||'');
      if(grade){itemGradeCount++;out.push({section:'review',grade});}
      else if(status==='repeat'||status==='not_heard'){itemGradeCount++;out.push({section:'review',grade:'إعادة'});}
    }
  }
  if(!itemGradeCount){for(const key of ['juz','surahReview']){const grade=v107Grade(pg[key]);if(grade)out.push({section:'review',grade});}}
  return out;
}
function v107AttentionItems(studentId){
  const all=v107StudentSessions(studentId,Infinity).filter(x=>x.status==='حضر').slice().sort((a,b)=>v107DateValue(b)-v107DateValue(a)).slice(0,12);
  const seen=new Set(),items=[];
  const sectionNames={new:'الحفظ',rec:'المراجعة القريبة',far:'المراجعة البعيدة'};
  for(const ses of all){
    const scores=ses.assessmentScores||{},pg=ses.prevGrades||{};
    for(const key of ['new','rec','far']){
      const sec=ses.actualRecitation?.[key]||ses[key],range=v107SectionShort(sec);if(!range)continue;
      const id=`${key}:${range}`,score=v107Score(scores[key]),grade=v107Grade(pg[key]);
      if(seen.has(id))continue;seen.add(id);
      const weak=score!==null?score<65:(grade==='ضعيف'||grade==='إعادة');
      if(weak)items.push({label:`${sectionNames[key]} · ${range}`,score,grade,date:v107DateText(ses)});
    }
    for(const group of Array.isArray(ses.reviewResults)?ses.reviewResults:[]){
      for(const item of Array.isArray(group?.items)?group.items:[]){
        const label=v107ReviewItemLabel(item),id=`review:${label}`;if(seen.has(id))continue;seen.add(id);
        const score=v107Score(item?.score),grade=v107Grade(item?.grade||item?.evaluation),status=String(item?.status||'');
        const weak=score!==null?score<65:(grade==='ضعيف'||grade==='إعادة'||status==='repeat'||status==='not_heard');
        if(weak)items.push({label,score,grade:grade||((status==='repeat'||status==='not_heard')?'إعادة':''),date:v107DateText(ses)});
      }
    }
  }
  return items.slice(0,8);
}
function v107Trend(sessionPoints){
  const values=sessionPoints.map(x=>x.value).filter(Number.isFinite);
  if(values.length<2)return{delta:null,label:'بيانات غير كافية',cls:'neutral'};
  const tail=values.slice(-3),prev=values.slice(-6,-3);
  if(!prev.length){const delta=tail.at(-1)-values[0];return{delta,label:Math.abs(delta)<5?'مستقر':delta>0?`تحسن +${Math.round(delta)}`:`تراجع ${Math.round(delta)}`,cls:delta>=5?'up':delta<=-5?'down':'neutral'};}
  const delta=v107Avg(tail)-v107Avg(prev);
  return{delta,label:Math.abs(delta)<5?'مستقر':delta>0?`تحسن +${Math.round(delta)}`:`تراجع ${Math.round(delta)}`,cls:delta>=5?'up':delta<=-5?'down':'neutral'};
}
function v107Sparkline(points){
  const vals=points.map(x=>x.value).filter(Number.isFinite);if(!vals.length)return '<div class="v107-empty">لا توجد نسب رقمية مسجلة في هذه الفترة.</div>';
  const w=320,h=104,pad=10,min=0,max=100;
  const coords=vals.map((v,i)=>{const x=vals.length===1?w/2:pad+i*(w-2*pad)/(vals.length-1),y=pad+(max-v)*(h-2*pad)/(max-min);return{x,y,v};});
  const poly=coords.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const circles=coords.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2"></circle>`).join('');
  return `<div class="v107-chart"><div class="v107-chart-scale"><span>100</span><span>50</span><span>0</span></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="مسار نسب الإتقان"><line x1="${pad}" y1="${h/2}" x2="${w-pad}" y2="${h/2}" class="mid"></line><polyline points="${poly}" class="line"></polyline>${circles}</svg></div>`;
}
function v107MasteryClass(value){if(value===null)return'none';if(value>=85)return'great';if(value>=70)return'good';if(value>=60)return'warn';return'bad';}
function v107Metric(value,suffix=''){return value===null?'—':`${value}${suffix}`;}
function v107ProgressBar(value){const n=value===null?0:value;return `<div class="v107-bar"><span style="width:${Math.max(0,Math.min(100,n))}%"></span></div>`;}
function v107Calculate(studentId,rangeDays=v107RangeDays()){
  const rows=v107StudentSessions(studentId,rangeDays),present=rows.filter(x=>x.status==='حضر'),absent=rows.filter(x=>x.status==='غاب');
  const sessionPoints=present.map(s=>({date:v107DateText(s),value:v107SessionAverage(s)})).filter(x=>x.value!==null);
  const mastery=v107Avg(sessionPoints.map(x=>x.value));
  const eligible=present.length+absent.length,attendance=eligible?Math.round(present.length/eligible*100):null;
  const scoreEntries=present.flatMap(v107SessionScoreEntries),sectionAvgs={};
  for(const key of ['new','rec','far','review'])sectionAvgs[key]=v107Avg(scoreEntries.filter(x=>x.section===key).map(x=>x.score));
  const gradeEntries=present.flatMap(v107GradeEntries),gradeCounts={'ممتاز':0,'جيد جداً':0,'جيد':0,'ضعيف':0,'إعادة':0};
  gradeEntries.forEach(x=>{if(x.grade in gradeCounts)gradeCounts[x.grade]++;});
  const repeats=gradeCounts['إعادة'];
  let newAyat=0;try{newAyat=countUniqueAyatFromSessions(present);}catch(_){newAyat=0;}
  const attention=v107AttentionItems(studentId),trend=v107Trend(sessionPoints),coverage=present.length?Math.round(sessionPoints.length/present.length*100):0;
  return{rows,present,absent,sessionPoints,mastery,attendance,sectionAvgs,gradeCounts,repeats,newAyat,attention,trend,coverage,scoreEntries};
}
function v107SectionCard(icon,title,value,subtitle){
  const cls=v107MasteryClass(value);return `<div class="v107-section"><div class="v107-section-head"><span>${icon} ${title}</span><b class="${cls}">${v107Metric(value,'%')}</b></div>${v107ProgressBar(value)}<small>${v107Esc(subtitle)}</small></div>`;
}
function v107RenderAttention(items){
  if(!items.length)return '<div class="v107-good-state"><b>✅ لا توجد إشارات حديثة تستدعي التثبيت</b><span>آخر النتائج لا تحتوي على إعادة أو نسبة أقل من 65%.</span></div>';
  return `<div class="v107-attention-list">${items.map(x=>`<div class="v107-attention-item"><div><b>${v107Esc(x.label)}</b><small>${v107Esc(x.date)}</small></div><span>${x.score!==null?`${x.score}%`:v107Esc(v107GradeLabel(x.grade))}</span></div>`).join('')}</div>`;
}
function renderV107Progress(studentId=curStId){
  const host=document.getElementById('profProgressContent');if(!host||!studentId)return;
  const st=(Array.isArray(students)?students:[]).find(x=>x.id===studentId);if(!st)return;
  const data=v107Calculate(studentId),period=v107RangeLabel(),last=data.sessionPoints.at(-1)?.value??null;
  const grades=data.gradeCounts,totalGrades=Object.values(grades).reduce((a,b)=>a+b,0);
  const gradeRows=[['ممتاز','⭐⭐⭐',grades['ممتاز']],['جيد جدًا','⭐⭐',grades['جيد جداً']],['جيد','⭐',grades['جيد']],['يحتاج متابعة','😕',grades['ضعيف']],['إعادة','🔄',grades['إعادة']]];
  const scoreCoverage=data.present.length?`نسب رقمية في ${data.sessionPoints.length} من ${data.present.length} حصة حضور`:'لا توجد حصص حضور في الفترة';
  host.innerHTML=`
    <div class="v107-kpis">
      <div class="v107-kpi ${v107MasteryClass(data.mastery)}"><small>متوسط الإتقان</small><strong>${v107Metric(data.mastery,'%')}</strong><span>${v107Esc(scoreCoverage)}</span></div>
      <div class="v107-kpi"><small>نسبة الحضور</small><strong>${v107Metric(data.attendance,'%')}</strong><span>${data.present.length} حضور · ${data.absent.length} غياب</span></div>
      <div class="v107-kpi ${data.repeats?'warn':'great'}"><small>الإعادات</small><strong>${data.repeats}</strong><span>داخل ${v107Esc(period)}</span></div>
      <div class="v107-kpi"><small>حفظ جديد</small><strong>${data.newAyat}</strong><span>آية في ${v107Esc(period)}</span></div>
    </div>
    <div class="v107-panel">
      <div class="v107-panel-head"><div><b>📈 اتجاه الإتقان</b><small>يعتمد على النسب التي كتبها المحفظ فقط</small></div><span class="v107-trend ${data.trend.cls}">${v107Esc(data.trend.label)}</span></div>
      ${v107Sparkline(data.sessionPoints.slice(-12))}
      <div class="v107-chart-foot"><span>آخر نسبة: <b>${v107Metric(last,'%')}</b></span><span>تغطية التسجيل: <b>${data.coverage}%</b></span></div>
    </div>
    <div class="v107-panel">
      <div class="v107-panel-head"><div><b>🎯 مستوى الأقسام</b><small>متوسط النسب المسجلة لكل نوع تسميع</small></div></div>
      <div class="v107-sections">
        ${v107SectionCard('📖','الحفظ',data.sectionAvgs.new,'الحفظ الجديد')}
        ${v107SectionCard('📚','المراجعة القريبة',data.sectionAvgs.rec,'المراجعات القريبة')}
        ${v107SectionCard('📘','المراجعة البعيدة',data.sectionAvgs.far,'المراجعات البعيدة')}
        ${v107SectionCard('🧩','السور والأرباع',data.sectionAvgs.review,'تقييمات عناصر المراجعة')}
      </div>
    </div>
    <div class="v107-panel">
      <div class="v107-panel-head"><div><b>🔍 يحتاج تثبيت الآن</b><small>آخر 12 حصة — النتيجة الأحدث لكل موضع هي المعتمدة</small></div><span class="v107-count">${data.attention.length}</span></div>
      ${v107RenderAttention(data.attention)}
    </div>
    <div class="v107-panel">
      <div class="v107-panel-head"><div><b>⭐ توزيع التقييمات</b><small>${totalGrades?`${totalGrades} تقييمًا في ${period}`:'لا توجد تقييمات في الفترة'}</small></div></div>
      <div class="v107-grade-dist">${gradeRows.map(([label,icon,count])=>`<div><span>${icon}</span><b>${count}</b><small>${label}</small></div>`).join('')}</div>
    </div>
    <div class="v107-actions"><button class="btn btn-wa btn-sm" onclick="v107SendProgressWhatsApp()">📲 إرسال ملخص التقدم</button><button class="btn btn-out btn-sm" onclick="goPage('reports')">📊 التقرير الشهري</button></div>`;
}
function v107SendProgressWhatsApp(){
  if(!curStId)return;
  const st=(Array.isArray(students)?students:[]).find(x=>x.id===curStId);if(!st)return;
  const data=v107Calculate(curStId),period=v107RangeLabel(),parts=[];
  for(const [label,key] of [['الحفظ','new'],['المراجعة القريبة','rec'],['المراجعة البعيدة','far'],['السور والأرباع','review']]){const n=data.sectionAvgs[key];if(n!==null)parts.push(`• ${label}: ${n}/100`);}
  const focus=data.attention.slice(0,4).map(x=>`• ${x.label}`).join('\n');
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n📊 *ملخص تقدم الطالب: ${st.name}*\n📅 ${period}\n\n`;
  msg+=`🎯 متوسط الإتقان: ${data.mastery===null?'لم تُسجل نسب كافية':data.mastery+'/100'}\n✅ الحضور: ${data.attendance===null?'—':data.attendance+'%'}\n📖 الحفظ الجديد: ${data.newAyat} آية\n🔄 الإعادات: ${data.repeats}\n`;
  if(parts.length)msg+=`\n*مستوى الأقسام*\n${parts.join('\n')}\n`;
  if(focus)msg+=`\n*مواضع تحتاج تثبيت*\n${focus}\n`;
  msg+=`\nنسأل الله له مزيدًا من التوفيق والثبات 🌱`;
  try{if(typeof academyFooter==='function')msg+=academyFooter();}catch(_){ }
  if(typeof openWhatsApp==='function')openWhatsApp(st,msg);else if(typeof directWA==='function')directWA(st.id);
}
function v107EnsureProfileTab(){
  const tabs=document.getElementById('v9ProfileTabs');if(!tabs)return null;
  let btn=tabs.querySelector('[data-v107-tab="progress"]');
  if(!btn){btn=document.createElement('button');btn.dataset.v107Tab='progress';btn.textContent='التقدم';btn.setAttribute('onclick',"setProfileTab('progress',this)");tabs.prepend(btn);}
  return btn;
}
function v107SetProfileTab(tab,btn){
  document.querySelectorAll('#v9ProfileTabs button').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');
  const map={progress:['profProgress'],plan:['profStop','profMap','profTrack'],history:['profHist'],analysis:['profErrors','profChart','profWeak']};
  const all=new Set(Object.values(map).flat());
  all.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=(map[tab]||[]).includes(id)?'block':'none';});
  if(tab==='progress'&&curStId)renderV107Progress(curStId);
}

if(typeof globalThis.setProfileTab==='function')globalThis.setProfileTab=v107SetProfileTab;
if(typeof V107_PROGRESS.baseOpenProf==='function'){
  globalThis.openProf=function(id){
    V107_PROGRESS.baseOpenProf(id);
    const btn=v107EnsureProfileTab();
    renderV107Progress(id);
    v107SetProfileTab('progress',btn);
  };
}

globalThis.ImamApp=globalThis.ImamApp||{};
globalThis.ImamApp.StudentProgress=Object.freeze({render:renderV107Progress,calculate:v107Calculate,sendWhatsApp:v107SendProgressWhatsApp});
