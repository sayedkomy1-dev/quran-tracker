'use strict';
/* We Live Quran v10.9.0 — Circle Analytics & Reports Center.
   Read-only cross-student analytics over the existing Schema 12 data. */

const V109_ANALYTICS={range:'30',group:'',baseGoPage:globalThis.goPage||null,baseGoBack:globalThis.goBack||null,baseInjectNav:globalThis.injectV9Navigation||null};

function v109Esc(value){
  if(globalThis.ImamApp?.Utils?.escapeHtml)return globalThis.ImamApp.Utils.escapeHtml(value??'');
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function v109Score(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Math.round(Number(value));
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
}
function v109Grade(value){
  const g=String(value||'').trim().replace('جيد جدًا','جيد جداً');
  if(g==='ممتاز')return 'ممتاز';
  if(g==='جيد جداً')return 'جيد جداً';
  if(g==='جيد')return 'جيد';
  if(g==='ضعيف'||g==='يحتاج متابعة')return 'ضعيف';
  if(g==='إعادة')return 'إعادة';
  return '';
}
function v109Avg(values){const a=(values||[]).filter(Number.isFinite);return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;}
function v109DateValue(ses){const n=Date.parse(ses?.date||ses?.sessionDate||ses?.createdAt||'');return Number.isFinite(n)?n:0;}
function v109RangeDays(value=V109_ANALYTICS.range){return value==='7'?7:value==='30'?30:value==='90'?90:Infinity;}
function v109RangeLabel(value=V109_ANALYTICS.range){return value==='7'?'آخر 7 أيام':value==='30'?'آخر 30 يومًا':value==='90'?'آخر 90 يومًا':'كل الفترة';}
function v109ActiveStudents(){return (Array.isArray(students)?students:[]).filter(st=>!st.studentStatus||st.studentStatus==='active');}
function v109Groups(){return [...new Set(v109ActiveStudents().map(x=>String(x.group||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));}
function v109Students(group=V109_ANALYTICS.group){const g=String(group||'').trim();return v109ActiveStudents().filter(st=>!g||String(st.group||'').trim()===g);}
function v109Sessions(studentIds,days=v109RangeDays()){
  const ids=new Set(studentIds||[]),all=Array.isArray(sessions)?sessions:[];
  const cutoff=Number.isFinite(days)?Date.now()-(Math.max(1,days)-1)*86400000:-Infinity;
  return all.filter(s=>ids.has(s.studentId)&&v109DateValue(s)>=cutoff);
}
function v109Progress(studentId,days=v109RangeDays()){
  try{return globalThis.ImamApp?.StudentProgress?.calculate?.(studentId,days)||null;}catch(_){return null;}
}
function v109SectionLabel(sec){
  if(!sec)return '';
  const surah=String(sec.surah||sec.surahName||'').trim();if(!surah)return '';
  if(sec.full)return `سورة ${surah} كاملة`;
  const from=Number(sec.from)||1,to=Number(sec.to)||from;
  return `سورة ${surah} ${from}–${to}`;
}
function v109ReviewLabel(item){
  try{if(typeof v1051ItemDisplay==='function')return v1051ItemDisplay(item);}catch(_){ }
  return String(item?.label||item?.surahName||item?.juzName||item?.name||item?.id||'مراجعة').trim();
}
function v109AddWeak(map,studentId,label,score,grade,status){
  if(!label)return;
  const weak=(score!==null&&score<65)||grade==='ضعيف'||grade==='إعادة'||status==='repeat'||status==='not_heard';
  if(!weak)return;
  const key=label.replace(/\s+/g,' ').trim();
  const row=map.get(key)||{label:key,count:0,students:new Set(),scores:[],repeats:0};
  row.count++;row.students.add(studentId);if(score!==null)row.scores.push(score);if(grade==='إعادة'||status==='repeat'||status==='not_heard')row.repeats++;
  map.set(key,row);
}
function v109WeakItems(rows){
  const map=new Map();
  for(const ses of rows){
    if(ses.status!=='حضر')continue;
    const scores=ses.assessmentScores||{},grades=ses.prevGrades||{},names={new:'الحفظ',rec:'المراجعة القريبة',far:'المراجعة البعيدة'};
    for(const key of ['new','rec','far']){
      const sec=ses.actualRecitation?.[key]||ses[key],range=v109SectionLabel(sec);if(!range)continue;
      v109AddWeak(map,ses.studentId,`${names[key]} · ${range}`,v109Score(scores[key]),v109Grade(grades[key]),'');
    }
    for(const group of Array.isArray(ses.reviewResults)?ses.reviewResults:[]){
      for(const item of Array.isArray(group?.items)?group.items:[]){
        v109AddWeak(map,ses.studentId,v109ReviewLabel(item),v109Score(item?.score),v109Grade(item?.grade||item?.evaluation),String(item?.status||''));
      }
    }
  }
  return [...map.values()].map(x=>({label:x.label,count:x.count,studentCount:x.students.size,avg:v109Avg(x.scores),repeats:x.repeats})).sort((a,b)=>b.studentCount-a.studentCount||b.count-a.count||(a.avg??101)-(b.avg??101)||a.label.localeCompare(b.label,'ar')).slice(0,10);
}
function v109StudentRow(st,days=v109RangeDays()){
  const data=v109Progress(st.id,days)||{present:[],absent:[],mastery:null,attendance:null,repeats:0,newAyat:0,trend:{delta:null,label:'بيانات غير كافية',cls:'neutral'},gradeCounts:{}};
  const mastery=Number.isFinite(data.mastery)?data.mastery:null,attendance=Number.isFinite(data.attendance)?data.attendance:null;
  return{st,data,mastery,attendance,present:data.present?.length||0,absent:data.absent?.length||0,repeats:Number(data.repeats)||0,newAyat:Number(data.newAyat)||0,trend:data.trend||{delta:null,label:'بيانات غير كافية',cls:'neutral'}};
}
function v109Analyze(range=V109_ANALYTICS.range,group=V109_ANALYTICS.group){
  const days=v109RangeDays(range),list=v109Students(group),studentRows=list.map(st=>v109StudentRow(st,days)),ids=list.map(x=>x.id),rows=v109Sessions(ids,days);
  const present=rows.filter(x=>x.status==='حضر'),absent=rows.filter(x=>x.status==='غاب'),vacation=rows.filter(x=>x.status==='إجازة');
  const eligible=present.length+absent.length,attendance=eligible?Math.round(present.length/eligible*100):null;
  const mastery=v109Avg(studentRows.map(x=>x.mastery)),repeats=studentRows.reduce((n,x)=>n+x.repeats,0),newAyat=studentRows.reduce((n,x)=>n+x.newAyat,0);
  const scoredStudents=studentRows.filter(x=>x.mastery!==null).length,unscoredStudents=studentRows.filter(x=>x.present>0&&x.mastery===null).length;
  const trendCounts={up:0,neutral:0,down:0};studentRows.forEach(x=>{const c=['up','down'].includes(x.trend?.cls)?x.trend.cls:'neutral';trendCounts[c]++;});
  const gradeCounts={'ممتاز':0,'جيد جداً':0,'جيد':0,'ضعيف':0,'إعادة':0};
  studentRows.forEach(x=>Object.entries(x.data?.gradeCounts||{}).forEach(([k,v])=>{if(k in gradeCounts)gradeCounts[k]+=Number(v)||0;}));
  const ranked=studentRows.slice().sort((a,b)=>(b.mastery??-1)-(a.mastery??-1)||(b.attendance??-1)-(a.attendance??-1)||b.newAyat-a.newAyat||String(a.st.name||'').localeCompare(String(b.st.name||''),'ar'));
  const improving=studentRows.filter(x=>Number.isFinite(x.trend?.delta)&&x.trend.delta>=5).sort((a,b)=>b.trend.delta-a.trend.delta).slice(0,5);
  const declining=studentRows.filter(x=>Number.isFinite(x.trend?.delta)&&x.trend.delta<=-5).sort((a,b)=>a.trend.delta-b.trend.delta).slice(0,5);
  return{range,group,days,students:list,studentRows,rows,present,absent,vacation,mastery,attendance,repeats,newAyat,scoredStudents,unscoredStudents,trendCounts,gradeCounts,weakItems:v109WeakItems(rows),ranked,improving,declining};
}
function v109Metric(value,suffix=''){return value===null||value===undefined?'—':`${value}${suffix}`;}
function v109MasteryClass(value){if(value===null)return'none';if(value>=85)return'great';if(value>=70)return'good';if(value>=60)return'warn';return'bad';}
function v109Bar(value,cls=''){const n=Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;return `<div class="v109-bar ${cls}"><span style="width:${n}%"></span></div>`;}
function v109Kpi(icon,label,value,sub,cls=''){return `<div class="v109-kpi ${cls}"><span>${icon}</span><div><b>${v109Esc(value)}</b><small>${v109Esc(label)}</small>${sub?`<em>${v109Esc(sub)}</em>`:''}</div></div>`;}
function v109TrendCards(data){
  const total=Math.max(1,data.studentRows.length),pct=n=>Math.round(n/total*100);
  return `<div class="v109-trend-grid"><div class="up"><b>${data.trendCounts.up}</b><span>متحسنون</span>${v109Bar(pct(data.trendCounts.up),'up')}</div><div class="neutral"><b>${data.trendCounts.neutral}</b><span>مستقر/غير كافٍ</span>${v109Bar(pct(data.trendCounts.neutral),'neutral')}</div><div class="down"><b>${data.trendCounts.down}</b><span>متراجعون</span>${v109Bar(pct(data.trendCounts.down),'down')}</div></div>`;
}
function v109GradeDistribution(data){
  const order=[['ممتاز','⭐⭐⭐'],['جيد جداً','⭐⭐'],['جيد','⭐'],['ضعيف','😕'],['إعادة','🔄']],total=Object.values(data.gradeCounts).reduce((a,b)=>a+b,0)||1;
  return `<div class="v109-grade-list">${order.map(([k,ic])=>{const n=data.gradeCounts[k]||0,p=Math.round(n/total*100),label=k==='جيد جداً'?'جيد جدًا':k==='ضعيف'?'يحتاج متابعة':k;return `<div><span>${ic} ${label}</span><b>${n}</b>${v109Bar(p)}</div>`;}).join('')}</div>`;
}
function v109WeakList(items){
  if(!items.length)return '<div class="v109-empty">لا توجد مواضع ضعف واضحة في الفترة المختارة.</div>';
  return `<div class="v109-weak-list">${items.map((x,i)=>`<div><span class="v109-rank">${i+1}</span><div><b>${v109Esc(x.label)}</b><small>${x.studentCount} طالب · ${x.count} مرة${x.avg!==null?` · متوسط ${x.avg}%`:''}${x.repeats?` · ${x.repeats} إعادة`:''}</small></div></div>`).join('')}</div>`;
}
function v109MovementList(rows,type){
  if(!rows.length)return `<div class="v109-empty">${type==='up'?'لا يوجد تحسن رقمي كافٍ للحكم في هذه الفترة.':'لا توجد حالات تراجع رقمي واضحة في هذه الفترة.'}</div>`;
  return `<div class="v109-movement-list">${rows.map(x=>`<button onclick="openProf('${v109Esc(x.st.id)}')"><span>${type==='up'?'↗️':'↘️'}</span><div><b>${v109Esc(x.st.name)}</b><small>${v109Esc(x.st.group||'بدون حلقة')} · إتقان ${v109Metric(x.mastery,'%')}</small></div><em class="${type}">${type==='up'?'+':''}${Math.round(x.trend.delta)}</em></button>`).join('')}</div>`;
}
function v109StudentTable(data){
  if(!data.ranked.length)return '<div class="v109-empty">لا يوجد طلاب نشطون في هذا النطاق.</div>';
  return `<div class="v109-table-wrap"><table class="v109-table"><thead><tr><th>#</th><th>الطالب</th><th>الإتقان</th><th>الحضور</th><th>الحصص</th><th>الإعادات</th><th>الاتجاه</th></tr></thead><tbody>${data.ranked.map((x,i)=>`<tr onclick="openProf('${v109Esc(x.st.id)}')"><td>${i+1}</td><td><b>${v109Esc(x.st.name)}</b><small>${v109Esc(x.st.group||'—')}</small></td><td class="${v109MasteryClass(x.mastery)}">${v109Metric(x.mastery,'%')}</td><td>${v109Metric(x.attendance,'%')}</td><td>${x.present}</td><td>${x.repeats}</td><td><span class="v109-trend-pill ${x.trend?.cls||'neutral'}">${v109Esc(x.trend?.label||'—')}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function v109SyncGroups(){
  const el=document.getElementById('v109Group');if(!el)return;
  const current=V109_ANALYTICS.group;el.innerHTML='<option value="">كل الحلقات</option>'+v109Groups().map(g=>`<option value="${v109Esc(g)}">${v109Esc(g)}</option>`).join('');el.value=current;
}
function renderV109Analytics(){
  const host=document.getElementById('v109Content');if(!host)return;
  v109SyncGroups();
  const rangeEl=document.getElementById('v109Range');if(rangeEl)rangeEl.value=V109_ANALYTICS.range;
  const data=v109Analyze();
  const circle=data.group||settings?.circle||'كل الحلقة';
  const coverage=data.students.length?Math.round(data.scoredStudents/data.students.length*100):0;
  host.innerHTML=`
    <section class="v109-report-head"><div><span>الفترة</span><b>${v109Esc(v109RangeLabel(data.range))}</b></div><div><span>الحلقة</span><b>${v109Esc(circle)}</b></div><div><span>الطلاب النشطون</span><b>${data.students.length}</b></div><div><span>تغطية النسب</span><b>${coverage}%</b></div></section>
    <section class="v109-kpis">
      ${v109Kpi('🎯','متوسط الإتقان',v109Metric(data.mastery,'%'),`${data.scoredStudents} طالب بنسب مسجلة`,v109MasteryClass(data.mastery))}
      ${v109Kpi('📅','نسبة الحضور',v109Metric(data.attendance,'%'),`${data.present.length} حضور · ${data.absent.length} غياب`)}
      ${v109Kpi('📖','حصص الحضور',String(data.present.length),`${data.rows.length} سجل في الفترة`)}
      ${v109Kpi('🔄','إجمالي الإعادات',String(data.repeats),'من التقييمات المسجلة')}
      ${v109Kpi('📝','آيات حفظ جديد',String(data.newAyat),'إجمالي الطلاب في الفترة')}
      ${v109Kpi('⚪','بدون نسب',String(data.unscoredStudents),'لديهم حضور لكن بلا نسبة رقمية')}
    </section>
    <section class="v109-grid two"><article class="card v109-panel"><div class="ch">📈 اتجاه أداء الطلاب</div>${v109TrendCards(data)}</article><article class="card v109-panel"><div class="ch">⭐ توزيع التقييمات</div>${v109GradeDistribution(data)}</article></section>
    <section class="v109-grid two"><article class="card v109-panel"><div class="ch">🧩 أكثر المواضع احتياجًا للتثبيت</div><p class="v109-help">مرتبة بعدد الطلاب المتأثرين ثم عدد مرات الضعف خلال الفترة.</p>${v109WeakList(data.weakItems)}</article><article class="card v109-panel"><div class="ch">🚀 الطلاب الأكثر تحسنًا</div>${v109MovementList(data.improving,'up')}<div class="v109-divider"></div><div class="ch">⚠️ اتجاه متراجع</div>${v109MovementList(data.declining,'down')}</article></section>
    <section class="card v109-panel"><div class="ch">🏅 ترتيب ومؤشرات الطلاب</div><p class="v109-help">الترتيب يبدأ بمتوسط الإتقان، ثم الحضور، ثم حجم الحفظ الجديد. اضغط على أي طالب لفتح ملفه.</p>${v109StudentTable(data)}</section>`;
}
function v109SetRange(value){V109_ANALYTICS.range=String(value||'30');renderV109Analytics();}
function v109SetGroup(value){V109_ANALYTICS.group=String(value||'');renderV109Analytics();}
function v109CsvCell(value){let v=String(value??'');if(/^[=+\-@]/.test(v))v="'"+v;return `"${v.replace(/"/g,'""')}"`;}
function v109ExportCSV(){
  const data=v109Analyze(),rows=[['الطالب','الحلقة','الإتقان %','الحضور %','حصص حضور','غياب','إعادات','آيات حفظ جديد','الاتجاه']];
  data.ranked.forEach(x=>rows.push([x.st.name||'',x.st.group||'',x.mastery??'',x.attendance??'',x.present,x.absent,x.repeats,x.newAyat,x.trend?.label||'']));
  const csv='\ufeff'+rows.map(r=>r.map(v109CsvCell).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`circle-analytics-${String(V109_ANALYTICS.range)}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(typeof toast==='function')toast('تم تصدير تقرير الحلقة CSV','success');
}
function v109SummaryText(data=v109Analyze()){
  const group=data.group||settings?.circle||'كل الحلقة';
  let txt=`📊 ملخص الحلقة — ${group}\n📅 ${v109RangeLabel(data.range)}\n\n`;
  txt+=`👥 الطلاب النشطون: ${data.students.length}\n🎯 متوسط الإتقان: ${v109Metric(data.mastery,'%')}\n📅 الحضور: ${v109Metric(data.attendance,'%')}\n✅ حصص الحضور: ${data.present.length}\n🔄 الإعادات: ${data.repeats}\n📖 آيات الحفظ الجديد: ${data.newAyat}\n`;
  if(data.improving.length)txt+=`\n🚀 تحسن ملحوظ: ${data.improving.map(x=>x.st.name).join('، ')}`;
  if(data.declining.length)txt+=`\n⚠️ يحتاج متابعة: ${data.declining.map(x=>x.st.name).join('، ')}`;
  if(data.weakItems.length)txt+=`\n🧩 أكثر موضع يحتاج تثبيت: ${data.weakItems[0].label}`;
  return txt;
}
async function v109CopySummary(){
  const txt=v109SummaryText();
  try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(txt);else throw new Error('no clipboard');if(typeof toast==='function')toast('تم نسخ ملخص الحلقة','success');}
  catch(_){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand?.('copy');ta.remove();if(typeof toast==='function')toast('تم نسخ ملخص الحلقة','success');}
}
async function v109ShareSummary(){
  const txt=v109SummaryText(),nav=globalThis.navigator;
  if(nav?.share){
    try{await nav.share({title:'تحليلات وتقارير الحلقة',text:txt});return;}catch(err){if(err?.name==='AbortError')return;}
  }
  return v109CopySummary();
}
function v109Print(){
  document.body.classList.add('v109-print');
  const cleanup=()=>document.body.classList.remove('v109-print');window.addEventListener('afterprint',cleanup,{once:true});setTimeout(()=>window.print(),80);
}
function v109EnsureMoreItem(){
  const grid=document.getElementById('v9MoreGrid');if(!grid||grid.querySelector('[data-v109-more]'))return;
  const btn=document.createElement('button');btn.className='v9-more-item';btn.dataset.v109More='1';btn.setAttribute('onclick',"goPage('analytics');closeV9More()");btn.innerHTML=`${typeof v9Icon==='function'?v9Icon('chart'):'📊'}<b>تحليلات الحلقة</b><small>الإتقان والحضور والاتجاهات والتقارير</small>`;grid.appendChild(btn);
}
function v109PatchNavigation(){
  if(typeof V109_ANALYTICS.baseGoPage==='function')globalThis.goPage=function(p){
    V109_ANALYTICS.baseGoPage(p);
    if(p==='analytics'){
      const back=document.getElementById('backBtn');if(back)back.style.display='block';
      const title=document.getElementById('hdrTitle');if(title)title.textContent='تحليلات وتقارير الحلقة';
      const sub=document.getElementById('hdrSub');if(sub)sub.textContent='صورة شاملة للأداء خلال الفترة المختارة';
      document.querySelectorAll('#v9Nav .v9-nav-btn').forEach(b=>b.classList.toggle('on',b.dataset.page==='reports'));
      renderV109Analytics();
    }
    v109EnsureMoreItem();
  };
  if(typeof V109_ANALYTICS.baseGoBack==='function')globalThis.goBack=function(){if(curPage==='analytics')return goPage('reports');return V109_ANALYTICS.baseGoBack();};
  if(typeof V109_ANALYTICS.baseInjectNav==='function')globalThis.injectV9Navigation=function(){const r=V109_ANALYTICS.baseInjectNav();setTimeout(v109EnsureMoreItem,0);return r;};
}
function v109Init(){v109PatchNavigation();v109EnsureMoreItem();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(v109Init,0),{once:true});else setTimeout(v109Init,0);

globalThis.v109SetRange=v109SetRange;
globalThis.v109SetGroup=v109SetGroup;
globalThis.v109ExportCSV=v109ExportCSV;
globalThis.v109CopySummary=v109CopySummary;
globalThis.v109ShareSummary=v109ShareSummary;
globalThis.v109Print=v109Print;
globalThis.renderV109Analytics=renderV109Analytics;
globalThis.ImamApp=globalThis.ImamApp||{};
globalThis.ImamApp.CircleAnalytics=Object.freeze({analyze:v109Analyze,weakItems:v109WeakItems,summaryText:v109SummaryText,render:renderV109Analytics});
