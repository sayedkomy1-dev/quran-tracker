'use strict';
/* We Live Quran v10.10.0 — Teacher Follow-up Center.
   Cross-student read-only prioritization over existing Schema 12 data. */

const V108_FOLLOWUP={filter:'all',query:'',group:'',baseGoPage:globalThis.goPage||null,baseGoBack:globalThis.goBack||null,baseRenderHome:globalThis.renderV9Home||null,baseInjectNav:globalThis.injectV9Navigation||null};

function v108Esc(value){
  if(globalThis.ImamApp?.Utils?.escapeHtml)return globalThis.ImamApp.Utils.escapeHtml(value??'');
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function v108ActiveStudents(){return (Array.isArray(students)?students:[]).filter(st=>!st.studentStatus||st.studentStatus==='active');}
function v108DateValue(ses){const n=Date.parse(ses?.date||ses?.sessionDate||ses?.createdAt||'');return Number.isFinite(n)?n:0;}
function v108DaysAgo(ts){if(!ts)return null;return Math.max(0,Math.floor((Date.now()-ts)/86400000));}
function v108LastAttendance(studentId){return (Array.isArray(sessions)?sessions:[]).filter(s=>s.studentId===studentId&&s.status==='حضر').slice().sort((a,b)=>v108DateValue(b)-v108DateValue(a))[0]||null;}
function v108Progress(studentId){
  try{return globalThis.ImamApp?.StudentProgress?.calculate?.(studentId,30)||null;}catch(_){return null;}
}
function v108BuildRow(st){
  const data=v108Progress(st.id)||{present:[],absent:[],mastery:null,attendance:null,repeats:0,attention:[],trend:{cls:'neutral',label:'بيانات غير كافية'}};
  const last=v108LastAttendance(st.id),days=v108DaysAgo(v108DateValue(last));
  const eligible=(data.present?.length||0)+(data.absent?.length||0);
  const mastery=Number.isFinite(data.mastery)?data.mastery:null,attendance=Number.isFinite(data.attendance)?data.attendance:null,repeats=Number(data.repeats)||0,attention=Array.isArray(data.attention)?data.attention:[];
  const flags={
    mastery:mastery!==null&&mastery<70,
    repeats:repeats>0,
    attendance:eligible>=3&&attendance!==null&&attendance<75,
    overdue:days===null||days>10,
    declining:data.trend?.cls==='down',
    unscored:(data.present?.length||0)>=2&&mastery===null
  };
  let score=0;const reasons=[];
  if(mastery!==null&&mastery<60){score+=4;reasons.push(`إتقان ${mastery}%`);}else if(mastery!==null&&mastery<70){score+=2;reasons.push(`إتقان ${mastery}%`);}
  if(attention.length>=3){score+=2;reasons.push(`${attention.length} مواضع تحتاج تثبيت`);}else if(attention.length){score+=1;reasons.push(`${attention.length} موضع يحتاج تثبيت`);}
  if(repeats>=2){score+=2;reasons.push(`${repeats} إعادات`);}else if(repeats===1){score+=1;reasons.push('إعادة حديثة');}
  if(flags.attendance){score+=2;reasons.push(`حضور ${attendance}%`);}
  if(flags.declining){score+=1;reasons.push('اتجاه الأداء متراجع');}
  if(days===null){score+=2;reasons.push('لم يبدأ التسميع');}else if(days>14){score+=2;reasons.push(`آخر حصة منذ ${days} يوم`);}else if(days>7){score+=1;reasons.push(`آخر حصة منذ ${days} أيام`);}
  if(flags.unscored){score+=1;reasons.push('لا توجد نسب رقمية كافية');}
  const priority=score>=6?'urgent':score>=3?'follow':'stable';
  return{st,data,last,days,mastery,attendance,repeats,attention,eligible,flags,score,priority,reasons};
}
function v108Rows(){return v108ActiveStudents().map(v108BuildRow).sort((a,b)=>b.score-a.score||(b.days??999)-(a.days??999)||String(a.st.name||'').localeCompare(String(b.st.name||''),'ar'));}
function v108Summary(rows=v108Rows()){
  return{
    urgent:rows.filter(x=>x.priority==='urgent').length,
    follow:rows.filter(x=>x.priority==='follow').length,
    lowAttendance:rows.filter(x=>x.flags.attendance).length,
    overdue:rows.filter(x=>x.flags.overdue).length
  };
}
function v108PriorityLabel(row){return row.priority==='urgent'?'أولوية عالية':row.priority==='follow'?'متابعة':'مستقر';}
function v108MasteryText(row){return row.mastery===null?'—':`${row.mastery}%`;}
function v108AttendanceText(row){return row.attendance===null?'—':`${row.attendance}%`;}
function v108LastText(row){if(row.days===null)return'لا توجد حصة حضور';if(row.days===0)return'اليوم';if(row.days===1)return'أمس';return`منذ ${row.days} يوم`;}
function v108FilterRows(rows){
  const q=String(V108_FOLLOWUP.query||'').trim().toLowerCase(),group=String(V108_FOLLOWUP.group||''),filter=V108_FOLLOWUP.filter;
  return rows.filter(row=>{
    const st=row.st;
    if(q&&!`${st.name||''} ${st.parent||''} ${st.group||''}`.toLowerCase().includes(q))return false;
    if(group&&String(st.group||'')!==group)return false;
    if(filter==='urgent'&&row.priority!=='urgent')return false;
    if(filter==='mastery'&&!row.flags.mastery)return false;
    if(filter==='repeats'&&!row.flags.repeats)return false;
    if(filter==='attendance'&&!row.flags.attendance)return false;
    if(filter==='overdue'&&!row.flags.overdue)return false;
    if(filter==='unscored'&&!row.flags.unscored)return false;
    return true;
  });
}
function v108Groups(){return [...new Set(v108ActiveStudents().map(x=>String(x.group||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));}
function v108SyncGroupOptions(){const el=document.getElementById('v108Group');if(!el)return;const selected=V108_FOLLOWUP.group;el.innerHTML='<option value="">كل الحلقات</option>'+v108Groups().map(g=>`<option value="${v108Esc(g)}">${v108Esc(g)}</option>`).join('');el.value=selected;}
function v108Reasons(row){
  if(!row.reasons.length)return'<span class="v108-reason good">لا توجد إشارة قوية تستدعي التدخل الآن</span>';
  return row.reasons.slice(0,4).map(r=>`<span class="v108-reason">${v108Esc(r)}</span>`).join('');
}
function v108StudentCard(row){
  const st=row.st,attention=row.attention.slice(0,2).map(x=>x.label).filter(Boolean);
  return `<article class="v108-student ${row.priority}">
    <div class="v108-student-head"><div><b>${v108Esc(st.name)}</b><small>${v108Esc(st.group||'بدون حلقة')} · آخر حضور ${v108Esc(v108LastText(row))}</small></div><span class="v108-priority ${row.priority}">${v108PriorityLabel(row)}</span></div>
    <div class="v108-mini-kpis"><span><small>الإتقان</small><b>${v108MasteryText(row)}</b></span><span><small>الحضور</small><b>${v108AttendanceText(row)}</b></span><span><small>الإعادات</small><b>${row.repeats}</b></span><span><small>تثبيت</small><b>${row.attention.length}</b></span></div>
    <div class="v108-reasons">${v108Reasons(row)}</div>
    ${attention.length?`<div class="v108-focus"><b>أقرب مواضع للتثبيت:</b><span>${attention.map(v108Esc).join(' · ')}</span></div>`:''}
    <div class="v108-card-actions"><button class="btn btn-g btn-sm" onclick="openProf('${v108Esc(st.id)}')">ملف الطالب</button><button class="btn btn-out btn-sm" onclick="startFor('${v108Esc(st.id)}')">بدء حصة</button><button class="btn btn-wa btn-sm" onclick="v108ContactGuardian('${v108Esc(st.id)}')">واتساب</button></div>
  </article>`;
}
function renderV108Followup(){
  const host=document.getElementById('v108List');if(!host)return;
  const rows=v108Rows(),summary=v108Summary(rows),visible=v108FilterRows(rows);
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=String(val);};
  set('v108UrgentCount',summary.urgent);set('v108FollowCount',summary.follow);set('v108AttendanceCount',summary.lowAttendance);set('v108OverdueCount',summary.overdue);set('v108VisibleCount',visible.length);
  v108SyncGroupOptions();
  document.querySelectorAll('[data-v108-filter]').forEach(b=>b.classList.toggle('on',b.dataset.v108Filter===V108_FOLLOWUP.filter));
  host.innerHTML=visible.length?visible.map(v108StudentCard).join(''):'<div class="v108-empty"><b>لا توجد نتائج بهذا الفلتر</b><span>غيّر الفلتر أو الحلقة أو كلمة البحث.</span></div>';
  v108UpdateBadge(rows);
}
function v108SetFilter(value){V108_FOLLOWUP.filter=String(value||'all');renderV108Followup();}
function v108SetQuery(value){V108_FOLLOWUP.query=String(value||'');renderV108Followup();}
function v108SetGroup(value){V108_FOLLOWUP.group=String(value||'');renderV108Followup();}
function v108ContactGuardian(studentId){
  const row=v108Rows().find(x=>x.st.id===studentId);if(!row)return;
  const st=row.st,why=row.reasons.slice(0,2).join('، ');
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\nمتابعة الطالب: *${st.name}*\n`;
  msg+=why?`نحتاج هذا الأسبوع إلى مزيد من المتابعة في: ${why}.\n`:'الأداء مستقر، ونشكر لكم الاستمرار في المتابعة المنزلية.\n';
  if(row.attention.length)msg+=`موضع مقترح للتثبيت: ${row.attention[0].label}.\n`;
  msg+='\nجزاكم الله خيرًا على تعاونكم، ونسأل الله له التوفيق والثبات.';
  try{if(typeof academyFooter==='function')msg+=academyFooter();}catch(_){ }
  if(typeof openWhatsApp==='function')openWhatsApp(st,msg);else if(typeof directWA==='function')directWA(st.id);
}
function v108UpdateBadge(rows=v108Rows()){
  const count=rows.filter(x=>x.priority==='urgent').length,el=document.getElementById('followupBadge');
  if(el){el.textContent=String(count);el.hidden=count===0;}
}
function v108InjectHomeCard(){
  const root=document.getElementById('v9Home');if(!root)return;
  root.querySelector('#v108HomeCard')?.remove();
  const rows=v108Rows(),summary=v108Summary(rows),card=document.createElement('section');
  card.id='v108HomeCard';card.className='v108-home-card';
  card.innerHTML=`<button type="button" onclick="goPage('followup')"><span class="v108-home-icon">🎯</span><span><b>مركز متابعة الطلاب</b><small>${summary.urgent?`${summary.urgent} أولوية عالية · `:''}${summary.follow} يحتاجون متابعة</small></span><em>فتح المركز ‹</em></button>`;
  const anchor=root.querySelector('.v1052-mushaf-launcher')||root.querySelector('.v92-today-card');
  if(anchor)anchor.before(card);else root.appendChild(card);
  v108UpdateBadge(rows);
}
function v108EnsureMoreItem(){
  const grid=document.getElementById('v9MoreGrid');if(!grid||grid.querySelector('[data-v108-more]'))return;
  const btn=document.createElement('button');btn.className='v9-more-item';btn.dataset.v108More='1';btn.setAttribute('onclick',"goPage('followup');closeV9More()");
  btn.innerHTML=`${typeof v9Icon==='function'?v9Icon('insight'):'🎯'}<b>مركز المتابعة</b><small>أولويات الطلاب والتثبيت والغياب</small>`;
  grid.appendChild(btn);
}
function v108PatchNavigation(){
  if(typeof V108_FOLLOWUP.baseGoPage==='function'){
    globalThis.goPage=function(p){
      V108_FOLLOWUP.baseGoPage(p);
      if(p==='followup'){
        const back=document.getElementById('backBtn');if(back)back.style.display='block';
        const title=document.getElementById('hdrTitle');if(title)title.textContent='مركز متابعة الطلاب';
        const sub=document.getElementById('hdrSub');if(sub)sub.textContent='الأولويات التي تحتاج تدخل المحفظ';
        document.querySelectorAll('#v9Nav .v9-nav-btn').forEach(b=>b.classList.toggle('on',b.dataset.page==='more'));
        renderV108Followup();
      }
      v108EnsureMoreItem();v108UpdateBadge();
    };
  }
  if(typeof V108_FOLLOWUP.baseGoBack==='function')globalThis.goBack=function(){if(curPage==='followup')return goPage('home');return V108_FOLLOWUP.baseGoBack();};
  if(typeof V108_FOLLOWUP.baseRenderHome==='function')globalThis.renderV9Home=function(){const r=V108_FOLLOWUP.baseRenderHome();v108InjectHomeCard();return r;};
  if(typeof V108_FOLLOWUP.baseInjectNav==='function')globalThis.injectV9Navigation=function(){const r=V108_FOLLOWUP.baseInjectNav();setTimeout(v108EnsureMoreItem,0);return r;};
}
function v108Init(){v108PatchNavigation();v108EnsureMoreItem();v108InjectHomeCard();v108UpdateBadge();}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(v108Init,0),{once:true});else setTimeout(v108Init,0);

globalThis.v108SetFilter=v108SetFilter;
globalThis.v108SetQuery=v108SetQuery;
globalThis.v108SetGroup=v108SetGroup;
globalThis.v108ContactGuardian=v108ContactGuardian;
globalThis.renderV108Followup=renderV108Followup;
globalThis.ImamApp=globalThis.ImamApp||{};
globalThis.ImamApp.TeacherFollowup=Object.freeze({rows:v108Rows,summary:v108Summary,render:renderV108Followup});
