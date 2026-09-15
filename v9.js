/* أكاديمية الإمام — UX/Product Layer v9.2.2
 * Professional responsive shell, guided session, Quran focus, Mushaf library, accessibility and workflow optimizations.
 */
'use strict';

const V9_BASE=globalThis.__IMAM_V8_BASE__;
if(!V9_BASE)throw new Error('v9 requires the v8 compatibility bridge');

const V9_OFFICIAL={
  portal:'https://dm.qurancomplex.gov.sa/hafsdownload/',
  ai1441:'https://dm.qurancomplex.gov.sa/Download/1441-AI-hafs.zip',
  info:'https://qurancomplex.gov.sa/'
};
const V9={
  inited:false,step:'assessment',steps:['assessment','new','review','notes'],selectedStudents:new Set(),bulkMode:false,
  quranRepeatLeft:0,quranAdvanceTimer:null,quranPane:'text',mushafObjectURL:'',currentMushafPage:1,
  textPackCancel:false,onboardingStep:0,contextStudentId:'',undo:null,sessionDockObserver:null
};

function v9Esc(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function v9Icon(name){
  const p={
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1A1.7 1.7 0 0 0 1.9 13H2V9h-.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.6 1.9V2h4v-.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.6H21v4h.1a1.7 1.7 0 0 0-1.7 1.4Z"/>',
    tasks:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4A7 7 0 1 1 21 15Z"/>',
    star:'<path d="m12 2 3 6 6.5 1-4.7 4.6 1.1 6.4-5.9-3.1L6.1 20l1.1-6.4L2.5 9 9 8l3-6Z"/>',
    play:'<path d="m8 5 11 7-11 7Z"/>',
    pause:'<path d="M9 5v14M15 5v14"/>',
    stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    arrowLeft:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight:'<path d="M5 12h14M12 5l7 7-7 7"/>',
    upload:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14a2 2 0 0 0 2-2v-4M3 15v4a2 2 0 0 0 2 2"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14a2 2 0 0 0 2-2v-4M3 15v4a2 2 0 0 0 2 2"/>',
    pin:'<path d="m12 17-5 5M15 3l6 6-4 1-5 5-3-3 5-5 1-4Z"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    insight:'<path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5C14.5 15.2 14 16 14 17h-4c0-1-.5-1.8-1.5-2.5Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    group:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 20a4.5 4.5 0 0 1 9 0"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    wifi:'<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${p[name]||p.more}</svg>`;
}
function v9Toast(msg,type='info'){try{if(typeof v8Toast==='function')v8Toast(msg,type);else if(typeof toast==='function')toast(msg,type);else console.log(msg);}catch(_){console.log(msg);}}
function v9Initials(name){return String(name||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('');}
function v9StudentStatus(st){return ['active','paused','archived'].includes(st?.studentStatus)?st.studentStatus:'active';}
function v9StatusAr(status){return status==='paused'?'متوقف مؤقتًا':status==='archived'?'مؤرشف':'نشط';}
function v9TodayDate(){return new Date().toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});}

function v9Safe(label,fn){
  try{return fn();}catch(err){console.error(`[v9] ${label}`,err);v9Toast(`تعذر تهيئة ${label}، وتم إبقاء الوظائف الأساسية متاحة.`,'error');return null;}
}
async function v9SafeAsync(label,fn){
  try{return await fn();}catch(err){console.error(`[v9] ${label}`,err);v9Toast(`تعذر تحميل ${label}، وتم إبقاء الوظائف الأساسية متاحة.`,'error');return null;}
}
async function initV9Layer(){
  if(V9.inited)return;V9.inited=true;
  v9Safe('ترقية الإعدادات',migrateV9Data);
  v9Safe('شريط التنقل',injectV9Navigation);
  v9Safe('الصفحة الرئيسية',injectHomeCommandCenter);
  v9Safe('واجهة الطلاب',injectStudentUX);
  v9Safe('واجهة الحصة',injectSessionUX);
  v9Safe('ملف الطالب',injectProfileTabs);
  v9Safe('إعدادات الواجهة',injectSettingsUX);
  await v9SafeAsync('المصحف',async()=>{injectMushafUX();await renderV9Mushaf();});
  v9Safe('قارئ القرآن',enhanceQuranModal);
  v9Safe('الحضور',injectCheckinUX);
  v9Safe('اختصارات لوحة المفاتيح',setupV9Keyboard);
  v9Safe('قوائم السياق',setupContextDismiss);
  v9Safe('تفضيلات الواجهة',applyV9Prefs);
  v9Safe('الرئيسية',()=>{renderHome();renderSt();renderV9Settings();updateV9Nav(typeof curPage==='string'?curPage:'home');});
  if(!settings.v9?.onboardingDone&&students.length===0)setTimeout(()=>v9Safe('دليل الاستخدام',()=>openV9Onboarding()),500);
}
function migrateV9Data(){
  const hadV9=!!settings.v9;
  const oldLayout=Number(settings.v9?.layoutVersion||0);
  const existingUser=(students?.length||0)+(sessions?.length||0)>0;
  const defaultMode=existingUser?'expert':'guided';
  settings.v9={mode:defaultMode,reduceMotion:false,onboardingDone:existingUser,textPackStatus:'',quranSpeed:1,quranRepeat:1,tutorDelay:0,mushafView:'single',mushafBookmarks:[],...(settings.v9||{})};
  let changed=false;
  // Existing users coming from v8 or the first v9 build are restored to the full familiar session view once.
  if(existingUser&&oldLayout<2&&settings.v9.mode!=='expert'){settings.v9.mode='expert';changed=true;}
  if(!hadV9&&existingUser&&settings.v9.mode!=='expert'){settings.v9.mode='expert';changed=true;}
  if(!['guided','expert'].includes(settings.v9.mode)){settings.v9.mode=defaultMode;changed=true;}
  if(oldLayout!==2){settings.v9.layoutVersion=2;changed=true;}
  if(!['single','spread'].includes(settings.v9.mushafView)){settings.v9.mushafView='single';changed=true;}
  if(!Array.isArray(settings.v9.mushafBookmarks)){settings.v9.mushafBookmarks=[];changed=true;}
  students.forEach(st=>{if(!['active','paused','archived'].includes(st.studentStatus)){st.studentStatus='active';changed=true;}if(typeof st.pinned!=='boolean'){st.pinned=false;changed=true;}});
  if(settings.schemaVersion!==12){settings.schemaVersion=12;changed=true;}
  if(changed)try{V9_BASE.save();}catch(_){try{save();}catch(__){}}
  return changed;
}
function applyV9Prefs(){document.body.classList.toggle('v9-reduce-motion',!!settings.v9?.reduceMotion);}

// ──────────────────────────────────────
// Responsive navigation and More sheet
// ──────────────────────────────────────
function injectV9Navigation(){
  const nav=document.getElementById('v9Nav');if(!nav)return;
  nav.innerHTML=[
    ['home','home','الرئيسية',`goPage('home')`],['students','users','الطلاب',`goPage('students')`],['session','book','الحصة',`goPage('session')`],['reports','chart','التقارير',`goPage('reports')`],['more','more','المزيد','openV9More()']
  ].map(([p,i,l,a])=>`<button class="v9-nav-btn ${p==='session'?'session-primary':''}" data-page="${p}" onclick="${a}" aria-label="${l}">${v9Icon(i)}<span class="v9-nav-label">${l}</span></button>`).join('');
  const g=document.getElementById('v9MoreGrid');if(g)g.innerHTML=[
    ['calendar','الحضور','تسجيل سريع لحضور اليوم',`goPage('checkin');closeV9More()`],['tasks','المهام','متابعة المهام والمواعيد',`goPage('tasks');closeV9More()`],['book','المصحف','مصحف المدينة وحزمة العمل دون إنترنت',`goPage('mushaf');closeV9More()`],['group','المجموعات','عرض الحلقات والطلاب',`openGroupOverview()`],['settings','الإعدادات','التخصيص، النسخ والمزامنة',`goPage('settings');closeV9More()`],['shield','سلامة البيانات','فحص سريع للبيانات',`closeV9More();goPage('settings');setTimeout(()=>runDataHealthCheck(),150)`]
  ].map(([i,t,s,a])=>`<button class="v9-more-item" onclick="${a}">${v9Icon(i)}<b>${t}</b><small>${s}</small></button>`).join('');
  document.body.classList.add('v9-shell-ready');
}
function openV9More(){const m=document.getElementById('v9MoreSheet');if(m){m.classList.add('open');m.setAttribute('aria-hidden','false');}}
function closeV9More(){const m=document.getElementById('v9MoreSheet');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');}}
function updateV9Nav(p){document.querySelectorAll('#v9Nav .v9-nav-btn').forEach(b=>b.classList.toggle('on',b.dataset.page===p||(b.dataset.page==='more'&&['checkin','tasks','settings','mushaf'].includes(p))));}
function goPage(p){
  closeV9More();
  if(p==='mushaf'){
    document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));document.getElementById('pg-mushaf')?.classList.add('on');curPage='mushaf';
    document.getElementById('backBtn').style.display='none';document.getElementById('hdrTitle').textContent='المصحف';document.getElementById('hdrSub').textContent='مصحف المدينة النبوية';renderV9Mushaf();if(typeof injectMushafDirectDownload==='function')setTimeout(injectMushafDirectDownload,40);
  }else V9_BASE.goPage(p);
  updateV9Nav(p);
  window.scrollTo({top:0,behavior:settings.v9?.reduceMotion?'auto':'smooth'});
}

// ──────────────────────────────────────
// Home command center
// ──────────────────────────────────────
function injectHomeCommandCenter(){
  const pg=document.getElementById('pg-home');if(!pg||document.getElementById('v9Home'))return;
  pg.insertAdjacentHTML('afterbegin','<div id="v9Home"></div>');
}
function activeStudents(){return students.filter(s=>v9StudentStatus(s)==='active');}
function v9ExpectedToday(){const a=activeStudents(),configured=a.some(s=>Array.isArray(s.scheduleDays)&&s.scheduleDays.length);if(!configured)return a;const dow=weekdayFromDateKey(localDateKey());return a.filter(s=>(s.scheduleDays||[]).includes(dow));}
function v9LastSessionFor(id){return sessions.filter(s=>s.studentId===id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0]||null;}
function v9RecentStudents(){
  const ranked=activeStudents().map(st=>({st,last:v9LastSessionFor(st.id)})).sort((a,b)=>(b.st.pinned?1:0)-(a.st.pinned?1:0)||String(b.last?.date||'').localeCompare(String(a.last?.date||''))||a.st.name.localeCompare(b.st.name,'ar'));
  return ranked.slice(0,window.innerWidth>=800?6:4).map(x=>x.st);
}
function v9HomeInsight(){
  const present=sessions.filter(s=>s.status==='حضر').slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
  if(!present.length)return {title:'ابدأ أول حصة',text:'بعد تسجيل عدة حصص سيعرض البرنامج ملاحظات عملية مختصرة عن الأداء.'};
  const gs=present.flatMap(s=>Object.values(s.prevGrades||{})).filter(Boolean).map(g=>GRADE_MAP[g]||0).filter(Boolean);
  if(gs.length>=4){const n=Math.max(2,Math.floor(gs.length/2)),recent=gs.slice(0,n).reduce((a,b)=>a+b,0)/n,older=gs.slice(n,n*2).reduce((a,b)=>a+b,0)/Math.max(1,gs.slice(n,n*2).length);if(recent>older+.25)return{title:'اتجاه الأداء إيجابي',text:'متوسط التسميع في الحصص الأحدث أفضل من المجموعة السابقة.'};if(recent<older-.25)return{title:'يفضل زيادة التثبيت',text:'متوسط التسميع تراجع قليلًا في الحصص الأخيرة؛ راجع مواضع الأخطاء المتكررة.'};}
  const errs={};present.flatMap(s=>s.recitationErrors||[]).forEach(e=>errs[e.type]=(errs[e.type]||0)+1);const top=Object.entries(errs).sort((a,b)=>b[1]-a[1])[0];
  if(top)return{title:'ملاحظة من سجل الأخطاء',text:`أكثر نوع خطأ مسجل مؤخرًا: ${top[0]} (${top[1]} مرات).`};
  return{title:'الأداء مستقر',text:'لا توجد إشارة واضحة تستدعي تغيير الخطة الآن.'};
}
function renderV9Home(){
  const el=document.getElementById('v9Home');if(!el)return;
  const today=localDateKey(),expected=v9ExpectedToday(),tod=sessions.filter(s=>sessionDay(s)===today),doneIds=new Set(tod.filter(s=>s.status).map(s=>s.studentId)),present=tod.filter(s=>s.status==='حضر').length,absent=tod.filter(s=>s.status==='غاب').length,pending=expected.filter(s=>!doneIds.has(s.id)).length;
  const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-6);const wk=sessions.filter(s=>new Date(s.date)>=start&&s.status==='حضر'),weekAyat=wk.reduce((n,s)=>n+(s.new?Math.max(1,Number(s.new.to||1)-Number(s.new.from||1)+1):0),0),reviews=wk.reduce((n,s)=>n+(s.rec?1:0)+(s.far?1:0)+(s.juz?.chips?.length||0)+(s.surahReview?.chips?.length||0),0);
  const grades=wk.flatMap(s=>Object.values(s.prevGrades||{})).filter(Boolean).map(g=>GRADE_MAP[g]||0).filter(Boolean),avg=grades.length?gradeLabel(grades.reduce((a,b)=>a+b,0)/grades.length):'—',ins=v9HomeInsight(),recent=v9RecentStudents();
  const greeting=new Date().getHours()<12?'صباح الخير':new Date().getHours()<18?'مساء الخير':'مساء الخير';
  const recentHtml=recent.length?recent.map(st=>{const last=v9LastSessionFor(st.id);return `<button class="v9-recent-student" onclick="startFor('${v9Esc(st.id)}')"><span class="v9-avatar">${v9Esc(v9Initials(st.name))}</span><b>${v9Esc(st.name.split(' ').slice(0,2).join(' '))}</b><small>${st.pinned?'مثبت · ':''}${last?new Date(last.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}):'لم يبدأ'}</small></button>`}).join(''):`<div class="v9-empty" style="grid-column:1/-1">${v9Icon('users')}<b>لا يوجد طلاب بعد</b><span>أضف أول طالب لبدء المتابعة.</span></div>`;
  el.innerHTML=`<div class="v9-hero"><div class="v9-hero-top"><div><div class="v9-eyebrow">${v9Esc(settings.circle||'أكاديمية الإمام')}</div><div class="v9-greeting">${greeting}${settings.name?`، ${v9Esc(settings.name)}`:''}</div><div class="v9-date">${v9Esc(v9TodayDate())}</div></div><button class="v9-search-round" onclick="openQuickSearch()" aria-label="بحث">${v9Icon('search')}</button></div><div class="v9-today-grid"><div class="v9-today-stat"><b>${expected.length}</b><span>طلاب اليوم</span></div><div class="v9-today-stat"><b>${present}</b><span>تم</span></div><div class="v9-today-stat"><b>${pending}</b><span>متبقٍ</span></div><div class="v9-today-stat"><b>${absent}</b><span>غياب</span></div></div><button class="v9-start-session" onclick="goPage('session')">${v9Icon('book')} ابدأ الحصة</button></div>
  <div class="v9-home-main"><section class="v9-section"><div class="v9-section-head"><div class="v9-section-title">الطلاب الأخيرون</div><button class="v9-link-btn" onclick="goPage('students')">كل الطلاب</button></div><div class="v9-recent-row">${recentHtml}</div></section><section class="v9-section"><div class="v9-section-head"><div class="v9-section-title">ملخص آخر 7 أيام</div><button class="v9-link-btn" onclick="goPage('reports')">التفاصيل</button></div><div class="v9-summary-grid"><div class="v9-summary-item"><b>${weekAyat}</b><span>آية حفظ جديد</span></div><div class="v9-summary-item"><b>${reviews}</b><span>مراجعات</span></div><div class="v9-summary-item"><b style="font-size:15px">${v9Esc(avg)}</b><span>متوسط التسميع</span></div></div></section></div>
  <div class="v9-home-side"><section class="v9-section"><div class="v9-section-title" style="margin-bottom:10px">ملاحظة ذكية</div><div class="v9-insight"><div class="v9-insight-icon">${v9Icon('insight')}</div><div><b>${v9Esc(ins.title)}</b><p>${v9Esc(ins.text)}</p></div></div></section><section class="v9-section"><div class="v9-section-head" style="margin-bottom:10px"><div class="v9-section-title">اختصارات العمل</div><button class="v9-link-btn" onclick="openQuickSearch()">بحث</button></div><div class="v9-quick-row"><button class="v9-quick" onclick="goPage('checkin')">${v9Icon('check')}الحضور</button><button class="v9-quick" onclick="openAddSt()">${v9Icon('plus')}طالب</button><button class="v9-quick" onclick="openBroadcastComposer()">${v9Icon('message')}رسالة جماعية</button><button class="v9-quick" onclick="goPage('tasks')">${v9Icon('tasks')}المهام</button><button class="v9-quick" onclick="goPage('mushaf')">${v9Icon('book')}المصحف</button><button class="v9-quick" onclick="openGroupOverview()">${v9Icon('group')}الحلقات</button></div></section></div>`;
  document.getElementById('pg-home')?.classList.add('v9-home-ready');
}
function renderHome(){V9_BASE.renderHome();renderV9Home();}

// ──────────────────────────────────────
// Students: status/pinning/bulk/context UX
// ──────────────────────────────────────
function injectStudentUX(){
  const pg=document.getElementById('pg-students');if(!pg)return;
  const first=pg.firstElementChild;if(first&&!document.getElementById('v9StudentStatusFilter'))first.insertAdjacentHTML('afterend',`<div class="v9-student-toolbar"><select id="v9StudentStatusFilter" class="v9-status-filter" onchange="filterSt()"><option value="active">النشطون</option><option value="paused">المتوقفون مؤقتًا</option><option value="archived">المؤرشفون</option><option value="all">الكل</option></select><button class="btn btn-out btn-sm" onclick="toggleBulkMode()">تحديد متعدد</button></div><div id="v9BulkBar" class="v9-bulk-bar" hidden><b id="v9BulkCount">0 محدد</b><button class="btn btn-out btn-xs" onclick="bulkMoveGroup()">نقل لمجموعة</button><button class="btn btn-out btn-xs" onclick="bulkSetStatus('active')">إعادة تنشيط</button><button class="btn btn-out btn-xs" onclick="bulkSetStatus('paused')">إيقاف مؤقت</button><button class="btn btn-out btn-xs" onclick="bulkSetStatus('archived')">أرشفة</button><button class="btn btn-out btn-xs" onclick="bulkBroadcast()">رسالة</button></div>`);
  const note=document.getElementById('m-notes');if(note&&!document.getElementById('m-status'))note.closest('.fld')?.insertAdjacentHTML('beforebegin',`<div class="frow"><div class="fld"><label>حالة الطالب</label><select id="m-status"><option value="active">نشط</option><option value="paused">متوقف مؤقتًا</option><option value="archived">مؤرشف</option></select></div><div class="fld"><label>تثبيت أعلى القائمة</label><select id="m-pinned"><option value="0">لا</option><option value="1">نعم</option></select></div></div>`);
}
function renderSt(q='',lvl='',group=''){
  const el=document.getElementById('stList');if(!el)return;refreshGroupOptions();
  const nq=String(q||document.getElementById('searchIn')?.value||'').trim().toLowerCase(),lv=lvl||document.getElementById('filterLevel')?.value||'',gr=group||document.getElementById('filterGroup')?.value||'',status=document.getElementById('v9StudentStatusFilter')?.value||'active';
  const list=students.filter(s=>(status==='all'||v9StudentStatus(s)===status)&&(!nq||[s.name,s.parent,s.group].some(x=>String(x||'').toLowerCase().includes(nq)))&&(!lv||s.level===lv)&&(!gr||s.group===gr)).sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||a.name.localeCompare(b.name,'ar'));
  if(!list.length){el.innerHTML=`<div class="v9-empty">${v9Icon('users')}<b>${students.length?'لا توجد نتائج مطابقة':'لم تضف طلابًا بعد'}</b><span>${students.length?'غيّر البحث أو حالة الطالب.':'أضف أول طالب لبدء المتابعة.'}</span>${students.length?'':`<div style="margin-top:12px"><button class="btn btn-g btn-sm" onclick="openAddSt()">إضافة أول طالب</button></div>`}</div>`;return;}
  el.innerHTML=list.map(st=>{const ss=sessions.filter(x=>x.studentId===st.id),last=v9LastSessionFor(st.id),present=ss.filter(x=>x.status==='حضر').length,total=typeof calcTotalAyat==='function'?calcTotalAyat(st.id):0;return `<article class="v9-student-card ${v9StudentStatus(st)}" data-student-id="${v9Esc(st.id)}" onclick="v9StudentCardClick(event,'${v9Esc(st.id)}')" oncontextmenu="openV9ContextMenu(event,'${v9Esc(st.id)}')">${V9.bulkMode?`<input class="v9-select-box" type="checkbox" ${V9.selectedStudents.has(st.id)?'checked':''} onclick="event.stopPropagation();toggleBulkStudent('${v9Esc(st.id)}',this.checked)">`:`<span class="v9-avatar">${v9Esc(v9Initials(st.name))}</span>`}<div class="v9-student-main"><b>${v9Esc(st.name)}${st.pinned?` <span title="مثبت" style="color:var(--v9-gold)">★</span>`:''}</b><div class="v9-student-meta">${last?`آخر حصة ${new Date(last.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'})}`:'لا توجد حصص'} · ${present} حضور · ${total} آية</div><div class="v9-student-tags"><span class="v9-tag">${v9Esc(st.level||'—')}</span>${st.group?`<span class="v9-tag">${v9Esc(st.group)}</span>`:''}${v9StudentStatus(st)!=='active'?`<span class="v9-tag">${v9StatusAr(v9StudentStatus(st))}</span>`:''}</div></div><div class="v9-student-actions"><button class="v9-icon-btn ${st.pinned?'v9-pin-on':''}" onclick="event.stopPropagation();toggleStudentPin('${v9Esc(st.id)}')" aria-label="تثبيت في الأعلى">${v9Icon('pin')}</button><button class="v9-icon-btn" onclick="event.stopPropagation();startFor('${v9Esc(st.id)}')" aria-label="بدء حصة">${v9Icon('play')}</button></div></article>`}).join('');
}
function filterSt(){renderSt();}
function v9StudentCardClick(e,id){if(V9.bulkMode){toggleBulkStudent(id,!V9.selectedStudents.has(id));renderSt();}else openProf(id);}
function toggleStudentPin(id){const st=students.find(s=>s.id===id);if(!st)return;st.pinned=!st.pinned;st.updatedAt=new Date().toISOString();save();renderSt();renderHome();}
function toggleBulkMode(){V9.bulkMode=!V9.bulkMode;if(!V9.bulkMode)V9.selectedStudents.clear();document.getElementById('v9BulkBar').hidden=!V9.bulkMode;renderSt();updateBulkBar();}
function toggleBulkStudent(id,on){on?V9.selectedStudents.add(id):V9.selectedStudents.delete(id);updateBulkBar();}
function updateBulkBar(){const c=document.getElementById('v9BulkCount');if(c)c.textContent=`${V9.selectedStudents.size} محدد`;}
function bulkSetStatus(status){if(!V9.selectedStudents.size)return v9Toast('حدد طالبًا واحدًا على الأقل','error');const ids=[...V9.selectedStudents],before=new Map(ids.map(id=>{const st=students.find(x=>x.id===id);return[id,st?v9StudentStatus(st):'active'];}));students.forEach(st=>{if(V9.selectedStudents.has(st.id)){st.studentStatus=status;st.updatedAt=new Date().toISOString();}});save();V9.undo=()=>{before.forEach((oldStatus,id)=>{const st=students.find(x=>x.id===id);if(st){st.studentStatus=oldStatus;st.updatedAt=new Date().toISOString();}});save();renderSt();renderHome();};setTimeout(()=>V9.undo=null,8000);V9.selectedStudents.clear();renderSt();renderHome();updateBulkBar();v9Toast(status==='active'?'تمت إعادة تنشيط الطلاب — Ctrl+Z للتراجع':'تم تحديث حالة الطلاب — Ctrl+Z للتراجع','success');}
function bulkMoveGroup(){if(!V9.selectedStudents.size)return v9Toast('حدد طلابًا أولاً','error');const name=prompt('اسم المجموعة / الحلقة:');if(name==null)return;const ids=[...V9.selectedStudents],before=new Map(ids.map(id=>{const s=students.find(x=>x.id===id);return[id,s?.group||''];}));students.forEach(s=>{if(V9.selectedStudents.has(s.id)){s.group=String(name).trim().slice(0,120);s.updatedAt=new Date().toISOString();}});save();V9.undo=()=>{before.forEach((old,id)=>{const s=students.find(x=>x.id===id);if(s)s.group=old;});save();renderSt();};setTimeout(()=>V9.undo=null,8000);renderSt();v9Toast('تم نقل الطلاب — Ctrl+Z للتراجع','success');}
function bulkBroadcast(){if(!V9.selectedStudents.size)return v9Toast('حدد طلابًا أولاً','error');const ids=new Set(V9.selectedStudents);openBroadcastComposer();broadcastSelected=new Set([...ids].filter(id=>students.find(s=>s.id===id&&s.phone)));renderBroadcastRecipients();updateBroadcastPreview();}
function openAddSt(){V9_BASE.openAddSt();const a=document.getElementById('m-status'),p=document.getElementById('m-pinned');if(a)a.value='active';if(p)p.value='0';}
function editSt(){V9_BASE.editSt();const st=students.find(x=>x.id===curStId);if(!st)return;const a=document.getElementById('m-status'),p=document.getElementById('m-pinned');if(a)a.value=v9StudentStatus(st);if(p)p.value=st.pinned?'1':'0';}
function saveSt(){const editing=editId,before=new Set(students.map(s=>s.id)),status=document.getElementById('m-status')?.value||'active',pinned=document.getElementById('m-pinned')?.value==='1';V9_BASE.saveSt();if(document.getElementById('stModal')?.classList.contains('open'))return;const st=editing?students.find(s=>s.id===editing):students.find(s=>!before.has(s.id));if(st){st.studentStatus=status;st.pinned=pinned;st.updatedAt=new Date().toISOString();save();}renderSt();renderHome();}
function openV9ContextMenu(e,id){e.preventDefault();V9.contextStudentId=id;const m=document.getElementById('v9ContextMenu'),st=students.find(s=>s.id===id);if(!m||!st)return;const status=v9StudentStatus(st),statusActions=status==='active'?`<button onclick="setStudentStatusWithUndo('${v9Esc(id)}','paused');closeV9ContextMenu()">${v9Icon('pause')} إيقاف مؤقت</button><button onclick="setStudentStatusWithUndo('${v9Esc(id)}','archived');closeV9ContextMenu()">${v9Icon('trash')} أرشفة</button>`:`<button onclick="setStudentStatusWithUndo('${v9Esc(id)}','active');closeV9ContextMenu()">${v9Icon('check')} إعادة تنشيط</button>${status==='paused'?`<button onclick="setStudentStatusWithUndo('${v9Esc(id)}','archived');closeV9ContextMenu()">${v9Icon('trash')} أرشفة</button>`:''}`;m.innerHTML=`${status==='archived'?'':`<button onclick="startFor('${v9Esc(id)}');closeV9ContextMenu()">${v9Icon('play')} بدء حصة</button>`}<button onclick="openProf('${v9Esc(id)}');closeV9ContextMenu()">${v9Icon('users')} ملف الطالب</button><button onclick="directWA('${v9Esc(id)}');closeV9ContextMenu()">${v9Icon('message')} واتساب</button><button onclick="toggleStudentPin('${v9Esc(id)}');closeV9ContextMenu()">${v9Icon('pin')} ${st.pinned?'إلغاء التثبيت':'تثبيت في الأعلى'}</button>${statusActions}`;m.hidden=false;m.style.left=Math.min(e.clientX,innerWidth-210)+'px';m.style.top=Math.min(e.clientY,innerHeight-300)+'px';}
function closeV9ContextMenu(){const m=document.getElementById('v9ContextMenu');if(m)m.hidden=true;}
function setStudentStatusWithUndo(id,status){const st=students.find(s=>s.id===id);if(!st)return;const oldStatus=v9StudentStatus(st);st.studentStatus=status;st.updatedAt=new Date().toISOString();save();renderSt();renderHome();V9.undo=()=>{st.studentStatus=oldStatus;st.updatedAt=new Date().toISOString();save();renderSt();renderHome();};const action=status==='archived'?'أرشفة':status==='paused'?'إيقاف مؤقت':'إعادة تنشيط';v9Toast(`تم ${action} ${st.name} — يمكنك التراجع من Ctrl+Z`,'info');setTimeout(()=>V9.undo=null,8000);}


async function deleteSt(){
  const id=curStId,st=students.find(x=>x.id===id);if(!id||!st)return;
  if(!confirm(`هل تريد حذف ${st.name} وجميع حصصه ومهامه؟
سيتم أيضًا حذف الملاحظات الصوتية المحلية التابعة لحصصه.`))return;
  const voiceIds=[...new Set(sessions.filter(s=>s.studentId===id&&s.voiceNoteId).map(s=>s.voiceNoteId))];
  if(typeof mediaDelete==='function')await Promise.allSettled(voiceIds.map(x=>mediaDelete(x)));
  if(V8.voiceNoteId&&voiceIds.includes(V8.voiceNoteId)){V8.voiceNoteId='';V8.pendingVoiceBlob=null;}
  students=students.filter(s=>s.id!==id);sessions=sessions.filter(s=>s.studentId!==id);tasks=tasks.filter(t=>t.studentId!==id);
  curStId='';save();renderHome();renderSt();v9Toast('تم حذف الطالب وبياناته المحلية','success');goPage('students');
}
function v9MediaKeys(){return new Promise(resolve=>{try{if(!db?.objectStoreNames?.contains('media'))return resolve([]);const tx=db.transaction('media','readonly'),req=tx.objectStore('media').getAllKeys();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>resolve([]);}catch(_){resolve([]);}});}
async function runDataHealthCheck(){
  const issues=[],notes=[],studentIds=new Set(students.map(x=>x.id));
  const orphans=sessions.filter(x=>!studentIds.has(x.studentId));if(orphans.length)issues.push(`${orphans.length} حصة بلا طالب مرتبط`);
  const groups=new Map();sessions.forEach(x=>{const k=`${x.studentId}|${sessionDay(x)}`;groups.set(k,(groups.get(k)||0)+1);});
  const dup=[...groups.values()].filter(n=>n>1).length;if(dup)issues.push(`${dup} يوم به أكثر من سجل لنفس الطالب`);
  let badRanges=0;sessions.forEach(x=>['new','rec','far'].forEach(k=>{const v=x[k];if(v&&(Number(v.from)<1||Number(v.to)<Number(v.from)))badRanges++;}));if(badRanges)issues.push(`${badRanges} نطاق آيات غير صالح`);
  const badPhones=students.filter(x=>!/^20\d{10}$/.test(String(x.phone||''))).length;if(badPhones)issues.push(`${badPhones} رقم واتساب يحتاج مراجعة`);
  const scheduleConflicts=allScheduleConflicts();if(scheduleConflicts.length)issues.push(`${scheduleConflicts.length} تعارضًا فعليًا بين الطلاب النشطين`);
  const orphanTasks=tasks.filter(t=>t.studentId&&!studentIds.has(t.studentId)).length;if(orphanTasks)issues.push(`${orphanTasks} مهمة مرتبطة بطالب غير موجود`);
  const voiceRefs=new Set(sessions.map(s=>s.voiceNoteId).filter(Boolean)),mediaKeys=await v9MediaKeys(),voiceKeys=new Set(mediaKeys.filter(k=>String(k).startsWith('voice')));
  const orphanVoice=[...voiceKeys].filter(k=>!voiceRefs.has(k)),missingVoice=[...voiceRefs].filter(k=>!voiceKeys.has(k));
  if(orphanVoice.length)issues.push(`${orphanVoice.length} ملف صوتي محلي غير مرتبط بحصة`);
  if(missingVoice.length)issues.push(`${missingVoice.length} حصة تشير إلى ملاحظة صوتية غير موجودة على هذا الجهاز`);
  const draftCount=Object.keys(localStorage).filter(k=>/^qt_draft_v[678]_/.test(k)).length;if(draftCount)notes.push(`${draftCount} مسودة حصة محفوظة تلقائيًا`);
  if(navigator.storage?.estimate){try{const q=await navigator.storage.estimate(),ratio=q.quota?Number(q.usage||0)/q.quota:0;if(ratio>.85)issues.push(`استخدام التخزين مرتفع (${Math.round(ratio*100)}%)`);else if(q.quota)notes.push(`استخدام التخزين ${Math.round(ratio*100)}%`);}catch(_){}}
  const el=document.getElementById('dataHealthResult');if(!el)return;
  if(!issues.length){el.innerHTML=`✅ لا توجد مشكلات بنيوية ظاهرة في البيانات.${notes.length?'<br><span class="txt-mut">'+notes.map(v9Esc).join(' · ')+'</span>':''}`;v9Toast('فحص البيانات سليم','success');}
  else{el.innerHTML='⚠️ '+issues.map(v9Esc).join('<br>⚠️ ')+(notes.length?'<br><span class="txt-mut">ℹ️ '+notes.map(v9Esc).join(' · ')+'</span>':'');v9Toast(`تم العثور على ${issues.length} ملاحظة تحتاج مراجعة`,'info');}
}

// ──────────────────────────────────────
// Guided session workflow
// ──────────────────────────────────────
function injectSessionUX(){
  const pg=document.getElementById('pg-session'),content=document.getElementById('sesContent');if(!pg||!content)return;
  pg.classList.remove('v9-ready');
  if(!document.getElementById('v9SessionSteps')){
    content.insertAdjacentHTML('beforebegin',`<div id="v9SessionSteps" class="v9-session-steps"><div class="v9-session-mode"><div><small style="color:var(--v9-muted)">مسار الحصة</small><div class="v9-session-help">يمكنك إظهار كل الأقسام في «سريع» دون فقد أي زر.</div></div><div class="v9-mode-toggle"><button data-mode="guided" onclick="setSessionMode('guided')">مبسّط</button><button data-mode="expert" onclick="setSessionMode('expert')">سريع</button></div></div><div class="v9-step-row">${[['assessment','التسميع'],['new','الحفظ'],['review','المراجعة'],['notes','الملاحظات']].map(([k,l])=>`<button class="v9-step-btn" data-step="${k}" onclick="setSessionStep('${k}')">${l}</button>`).join('')}</div></div>`);
  }
  const cards=[...content.children].filter(x=>x.classList?.contains('card'));
  cards.forEach(c=>{if(c.id==='prevCard'||c.id==='sessionErrorsCard')c.dataset.v9Step='assessment';else if(c.querySelector('#tog-new'))c.dataset.v9Step='new';else if(c.querySelector('#tog-rec')||c.querySelector('#tog-far')||c.querySelector('#tog-juz')||c.querySelector('#tog-surahReview'))c.dataset.v9Step='review';else if(c.querySelector('#sesNotes'))c.dataset.v9Step='notes';});
  ensureSessionActionDock();
  ['new','rec','far'].forEach(k=>['f','t'].forEach(x=>enhanceAyahInput(`${k}-${x}`)));
  setSessionMode(settings.v9?.mode||'expert',false);setSessionStep('assessment',false);
  pg.classList.add('v9-ready');
}
function ensureSessionActionDock(){
  const content=document.getElementById('sesContent');if(!content)return;
  let footer=document.getElementById('v9SessionFooter');
  if(!footer){
    footer=document.createElement('section');
    footer.id='v9SessionFooter';
    footer.className='v9-session-footer';
    footer.setAttribute('aria-label','إجراءات إنهاء الحصة');
    footer.innerHTML=`<div class="v9-action-head"><div><b>إنهاء الحصة</b><small>احفظ بعد الانتهاء من إدخال بيانات الحصة.</small></div><span class="v9-action-safe">✓ لا يغطي محتوى الصفحة</span></div><div class="v9-action-stack"><div class="v9-main-actions"></div><details class="v9-send-details"><summary>خيارات رسالة ولي الأمر</summary><div class="v9-secondary-actions"></div></details></div>`;
    content.appendChild(footer);
  }else if(footer.parentElement!==content){
    content.appendChild(footer);
  }
  const main=footer.querySelector('.v9-main-actions'),secondary=footer.querySelector('.v9-secondary-actions');
  const saveBtn=document.getElementById('saveSessionBtn');
  let sendBtn=document.getElementById('saveSendSessionBtn');
  if(!sendBtn)sendBtn=[...content.querySelectorAll('button')].find(b=>String(b.getAttribute('onclick')||'').includes('saveAndSendWA()'))||null;
  const waModes=document.getElementById('sessionWaModes')||content.querySelector('.wa-mode-row');
  if(saveBtn&&main&&saveBtn.parentElement!==main){saveBtn.classList.remove('mb8');saveBtn.classList.add('v9-save-primary');main.appendChild(saveBtn);}
  if(sendBtn&&main&&sendBtn.parentElement!==main){sendBtn.id='saveSendSessionBtn';sendBtn.classList.add('v9-send-primary');main.appendChild(sendBtn);}
  if(waModes&&secondary&&waModes.parentElement!==secondary){waModes.id='sessionWaModes';waModes.classList.add('v9-wa-mode-preserved');secondary.appendChild(waModes);}
  const details=footer.querySelector('.v9-send-details');if(details)details.hidden=!(waModes&&waModes.querySelector('button'));
  applySessionStepVisibility();
}
function enhanceAyahInput(id){const input=document.getElementById(id);if(!input||input.closest('.v9-ayah-wrap'))return;const w=document.createElement('div');w.className='v9-ayah-wrap';input.parentNode.insertBefore(w,input);w.innerHTML=`<button type="button" class="v9-ayah-step" aria-label="نقصان">−</button><span></span><button type="button" class="v9-ayah-step" aria-label="زيادة">+</button>`;w.children[1].replaceWith(input);w.children[0].onclick=()=>stepAyah(input,-1);w.children[2].onclick=()=>stepAyah(input,1);}
function stepAyah(input,d){const max=Number(input.max)||999,min=Number(input.min)||1;input.value=Math.max(min,Math.min(max,(Number(input.value)||min)+d));input.dispatchEvent(new Event('input',{bubbles:true}));if(navigator.vibrate)navigator.vibrate(8);}
function setSessionMode(mode,persist=true){mode=mode==='expert'?'expert':'guided';settings.v9=settings.v9||{};settings.v9.mode=mode;if(persist)save();const pg=document.getElementById('pg-session');pg?.classList.toggle('v9-guided',mode==='guided');pg?.classList.toggle('v9-expert',mode==='expert');document.querySelectorAll('.v9-mode-toggle button').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));applySessionStepVisibility();}
function setSessionStep(step,scroll=true){if(!V9.steps.includes(step))step='assessment';V9.step=step;document.querySelectorAll('.v9-step-btn').forEach(b=>{const on=b.dataset.step===step;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});applySessionStepVisibility();if(scroll&&settings.v9?.mode!=='expert')document.getElementById('v9SessionSteps')?.scrollIntoView({block:'start',behavior:settings.v9?.reduceMotion?'auto':'smooth'});}
function applySessionStepVisibility(){const guided=(settings.v9?.mode||'expert')==='guided';document.querySelectorAll('#sesContent>.card[data-v9-step]').forEach(c=>c.classList.toggle('v9-step-hidden',guided&&c.dataset.v9Step!==V9.step));const f=document.getElementById('v9SessionFooter');if(f)f.hidden=guided&&V9.step!=='notes';}
function moveSessionStep(d){let i=Math.max(0,V9.steps.indexOf(V9.step));i=Math.max(0,Math.min(V9.steps.length-1,i+d));setSessionStep(V9.steps[i]);}
function initSession(){V9_BASE.initSession();ensureSessionActionDock();setSessionStep('assessment',false);setSessionMode(settings.v9?.mode||'expert',false);refreshV9DraftState();}
function onSesSt(){V9_BASE.onSesSt();setSessionStep('assessment',false);refreshV9DraftState();}
function applySessionToEditor(s){V9_BASE.applySessionToEditor(s);refreshV9DraftState();}
function refreshV9DraftState(){const d=document.getElementById('draftState');if(d&&!d.classList.contains('editing'))d.textContent='جاهز للحفظ التلقائي';}

// ──────────────────────────────────────
// Profile master view tabs
// ──────────────────────────────────────
function injectProfileTabs(){const pg=document.getElementById('pg-profile'),hdr=document.getElementById('profHdr');if(!pg||!hdr||document.getElementById('v9ProfileTabs'))return;hdr.insertAdjacentHTML('afterend',`<div id="v9ProfileTabs" class="segmented" style="margin-bottom:10px"><button class="on" onclick="setProfileTab('plan',this)">الخطة</button><button onclick="setProfileTab('history',this)">السجل</button><button onclick="setProfileTab('analysis',this)">التحليل</button></div>`);}
function setProfileTab(tab,btn){document.querySelectorAll('#v9ProfileTabs button').forEach(b=>b.classList.remove('on'));btn?.classList.add('on');const map={plan:['profStop','profMap','profTrack'],history:['profHist'],analysis:['profErrors','profChart','profWeak']};const all=new Set(Object.values(map).flat());all.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=(map[tab]||[]).includes(id)?'block':'none';});}
function openProf(id){V9_BASE.openProf(id);injectProfileTabs();const b=document.querySelector('#v9ProfileTabs button');setProfileTab('plan',b);if(typeof injectProfileWeeklyContent==='function')setTimeout(injectProfileWeeklyContent,0);}

// ──────────────────────────────────────
// Attendance acceleration
// ──────────────────────────────────────
function injectCheckinUX(){const pg=document.getElementById('pg-checkin');if(!pg||document.getElementById('v9AllPresent'))return;const card=pg.querySelector('.card');card?.insertAdjacentHTML('beforeend',`<button id="v9AllPresent" class="btn btn-g btn-sm mt8" onclick="markAllPresentV9()">حضر الجميع</button>`);}
function renderCheckin(){V9_BASE.renderCheckin();injectCheckinUX();}
function markAllPresentV9(){const today=localDateKey(),list=v9ExpectedToday().length?v9ExpectedToday():activeStudents(),now=new Date().toISOString();list.forEach(st=>{const e=findDailySession(st.id,today);if(e){if(!e.status)e.status='حضر';e.updatedAt=now;e.summary=buildSumText(e);}else sessions.push({id:makeId('ses'),studentId:st.id,sessionDate:today,date:now,status:'حضر',summary:'حضر',source:'checkin',completed:false,createdAt:now,updatedAt:now,prevGrades:{new:'',rec:'',far:'',juz:'',surahReview:''}});});save();renderCheckin();renderHome();v9Toast(`تم تسجيل حضور ${list.length} طالب`,'success');}

// ──────────────────────────────────────
// Quran focus: text / original Mushaf page / repetitions / tutoring
// ──────────────────────────────────────
function enhanceQuranModal(){
  const box=document.querySelector('#quranTextModal .quran-box');if(!box||document.getElementById('v9QuranTabs'))return;box.classList.add('v9-quran-focus');const content=document.getElementById('quranVerseContent');
  content.insertAdjacentHTML('beforebegin',`<div id="v9QuranTabs" class="v9-quran-tabs"><button class="on" data-pane="text" onclick="setQuranPane('text')">النص</button><button data-pane="mushaf" onclick="setQuranPane('mushaf')">صفحة المصحف</button></div>`);
  content.insertAdjacentHTML('afterend',`<div id="v9MushafPane" class="v9-mushaf-pane"><div id="v9MushafPaneBody" class="v9-mushaf-empty"><div><b>صفحة مصحف المدينة الأصلية</b><p>استورد نسخة PDF الأصلية مرة واحدة من صفحة «المصحف»، ثم يمكنك فتح موضع الحفظ مباشرة.</p><button class="btn btn-g btn-sm" onclick="closeQuranTextModal();goPage('mushaf')">إعداد المصحف</button></div></div></div><div class="v9-quran-advanced"><div class="fld"><label>السرعة</label><select id="v9QuranSpeed" onchange="applyQuranSpeed()"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select></div><div class="fld"><label>تكرار الآية</label><select id="v9QuranRepeat"><option value="1">مرة</option><option value="3">3 مرات</option><option value="5">5 مرات</option></select></div><div class="fld"><label>وضع التلقين</label><select id="v9TutorDelay"><option value="0">متوقف</option><option value="3">توقف 3 ثوانٍ</option><option value="5">توقف 5 ثوانٍ</option><option value="8">توقف 8 ثوانٍ</option></select></div><div class="fld"><label>النطاق</label><button class="btn btn-out btn-sm" style="width:100%" onclick="repeatCurrentRange()">إعادة النطاق</button></div></div>`);
  const audio=document.getElementById('quranAudioPlayer');if(audio){audio.removeEventListener('ended',V9_BASE.playNextQuranAudio);audio.addEventListener('ended',v9QuranEnded);audio.addEventListener('play',renderMiniPlayer);audio.addEventListener('pause',renderMiniPlayer);}
}
async function openQuranTextModal(){await V9_BASE.openQuranTextModal();setQuranPane('text');const sp=document.getElementById('v9QuranSpeed');if(sp)sp.value=String(settings.v9?.quranSpeed||1);const rp=document.getElementById('v9QuranRepeat');if(rp)rp.value=String(settings.v9?.quranRepeat||1);const td=document.getElementById('v9TutorDelay');if(td)td.value=String(settings.v9?.tutorDelay||0);applyQuranSpeed();}
function closeQuranTextModal(){document.getElementById('quranTextModal')?.classList.remove('open');renderMiniPlayer();}
function setQuranPane(pane){V9.quranPane=pane;document.querySelectorAll('#v9QuranTabs button').forEach(b=>b.classList.toggle('on',b.dataset.pane===pane));document.getElementById('quranVerseContent').style.display=pane==='text'?'block':'none';document.getElementById('v9MushafPane')?.classList.toggle('on',pane==='mushaf');if(pane==='mushaf')openCurrentMushafPage();}
function applyQuranSpeed(){const n=Number(document.getElementById('v9QuranSpeed')?.value||1),a=document.getElementById('quranAudioPlayer');if(a)a.playbackRate=n;settings.v9=settings.v9||{};settings.v9.quranSpeed=n;V9_BASE.save();}
function playQuranRange(){const r=V8.quranRange||quranRangeFromNew();if(!r)return v9Toast('لا يوجد نطاق آيات للتشغيل','error');const rec=document.getElementById('quranReciter')?.value||settings.quranReciter||'Husary_128kbps';settings.quranReciter=rec;settings.v9=settings.v9||{};settings.v9.quranRepeat=Number(document.getElementById('v9QuranRepeat')?.value||1);settings.v9.tutorDelay=Number(document.getElementById('v9TutorDelay')?.value||0);V9_BASE.save();V8.quranAudioQueue=[];for(let a=r.from;a<=r.to;a++)V8.quranAudioQueue.push({ayah:a,url:everyAyahURL(rec,r.chapter,a)});V8.quranAudioIndex=-1;V9.quranRepeatLeft=0;v9PlayNextAudio(true);}
function repeatCurrentRange(){stopQuranAudio();playQuranRange();}
function v9PlayNextAudio(advance=true){clearTimeout(V9.quranAdvanceTimer);if(advance)V8.quranAudioIndex++;if(V8.quranAudioIndex>=V8.quranAudioQueue.length){stopQuranAudio(false);renderMiniPlayer();return;}const item=V8.quranAudioQueue[V8.quranAudioIndex],audio=document.getElementById('quranAudioPlayer');V9.quranRepeatLeft=Math.max(1,Number(document.getElementById('v9QuranRepeat')?.value||settings.v9?.quranRepeat||1));document.querySelectorAll('.quran-ayah').forEach(x=>x.classList.toggle('playing',Number(x.dataset.ayah)===item.ayah));document.querySelector(`.quran-ayah[data-ayah="${item.ayah}"]`)?.scrollIntoView({behavior:settings.v9?.reduceMotion?'auto':'smooth',block:'center'});audio.src=item.url;audio.playbackRate=Number(document.getElementById('v9QuranSpeed')?.value||settings.v9?.quranSpeed||1);audio.play().catch(()=>v9Toast('تعذر تشغيل الصوت. تحقق من الإنترنت.','error'));renderMiniPlayer();}
function v9QuranEnded(){if(V9.quranRepeatLeft>1){V9.quranRepeatLeft--;const a=document.getElementById('quranAudioPlayer');a.currentTime=0;a.play().catch(()=>{});return;}const delay=Math.max(0,Number(document.getElementById('v9TutorDelay')?.value||settings.v9?.tutorDelay||0));V9.quranAdvanceTimer=setTimeout(()=>v9PlayNextAudio(true),delay*1000);renderMiniPlayer(delay?`انتظار ${delay} ثوانٍ للتلقين…`:'');}
function stopQuranAudio(clear=true){clearTimeout(V9.quranAdvanceTimer);V9_BASE.stopQuranAudio(clear);renderMiniPlayer();}
function renderMiniPlayer(extra=''){const el=document.getElementById('v9MiniPlayer'),a=document.getElementById('quranAudioPlayer'),r=V8.quranRange;if(!el||!a||!r||(!a.src&&!V8.quranAudioQueue.length)){if(el)el.hidden=true;return;}const item=V8.quranAudioQueue[V8.quranAudioIndex]||{};el.hidden=false;el.innerHTML=`<button onclick="toggleMiniQuran()">${a.paused?v9Icon('play'):v9Icon('pause')}</button><div><b>سورة ${v9Esc(r.surah)} · آية ${item.ayah||r.from}</b><small>${extra||'الحصري / مشاري — وضع الحفظ'}</small></div><button onclick="document.getElementById('quranTextModal').classList.add('open')">${v9Icon('book')}</button><button onclick="stopQuranAudio()">${v9Icon('stop')}</button>`;}
function toggleMiniQuran(){const a=document.getElementById('quranAudioPlayer');if(!a)return;a.paused?a.play().catch(()=>{}):a.pause();renderMiniPlayer();}
async function getMushafPageForRange(){const r=V8.quranRange||quranRangeFromNew();if(!r)return null;const key=`mushaf:page:${r.chapter}:${r.from}`,cached=await idbKvGet(key).catch(()=>null);if(cached){const p=Number(cached);if(p>=1&&p<=604)return p;}try{const res=await fetch(`https://api.quran.com/api/v4/verses/by_key/${r.chapter}:${r.from}?fields=page_number`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error();const d=await res.json(),p=Number(d.verse?.page_number||d.page_number);if(p>=1&&p<=604){await idbKvPut(key,String(p));return p;}}catch(_){}return null;}
async function openCurrentMushafPage(){const body=document.getElementById('v9MushafPaneBody');if(!body)return;const blob=await mediaGet('mushaf:madinah:pdf').catch(()=>null);if(!blob){body.className='v9-mushaf-empty';body.innerHTML=`<div><b>المصحف الأصلي غير مُضاف بعد</b><p>افتح صفحة المصحف وحمّل النسخة الرسمية أو استورد ملف PDF الأصلي.</p><button class="btn btn-g btn-sm" onclick="closeQuranTextModal();goPage('mushaf')">فتح إعداد المصحف</button></div>`;return;}const p=await getMushafPageForRange();if(!p){body.className='v9-mushaf-empty';body.innerHTML=`<div><b>تعذر تحديد رقم الصفحة بدقة</b><p>${navigator.onLine?'تعذر جلب رقم صفحة هذا الموضع الآن. أعد المحاولة أو افتح المصحف يدويًا.':'لا توجد خريطة صفحة محفوظة لهذا الموضع والجهاز غير متصل بالإنترنت. لن يفتح التطبيق صفحة افتراضية خاطئة.'}</p><button class="btn btn-out btn-sm" onclick="closeQuranTextModal();goPage('mushaf')">فتح المصحف يدويًا</button></div>`;return;}if(V9.mushafObjectURL)URL.revokeObjectURL(V9.mushafObjectURL);V9.mushafObjectURL=URL.createObjectURL(blob);body.className='';body.innerHTML=`<iframe title="صفحة المصحف" src="${V9.mushafObjectURL}#page=${p}&zoom=page-width"></iframe>`;}

// ──────────────────────────────────────
// Mushaf library: official original download + local PDF reader
// ──────────────────────────────────────
function injectMushafUX(){renderV9Mushaf();}
async function storageInfo(){if(!navigator.storage?.estimate)return{usage:0,quota:0};try{return await navigator.storage.estimate();}catch(_){return{usage:0,quota:0};}}
function fmtBytes(n){n=Number(n)||0;if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} MB`;if(n<1073741824)return `${(n/1048576).toFixed(1)} MB`;return `${(n/1073741824).toFixed(1)} GB`;}
async function renderV9Mushaf(){
  const el=document.getElementById('v9MushafApp');if(!el)return;
  const blob=await mediaGet('mushaf:madinah:pdf').catch(()=>null),metaRaw=await idbKvGet('mushaf:madinah:meta').catch(()=>null),lastRaw=await idbKvGet('mushaf:lastPage').catch(()=>null),meta=(()=>{try{return JSON.parse(metaRaw||'{}')}catch(_){return{}}})(),st=await storageInfo(),pct=st.quota?Math.min(100,Math.round((st.usage||0)/st.quota*100)):0;
  const lastPage=Math.max(1,Math.min(604,Number(lastRaw)||1));if((V9.currentMushafPage||1)===1&&lastPage>1)V9.currentMushafPage=lastPage;
  const marks=(settings.v9?.mushafBookmarks||[]).map(Number).filter(n=>n>=1&&n<=604).sort((a,b)=>a-b);
  el.innerHTML=`<section class="v9-mushaf-hero"><div class="v9-mushaf-title">مصحف المدينة النبوية</div><div class="v9-mushaf-sub">النسخة الأصلية الصادرة عن مجمع الملك فهد برواية حفص عن عاصم — 604 صفحات. لا يعيد التطبيق تكوين الصفحة بخط عثماني تقريبي؛ زر التحميل ينقلك إلى المصدر الرسمي، وبعد تنزيل ملف PDF يمكنك تثبيته محليًا وقراءته داخل التطبيق دون إنترنت.</div><div class="v9-mushaf-badges"><span class="v9-mushaf-badge">حفص عن عاصم</span><span class="v9-mushaf-badge">604 صفحات</span><span class="v9-mushaf-badge">مصدر مجمع الملك فهد</span><span class="v9-mushaf-badge">Offline بعد التثبيت</span></div><div class="v9-mushaf-actions"><button class="v9-mushaf-primary" onclick="openOfficialMushafPortal()">${v9Icon('download')} تحميل المصحف الكامل — المصدر الرسمي</button><button class="v9-mushaf-secondary" onclick="downloadOfficialAIPackage()">${v9Icon('download')} أصل الطباعة المتجهي AI 1441</button></div><div class="v9-mushaf-source-note">بعد تنزيل نسخة PDF من موقع المجمع، عُد إلى هنا واختر «تثبيت ملف PDF» مرة واحدة.</div></section>
  <div class="v9-mushaf-grid"><section class="v9-mushaf-card"><div class="v9-section-title">تثبيت النسخة الأصلية داخل التطبيق</div><p class="txt-mut" style="font-size:12px;line-height:1.8">الملف يبقى على جهازك داخل تخزين التطبيق، ولا يُرفع إلى أي خادم. حذف المصحف لا يحذف الطلاب أو الحصص.</p><label class="v9-file-drop"><input type="file" id="v9MushafFile" accept="application/pdf,.pdf" onchange="importMushafPDF(event)"><b>${blob?'استبدال ملف المصحف':'تثبيت ملف PDF'}</b><div class="txt-mut" style="font-size:11px;margin-top:5px">يفضل الضغط على «حماية التخزين» قبل تثبيت ملف كبير.</div></label>${blob?`<div class="v9-mushaf-progress"><span class="v9-status-dot"></span> محفوظ على الجهاز · ${v9Esc(meta.name||'Madinah Mushaf.pdf')} · ${fmtBytes(meta.size||blob.size)}</div><div class="v9-mushaf-installed-actions"><button class="btn btn-g btn-sm" onclick="openMushafReader(${lastPage})">متابعة من صفحة ${lastPage}</button><button class="btn btn-out btn-sm" onclick="openMushafReader(1)">من البداية</button><button class="btn btn-red btn-sm" onclick="deleteMushafPDF()">حذف المصحف</button></div>`:''}</section><section class="v9-mushaf-card"><div class="v9-section-title">التخزين والحزم Offline</div><div class="v9-storage-bar"><div class="v9-storage-fill" style="width:${pct}%"></div></div><div class="txt-mut" style="font-size:11px">المستخدم: ${fmtBytes(st.usage)} من ${fmtBytes(st.quota)}</div><div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-out btn-sm" onclick="requestPersistentStorage().then(()=>renderV9Mushaf())">حماية التخزين</button><button class="btn btn-out btn-sm" onclick="downloadQuranTextPack()">تنزيل نص المصحف Offline</button></div><div id="v9TextPackProgress" class="v9-mushaf-progress">${v9Esc(settings.v9?.textPackStatus||'')}</div></section></div>
  ${blob?`<section class="v9-reader-shell" id="v9ReaderShell"><div class="v9-reader-toolbar"><b>قارئ المصحف</b><label class="v9-page-label">الصفحة</label><input type="number" id="v9MushafPage" min="1" max="604" value="${V9.currentMushafPage||lastPage}" onkeydown="if(event.key==='Enter')openMushafReader(this.value)"><button class="btn btn-out btn-xs" onclick="openMushafReader(Math.max(1,(V9.currentMushafPage||1)-1))">السابق</button><button class="btn btn-out btn-xs" onclick="openMushafReader(Math.min(604,(V9.currentMushafPage||1)+1))">التالي</button><button class="btn btn-out btn-xs" onclick="toggleMushafView()">${settings.v9?.mushafView==='spread'?'صفحة واحدة':'صفحتان'}</button><button class="btn btn-out btn-xs" onclick="toggleMushafBookmark()">${marks.includes(Number(V9.currentMushafPage))?'★ إزالة العلامة':'☆ علامة'}</button><button class="btn btn-out btn-xs" onclick="openMushafFullscreen()">ملء الشاشة</button></div>${marks.length?`<div class="v9-mushaf-marks"><span>العلامات:</span>${marks.map(n=>`<button onclick="openMushafReader(${n})">${n}</button>`).join('')}</div>`:''}<div id="v9MushafReaderFrame" class="v9-reader-frame"><div class="v9-mushaf-empty"><div><b>المصحف جاهز</b><p>اضغط «متابعة» أو أدخل رقم صفحة من 1 إلى 604.</p></div></div></div></section>`:''}`;
}
function openOfficialMushafPortal(){window.open(V9_OFFICIAL.portal,'_blank','noopener');}
function downloadOfficialAIPackage(){const a=document.createElement('a');a.href=V9_OFFICIAL.ai1441;a.target='_blank';a.rel='noopener';a.click();v9Toast('سيبدأ التحميل من خادم مجمع الملك فهد إذا كان الرابط متاحًا','info');}
async function importMushafPDF(e){const f=e.target.files?.[0];if(!f)return;if(f.type&&f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf'))return v9Toast('اختر ملف PDF فقط','error');const st=await storageInfo();if(st.quota&&f.size>(st.quota-st.usage)*.9&&!confirm('المساحة المتاحة قد لا تكفي. هل تريد المحاولة؟'))return;try{await requestPersistentStorage();await mediaPut('mushaf:madinah:pdf',f);await idbKvPut('mushaf:madinah:meta',JSON.stringify({name:f.name,size:f.size,importedAt:new Date().toISOString()}));V9.currentMushafPage=1;v9Toast('تم حفظ المصحف على الجهاز','success');renderV9Mushaf();}catch(err){v9Toast('تعذر حفظ الملف — قد تكون مساحة التخزين غير كافية','error');console.error(err);}finally{e.target.value='';}}
async function deleteMushafPDF(){if(!confirm('سيتم حذف ملف المصحف فقط، ولن تتأثر بيانات الطلاب. متابعة؟'))return;try{await ensureMediaStore();await new Promise(resolve=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').delete('mushaf:madinah:pdf');tx.oncomplete=resolve;tx.onerror=resolve;});await idbKvPut('mushaf:madinah:meta','{}');if(V9.mushafObjectURL){URL.revokeObjectURL(V9.mushafObjectURL);V9.mushafObjectURL='';}renderV9Mushaf();v9Toast('تم حذف ملف المصحف من الجهاز','success');}catch(_){v9Toast('تعذر الحذف','error');}}
async function openMushafReader(page=1){
  page=Math.max(1,Math.min(604,Number(page)||1));V9.currentMushafPage=page;
  const blob=await mediaGet('mushaf:madinah:pdf').catch(()=>null);if(!blob)return v9Toast('ثبّت نسخة PDF أولاً','error');
  if(V9.mushafObjectURL)URL.revokeObjectURL(V9.mushafObjectURL);V9.mushafObjectURL=URL.createObjectURL(blob);
  const fr=document.getElementById('v9MushafReaderFrame'),spread=settings.v9?.mushafView==='spread'&&window.innerWidth>=800;
  if(fr){fr.classList.toggle('spread',spread);fr.innerHTML=spread?`<div class="v9-spread-page"><span>${page}</span><iframe title="مصحف المدينة — صفحة ${page}" src="${V9.mushafObjectURL}#page=${page}&zoom=page-width"></iframe></div>${page<604?`<div class="v9-spread-page"><span>${page+1}</span><iframe title="مصحف المدينة — صفحة ${page+1}" src="${V9.mushafObjectURL}#page=${page+1}&zoom=page-width"></iframe></div>`:''}`:`<iframe title="مصحف المدينة — صفحة ${page}" src="${V9.mushafObjectURL}#page=${page}&zoom=page-width"></iframe>`;}
  const input=document.getElementById('v9MushafPage');if(input)input.value=page;await idbKvPut('mushaf:lastPage',String(page));
  const marks=settings.v9?.mushafBookmarks||[],btn=[...document.querySelectorAll('#v9ReaderShell .v9-reader-toolbar button')].find(b=>b.textContent.includes('علامة'));if(btn)btn.textContent=marks.includes(page)?'★ إزالة العلامة':'☆ علامة';
}
function toggleMushafView(){settings.v9=settings.v9||{};settings.v9.mushafView=settings.v9.mushafView==='spread'?'single':'spread';save();renderV9Mushaf().then(()=>openMushafReader(V9.currentMushafPage));}
function toggleMushafBookmark(){settings.v9=settings.v9||{};const page=Number(V9.currentMushafPage)||1,arr=Array.isArray(settings.v9.mushafBookmarks)?settings.v9.mushafBookmarks.map(Number):[],i=arr.indexOf(page);if(i>=0)arr.splice(i,1);else arr.push(page);settings.v9.mushafBookmarks=[...new Set(arr)].sort((a,b)=>a-b).slice(0,60);save();renderV9Mushaf().then(()=>openMushafReader(page));}
function openMushafFullscreen(){const el=document.getElementById('v9ReaderShell');if(!el)return;if(document.fullscreenElement)document.exitFullscreen?.();else el.requestFullscreen?.().catch(()=>v9Toast('ملء الشاشة غير مدعوم هنا','error'));}

async function downloadQuranTextPack(){if(V9.textPackDownloading){V9.textPackCancel=true;return;}V9.textPackDownloading=true;V9.textPackCancel=false;const p=document.getElementById('v9TextPackProgress');for(let ch=1;ch<=114;ch++){if(V9.textPackCancel){settings.v9.textPackStatus=`توقف عند سورة ${ch}`;break;}if(p)p.textContent=`جارٍ تنزيل النص: ${ch} / 114`;try{await fetchQpcHafsChapter(ch);}catch(_){settings.v9.textPackStatus=`توقف بسبب خطأ عند سورة ${ch}`;break;}if(ch===114)settings.v9.textPackStatus='✓ نص المصحف محفوظ للعمل دون إنترنت';}V9.textPackDownloading=false;V9_BASE.save();renderV9Mushaf();}

// ──────────────────────────────────────
// Settings / accessibility / quality
// ──────────────────────────────────────
function injectSettingsUX(){const pg=document.getElementById('pg-settings');if(!pg||document.getElementById('v9UxSettings'))return;pg.insertAdjacentHTML('afterbegin',`<div class="card" id="v9UxSettings"><div class="ch">تجربة الاستخدام</div><div class="fld"><label>طريقة شاشة الحصة</label><select id="v9ModeSetting" onchange="settings.v9.mode=this.value;save();setSessionMode(this.value,false)"><option value="guided">مبسطة — خطوة بخطوة</option><option value="expert">سريعة — كل الأقسام</option></select></div><label class="switch-line"><input type="checkbox" id="v9ReduceMotion" onchange="settings.v9.reduceMotion=this.checked;save();applyV9Prefs()"><span>تقليل الحركة والانتقالات</span></label><div class="settings-actions mt8"><button class="btn btn-out btn-sm" onclick="openV9Onboarding(true)">عرض دليل الاستخدام</button><button class="btn btn-out btn-sm" onclick="goPage('mushaf')">إدارة المصحف Offline</button></div></div>`);}
function renderV9Settings(){const m=document.getElementById('v9ModeSetting'),r=document.getElementById('v9ReduceMotion');if(m)m.value=settings.v9?.mode||'expert';if(r)r.checked=!!settings.v9?.reduceMotion;}
function initSettings(){V9_BASE.initSettings();injectSettingsUX();renderV9Settings();}

// ──────────────────────────────────────
// Groups overview
// ──────────────────────────────────────
function ensureUtilityModal(){let m=document.getElementById('v9UtilityModal');if(!m){document.body.insertAdjacentHTML('beforeend','<div class="mo" id="v9UtilityModal"><div class="mo-box"><div class="mo-title"><span id="v9UtilityTitle"></span><button class="mo-x" onclick="closeUtilityModal()">✕</button></div><div id="v9UtilityBody"></div></div></div>');m=document.getElementById('v9UtilityModal');}return m;}
function closeUtilityModal(){document.getElementById('v9UtilityModal')?.classList.remove('open');}
function openGroupOverview(){closeV9More();const m=ensureUtilityModal(),body=document.getElementById('v9UtilityBody');document.getElementById('v9UtilityTitle').textContent='المجموعات والحلقات';const groups=new Map();activeStudents().forEach(s=>{const g=s.group||'بدون مجموعة';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(s);});body.innerHTML=groups.size?[...groups.entries()].map(([g,list])=>`<div class="card" style="margin:0 0 8px"><div class="fb"><b>${v9Esc(g)}</b><span class="txt-mut">${list.length} طالب</span></div><div class="txt-mut" style="font-size:11px;margin:7px 0">${list.map(s=>v9Esc(s.name)).join(' · ')}</div><button class="btn btn-out btn-xs" onclick="prepareGroupBroadcast(decodeURIComponent('${encodeURIComponent(g)}'))">رسالة للمجموعة</button></div>`).join(''):`<div class="v9-empty">${v9Icon('group')}<b>لا توجد مجموعات بعد</b><span>عيّن مجموعة من بيانات الطالب.</span></div>`;m.classList.add('open');}
function prepareGroupBroadcast(group){const ids=new Set(activeStudents().filter(s=>(s.group||'بدون مجموعة')===group&&s.phone).map(s=>s.id));closeUtilityModal();openBroadcastComposer();broadcastSelected=ids;renderBroadcastRecipients();updateBroadcastPreview();}

// ──────────────────────────────────────
// Onboarding + demo
// ──────────────────────────────────────
const V9_ONBOARD=[
  {icon:'users',title:'أضف الطالب مرة واحدة',text:'احفظ بياناته، مجموعته وموعده. بعدها يصل المحفظ إلى الطالب والحصة بأقل عدد من اللمسات.'},
  {icon:'book',title:'الحصة خطوة بخطوة',text:'التسميع ثم الحفظ الجديد ثم المراجعة ثم الملاحظات. يمكنك التحويل إلى الوضع السريع في أي وقت.'},
  {icon:'message',title:'أغلق الحصة وأرسل التقرير',text:'بعد الحفظ أرسل رسالة واتساب مختصرة أو تفصيلية لولي الأمر، مع الاحتفاظ بالسجل والتحليل.'}
];
function openV9Onboarding(force=false){if(!force&&settings.v9?.onboardingDone)return;V9.onboardingStep=0;renderOnboarding();document.getElementById('v9Onboarding')?.classList.add('open');}
function renderOnboarding(){const el=document.getElementById('v9OnboardingBody');if(!el)return;const x=V9_ONBOARD[V9.onboardingStep];el.innerHTML=`<img src="icon-192.png" class="v9-onboarding-logo" alt="شعار الأكاديمية"><div class="v9-onboarding-ill">${v9Icon(x.icon)}</div><h2>${x.title}</h2><p>${x.text}</p><div class="v9-dots">${V9_ONBOARD.map((_,i)=>`<span class="v9-dot ${i===V9.onboardingStep?'on':''}"></span>`).join('')}</div><div class="v9-onboarding-actions">${V9.onboardingStep?`<button class="btn btn-out" onclick="V9.onboardingStep--;renderOnboarding()">السابق</button>`:`<button class="btn btn-out" onclick="finishOnboarding()">تخطي</button>`}<button class="btn btn-g" onclick="${V9.onboardingStep===V9_ONBOARD.length-1?'finishOnboarding()':'V9.onboardingStep++;renderOnboarding()'}">${V9.onboardingStep===V9_ONBOARD.length-1?'ابدأ':'التالي'}</button></div>${students.length===0&&V9.onboardingStep===0?`<button class="v9-link-btn" style="margin-top:12px" onclick="createDemoData()">تجربة ببيانات نموذجية</button>`:''}`;}
function finishOnboarding(){settings.v9=settings.v9||{};settings.v9.onboardingDone=true;save();document.getElementById('v9Onboarding')?.classList.remove('open');}
function createDemoData(){if(students.length&&!confirm('سيتم إضافة 3 طلاب تجريبيين بجانب بياناتك الحالية. متابعة؟'))return;const now=new Date(),today=localDateKey();const demo=[['أحمد محمود','201000000001','متوسط'],['يوسف علي','201000000002','مبتدئ'],['عمر خالد','201000000003','متقدم']];demo.forEach((d,i)=>{const id=makeId('demo');students.push({id,name:d[0],parent:'ولي أمر تجريبي',phone:d[1],level:d[2],group:'حلقة تجريبية',startDate:today,scheduleDays:[now.getDay()],scheduleTime:`${String(15+i).padStart(2,'0')}:00`,sessionDuration:30,notes:'بيانات تجريبية يمكن حذفها',plan:'balanced',nextMode:'next',studentStatus:'active',pinned:i===0,demo:true,createdAt:now.toISOString(),updatedAt:now.toISOString()});if(i===0)sessions.push({id:makeId('ses'),studentId:id,sessionDate:today,date:now.toISOString(),status:'حضر',new:{surahId:63,surah:'المنافقون',from:1,to:3,full:false},prevGrades:{new:'ممتاز',rec:'',far:'',juz:'',surahReview:''},actualRecitation:{new:{surahId:63,surah:'المنافقون',from:1,to:3,full:false}},summary:'حصة تجريبية',createdAt:now.toISOString(),updatedAt:now.toISOString()});});save();finishOnboarding();renderHome();renderSt();v9Toast('تمت إضافة بيانات تجريبية','success');}

// ──────────────────────────────────────
// Keyboard, undo and global UX
// ──────────────────────────────────────
function setupV9Keyboard(){document.addEventListener('keydown',e=>{const t=e.target?.tagName;if((t==='INPUT'||t==='TEXTAREA'||t==='SELECT')&&e.key!=='Escape')return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&V9.undo){e.preventDefault();V9.undo();V9.undo=null;v9Toast('تم التراجع','success');return;}if(e.key==='/'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();openQuickSearch();return;}if(e.key.toLowerCase()==='n'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();goPage('session');return;}if(e.key==='Escape'){closeV9More();closeV9ContextMenu();closeUtilityModal();}});}
function setupContextDismiss(){document.addEventListener('click',e=>{if(!e.target.closest('#v9ContextMenu'))closeV9ContextMenu();});}

// The app invokes initV9Layer() after IndexedDB and the v8 compatibility layer are ready.

/* ═══════════════════════════════════════════════════════════════
 * v9.2.0 — Clarity & Reliability repair
 * Simplifies Home, clarifies color semantics, and provides a practical
 * one-click Mushaf download + explicit local install workflow.
 * ═══════════════════════════════════════════════════════════════ */
const V92_MUSHAF={
  fullPdf:'https://pdf.quran.ws/pdfs/hafs/quran-hafs-mushaf.pdf',
  mirrorInfo:'https://pdf.quran.ws/hafs/',
  officialApp:'https://qurancomplex.gov.sa/en/apps-hafs/',
  officialInfo:'https://qurancomplex.gov.sa/en/techquran/dev/'
};

function v9CountSectionAyat(sec){if(!sec||!sec.surah)return 0;const from=Math.max(1,Number(sec.from)||1),to=Math.max(from,Number(sec.to)||from);return to-from+1;}
function v9SectionLabel(sec){if(!sec?.surah)return '—';return sec.full?`سورة ${sec.surah} كاملة`:`سورة ${sec.surah} ${Number(sec.from)||1}–${Number(sec.to)||Number(sec.from)||1}`;}
function v9NextStudentToday(expected,statusMap){
  const pending=(expected||[]).filter(st=>!statusMap.get(st.id)).slice().sort((a,b)=>(a.scheduleTime||'99:99').localeCompare(b.scheduleTime||'99:99','en')||a.name.localeCompare(b.name,'ar'));
  if(!pending.length)return null;
  const st=pending[0],last=v9LastSessionFor(st.id),stop=last?.actualRecitation?.new||null;
  const now=new Date(),nowMin=now.getHours()*60+now.getMinutes(),start=timeToMinutes(st.scheduleTime),duration=Number(st.sessionDuration)||30;
  return{st,last,stop,overdue:start!=null&&nowMin>start+duration,label:start==null?'الطالب التالي':(start!=null&&nowMin>start+duration)?'حصة متأخرة':'الحصة التالية'};
}

function v92ExpectedStatusMap(){
  const today=localDateKey(),tod=sessions.filter(s=>sessionDay(s)===today),map=new Map();
  tod.forEach(s=>map.set(s.studentId,s.status||'')); return map;
}

function renderV9Home(){
  const el=document.getElementById('v9Home'); if(!el)return;
  const expected=v9ExpectedToday(), status=v92ExpectedStatusMap();
  const present=[...status.values()].filter(v=>v==='حضر').length;
  const absent=[...status.values()].filter(v=>v==='غاب').length;
  const completed=new Set([...status.entries()].filter(([,v])=>v).map(([k])=>k));
  const pending=expected.filter(st=>!completed.has(st.id));
  const total=activeStudents().length,next=v9NextStudentToday(expected,status);
  const todayList=expected.length?expected.slice(0,8):activeStudents().slice(0,6);
  const listHtml=todayList.length?todayList.map(st=>{
    const state=status.get(st.id)||'';
    const badge=state==='حضر'?'<span class="v92-state ok">حضر</span>':state==='غاب'?'<span class="v92-state bad">غاب</span>':'<span class="v92-state neutral">لم يبدأ</span>';
    return `<button class="v92-today-student" onclick="startFor('${v9Esc(st.id)}')"><span class="v92-person"><span class="v92-avatar">${v9Esc(v9Initials(st.name))}</span><span><b>${v9Esc(st.name)}</b><small>${v9Esc(st.group||st.level||'طالب')}</small></span></span>${badge}</button>`;
  }).join(''):`<div class="v92-empty"><b>لا يوجد طلاب مسجلون</b><span>ابدأ بإضافة أول طالب.</span><button class="btn btn-g btn-sm" onclick="openAddSt()">إضافة طالب</button></div>`;
  const nextTitle=next?`${next.label}${next.st.scheduleTime?` · ${v9Esc(next.st.scheduleTime)}`:''}`:'العمل اليومي';
  const nextHeading=next?`ابدأ حصة ${v9Esc(next.st.name.split(' ')[0]||next.st.name)}`:'ابدأ الحصة مباشرة';
  const nextText=next?(next.stop?`آخر تسميع فعلي: ${v9Esc(v9SectionLabel(next.stop))}`:next.last?'لا يوجد موضع تسميع فعلي مسجل في آخر حصة':'هذه أول حصة مسجلة للطالب'):'اختر الطالب ثم سجّل التسميع والحفظ والمراجعة في شاشة واحدة.';
  const nextAction=next?`startFor('${v9Esc(next.st.id)}')`:`goPage('session')`;
  el.innerHTML=`
    <section class="v92-home-head">
      <div class="v92-brand-line"><img src="icon-96.png" alt="" class="v92-logo"><div><b>${v9Esc(settings.circle||'أكاديمية الإمام')}</b><span>${v9Esc(v9TodayDate())}</span></div></div>
      <button class="v92-search" onclick="openQuickSearch()" aria-label="بحث">${v9Icon('search')}</button>
    </section>

    <section class="v92-primary-card${next?.overdue?' overdue':''}">
      <div><span class="v92-kicker">${nextTitle}</span><h1>${nextHeading}</h1><p>${nextText}</p></div>
      <button class="v92-start" onclick="${nextAction}">${v9Icon(next?'play':'book')}<span>${next?'ابدأ الآن':'ابدأ حصة'}</span></button>
    </section>

    <section class="v92-stats" aria-label="إحصائيات اليوم">
      <div><b>${expected.length}</b><span>مواعيد اليوم</span></div>
      <div><b>${present}</b><span>حضر</span></div>
      <div><b>${pending.length}</b><span>متبقٍ</span></div>
      <div><b>${absent}</b><span>غاب</span></div>
    </section>

    <section class="v92-actions">
      <button onclick="goPage('checkin')">${v9Icon('check')}<span><b>الحضور</b><small>تسجيل حضور اليوم</small></span></button>
      <button onclick="openAddSt()">${v9Icon('plus')}<span><b>طالب جديد</b><small>إضافة طالب بسرعة</small></span></button>
      <button onclick="goPage('students')">${v9Icon('users')}<span><b>كل الطلاب</b><small>${total} طالب نشط</small></span></button>
      <button onclick="goPage('mushaf')">${v9Icon('book')}<span><b>المصحف</b><small>قراءة وتنزيل Offline</small></span></button>
    </section>

    <section class="v92-today-card">
      <div class="v92-section-head"><div><b>${expected.length?'طلاب اليوم':'الطلاب'}</b><span>${expected.length?'اضغط على الطالب لبدء حصته':'لم يتم تحديد جدول يومي بعد'}</span></div><button onclick="goPage('students')">عرض الكل</button></div>
      <div class="v92-today-list">${listHtml}</div>
    </section>`;
  document.getElementById('pg-home')?.classList.add('v9-home-ready','v92-home-ready');
}

function v92TriggerMushafFile(){document.getElementById('v9MushafFile')?.click();}
function downloadMadinahMushafDirect(){
  const a=document.createElement('a');
  a.href=V92_MUSHAF.fullPdf; a.target='_blank'; a.rel='noopener'; a.download='Madinah-Mushaf-Hafs-604.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  v9Toast('بدأ فتح ملف المصحف الكامل. بعد اكتمال التنزيل اضغط «تثبيت الملف داخل البرنامج».','info');
}
function openOfficialMushafPortal(){window.open(V92_MUSHAF.officialApp,'_blank','noopener');}
function openMushafMirrorInfo(){window.open(V92_MUSHAF.mirrorInfo,'_blank','noopener');}

async function renderV9Mushaf(){
  const el=document.getElementById('v9MushafApp');if(!el)return;
  const blob=await mediaGet('mushaf:madinah:pdf').catch(()=>null),metaRaw=await idbKvGet('mushaf:madinah:meta').catch(()=>null),lastRaw=await idbKvGet('mushaf:lastPage').catch(()=>null);
  const meta=(()=>{try{return JSON.parse(metaRaw||'{}')}catch(_){return{}}})();
  const lastPage=Math.max(1,Math.min(604,Number(lastRaw)||1)); if((V9.currentMushafPage||1)===1&&lastPage>1)V9.currentMushafPage=lastPage;
  const st=await storageInfo(),pct=st.quota?Math.min(100,Math.round((st.usage||0)/st.quota*100)):0;
  const marks=(settings.v9?.mushafBookmarks||[]).map(Number).filter(n=>n>=1&&n<=604).sort((a,b)=>a-b);
  const installed=!!blob;
  el.innerHTML=`
  <section class="v92-mushaf-head">
    <div><span class="v92-kicker">مصحف المدينة النبوية</span><h1>المصحف الكامل — حفص عن عاصم</h1><p>604 صفحات. يمكنك تنزيل نسخة PDF كاملة، ثم تثبيتها داخل البرنامج مرة واحدة لتعمل بدون إنترنت.</p></div>
    <div class="v92-mushaf-status ${installed?'ready':''}">${installed?'✓ المصحف مثبت على هذا الجهاز':'غير مثبت بعد'}</div>
  </section>

  <section class="v92-install-flow">
    <div class="v92-step"><span>1</span><div><b>نزّل المصحف الكامل</b><p>زر مباشر لملف PDF كامل (حوالي 220 MB). النسخة المتاحة عبر مرآة PDF مبنية من أصول مصحف المدينة؛ وللتأكد من المصدر الرسمي يوجد رابط منفصل لمجمع الملك فهد.</p><div class="v92-step-actions"><button class="btn btn-g" onclick="downloadMadinahMushafDirect()">${v9Icon('download')} تنزيل المصحف الكامل</button><button class="btn btn-out" onclick="openOfficialMushafPortal()">موقع/تطبيق المجمع الرسمي</button></div></div></div>
    <div class="v92-step"><span>2</span><div><b>ثبّت الملف داخل البرنامج</b><p>بعد اكتمال التنزيل اختر ملف PDF من جهازك. هذه الخطوة تحفظه محليًا داخل التطبيق ولا ترفع الملف إلى أي خادم.</p><input type="file" id="v9MushafFile" accept="application/pdf,.pdf" onchange="importMushafPDF(event)" hidden><button class="btn ${installed?'btn-out':'btn-g'}" onclick="v92TriggerMushafFile()">${v9Icon('upload')} ${installed?'استبدال ملف المصحف':'تثبيت ملف PDF داخل البرنامج'}</button>${installed?`<div class="v92-file-ok"><b>${v9Esc(meta.name||'Madinah Mushaf.pdf')}</b><span>${fmtBytes(meta.size||blob.size)} · محفوظ Offline</span></div>`:''}</div></div>
    <div class="v92-step"><span>3</span><div><b>ابدأ القراءة</b><p>${installed?'المصحف جاهز الآن للعمل بدون إنترنت.':'بعد التثبيت سيظهر قارئ المصحف هنا تلقائيًا.'}</p>${installed?`<div class="v92-step-actions"><button class="btn btn-g" onclick="openMushafReader(${lastPage})">متابعة من صفحة ${lastPage}</button><button class="btn btn-out" onclick="openMushafReader(1)">من البداية</button><button class="btn btn-red btn-sm" onclick="deleteMushafPDF()">حذف الملف فقط</button></div>`:''}</div></div>
  </section>

  <section class="v92-offline-card"><div><b>التخزين Offline</b><span>المستخدم ${fmtBytes(st.usage)} من ${fmtBytes(st.quota)}</span></div><div class="v92-storage"><i style="width:${pct}%"></i></div><div class="v92-step-actions"><button class="btn btn-out btn-sm" onclick="requestPersistentStorage().then(()=>renderV9Mushaf())">حماية التخزين</button><button class="btn btn-out btn-sm" onclick="downloadQuranTextPack()">تنزيل النص العثماني Offline</button></div><div id="v9TextPackProgress" class="v9-mushaf-progress">${v9Esc(settings.v9?.textPackStatus||'')}</div></section>

  ${installed?`<section class="v9-reader-shell" id="v9ReaderShell"><div class="v9-reader-toolbar"><b>قارئ المصحف</b><label class="v9-page-label">الصفحة</label><input type="number" id="v9MushafPage" min="1" max="604" value="${V9.currentMushafPage||lastPage}" onkeydown="if(event.key==='Enter')openMushafReader(this.value)"><button class="btn btn-out btn-xs" onclick="openMushafReader(Math.max(1,(V9.currentMushafPage||1)-1))">السابق</button><button class="btn btn-out btn-xs" onclick="openMushafReader(Math.min(604,(V9.currentMushafPage||1)+1))">التالي</button><button class="btn btn-out btn-xs" onclick="toggleMushafView()">${settings.v9?.mushafView==='spread'?'صفحة واحدة':'صفحتان'}</button><button class="btn btn-out btn-xs" onclick="toggleMushafBookmark()">${marks.includes(Number(V9.currentMushafPage))?'★ إزالة العلامة':'☆ علامة'}</button><button class="btn btn-out btn-xs" onclick="openMushafFullscreen()">ملء الشاشة</button></div>${marks.length?`<div class="v9-mushaf-marks"><span>العلامات:</span>${marks.map(n=>`<button onclick="openMushafReader(${n})">${n}</button>`).join('')}</div>`:''}<div id="v9MushafReaderFrame" class="v9-reader-frame"><div class="v9-mushaf-empty"><div><b>المصحف جاهز</b><p>اضغط «متابعة» أو أدخل رقم صفحة من 1 إلى 604.</p></div></div></div></section>`:''}`;
}

// Refresh visible surfaces after the v9.2 overrides are defined.
if(document.readyState==='complete'||document.readyState==='interactive'){
  setTimeout(()=>{try{if(document.getElementById('v9Home'))renderV9Home();if(curPage==='mushaf')renderV9Mushaf();}catch(e){console.error('[v9.2 refresh]',e)}},0);
}
