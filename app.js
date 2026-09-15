
'use strict';

// ══════════════════════════════════════
// SECURITY — XSS PREVENTION
// ══════════════════════════════════════
function esc(str){
  const d=document.createElement('div');
  d.textContent=String(str==null?'':str);
  return d.innerHTML;
}

// ══════════════════════════════════════
// QURAN DATA
// ══════════════════════════════════════
const S=[
  {n:"الفاتحة",a:7},{n:"البقرة",a:286},{n:"آل عمران",a:200},{n:"النساء",a:176},
  {n:"المائدة",a:120},{n:"الأنعام",a:165},{n:"الأعراف",a:206},{n:"الأنفال",a:75},
  {n:"التوبة",a:129},{n:"يونس",a:109},{n:"هود",a:123},{n:"يوسف",a:111},
  {n:"الرعد",a:43},{n:"إبراهيم",a:52},{n:"الحجر",a:99},{n:"النحل",a:128},
  {n:"الإسراء",a:111},{n:"الكهف",a:110},{n:"مريم",a:98},{n:"طه",a:135},
  {n:"الأنبياء",a:112},{n:"الحج",a:78},{n:"المؤمنون",a:118},{n:"النور",a:64},
  {n:"الفرقان",a:77},{n:"الشعراء",a:227},{n:"النمل",a:93},{n:"القصص",a:88},
  {n:"العنكبوت",a:69},{n:"الروم",a:60},{n:"لقمان",a:34},{n:"السجدة",a:30},
  {n:"الأحزاب",a:73},{n:"سبأ",a:54},{n:"فاطر",a:45},{n:"يس",a:83},
  {n:"الصافات",a:182},{n:"ص",a:88},{n:"الزمر",a:75},{n:"غافر",a:85},
  {n:"فصلت",a:54},{n:"الشورى",a:53},{n:"الزخرف",a:89},{n:"الدخان",a:59},
  {n:"الجاثية",a:37},{n:"الأحقاف",a:35},{n:"محمد",a:38},{n:"الفتح",a:29},
  {n:"الحجرات",a:18},{n:"ق",a:45},{n:"الذاريات",a:60},{n:"الطور",a:49},
  {n:"النجم",a:62},{n:"القمر",a:55},{n:"الرحمن",a:78},{n:"الواقعة",a:96},
  {n:"الحديد",a:29},{n:"المجادلة",a:22},{n:"الحشر",a:24},{n:"الممتحنة",a:13},
  {n:"الصف",a:14},{n:"الجمعة",a:11},{n:"المنافقون",a:11},{n:"التغابن",a:18},
  {n:"الطلاق",a:12},{n:"التحريم",a:12},{n:"الملك",a:30},{n:"القلم",a:52},
  {n:"الحاقة",a:52},{n:"المعارج",a:44},{n:"نوح",a:28},{n:"الجن",a:28},
  {n:"المزمل",a:20},{n:"المدثر",a:56},{n:"القيامة",a:40},{n:"الإنسان",a:31},
  {n:"المرسلات",a:50},{n:"النبأ",a:40},{n:"النازعات",a:46},{n:"عبس",a:42},
  {n:"التكوير",a:29},{n:"الانفطار",a:19},{n:"المطففين",a:36},{n:"الانشقاق",a:25},
  {n:"البروج",a:22},{n:"الطارق",a:17},{n:"الأعلى",a:19},{n:"الغاشية",a:26},
  {n:"الفجر",a:30},{n:"البلد",a:20},{n:"الشمس",a:15},{n:"الليل",a:21},
  {n:"الضحى",a:11},{n:"الشرح",a:8},{n:"التين",a:8},{n:"العلق",a:19},
  {n:"القدر",a:5},{n:"البينة",a:8},{n:"الزلزلة",a:8},{n:"العاديات",a:11},
  {n:"القارعة",a:11},{n:"التكاثر",a:8},{n:"العصر",a:3},{n:"الهمزة",a:9},
  {n:"الفيل",a:5},{n:"قريش",a:4},{n:"الماعون",a:7},{n:"الكوثر",a:3},
  {n:"الكافرون",a:6},{n:"النصر",a:3},{n:"المسد",a:5},{n:"الإخلاص",a:4},
  {n:"الفلق",a:5},{n:"الناس",a:6}
];
const JZ=[
  'جزء ألم','جزء سيقول','جزء تلك الرسل','جزء لن تنالوا','جزء والمحصنات','جزء لا يحب الله',
  'جزء وإذا سمعوا','جزء ولو أننا','جزء قال الملأ','جزء واعلموا','جزء يعتذرون','جزء وما من دابة',
  'جزء وما أبرئ','جزء ربما','جزء سبحان الذي','جزء قال ألم','جزء اقترب للناس','جزء قد أفلح',
  'جزء وقال الذين','جزء أمن خلق','جزء اتل ما أوحي','جزء ومن يقنت','جزء وما لي','جزء فمن أظلم',
  'جزء إليه يرد','جزء حم','جزء قال فما خطبكم','جزء قد سمع','جزء تبارك','جزء عمّ'
];
const DAY_NAMES=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

// ══════════════════════════════════════
// STATE + VERSIONING
// ══════════════════════════════════════
const APP_VERSION='9.2.1';
const SCHEMA_VERSION=11;
const ACADEMY_NAME='أكاديمية الإمام لتحفيظ القرآن الكريم';
const ACADEMY_TAGLINE='بالقرآن نحيا';
const GRADE_MAP={ممتاز:4,'جيد جداً':3,جيد:2,ضعيف:1};

let students=[];
let sessions=[];
let tasks=[];
let settings={name:'',circle:ACADEMY_NAME,theme:'light',fontSize:'md',notifEnabled:false,waTemplate:'',schemaVersion:SCHEMA_VERSION};
let curPage='home';
let curStId=null;
let editId=null;
let sesStatus='حضر';
let secOn={new:true,rec:false,far:false,juz:false,surahReview:false};
let grades={new:'',rec:'',far:'',juz:''};
let prevGrades={new:'',rec:'',far:'',juz:'',surahReview:''};
let actualRecitation={new:null,rec:null,far:null};
let juzChips=[];
let surahReviewChips=[];
let reviewDirections={new:1,rec:1,far:1,juz:1,surahReview:1};
let db=null;
let editingSessionId=null;
let draftTimer=null;
let draftSuspend=false;
let waitingSW=null;

function makeId(prefix){
  if(globalThis.crypto&&crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
}
function localDateKey(value=new Date()){
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function sessionDay(s){ return s?.sessionDate||localDateKey(s?.date); }
function makeSessionISO(dateKey){
  const now=new Date();
  if(dateKey===localDateKey(now)) return now.toISOString();
  const [y,m,d]=(dateKey||localDateKey()).split('-').map(Number);
  return new Date(y,m-1,d,12,0,0,0).toISOString();
}
function weekdayFromDateKey(dateKey){
  const [y,m,d]=(dateKey||localDateKey()).split('-').map(Number);
  return new Date(y,m-1,d,12,0,0,0).getDay();
}
function hasConfiguredSchedules(){return students.some(st=>Array.isArray(st.scheduleDays)&&st.scheduleDays.length);}
function expectedStudentsForDate(dateKey=localDateKey()){
  if(!hasConfiguredSchedules()) return students.slice();
  const dow=weekdayFromDateKey(dateKey);
  return students.filter(st=>Array.isArray(st.scheduleDays)&&st.scheduleDays.includes(dow)).sort((a,b)=>(a.scheduleTime||'99:99').localeCompare(b.scheduleTime||'99:99','en'));
}
function scheduleText(st){
  const days=(Array.isArray(st?.scheduleDays)?st.scheduleDays:[]).map(d=>DAY_NAMES[d]).filter(Boolean);
  if(!days.length)return 'غير محدد';
  const t=st.scheduleTime?` · ${st.scheduleTime}`:'';
  const dur=st.sessionDuration?` · ${st.sessionDuration} د`:'';
  return `${days.join('، ')}${t}${dur}`;
}
function timeToMinutes(t){
  if(!/^\d{2}:\d{2}$/.test(String(t||'')))return null;
  const[h,m]=t.split(':').map(Number);return h*60+m;
}
function getScheduleConflicts(candidate,ignoreId=null){
  const days=Array.isArray(candidate?.scheduleDays)?candidate.scheduleDays:[];
  const start=timeToMinutes(candidate?.scheduleTime);if(!days.length||start==null)return [];
  const end=start+(Number(candidate.sessionDuration)||30),out=[];
  students.forEach(st=>{
    if(st.id===ignoreId)return;
    const stStart=timeToMinutes(st.scheduleTime);if(stStart==null)return;
    const shared=days.filter(d=>(st.scheduleDays||[]).includes(d));if(!shared.length)return;
    const stEnd=stStart+(Number(st.sessionDuration)||30);
    if(start<stEnd&&stStart<end) out.push({student:st,days:shared});
  });
  return out;
}
function allScheduleConflicts(){
  const seen=new Set(),out=[];
  students.forEach(st=>getScheduleConflicts(st,st.id).forEach(c=>{
    const pair=[st.id,c.student.id].sort().join('|');
    c.days.forEach(day=>{const key=`${pair}|${day}`;if(!seen.has(key)){seen.add(key);out.push({a:st,b:c.student,day});}});
  }));
  return out;
}
function hasSessionContent(s){ return !!(s&&(s.new||s.rec||s.far||s.juz||s.surahReview||s.notes||Object.values(s.prevGrades||{}).some(Boolean))); }
function dailySessions(studentId,dateKey){ return sessions.filter(s=>s.studentId===studentId&&sessionDay(s)===dateKey); }
function findDailySession(studentId,dateKey){
  const list=dailySessions(studentId,dateKey);
  if(!list.length) return null;
  return [...list].sort((a,b)=>{
    const ac=hasSessionContent(a)?1:0,bc=hasSessionContent(b)?1:0;
    if(ac!==bc) return bc-ac;
    return new Date(b.updatedAt||b.date||0)-new Date(a.updatedAt||a.date||0);
  })[0];
}
function clampSection(sec){
  if(!sec||!sec.surah) return sec;
  const idx=S.findIndex(x=>x.n===sec.surah);
  const max=idx>=0?S[idx].a:999;
  let from=Math.max(1,parseInt(sec.from)||1),to=Math.max(1,parseInt(sec.to)||from);
  from=Math.min(from,max);to=Math.min(to,max);
  if(to<from)[from,to]=[to,from];
  return {...sec,from,to,full:!!sec.full};
}
function migrateData(){
  let changed=false;
  const now=new Date().toISOString();
  students=(Array.isArray(students)?students:[]).map(st=>{
    const x={...st};
    if(!x.id){x.id=makeId('st');changed=true;}
    if(!x.createdAt){x.createdAt=now;changed=true;}
    if(!x.updatedAt){x.updatedAt=x.createdAt;changed=true;}
    if(!x.level){x.level='مبتدئ';changed=true;}
    const normalizedGroup=String(x.group||'').trim().slice(0,120);
    if((x.group||'')!==normalizedGroup){x.group=normalizedGroup;changed=true;} else x.group=normalizedGroup;
    const normDays=Array.isArray(x.scheduleDays)?[...new Set(x.scheduleDays.map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6))]:[];
    if(JSON.stringify(normDays)!==JSON.stringify(x.scheduleDays||[])){x.scheduleDays=normDays;changed=true;} else x.scheduleDays=normDays;
    if(x.scheduleTime&&!/^\d{2}:\d{2}$/.test(x.scheduleTime)){x.scheduleTime='';changed=true;}
    const dur=Math.min(180,Math.max(15,parseInt(x.sessionDuration)||30));if(x.sessionDuration!==dur){x.sessionDuration=dur;changed=true;}
    return x;
  });
  sessions=(Array.isArray(sessions)?sessions:[]).map(se=>{
    const x={...se};
    if(!x.id){x.id=makeId('ses');changed=true;}
    if(!x.date){x.date=now;changed=true;}
    if(!x.sessionDate){x.sessionDate=localDateKey(x.date);changed=true;}
    if(!x.createdAt){x.createdAt=x.date;changed=true;}
    if(!x.updatedAt){x.updatedAt=x.date;changed=true;}
    if(!x.source){x.source=hasSessionContent(x)?'session':'legacy';changed=true;}
    if(!x.prevGrades||typeof x.prevGrades!=='object'){x.prevGrades={new:'',rec:'',far:'',juz:'',surahReview:''};changed=true;}
    else if(!Object.prototype.hasOwnProperty.call(x.prevGrades,'surahReview')){x.prevGrades={new:'',rec:'',far:'',juz:'',surahReview:'',...x.prevGrades};changed=true;}
    ['new','rec','far'].forEach(k=>{if(x[k])x[k]=clampSection(x[k]);if(x.actualRecitation?.[k])x.actualRecitation[k]=clampSection(x.actualRecitation[k]);});
    // v7.1: مراجعة الأجزاء ومراجعة السور أصبحا مستقلين. نفصل السجلات القديمة بأمان.
    if(x.juz&&Array.isArray(x.juz.chips)){
      const partChips=[],surahChips=[];
      x.juz.chips.forEach(raw=>{const c=String(raw||'').trim();if(/^سورة\s+/.test(c))surahChips.push(c);else{const n=normalizeJuzChip(c);if(n)partChips.push(n);}});
      if(surahChips.length&&!x.surahReview){x.surahReview={chips:[...new Set(surahChips)]};changed=true;}
      const normalized=[...new Set(partChips)];
      if(normalized.length)x.juz={...x.juz,chips:normalized};else if(surahChips.length){delete x.juz;changed=true;}
    }
    if(x.surahReview&&Array.isArray(x.surahReview.chips))x.surahReview={...x.surahReview,chips:[...new Set(x.surahReview.chips.map(c=>normalizeSurahReviewChip(c)).filter(Boolean))]};
    x.directions={new:1,rec:1,far:1,juz:1,surahReview:1,...(x.directions||{})};
    if(!x.summary) x.summary=buildSumText(x);
    return x;
  });

  const studentIds=new Set(students.map(x=>x.id));
  tasks=(Array.isArray(tasks)?tasks:[]).map(raw=>{
    const x={...raw};
    if(!x.id){x.id=makeId('task');changed=true;}
    x.title=String(x.title||'').trim().slice(0,240);
    x.notes=String(x.notes||'').trim().slice(0,4000);
    if(x.studentId&&!studentIds.has(x.studentId)){x.studentId='';changed=true;}
    if(x.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(x.dueDate)){x.dueDate='';changed=true;}
    if(!['normal','high'].includes(x.priority)){x.priority='normal';changed=true;}
    x.done=!!x.done;
    if(!x.createdAt){x.createdAt=now;changed=true;}
    if(!x.updatedAt){x.updatedAt=x.createdAt;changed=true;}
    return x;
  }).filter(x=>x.title);

  // Safe legacy repair: remove attendance-only duplicates when the same student/day
  // already has a detailed session. Detailed same-day sessions are never deleted.
  const groups=new Map();
  sessions.forEach(se=>{
    const key=`${se.studentId}|${sessionDay(se)}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(se);
  });
  const removeIds=new Set();
  groups.forEach(list=>{
    if(list.length<2) return;
    const detailed=list.filter(hasSessionContent);
    if(detailed.length===1){
      list.filter(x=>!hasSessionContent(x)).forEach(x=>removeIds.add(x.id));
    }
  });
  if(removeIds.size){sessions=sessions.filter(x=>!removeIds.has(x.id));changed=true;}

  if(settings.schemaVersion!==SCHEMA_VERSION){settings.schemaVersion=SCHEMA_VERSION;changed=true;}
  return changed;
}

// ══════════════════════════════════════
// DATABASE — Native IndexedDB + localStorage safety copy
// ══════════════════════════════════════
function readLocalFallback(){
  try{
    students=JSON.parse(localStorage.getItem('qt_st')||'[]');
    sessions=JSON.parse(localStorage.getItem('qt_ses')||'[]');
    tasks=JSON.parse(localStorage.getItem('qt_tasks')||'[]');
    settings={...settings,...JSON.parse(localStorage.getItem('qt_cfg')||'{}')};
  }catch(e){
    console.warn('تعذر قراءة النسخة المحلية الاحتياطية',e);
    students=[];sessions=[];tasks=[];
  }
}

function openQuranDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('IndexedDB غير مدعوم'));return;}
    // فتح قاعدة البيانات بدون رقم إصدار يحافظ على التوافق مع قواعد Dexie القديمة
    // (Dexie قد يكون استخدم رقم إصدار داخلي مختلفاً).
    const req=indexedDB.open('QuranApp');
    req.onupgradeneeded=()=>{
      const database=req.result;
      if(!database.objectStoreNames.contains('kv')) database.createObjectStore('kv',{keyPath:'key'});
    };
    req.onsuccess=()=>{
      const database=req.result;
      database.onversionchange=()=>database.close();
      if(database.objectStoreNames.contains('kv')){resolve(database);return;}
      // قاعدة موجودة من إصدار غير متوقع: أنشئ مخزن kv بترقية آمنة.
      const nextVersion=database.version+1;database.close();
      const up=indexedDB.open('QuranApp',nextVersion);
      up.onupgradeneeded=()=>{if(!up.result.objectStoreNames.contains('kv'))up.result.createObjectStore('kv',{keyPath:'key'});};
      up.onsuccess=()=>{up.result.onversionchange=()=>up.result.close();resolve(up.result);};
      up.onerror=()=>reject(up.error||new Error('فشل ترقية قاعدة البيانات'));
      up.onblocked=()=>console.warn('ترقية قاعدة البيانات تنتظر إغلاق تبويب قديم');
    };
    req.onerror=()=>reject(req.error||new Error('فشل فتح قاعدة البيانات'));
    req.onblocked=()=>console.warn('قاعدة البيانات محجوبة بواسطة تبويب قديم مفتوح');
  });
}

function idbGetAll(database){
  return new Promise((resolve,reject)=>{
    try{
      if(!database.objectStoreNames.contains('kv')){resolve([]);return;}
      const tx=database.transaction('kv','readonly'),store=tx.objectStore('kv');
      if(typeof store.getAll==='function'){
        const req=store.getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);return;
      }
      const rows=[],req=store.openCursor();
      req.onsuccess=e=>{const cur=e.target.result;if(cur){rows.push(cur.value);cur.continue();}else resolve(rows);};
      req.onerror=()=>reject(req.error);
    }catch(e){reject(e);}
  });
}

function idbWriteSnapshot(){
  if(!db||!db.objectStoreNames.contains('kv')) return;
  try{
    const tx=db.transaction('kv','readwrite');
    const store=tx.objectStore('kv');
    store.put({key:'students',val:JSON.stringify(students)});
    store.put({key:'sessions',val:JSON.stringify(sessions)});
    store.put({key:'tasks',val:JSON.stringify(tasks)});
    store.put({key:'settings',val:JSON.stringify(settings)});
    tx.onerror=()=>console.warn('تعذر حفظ نسخة IndexedDB',tx.error);
  }catch(e){console.warn('تعذر الكتابة إلى IndexedDB',e);}
}

async function initDB(){
  try{
    db=await openQuranDB();
    const rows=await idbGetAll(db);
    const map={};
    rows.forEach(r=>{if(r&&r.key!=null)map[r.key]=r.val;});
    if(map.students!==undefined||map.sessions!==undefined||map.tasks!==undefined||map.settings!==undefined){
      students=JSON.parse(map.students||'[]');
      sessions=JSON.parse(map.sessions||'[]');
      tasks=JSON.parse(map.tasks||'[]');
      settings={...settings,...JSON.parse(map.settings||'{}')};
    }else{
      readLocalFallback();
    }
  }catch(e){
    console.warn('IndexedDB غير متاح؛ سيتم استخدام النسخة المحلية',e);
    db=null;
    readLocalFallback();
  }
  const changed=migrateData();
  if(changed) save();
  else idbWriteSnapshot();
}

function save(){
  // localStorage هنا نسخة أمان سريعة، وIndexedDB هو مخزن البيانات الرئيسي.
  try{
    localStorage.setItem('qt_st',JSON.stringify(students));
    localStorage.setItem('qt_ses',JSON.stringify(sessions));
    localStorage.setItem('qt_tasks',JSON.stringify(tasks));
    localStorage.setItem('qt_cfg',JSON.stringify(settings));
  }catch(e){console.warn('تعذر حفظ نسخة localStorage الاحتياطية',e);}
  idbWriteSnapshot();
  queueMicrotask(()=>{try{updateTaskBadge();}catch(_){}});
}

// ══════════════════════════════════════
// AVATAR COLOR HELPERS
// ══════════════════════════════════════
const AV_BG=['var(--gp)','var(--bp)','var(--goldp)','var(--rp)','var(--op)'];
const AV_TX=['var(--gd)','var(--blue)','#7a5a00','var(--red)','var(--org)'];
function avBg(id){const h=id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);return AV_BG[h%AV_BG.length];}
function avTx(id){const h=id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);return AV_TX[h%AV_TX.length];}

// ══════════════════════════════════════
// THEME — DARK MODE
// ══════════════════════════════════════
function applyTheme(){
  const dark=settings.theme==='dark';
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  document.getElementById('themeBtn').textContent=dark?'☀️':'🌙';
  document.getElementById('themeColorMeta').setAttribute('content',dark?'#0d1a11':'#1a4a2e');
}
function toggleTheme(){
  settings.theme=settings.theme==='dark'?'light':'dark';
  save();
  applyTheme();
  // Re-render charts with new theme colors
  if(curPage==='home') renderHomeCharts();
  if(curPage==='reports') renderReport();
  if(curPage==='profile'&&curStId) renderProfileChart(curStId);
}

// ══════════════════════════════════════
// FONT SIZE
// ══════════════════════════════════════
function applyFontSize(){
  const fs=settings.fontSize||'md';
  document.documentElement.className=document.documentElement.className.replace(/fs-\w+/g,'');
  if(fs!=='md') document.documentElement.classList.add('fs-'+fs);
  ['md','lg','xl'].forEach(s=>{
    const b=document.getElementById('fs'+s);
    if(b) b.classList.toggle('active',s===fs);
  });
}
function setFontSize(sz){
  settings.fontSize=sz;
  save();
  applyFontSize();
  toast('حجم الخط: '+(sz==='md'?'صغير':sz==='lg'?'متوسط':'كبير'),'info');
}

// ══════════════════════════════════════
// HAPTIC FEEDBACK
// ══════════════════════════════════════
function vibrate(pat){
  if(navigator.vibrate) navigator.vibrate(pat||[50]);
}

// ══════════════════════════════════════
// CONFETTI CELEBRATION
// ══════════════════════════════════════
function celebrate(){
  const colors=['#c9a227','#2d7a4f','#4caf7d','#1565c0','#e65100','#fff'];
  for(let i=0;i<70;i++){
    const p=document.createElement('div');
    p.className='confetti-p';
    const dur=1.4+Math.random()*1.2;
    p.style.cssText=`
      left:${Math.random()*100}vw;top:-10px;
      width:${6+Math.random()*7}px;height:${6+Math.random()*7}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>.5?'50%':'3px'};
      animation-duration:${dur}s;animation-delay:${Math.random()*0.6}s;
    `;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),(dur+1)*1000);
  }
  vibrate([100,50,100,50,200]);
  toast('🎉 ممتاز! أحسنت يا طالب القرآن!','gold');
}

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
function goPage(p){
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.nav-t').forEach(x=>x.classList.remove('on'));
  const pEl=document.getElementById('pg-'+p);
  if(pEl) pEl.classList.add('on');
  const navMap={home:0,students:1,checkin:2,session:3,reports:4,settings:5};
  const navTabs=document.querySelectorAll('.nav-t');
  if(navMap[p]!==undefined) navTabs[navMap[p]].classList.add('on');
  const isExtra=p==='profile'||p==='compare';
  const showBack=isExtra||p==='tasks';
  document.getElementById('mainNav').style.display=isExtra?'none':'flex';
  document.getElementById('backBtn').style.display=showBack?'block':'none';
  document.body.classList.toggle('no-sidebar',isExtra);
  const titles={profile:'ملف الطالب',compare:'مقارنة الطلاب',tasks:'المهام والمتابعة'};
  document.getElementById('hdrTitle').textContent=titles[p]||'أكاديمية الإمام';
  document.getElementById('hdrSub').textContent=isExtra?'':ACADEMY_TAGLINE;
  curPage=p;
  if(p==='home') renderHome();
  if(p==='students') renderSt();
  if(p==='checkin') renderCheckin();
  if(p==='session') initSession();
  if(p==='reports') initReports();
  if(p==='settings') initSettings();
  if(p==='compare') renderComparison();
  if(p==='tasks') renderTasks();
}
function goBack(){
  if(curPage==='compare') goPage('reports');
  else if(curPage==='tasks') goPage('home');
  else goPage('students');
}

// ══════════════════════════════════════
// STREAK CALCULATION
// ══════════════════════════════════════
function calcStreakFromDays(dayKeys){
  const days=[...new Set(dayKeys)].sort((a,b)=>b.localeCompare(a));
  if(!days.length) return 0;
  const latest=new Date(days[0]+'T12:00:00');
  const today=new Date(localDateKey()+'T12:00:00');
  const age=Math.round((today-latest)/86400000);
  if(age>1) return 0;
  let streak=1;
  let prev=latest;
  for(let i=1;i<days.length;i++){
    const d=new Date(days[i]+'T12:00:00');
    const diff=Math.round((prev-d)/86400000);
    if(diff===1){streak++;prev=d;}else if(diff>1) break;
  }
  return streak;
}
function calcMaxStreak(){
  return calcStreakFromDays(sessions.filter(s=>s.status==='حضر').map(sessionDay));
}

// ══════════════════════════════════════
// HOME
// ══════════════════════════════════════
function renderHome(){
  document.getElementById('stTotal').textContent=students.length;
  const today=localDateKey();
  const todSes=sessions.filter(s=>sessionDay(s)===today);
  document.getElementById('stToday').textContent=todSes.filter(s=>s.status==='حضر').length;
  document.getElementById('stAbsent').textContent=todSes.filter(s=>s.status==='غاب').length;
  const now=new Date(),m=now.getMonth(),y=now.getFullYear();
  document.getElementById('stMonth').textContent=sessions.filter(s=>{
    const d=new Date(s.date);return d.getMonth()===m&&d.getFullYear()===y&&s.status==='حضر';
  }).length;

  const qs=document.getElementById('quickSt');
  qs.innerHTML='<option value="">— اختر الطالب —</option>';
  students.forEach(st=>{qs.innerHTML+=`<option value="${esc(st.id)}">${esc(st.name)}</option>`;});

  const streak=calcMaxStreak();
  const sc=document.getElementById('streakCard');
  if(streak>=2){
    document.getElementById('streakNum').textContent=streak;
    document.getElementById('streakSub').textContent=streak>=30?'شهر كامل! 🌟':streak>=7?'أسبوع كامل 🏆':'واصل المسيرة!';
    sc.style.display='flex';
  }else sc.style.display='none';

  renderTodayQueue();
  renderHomeAnalysis();
  updateTaskBadge();

  const last=sessions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  const el=document.getElementById('recentSes');
  if(!last.length){el.innerHTML='<div class="empty"><div class="ei">📋</div><p>لا توجد حصص بعد</p></div>';}
  else{
    el.innerHTML=last.map(ses=>{
      const st=students.find(x=>x.id===ses.studentId);
      const nm=st?esc(st.name):'طالب محذوف';
      const d=new Date(ses.date).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'});
      const icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';
      return `<div class="hi"><div class="fb"><span style="font-weight:700">${nm}</span><span class="txt-mut">${d} ${icon}</span></div><div class="hi-content txt-mut">${esc(ses.summary||'')}</div></div>`;
    }).join('');
  }
  renderHomeCharts();
}
function renderTodayQueue(){
  const el=document.getElementById('todayQueue');
  const prog=document.getElementById('todayProgress');
  if(!el||!prog) return;
  const today=localDateKey(),expected=expectedStudentsForDate(today);
  const map={};
  sessions.filter(s=>sessionDay(s)===today).forEach(s=>{map[s.studentId]=findDailySession(s.studentId,today);});
  const done=expected.filter(st=>map[st.id]).length;
  prog.textContent=`${done} / ${expected.length}`;
  if(!students.length){el.innerHTML='<div class="empty"><p>أضف الطلاب أولاً لبدء المتابعة اليومية</p></div>';return;}
  if(!expected.length){el.innerHTML='<div class="empty"><p>لا توجد حصص مجدولة اليوم.<br><small>يمكن بدء حصة استثنائية من «حصة سريعة».</small></p></div>';return;}
  el.innerHTML=expected.map(st=>{
    const ses=map[st.id];
    const status=ses?.status||'';
    const cls=status==='حضر'?'present':status==='غاب'?'absent':status==='إجازة'?'vacation':'pending';
    const label=status||'لم يسجل';
    const time=st.scheduleTime?`<div class="today-time">🕐 ${esc(st.scheduleTime)} · ${Number(st.sessionDuration)||30} دقيقة</div>`:'';
    return `<div class="today-item">
      <div class="today-name">${esc(st.name)}${time}</div>
      <span class="today-status ${cls}">${esc(label)}</span>
      <button class="today-action" onclick="startFor('${esc(st.id)}')">${status==='حضر'?'فتح الحصة':'تسجيل'}</button>
    </div>`;
  }).join('');
}
function quickPick(){ curStId=document.getElementById('quickSt').value; }
function goToSession(){ goPage('session'); if(curStId) document.getElementById('sesSt').value=curStId; onSesSt(); }

// ══════════════════════════════════════
// NATIVE CANVAS CHARTS — no external dependency
// ══════════════════════════════════════
function getChartColors(){
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  return{
    text:dark?'#9ab39f':'#555b57',
    muted:dark?'#78917f':'#7c827e',
    grid:dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)',
    green:'#4caf7d',red:'#ef5350',gold:'#c9a227',blue:'#42a5f5',
    surface:dark?'#17251b':'#ffffff'
  };
}

function prepareCanvas(canvas,fallbackHeight=180){
  if(!canvas) return null;
  const rect=canvas.getBoundingClientRect();
  const cssW=Math.max(280,Math.round(rect.width||canvas.parentElement?.clientWidth||320));
  const cssH=Math.max(150,Math.round(rect.height||canvas.parentElement?.clientHeight||fallbackHeight));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width='100%';canvas.style.height=`${cssH}px`;
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssW,cssH);
  ctx.direction='rtl';
  ctx.font='11px system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif';
  return{ctx,w:cssW,h:cssH};
}
function clearCanvas(canvas){
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
}
function roundRectPath(ctx,x,y,w,h,r=5){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function drawLegend(ctx,items,w,y){
  const c=getChartColors();
  const gap=Math.max(90,Math.floor(w/Math.max(items.length,1)));
  const total=gap*items.length;
  let x=(w-total)/2+gap/2;
  ctx.textAlign='center';ctx.textBaseline='middle';
  items.forEach(it=>{
    ctx.fillStyle=it.color;roundRectPath(ctx,x+24,y-5,10,10,3);ctx.fill();
    ctx.fillStyle=c.text;ctx.fillText(it.label,x+8,y);
    x+=gap;
  });
}
function drawBarChart(canvas,labels,datasets){
  const box=prepareCanvas(canvas,170);if(!box)return;
  const{ctx,w,h}=box,c=getChartColors();
  const pad={l:30,r:12,t:14,b:46};
  const plotW=w-pad.l-pad.r,plotH=h-pad.t-pad.b;
  const all=datasets.flatMap(d=>d.data||[]).map(Number).filter(Number.isFinite);
  const max=Math.max(1,...all);
  const top=Math.max(1,Math.ceil(max));
  const steps=Math.min(4,top);
  ctx.lineWidth=1;ctx.textBaseline='middle';
  for(let i=0;i<=steps;i++){
    const val=Math.round(top*i/steps),y=pad.t+plotH-(plotH*i/steps);
    ctx.strokeStyle=c.grid;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillStyle=c.muted;ctx.textAlign='right';ctx.fillText(String(val),pad.l-5,y);
  }
  const groups=Math.max(labels.length,1),groupW=plotW/groups;
  const barGap=3,series=Math.max(datasets.length,1),barW=Math.min(20,Math.max(5,(groupW*0.72-(series-1)*barGap)/series));
  labels.forEach((label,i)=>{
    const center=pad.l+groupW*(i+.5);
    datasets.forEach((ds,j)=>{
      const val=Number(ds.data?.[i])||0,bh=plotH*(val/top);
      const x=center-(series*barW+(series-1)*barGap)/2+j*(barW+barGap),y=pad.t+plotH-bh;
      ctx.save();ctx.globalAlpha=.88;ctx.fillStyle=ds.color;roundRectPath(ctx,x,y,barW,Math.max(1,bh),4);ctx.fill();ctx.restore();
    });
    ctx.fillStyle=c.text;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(label,center,pad.t+plotH+7);
  });
  drawLegend(ctx,datasets.map(d=>({label:d.label,color:d.color})),w,h-12);
}
function drawLineChart(canvas,labels,values,{min=0,max=4}={}){
  const box=prepareCanvas(canvas,180);if(!box)return;
  const{ctx,w,h}=box,c=getChartColors();
  const pad={l:45,r:14,t:14,b:35};
  const plotW=w-pad.l-pad.r,plotH=h-pad.t-pad.b;
  const yLabels=['','ضعيف','جيد','جيد جداً','ممتاز'];
  for(let i=0;i<=4;i++){
    const y=pad.t+plotH-(plotH*i/4);
    ctx.strokeStyle=c.grid;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillStyle=c.muted;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(i?yLabels[i]:'0',pad.l-6,y);
  }
  if(values.length){
    const pts=values.map((v,i)=>({
      x:pad.l+(values.length===1?plotW/2:plotW*i/(values.length-1)),
      y:pad.t+plotH-(Math.max(min,Math.min(max,Number(v)||0))-min)/(max-min)*plotH
    }));
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.lineTo(pts[pts.length-1].x,pad.t+plotH);ctx.lineTo(pts[0].x,pad.t+plotH);ctx.closePath();
    ctx.save();ctx.globalAlpha=.10;ctx.fillStyle=c.green;ctx.fill();ctx.restore();
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=c.green;ctx.lineWidth=2.2;ctx.stroke();
    pts.forEach(p=>{ctx.fillStyle=c.surface;ctx.strokeStyle=c.green;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();});
  }
  const stride=Math.max(1,Math.ceil(labels.length/6));
  labels.forEach((label,i)=>{
    if(i%stride!==0&&i!==labels.length-1)return;
    const x=pad.l+(labels.length===1?plotW/2:plotW*i/(labels.length-1));
    ctx.fillStyle=c.text;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(label,x,pad.t+plotH+8);
  });
}
function drawDoughnutChart(canvas,values,labels){
  const box=prepareCanvas(canvas,200);if(!box)return;
  const{ctx,w,h}=box,c=getChartColors();
  const colors=[c.green,c.red,c.gold,c.blue];
  const total=values.reduce((a,v)=>a+(Number(v)||0),0);
  const cy=Math.min(82,h*.42),cx=w/2,r=Math.min(58,w*.22,cy-8),inner=r*.60;
  if(total<=0){ctx.fillStyle=c.muted;ctx.textAlign='center';ctx.fillText('لا توجد بيانات لهذا الشهر',cx,cy);return;}
  let a=-Math.PI/2;
  values.forEach((v,i)=>{
    const val=Number(v)||0,angle=Math.PI*2*val/total;if(angle<=0)return;
    ctx.beginPath();ctx.arc(cx,cy,r,a,a+angle);ctx.arc(cx,cy,inner,a+angle,a,true);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();a+=angle;
  });
  ctx.fillStyle=c.text;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 18px system-ui';ctx.fillText(String(total),cx,cy-4);
  ctx.font='10px system-ui';ctx.fillStyle=c.muted;ctx.fillText('إجمالي السجلات',cx,cy+14);
  const items=labels.map((label,i)=>({label:`${label} ${values[i]||0}`,color:colors[i%colors.length]}));
  drawLegend(ctx,items,w,h-18);
}

function renderHomeCharts(){
  const canvas=document.getElementById('weekChart');if(!canvas)return;
  const days=[],present=[],absent=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=localDateKey(d);
    days.push(d.toLocaleDateString('ar-EG',{weekday:'short'}));
    const day=sessions.filter(s=>sessionDay(s)===ds);
    present.push(day.filter(s=>s.status==='حضر').length);
    absent.push(day.filter(s=>s.status==='غاب').length);
  }
  const c=getChartColors();
  drawBarChart(canvas,days,[{label:'حضور',data:present,color:c.green},{label:'غياب',data:absent,color:c.red}]);
}

// ══════════════════════════════════════
// STUDENTS LIST
// ══════════════════════════════════════
function renderSt(q='',lvl='',group=''){
  const el=document.getElementById('stList');
  refreshGroupOptions();
  const nq=String(q||'').trim().toLowerCase();
  const list=students.filter(s=>{
    const matchQ=!nq||String(s.name||'').toLowerCase().includes(nq)||String(s.parent||'').toLowerCase().includes(nq)||String(s.group||'').toLowerCase().includes(nq);
    const matchL=!lvl||s.level===lvl;
    const matchG=!group||s.group===group;
    return matchQ&&matchL&&matchG;
  });
  if(!list.length){ el.innerHTML='<div class="empty"><div class="ei">👥</div><p>لا يوجد طلاب — اضغط + للإضافة</p></div>'; return; }
  el.innerHTML=list.map(s=>{
    const init=s.name.trim().split(' ').slice(0,2).map(x=>x[0]).join('');
    const cls=s.level==='متقدم'?'lv1':s.level==='متوسط'?'lv2':'lv3';
    const cnt=sessions.filter(x=>x.studentId===s.id&&x.status==='حضر').length;
    const studentSes=sessions.filter(x=>x.studentId===s.id).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const lastSes=studentSes.length?studentSes[studentSes.length-1]:null;
    const lastDate=lastSes?new Date(lastSes.date).toLocaleDateString('ar-EG',{month:'short',day:'numeric'}):'—';
    const total=calcTotalAyat(s.id);
    const pct=Math.min(100,Math.round(total/6236*100));
    // Urgency: highlight if last session > 7 days ago
    const daysSince=lastSes?Math.floor((Date.now()-new Date(lastSes.date))/86400000):999;
    const urgency=daysSince>14?'urgency-red':daysSince>7?'urgency-yellow':'urgency-none';
    return `<div class="stc" onclick="openProf('${esc(s.id)}')">
      <div class="av" style="background:${avBg(s.id)};color:${avTx(s.id)}">${esc(init)}</div>
      <div class="si">
        <div class="fb">
          <div class="sn2">${esc(s.name)}</div>
          <div class="urgency-dot ${urgency}" title="${daysSince<999?daysSince+' يوم':'لا حصص'}"></div>
        </div>
        <div class="sm">آخر حصة: ${lastDate} · ${cnt} حضور · ${total} آية مُقيّمة</div>
        ${s.group?`<span class="group-chip">👥 ${esc(s.group)}</span>`:''}${s.scheduleTime&&s.scheduleDays?.length?`<span class="schedule-chip">🕐 ${esc(s.scheduleTime)}</span>`:''}
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span class="lv ${cls}">${esc(s.level)}</span>
          <div class="mini-prog" style="flex:1"><div class="mini-prog-fill" style="width:${pct}%"></div></div>
          <span style="font-size:10px;color:var(--mut)">${pct}%</span>
        </div>
      </div>
      <div style="color:var(--mut);font-size:20px">‹</div>
    </div>`;
  }).join('');
}
function filterSt(){
  renderSt(document.getElementById('searchIn').value,document.getElementById('filterLevel').value,document.getElementById('filterGroup')?.value||'');
}

// ══════════════════════════════════════
// ADD / EDIT STUDENT
// ══════════════════════════════════════
function openAddSt(){
  editId=null;
  document.getElementById('moTitle').textContent='إضافة طالب جديد';
  ['m-name','m-par','m-phone','m-notes','m-group'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('m-level').value='مبتدئ';
  document.getElementById('m-date').value=localDateKey();
  document.querySelectorAll('.m-day').forEach(x=>x.checked=false);
  document.getElementById('m-time').value='';
  document.getElementById('m-duration').value='30';
  document.getElementById('stModal').classList.add('open');
}
function closeMo(){ document.getElementById('stModal').classList.remove('open'); }

function saveSt(){
  const name=document.getElementById('m-name').value.trim();
  const phone=document.getElementById('m-phone').value.trim();
  if(!name){toast('أدخل اسم الطالب','error');return;}
  if(!phone){toast('أدخل رقم الواتساب','error');return;}
  const normalizedPhone=normPhone(phone);
  if(!/^20\d{10}$/.test(normalizedPhone)){toast('رقم الواتساب غير صحيح — اكتب رقمًا مصريًا مثل 01xxxxxxxxx','error');return;}
  const scheduleDays=[...document.querySelectorAll('.m-day:checked')].map(x=>Number(x.value)).sort((a,b)=>a-b);
  const scheduleTime=document.getElementById('m-time').value||'';
  const sessionDuration=Math.min(180,Math.max(15,parseInt(document.getElementById('m-duration').value)||30));
  if(scheduleDays.length&&!scheduleTime){toast('حدد موعد الحصة أو ألغِ اختيار أيام الجدول','error');return;}
  const now=new Date().toISOString();
  const d={name,parent:document.getElementById('m-par').value.trim(),phone:normalizedPhone,
    startDate:document.getElementById('m-date').value,level:document.getElementById('m-level').value,
    group:document.getElementById('m-group')?.value.trim().slice(0,120)||'',
    scheduleDays,scheduleTime,sessionDuration,
    notes:document.getElementById('m-notes').value.trim(),updatedAt:now};
  const conflicts=getScheduleConflicts(d,editId);
  if(conflicts.length){
    const lines=conflicts.map(c=>`${c.student.name}: ${c.days.map(day=>DAY_NAMES[day]).join('، ')}`).join('\n');
    if(!confirm(`يوجد تعارض محتمل في الجدول مع:
${lines}

هل تريد الحفظ رغم ذلك؟`))return;
  }
  if(editId){
    const i=students.findIndex(st=>st.id===editId);
    if(i<0)return;
    students[i]={...students[i],...d};
    toast(conflicts.length?'تم التحديث مع وجود تعارض في الجدول':'تم تحديث البيانات','success');
  }else{
    d.id=makeId('st');d.createdAt=now;students.push(d);
    toast(conflicts.length?'تمت الإضافة مع وجود تعارض في الجدول':'تم إضافة الطالب','success');vibrate([50,25,100]);
  }
  save();closeMo();renderSt();renderHome();
}
function normPhone(p){
  p=p.replace(/\D/g,'');
  if(p.startsWith('0')) p='2'+p;
  if(!p.startsWith('20')) p='20'+p;
  return p;
}

// ══════════════════════════════════════
// PROFILE
// ══════════════════════════════════════
function openProf(id){
  curStId=id;
  const s=students.find(x=>x.id===id);
  const init=s.name.trim().split(' ').slice(0,2).map(x=>x[0]).join('');
  const cls=s.level==='متقدم'?'lv1':s.level==='متوسط'?'lv2':'lv3';
  const stSes=sessions.filter(x=>x.studentId===id);
  const present=stSes.filter(x=>x.status==='حضر').length;
  const absent=stSes.filter(x=>x.status==='غاب').length;
  const streak=calcStreakSt(id);
  const qualityPct=getMemorizationQualityPercent(id),quranPct=getQuranProgressPercent(id);
  document.getElementById('profHdr').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
      <div class="av" style="width:58px;height:58px;font-size:22px;background:${avBg(s.id)};color:${avTx(s.id)}">${esc(init)}</div>
      <div><div style="font-size:19px;font-weight:800">${esc(s.name)}</div><span class="lv ${cls}">${esc(s.level)}</span>
        ${streak>=3?`<span class="lv lv1" style="margin-right:4px">🔥 ${streak} أيام</span>`:''}
      </div>
    </div>
    <div class="ir"><span class="ir-k">👨‍👦 ولي الأمر</span><span>${esc(s.parent||'—')}</span></div>
    <div class="ir"><span class="ir-k">👥 المجموعة</span><span>${esc(s.group||'—')}</span></div>
    <div class="ir"><span class="ir-k">📱 واتساب</span><span dir="ltr">${esc(s.phone)}</span></div>
    <div class="ir"><span class="ir-k">📅 بداية الحفظ</span><span>${esc(s.startDate||'—')}</span></div>
    <div class="ir"><span class="ir-k">🗓️ الموعد الأسبوعي</span><span>${esc(scheduleText(s))}</span></div>
    <div class="ir"><span class="ir-k">✅ حضور</span><span>${present} حصة</span></div>
    <div class="ir"><span class="ir-k">❌ غياب</span><span>${absent} مرة</span></div>
    <div class="ir"><span class="ir-k">📊 مستوى الحفظ</span><span>${qualityPct==null?'—':qualityPct+'%'}</span></div>
    <div class="ir"><span class="ir-k">📈 الإنجاز الموثق</span><span>${quranPct}% من القرآن</span></div>
    <div class="ir"><span class="ir-k">📝 ملاحظات</span><span>${esc(s.notes||'—')}</span></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-g btn-sm" onclick="startFor('${esc(id)}')">📖 ابدأ حصة</button>
      <button class="btn btn-wa btn-sm" onclick="directWA('${esc(id)}')">📲 واتساب</button>
    </div>`;

  document.getElementById('profTrack').innerHTML='<div class="ch">📈 الحفظ التراكمي</div>'+buildTrackHTML(id);
  renderWeakness(id);
  renderProfileChart(id);

  const hist=[...stSes].sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById('profHist').innerHTML=`<div class="ch">📋 سجل الحصص (${stSes.length})</div>`+(
    !hist.length?'<div class="empty"><p>لا توجد حصص</p></div>':
    hist.map(ses=>{
      const d=new Date(ses.date).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});
      const icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';
      return `<div class="hi"><div class="fb"><span style="font-weight:700">${d} ${icon}</span></div><div class="hi-content">${buildSumHTML(ses)}</div></div>`;
    }).join('')
  );
  goPage('profile');
}
function calcStreakSt(id){
  return calcStreakFromDays(sessions.filter(s=>s.studentId===id&&s.status==='حضر').map(sessionDay));
}
function startFor(id){ curStId=id; goPage('session'); document.getElementById('sesSt').value=id; onSesSt(); }
function editSt(){
  const s=students.find(x=>x.id===curStId); editId=curStId;
  document.getElementById('moTitle').textContent='تعديل بيانات الطالب';
  document.getElementById('m-name').value=s.name;
  document.getElementById('m-par').value=s.parent;
  document.getElementById('m-phone').value=s.phone;
  document.getElementById('m-date').value=s.startDate||'';
  document.getElementById('m-level').value=s.level;
  document.getElementById('m-group').value=s.group||'';
  document.querySelectorAll('.m-day').forEach(x=>x.checked=(s.scheduleDays||[]).includes(Number(x.value)));
  document.getElementById('m-time').value=s.scheduleTime||'';
  document.getElementById('m-duration').value=String(s.sessionDuration||30);
  document.getElementById('m-notes').value=s.notes||'';
  document.getElementById('stModal').classList.add('open');
}
function deleteSt(){
  if(!confirm('هل تريد حذف هذا الطالب وجميع بياناته؟')) return;
  students=students.filter(s=>s.id!==curStId);
  sessions=sessions.filter(s=>s.studentId!==curStId);
  tasks=tasks.filter(t=>t.studentId!==curStId);
  save(); toast('تم الحذف','success'); goPage('students');
}

// ══════════════════════════════════════
// SESSION
// ══════════════════════════════════════
function initSession(){
  fillSurahSelects();fillJuzSelect();
  const sel=document.getElementById('sesSt');
  const keep=curStId||sel.value||'';
  sel.innerHTML='<option value="">— اختر الطالب —</option>';
  students.forEach(st=>{sel.innerHTML+=`<option value="${esc(st.id)}">${esc(st.name)}</option>`;});
  if(document.getElementById('sesDate')) document.getElementById('sesDate').value=localDateKey();
  if(keep&&students.some(st=>st.id===keep)){sel.value=keep;curStId=keep;}
  resetSession();
  if(curStId) onSesSt();
}
function resetSession(){
  draftSuspend=true;
  editingSessionId=null;
  grades={new:'',rec:'',far:'',juz:''};prevGrades={new:'',rec:'',far:'',juz:''};
  secOn={new:true,rec:false,far:false,juz:false};juzChips=[];sesStatus='حضر';
  const notes=document.getElementById('sesNotes');if(notes)notes.value='';
  document.querySelectorAll('.gb').forEach(b=>b.classList.remove('sel'));
  ['new','rec','far'].forEach(k=>{
    const se=document.getElementById(k+'-s');if(se)se.value='';
    const f=document.getElementById(k+'-f');if(f){f.value=1;f.max=999;}
    const t=document.getElementById(k+'-t');if(t){t.value=1;t.max=999;}
    const fc=document.getElementById(k+'-full');if(fc)fc.checked=false;
    const rng=document.getElementById(k+'-range');if(rng)rng.style.display='none';
  });
  const chips=document.getElementById('juz-chips');if(chips)chips.innerHTML='';
  updateTogs();setStatusUI('حضر');
  document.getElementById('absentNotice').style.display='none';
  document.getElementById('sesContent').style.display='block';
  document.getElementById('repeatBar').style.display='none';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 حفظ الحصة';
  setDraftState('جاهز','');
  draftSuspend=false;
}
function onSesDateChange(){
  onSesSt();
}
function getPreviousPresentSession(studentId,beforeDateKey,excludeId=''){
  return sessions.filter(x=>x.studentId===studentId&&x.status==='حضر'&&x.id!==excludeId&&sessionDay(x)<beforeDateKey)
    .sort((a,b)=>new Date(a.date)-new Date(b.date)).pop()||null;
}
function onSesSt(){
  curStId=document.getElementById('sesSt').value;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  resetSession();
  if(!curStId){
    document.getElementById('prevContent').innerHTML='<div class="txt-mut" style="text-align:center;padding:10px">اختر الطالب لعرض تكليف الحصة السابقة</div>';
    return;
  }
  const existing=findDailySession(curStId,dateKey);
  editingSessionId=existing?.id||null;
  loadPrevTask(existing?.id||'');
  const prev=getPreviousPresentSession(curStId,dateKey,existing?.id||'');
  const rb=document.getElementById('repeatBar');
  if(prev&&(prev.new||prev.rec||prev.far||prev.juz||prev.surahReview)){
    const d=new Date(prev.date).toLocaleDateString('ar-EG',{month:'short',day:'numeric'});
    document.getElementById('repeatHint').textContent=`آخر حصة: ${d} — اضغط لملء الحقول`;
    rb.style.display='flex';
  }else rb.style.display='none';

  draftSuspend=true;
  if(existing) applySessionToEditor(existing);
  const restored=restoreDraft(existing);
  draftSuspend=false;
  if(restored) setDraftState('تم استعادة مسودة أحدث','editing');
  else if(existing) setDraftState('تعديل حصة مسجلة','editing');
  else setDraftState('جاهز — الحفظ تلقائي','saved');
}
function applySessionToEditor(ses){
  if(!ses)return;
  sesStatus=ses.status||'حضر';setStatusUI(sesStatus);
  const isAbsent=sesStatus!=='حضر';
  document.getElementById('absentNotice').style.display=isAbsent?'block':'none';
  document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 تحديث الحصة';
  prevGrades={new:'',rec:'',far:'',juz:'',...(ses.prevGrades||{})};
  Object.entries(prevGrades).forEach(([k,g])=>{if(g)setPrevGr(k,g);});
  grades={new:'',rec:'',far:'',juz:''};
  secOn={new:false,rec:false,far:false,juz:false};
  ['new','rec','far'].forEach(k=>{
    const x=ses[k];if(!x)return;
    const idx=S.findIndex(q=>q.n===x.surah);if(idx<0)return;
    secOn[k]=true;updateTogs();
    document.getElementById(k+'-s').value=idx;fillAyah(k);
    const full=!!x.full||(parseInt(x.from)===1&&parseInt(x.to)===S[idx].a);
    document.getElementById(k+'-full').checked=full;toggleFull(k);
    if(!full){document.getElementById(k+'-f').value=x.from;document.getElementById(k+'-t').value=x.to;}
    if(x.grade)setGr(k,x.grade);
  });
  if(ses.juz){
    secOn.juz=true;juzChips=[...(ses.juz.chips||[])];updateTogs();renderChips();
    if(ses.juz.grade)setGr('juz',ses.juz.grade);
  }
  if(!ses.new&&!ses.rec&&!ses.far&&!ses.juz){secOn.new=true;updateTogs();}
  document.getElementById('sesNotes').value=ses.notes||'';
}
function setStatus(s){
  sesStatus=s;setStatusUI(s);
  const isAbsent=s!=='حضر';
  document.getElementById('absentNotice').style.display=isAbsent?'block':'none';
  document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  const n=document.querySelector('#absentNotice .absent-notice');
  if(n)n.textContent=s==='غاب'?'⚠️ الطالب غائب — سيبقى التكليف السابق للحصة القادمة':'🌙 الطالب في إجازة — سيبقى التكليف السابق للحصة القادمة';
  scheduleDraftSave();
}
function setStatusUI(s){
  document.getElementById('sb-h').className='st-btn'+(s==='حضر'?' sel-h':'');
  document.getElementById('sb-a').className='st-btn'+(s==='غاب'?' sel-a':'');
  document.getElementById('sb-v').className='st-btn'+(s==='إجازة'?' sel-v':'');
}
function loadPrevTask(excludeId=''){
  if(!curStId)return;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const prev=getPreviousPresentSession(curStId,dateKey,excludeId);
  const el=document.getElementById('prevContent');
  if(!prev){el.innerHTML='<div class="txt-mut" style="padding:8px;text-align:center">لا توجد حصة سابقة</div>';return;}
  const d=new Date(prev.date).toLocaleDateString('ar-EG',{weekday:'long',month:'long',day:'numeric'});
  let html=`<div class="txt-mut mb8">التكليف من حصة: ${d}</div>`;
  const sections=[{key:'new',label:'📖 الحفظ الجديد'},{key:'rec',label:'📚 المراجعة القريبة'},{key:'far',label:'📘 المراجعة البعيدة'},{key:'juz',label:'📜 الأجزاء والسور'}];
  let hasAny=false;
  sections.forEach(({key,label})=>{
    if(!prev[key])return;hasAny=true;
    const x=prev[key];
    const desc=key==='juz'?(x.chips||[]).map(c=>esc(c)).join('، '):x.full?`سورة ${esc(x.surah)} كاملة`:`سورة ${esc(x.surah)} من الآية ${esc(x.from)} إلى الآية ${esc(x.to)}`;
    html+=`<div style="background:var(--gp);border-radius:8px;padding:10px;margin-bottom:8px"><div style="font-weight:700;margin-bottom:6px;font-size:13px">${label}</div><div style="font-size:13px;margin-bottom:8px">${desc}</div><div class="gbs" id="pgr-${key}">${['ممتاز','جيد جداً','جيد','ضعيف'].map(g=>`<div class="gb" data-g="${g}" onclick="setPrevGr('${key}','${g}')">${g==='ممتاز'?'⭐ ':''}${g}</div>`).join('')}</div></div>`;
  });
  if(!hasAny)html+='<div class="txt-mut">لا يوجد تكليف للحصة السابقة</div>';
  el.innerHTML=html;
}
function setPrevGr(key,g){
  prevGrades[key]=g;
  document.querySelectorAll(`#pgr-${key} .gb`).forEach(b=>b.classList.toggle('sel',b.dataset.g===g));
  scheduleDraftSave();
}
function setDraftState(text,cls=''){
  const el=document.getElementById('draftState');if(!el)return;
  el.textContent=text;el.className='draft-state'+(cls?' '+cls:'');
}
function draftKey(){
  const sid=document.getElementById('sesSt')?.value,date=document.getElementById('sesDate')?.value;
  return sid&&date?`qt_draft_v6_${sid}_${date}`:'';
}
function captureDraft(){
  const fields={};
  ['new','rec','far'].forEach(k=>{fields[k]={surah:document.getElementById(k+'-s')?.value||'',from:document.getElementById(k+'-f')?.value||'',to:document.getElementById(k+'-t')?.value||'',full:!!document.getElementById(k+'-full')?.checked};});
  return {savedAt:new Date().toISOString(),editingSessionId,sesStatus,secOn:{...secOn},grades:{...grades},prevGrades:{...prevGrades},juzChips:[...juzChips],notes:document.getElementById('sesNotes')?.value||'',fields};
}
function scheduleDraftSave(){
  if(draftSuspend)return;
  const key=draftKey();if(!key)return;
  setDraftState('حفظ تلقائي…','editing');
  clearTimeout(draftTimer);draftTimer=setTimeout(saveDraftNow,450);
}
function saveDraftNow(){
  const key=draftKey();if(!key)return;
  try{localStorage.setItem(key,JSON.stringify(captureDraft()));setDraftState('تم الحفظ تلقائياً ✓','saved');}catch(e){setDraftState('تعذر حفظ المسودة','');}
}
function applyDraft(d){
  if(!d)return;
  sesStatus=d.sesStatus||'حضر';setStatusUI(sesStatus);
  const isAbsent=sesStatus!=='حضر';document.getElementById('absentNotice').style.display=isAbsent?'block':'none';document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  secOn={new:true,rec:false,far:false,juz:false,...(d.secOn||{})};grades={new:'',rec:'',far:'',juz:'',...(d.grades||{})};prevGrades={new:'',rec:'',far:'',juz:'',...(d.prevGrades||{})};juzChips=[...(d.juzChips||[])];
  updateTogs();
  ['new','rec','far'].forEach(k=>{
    const f=d.fields?.[k]||{};const se=document.getElementById(k+'-s');if(!se)return;
    se.value=f.surah??'';if(se.value!=='')fillAyah(k);
    const fc=document.getElementById(k+'-full');if(fc)fc.checked=!!f.full;toggleFull(k);
    if(document.getElementById(k+'-f'))document.getElementById(k+'-f').value=f.from||1;
    if(document.getElementById(k+'-t'))document.getElementById(k+'-t').value=f.to||1;
    if(grades[k])setGr(k,grades[k]);
  });
  renderChips();if(grades.juz)setGr('juz',grades.juz);
  Object.entries(prevGrades).forEach(([k,g])=>{if(g)setPrevGr(k,g);});
  document.getElementById('sesNotes').value=d.notes||'';
}
function restoreDraft(existing){
  const key=draftKey();if(!key)return false;
  try{
    const raw=localStorage.getItem(key);if(!raw)return false;
    const d=JSON.parse(raw);
    if(existing&&new Date(d.savedAt||0)<=new Date(existing.updatedAt||existing.date||0))return false;
    applyDraft(d);return true;
  }catch(e){return false;}
}
function clearDraft(){const key=draftKey();if(key)localStorage.removeItem(key);}
function setupSessionDraftAutosave(){
  const pg=document.getElementById('pg-session');if(!pg)return;
  pg.addEventListener('input',e=>{if(e.target.closest('#pg-session'))scheduleDraftSave();});
  pg.addEventListener('change',e=>{if(e.target.closest('#pg-session')&&e.target.id!=='sesSt'&&e.target.id!=='sesDate')scheduleDraftSave();});
}
function fillSurahSelects(){
  ['new','rec','far','juz'].forEach(p=>{
    const el=p==='juz'?document.getElementById('juz-s'):document.getElementById(p+'-s');
    if(!el) return;
    el.innerHTML='<option value="">— اختر السورة —</option>';
    S.forEach((s,i)=>{ el.innerHTML+=`<option value="${i}">${i+1}. سورة ${s.n}</option>`; });
  });
}
function fillJuzSelect(){
  const el=document.getElementById('juz-j');
  el.innerHTML='<option value="">— اختر الجزء —</option>';
  JZ.forEach((j,i)=>{ el.innerHTML+=`<option value="${i}">${j}</option>`; });
}
function fillAyah(p){
  const idx=parseInt(document.getElementById(p+'-s').value);
  const rng=document.getElementById(p+'-range');
  const fc=document.getElementById(p+'-full');
  if(isNaN(idx)){
    if(rng)rng.style.display='none';
    if(fc)fc.checked=false;
    return;
  }
  const cnt=S[idx].a;
  const f=document.getElementById(p+'-f');
  const t=document.getElementById(p+'-t');
  if(f){f.value=1;f.max=cnt;}
  if(t){t.value=cnt;t.max=cnt;}
  if(rng&&(!fc||!fc.checked)) rng.style.display='flex';
}
function toggleFull(p){
  const fc=document.getElementById(p+'-full');
  const rng=document.getElementById(p+'-range');
  const idx=parseInt(document.getElementById(p+'-s').value);
  if(!rng)return;
  rng.style.display=(fc&&fc.checked)?'none':(!isNaN(idx)?'flex':'none');
}
function togSec(k){secOn[k]=!secOn[k];updateTogs();scheduleDraftSave();}
function updateTogs(){
  ['new','rec','far','juz'].forEach(k=>{
    const tog=document.getElementById('tog-'+k);
    const bod=document.getElementById('bod-'+k);
    if(secOn[k]){tog.classList.add('on');bod.style.display='block';}
    else{tog.classList.remove('on');bod.style.display='none';}
  });
}
function setGr(k,g){
  grades[k]=g;
  document.querySelectorAll(`#gr-${k} .gb`).forEach(b=>b.classList.toggle('sel',b.dataset.g===g));
  scheduleDraftSave();
}
function addJuz(){
  const v=document.getElementById('juz-j').value;
  if(v===''||juzChips.includes('جزء: '+JZ[v])) return;
  juzChips.push('جزء: '+JZ[v]);document.getElementById('juz-j').value='';renderChips();scheduleDraftSave();
}
function addJuzSurah(){
  const v=document.getElementById('juz-s').value;
  if(v===''||juzChips.includes('سورة '+S[v].n)) return;
  juzChips.push('سورة '+S[v].n);document.getElementById('juz-s').value='';renderChips();scheduleDraftSave();
}
function renderChips(){ document.getElementById('juz-chips').innerHTML=juzChips.map((c,i)=>`<span class="chip">${esc(c)}<span class="chip-x" onclick="rmChip(${i})">✕</span></span>`).join(''); }
function rmChip(i){juzChips.splice(i,1);renderChips();scheduleDraftSave();}

function readSection(k){
  if(!secOn[k])return null;
  const sel=document.getElementById(k+'-s');
  if(!sel||sel.value==='')return null;
  const idx=parseInt(sel.value);if(Number.isNaN(idx)||!S[idx])return null;
  const full=!!document.getElementById(k+'-full')?.checked;
  let from=full?1:parseInt(document.getElementById(k+'-f')?.value)||1;
  let to=full?S[idx].a:parseInt(document.getElementById(k+'-t')?.value)||S[idx].a;
  from=Math.max(1,Math.min(S[idx].a,from));to=Math.max(1,Math.min(S[idx].a,to));
  if(to<from)[from,to]=[to,from];
  return {surahId:idx+1,surah:S[idx].n,from,to,grade:grades[k]||'',full};
}
function buildSesData(){
  const d={};
  const n=readSection('new'),r=readSection('rec'),f=readSection('far');
  if(n)d.new=n;if(r)d.rec=r;if(f)d.far=f;
  if(secOn.juz&&juzChips.length)d.juz={chips:[...juzChips],grade:grades.juz||''};
  d.notes=document.getElementById('sesNotes').value.trim();
  d.prevGrades={...prevGrades};
  return d;
}
function buildSumText(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'❌ غائب':ses.status==='إجازة'?'🌙 إجازة':ses.status||'غير حاضر';
  const parts=[];const fmt=sec=>sec.full?`${sec.surah} كاملة`:`${sec.surah}(${sec.from}-${sec.to})`;
  if(ses.new)parts.push(`حفظ: ${fmt(ses.new)}`);
  if(ses.rec)parts.push(`مراجعة قريبة: ${fmt(ses.rec)}`);
  if(ses.far)parts.push(`مراجعة بعيدة: ${fmt(ses.far)}`);
  if(ses.juz)parts.push((ses.juz.chips||[]).join('، '));
  return parts.join(' · ')||'حصة مسجلة';
}
function buildSumHTML(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'<span style="color:var(--red)">❌ غائب</span>':'<span style="color:var(--gold)">🌙 إجازة</span>';
  const parts=[];const fmt=sec=>sec.full?`سورة ${esc(sec.surah)} كاملة`:`سورة ${esc(sec.surah)} (${esc(sec.from)}–${esc(sec.to)})`;
  const pg=ses.prevGrades||{};
  if(Object.values(pg).some(Boolean)){
    const x=[];if(pg.new)x.push(`الحفظ: ${esc(pg.new)}`);if(pg.rec)x.push(`المراجعة القريبة: ${esc(pg.rec)}`);if(pg.far)x.push(`المراجعة البعيدة: ${esc(pg.far)}`);if(pg.juz)x.push(`الأجزاء: ${esc(pg.juz)}`);
    parts.push(`⭐ تقييم التسميع: ${x.join(' · ')}`);
  }
  if(ses.new)parts.push(`📖 ${fmt(ses.new)}`);
  if(ses.rec)parts.push(`📚 ${fmt(ses.rec)}`);
  if(ses.far)parts.push(`📘 ${fmt(ses.far)}`);
  if(ses.juz)parts.push(`📜 ${(ses.juz.chips||[]).map(c=>esc(c)).join('، ')}`);
  if(ses.notes)parts.push(`💬 <em>${esc(ses.notes)}</em>`);
  return parts.join('<br>')||'حصة مسجلة';
}
function saveSession(opts={}){
  const sid=document.getElementById('sesSt').value;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  if(!sid){toast('اختر الطالب أولاً','error');return null;}
  if(!dateKey){toast('اختر تاريخ الحصة','error');return null;}
  const data=sesStatus==='حضر'?buildSesData():{};
  const now=new Date().toISOString();
  const existing=(editingSessionId&&sessions.find(x=>x.id===editingSessionId))||findDailySession(sid,dateKey);
  const core={
    id:existing?.id||makeId('ses'),studentId:sid,sessionDate:dateKey,
    date:existing?.date||makeSessionISO(dateKey),status:sesStatus,
    createdAt:existing?.createdAt||now,updatedAt:now,source:'session',completed:true,
    ...data
  };
  core.summary=buildSumText(core);
  if(existing){
    const idx=sessions.findIndex(x=>x.id===existing.id);sessions[idx]=core;
  }else sessions.push(core);
  editingSessionId=core.id;save();clearDraft();
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 تحديث الحصة';
  setDraftState('تم حفظ الحصة ✓','saved');
  if(!opts.silent){vibrate([50,25,100]);toast(existing?'تم تحديث الحصة بنجاح ✓':'تم حفظ الحصة بنجاح ✓','success');}
  if(sesStatus==='حضر'&&data.juz&&grades.juz==='ممتاز'&&!opts.noCelebrate)setTimeout(celebrate,350);
  renderHome();
  return core;
}
function openWhatsApp(student,msg){
  if(!student?.phone){toast('لا يوجد رقم واتساب مسجل','error');return false;}
  const w=window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  if(!w)toast('تعذر فتح واتساب — اسمح بالنوافذ المنبثقة لهذا الموقع','error');
  return !!w;
}
function sendWA(){
  const sid=document.getElementById('sesSt').value;if(!sid){toast('اختر الطالب أولاً','error');return;}
  const st=students.find(x=>x.id===sid);const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const data=sesStatus==='حضر'?buildSesData():{};
  const ses={studentId:sid,sessionDate:dateKey,date:makeSessionISO(dateKey),status:sesStatus,...data};
  openWhatsApp(st,buildWAMsg(st,ses));
}
function saveAndSendWA(){
  const ses=saveSession({silent:true,noCelebrate:true});if(!ses)return;
  const st=students.find(x=>x.id===ses.studentId);if(!st)return;
  openWhatsApp(st,buildWAMsg(st,ses));
  toast('تم حفظ الحصة وفتح رسالة ولي الأمر','success');
}

// ══════════════════════════════════════
// FILL FROM LAST SESSION
// ══════════════════════════════════════
function fillFromLast(){
  if(!curStId) return;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const prev=getPreviousPresentSession(curStId,dateKey,editingSessionId||'');
  if(!prev){ toast('لا توجد حصة سابقة','error'); return; }

  // Make sure sections are populated with surah options
  fillSurahSelects();

  if(prev.new){
    const idx=S.findIndex(s=>s.n===prev.new.surah);
    if(idx>=0){
      secOn.new=true; updateTogs();
      document.getElementById('new-s').value=idx;
      fillAyah('new');
      if(prev.new.full){
        document.getElementById('new-full').checked=true;
        toggleFull('new');
      } else {
        document.getElementById('new-f').value=prev.new.from;
        document.getElementById('new-t').value=prev.new.to;
      }
    }
  }
  if(prev.rec){
    const idx=S.findIndex(s=>s.n===prev.rec.surah);
    if(idx>=0){
      secOn.rec=true; updateTogs();
      document.getElementById('rec-s').value=idx;
      fillAyah('rec');
      if(prev.rec.full){
        document.getElementById('rec-full').checked=true;
        toggleFull('rec');
      } else {
        document.getElementById('rec-f').value=prev.rec.from;
        document.getElementById('rec-t').value=prev.rec.to;
      }
    }
  }
  if(prev.far){
    const idx=S.findIndex(s=>s.n===prev.far.surah);
    if(idx>=0){
      secOn.far=true; updateTogs();
      document.getElementById('far-s').value=idx;
      fillAyah('far');
      if(prev.far.full){
        document.getElementById('far-full').checked=true;
        toggleFull('far');
      } else {
        document.getElementById('far-f').value=prev.far.from;
        document.getElementById('far-t').value=prev.far.to;
      }
    }
  }
  if(prev.juz&&prev.juz.chips){
    secOn.juz=true; updateTogs();
    juzChips=[...prev.juz.chips];
    renderChips();
  }
  scheduleDraftSave();
  toast('تم تحميل التكليف السابق ✓','success');
  vibrate([30,20,60]);
}

// ══════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════
let activeVoiceSec=null;
function startVoice(sec){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('المتصفح لا يدعم الإدخال الصوتي — جرب Chrome','error'); return; }
  if(activeVoiceSec){
    toast('هناك إدخال صوتي جارٍ بالفعل','error'); return;
  }
  const rec=new SR();
  rec.lang='ar-SA';rec.continuous=false;rec.interimResults=false;
  const btn=document.getElementById('vb-'+sec);
  if(btn) btn.classList.add('listening');
  activeVoiceSec=sec;
  toast('🎙️ يستمع... تكلم الآن','info');
  rec.onresult=e=>{
    const txt=e.results[0][0].transcript;
    parseVoiceInput(sec,txt);
    toast('تم التعرف: '+txt,'success');
  };
  rec.onerror=()=>{ toast('لم يتعرف على الصوت، حاول مرة أخرى','error'); };
  rec.onend=()=>{
    if(btn) btn.classList.remove('listening');
    activeVoiceSec=null;
  };
  rec.start();
}
function parseVoiceInput(sec,txt){
  // Match surah name
  const idx=S.findIndex(s=>txt.includes(s.n));
  if(idx>=0){
    document.getElementById(sec+'-s').value=idx;
    fillAyah(sec);
  }
  // Match full surah
  if(txt.includes('كامل')||txt.includes('كاملة')){
    const fc=document.getElementById(sec+'-full');
    if(fc){fc.checked=true; toggleFull(sec);}
  }
  // Match grade
  if(txt.includes('ممتاز')) setGr(sec,'ممتاز');
  else if(txt.includes('جيد جداً')||txt.includes('جيد جدا')) setGr(sec,'جيد جداً');
  else if(txt.includes('جيد')) setGr(sec,'جيد');
  else if(txt.includes('ضعيف')) setGr(sec,'ضعيف');
}

// ══════════════════════════════════════
// CHECK-IN
// ══════════════════════════════════════
function renderCheckin(){
  const today=localDateKey(),dow=weekdayFromDateKey(today),expected=expectedStudentsForDate(today);
  const d=new Date().toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('ciDate').textContent=d;
  const todaySes={};
  students.forEach(st=>{const ses=findDailySession(st.id,today);if(ses)todaySes[st.id]=ses.status;});
  const required=hasConfiguredSchedules()?expected:students;
  const allDone=required.length>0&&required.every(st=>todaySes[st.id]);
  document.getElementById('ciDoneBar').style.display=allDone?'block':'none';
  const el=document.getElementById('ciList');
  if(!students.length){el.innerHTML='<div class="empty"><div class="ei">👥</div><p>لا يوجد طلاب مسجلون</p></div>';return;}
  const list=[...students].sort((a,b)=>{
    const ae=(a.scheduleDays||[]).includes(dow)?0:1,be=(b.scheduleDays||[]).includes(dow)?0:1;
    return ae-be||(a.scheduleTime||'99:99').localeCompare(b.scheduleTime||'99:99','en')||a.name.localeCompare(b.name,'ar');
  });
  el.innerHTML=list.map(st=>{
    const status=todaySes[st.id]||'',isExpected=!hasConfiguredSchedules()||(st.scheduleDays||[]).includes(dow);
    const sched=isExpected&&st.scheduleTime?` · ${esc(st.scheduleTime)}`:isExpected?'':' · غير مجدول اليوم';
    return `<div class="ci-item" id="ci-${esc(st.id)}" style="${isExpected?'':'opacity:.68'}"><div><div class="ci-name">${esc(st.name)}</div><div class="ci-meta">${status?'● '+esc(status):'لم يسجل بعد'}${sched}</div></div><div class="ci-btns">
      <button class="ci-btn ${status==='حضر'?'h':''}" onclick="ciRecord('${esc(st.id)}','حضر')">✅ حضر</button>
      <button class="ci-btn ${status==='غاب'?'a':''}" onclick="ciRecord('${esc(st.id)}','غاب')">❌ غاب</button>
      <button class="ci-btn ${status==='إجازة'?'v':''}" onclick="ciRecord('${esc(st.id)}','إجازة')">🌙 إجازة</button>
    </div></div>`;
  }).join('');
}
function ciRecord(sid,status){
  const today=localDateKey();const now=new Date().toISOString();
  const existing=findDailySession(sid,today);
  if(existing){
    existing.status=status;existing.updatedAt=now;
    if(!hasSessionContent(existing))existing.source='checkin';
    existing.summary=buildSumText(existing);
  }else{
    sessions.push({id:makeId('ses'),studentId:sid,sessionDate:today,date:now,status,summary:status,source:'checkin',completed:false,createdAt:now,updatedAt:now,prevGrades:{new:'',rec:'',far:'',juz:''}});
  }
  save();renderCheckin();renderHome();vibrate([30]);
  const st=students.find(x=>x.id===sid);toast(`${st?st.name:'الطالب'}: ${status}`,'success');
}

// ══════════════════════════════════════
// BULK SEND
// ══════════════════════════════════════
function openBulkSend(){
  const today=localDateKey();
  const el=document.getElementById('bulkList');

  // الحاضرون اللي عندهم تكليف مسجل (مش بس حضور)
  const withContent=sessions.filter(s=>{
    if(sessionDay(s)!==today||s.status!=='حضر') return false;
    return s.new||s.rec||s.far||s.juz||s.surahReview;
  });

  // الحاضرون بدون تكليف (سُجّل حضورهم فقط)
  const attendedOnly=sessions.filter(s=>{
    if(sessionDay(s)!==today||s.status!=='حضر') return false;
    return !s.new&&!s.rec&&!s.far&&!s.juz&&!s.surahReview;
  });

  if(!withContent.length&&!attendedOnly.length){
    el.innerHTML='<div class="empty"><p>لا يوجد طلاب حاضرون اليوم<br><small>سجّل الحضور أولاً من صفحة الحضور</small></p></div>';
    document.getElementById('bulkModal').classList.add('open');
    return;
  }

  let html='';

  if(withContent.length){
    html+=`<div style="font-size:12px;font-weight:700;color:var(--gm);margin-bottom:8px;padding:0 2px">✅ جاهز للإرسال (${withContent.length})</div>`;
    html+=withContent.map(ses=>{
      const st=students.find(x=>x.id===ses.studentId);
      if(!st) return '';
      const preview=buildSumText(ses).substring(0,55);
      return `<div class="bulk-item">
        <div class="bulk-info">
          <div class="bulk-name">${esc(st.name)}</div>
          <div class="bulk-prev">${esc(preview)}</div>
        </div>
        <button class="bulk-send-btn" onclick="sendBulkOne('${esc(ses.studentId)}')">📲</button>
      </div>`;
    }).join('');
  }

  if(attendedOnly.length){
    html+=`<div style="font-size:12px;font-weight:700;color:var(--mut);margin:12px 0 8px;padding:0 2px">⚠️ حضور بدون تكليف (${attendedOnly.length}) — افتح الحصة وأضف التكليف</div>`;
    html+=attendedOnly.map(ses=>{
      const st=students.find(x=>x.id===ses.studentId);
      if(!st) return '';
      return `<div class="bulk-item" style="opacity:.6">
        <div class="bulk-info">
          <div class="bulk-name">${esc(st.name)}</div>
          <div class="bulk-prev">لم يُسجَّل تكليف بعد</div>
        </div>
        <button class="bulk-send-btn" style="background:var(--mut)" onclick="startFor('${esc(ses.studentId)}');document.getElementById('bulkModal').classList.remove('open')">📖</button>
      </div>`;
    }).join('');
  }

  el.innerHTML=html;
  document.getElementById('bulkModal').classList.add('open');
}
function sendBulkOne(sid){
  const st=students.find(x=>x.id===sid);
  if(!st) return;
  const today=localDateKey();
  const ses=findDailySession(sid,today);
  const msg=buildWAMsg(st,ses);
  openWhatsApp(st,msg);
}
function sendAllWA(){
  const today=localDateKey();
  const present=sessions.filter(s=>sessionDay(s)===today&&s.status==='حضر');
  if(!present.length){ toast('لا يوجد حاضرون اليوم','error'); return; }
  openBulkSend();
}

// ══════════════════════════════════════
// ANALYTICS HELPERS
// ══════════════════════════════════════
function getAssessmentGrades(ses){
  const pg=ses?.prevGrades||{};
  const assessed=[pg.new,pg.rec,pg.far,pg.juz].filter(Boolean);
  if(assessed.length)return assessed;
  // Legacy fallback for sessions saved before v6.
  return [ses?.new?.grade,ses?.rec?.grade,ses?.far?.grade,ses?.juz?.grade].filter(Boolean);
}
function getAssessmentAverage(ses){
  const vals=getAssessmentGrades(ses).map(g=>GRADE_MAP[g]||0).filter(Boolean);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}
function gradeLabel(v){return v>=3.5?'ممتاز':v>=2.5?'جيد جداً':v>=1.5?'جيد':v>0?'ضعيف':'—';}
function countUniqueAyatFromSections(sections){
  const bySurah=new Map();
  sections.filter(sec=>sec?.surah).forEach(raw=>{
    const sec=clampSection(raw);if(!sec)return;
    if(!bySurah.has(sec.surah))bySurah.set(sec.surah,[]);
    bySurah.get(sec.surah).push([sec.from,sec.to]);
  });
  let total=0;
  bySurah.forEach(intervals=>{
    intervals.sort((a,b)=>a[0]-b[0]);
    let [start,end]=intervals[0]||[0,-1];
    for(let i=1;i<intervals.length;i++){
      const [a,b]=intervals[i];
      if(a<=end+1)end=Math.max(end,b);
      else{total+=Math.max(0,end-start+1);start=a;end=b;}
    }
    if(end>=start)total+=end-start+1;
  });
  return total;
}
function countUniqueAyatFromSessions(list){
  return countUniqueAyatFromSections(list.filter(x=>x.status==='حضر'&&x.new?.surah).map(x=>x.new));
}
function getVerifiedNewSections(studentId){
  const ordered=sessions.filter(x=>x.studentId===studentId&&x.status==='حضر').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const verified=[];
  ordered.forEach((ses,i)=>{
    // Legacy v5: the grade lived on the same section.
    if(ses.new?.surah&&ses.new?.grade)verified.push(ses.new);
    // v6: prevGrades.new evaluates the new assignment from the previous attended session.
    if(ses.prevGrades?.new){
      for(let j=i-1;j>=0;j--){if(ordered[j].new?.surah){verified.push(ordered[j].new);break;}}
    }
  });
  return verified;
}

// ══════════════════════════════════════
// COMPARISON
// ══════════════════════════════════════
function renderComparison(){
  const tbl=document.getElementById('compTbl');
  if(!tbl||!students.length){if(tbl)tbl.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mut)">لا يوجد طلاب</td></tr>';return;}
  const data=students.map(st=>{
    const stSes=sessions.filter(x=>x.studentId===st.id);
    const present=stSes.filter(x=>x.status==='حضر');
    const absent=stSes.filter(x=>x.status==='غاب');
    const eligible=present.length+absent.length;
    const attPct=eligible?Math.round(present.length/eligible*100):0;
    const totalAyat=calcTotalAyat(st.id);
    const gradeVals=present.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean);
    const avgG=gradeVals.length?gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length:0;
    return {s:st,present:present.length,attPct,totalAyat,avgG,avgLabel:gradeLabel(avgG)};
  }).sort((a,b)=>b.totalAyat-a.totalAyat||b.avgG-a.avgG);
  const maxAyat=Math.max(...data.map(d=>d.totalAyat),1),medals=['🥇','🥈','🥉'];
  tbl.innerHTML=`<thead><tr><th>#</th><th>الطالب</th><th>آيات مُسمّعة</th><th>حضور</th><th>متوسط التقييم</th></tr></thead><tbody>${data.map((d,i)=>`<tr>
    <td><span class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${medals[i]||i+1}</span></td>
    <td style="font-weight:700;cursor:pointer" onclick="openProf('${esc(d.s.id)}')">${esc(d.s.name)}</td>
    <td><div style="font-weight:700;color:var(--gm)">${d.totalAyat}</div><div class="comp-bar"><div class="comp-fill" style="width:${Math.round(d.totalAyat/maxAyat*100)}%"></div></div></td>
    <td>${d.attPct}%<div style="font-size:10px;color:var(--mut)">${d.present} حصة</div></td><td>${esc(d.avgLabel)}</td></tr>`).join('')}</tbody>`;
}

// ══════════════════════════════════════
// WEAKNESS ANALYSIS
// ══════════════════════════════════════
function renderWeakness(id){
  const ordered=sessions.filter(x=>x.studentId===id&&x.status==='حضر').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const weak={};
  ordered.forEach((ses,i)=>{
    const pg=ses.prevGrades||{};const prev=ordered[i-1];
    let used=false;
    ['new','rec','far'].forEach(k=>{
      const g=pg[k];
      if(g&&(g==='جيد'||g==='ضعيف')&&prev?.[k]?.surah){const key=prev[k].surah;weak[key]=(weak[key]||0)+1;used=true;}
    });
    if(!used){
      ['new','rec','far'].forEach(k=>{const g=ses[k]?.grade;if((g==='جيد'||g==='ضعيف')&&ses[k]?.surah){const key=ses[k].surah;weak[key]=(weak[key]||0)+1;}});
    }
  });
  const sorted=Object.entries(weak).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const el=document.getElementById('profWeakContent'),card=document.getElementById('profWeak');
  if(!sorted.length){card.style.display='none';return;}
  card.style.display='block';
  el.innerHTML=sorted.map(([surah,cnt])=>`<div class="weak-item"><span>سورة ${esc(surah)}</span><span class="weak-count">${cnt} مرة</span></div>`).join('');
}

// ══════════════════════════════════════
// PROGRESS CHART IN PROFILE
// ══════════════════════════════════════
function renderProfileChart(id){
  const stSes=sessions.filter(x=>x.studentId===id&&x.status==='حضر').map(s=>({s,val:getAssessmentAverage(s)})).filter(x=>x.val>0).slice(-12);
  const card=document.getElementById('profChart');
  if(!card)return;
  if(stSes.length<2){card.style.display='none';return;}
  card.style.display='block';
  const labels=stSes.map(x=>new Date(x.s.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}));
  const vals=stSes.map(x=>Number(x.val.toFixed(2)));
  drawLineChart(document.getElementById('profChartCanvas'),labels,vals);
}

// ══════════════════════════════════════
// CERTIFICATE
// ══════════════════════════════════════
function openCert(){
  if(!curStId) return;
  const s=students.find(x=>x.id===curStId);
  if(!s) return;
  const total=calcTotalAyat(curStId);
  const pct=Math.min(100,Math.round(total/6236*100));
  const d=new Date().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});
  const stSes=sessions.filter(x=>x.studentId===curStId&&x.status==='حضر');
  const verified=getVerifiedNewSections(curStId),lastVerified=verified.length?verified[verified.length-1]:null;
  const wصل=lastVerified?`سورة ${lastVerified.surah} الآية ${lastVerified.to}`:'—';
  document.getElementById('certContent').innerHTML=`
    <div class="cert-box">
      <div class="cert-seal">📿</div>
      <div class="cert-title">شهادة تقدير</div>
      <div class="cert-sub">${esc(settings.circle)||'حلقة تحفيظ القرآن الكريم'}</div>
      <div class="cert-name">${esc(s.name)}</div>
      <div class="cert-body">
        أتم بحمد الله تسميع وتقييم<br>
        <strong style="font-size:18px;color:var(--gm)">${total} آية كريمة</strong><br>
        ما يعادل ${pct}% من القرآن الكريم بحسب سجل المتابعة<br>
        آخر موضع تم تقييمه: ${esc(wصل)}
      </div>
      <div style="font-size:12px;color:var(--mut);margin-bottom:8px">📅 ${d}</div>
      <div class="cert-teacher">${settings.name?'المحفظ: '+esc(settings.name):''}</div>
    </div>`;
  document.getElementById('certModal').classList.add('open');
}

function printCertificate(){
  document.body.classList.add('cert-print');
  const cleanup=()=>document.body.classList.remove('cert-print');
  window.addEventListener('afterprint',cleanup,{once:true});
  setTimeout(()=>window.print(),50);
}
function printReport(){
  const sid=document.getElementById('repSt')?.value;
  if(!sid){toast('اختر الطالب أولاً لطباعة التقرير','error');return;}
  document.body.classList.add('print-report');
  const cleanup=()=>document.body.classList.remove('print-report');
  window.addEventListener('afterprint',cleanup,{once:true});
  setTimeout(()=>window.print(),80);
}

// ══════════════════════════════════════
// WA TEMPLATE
// ══════════════════════════════════════
function insertVar(v){
  const ta=document.getElementById('waTmpl');
  if(!ta) return;
  const pos=ta.selectionStart;
  ta.value=ta.value.slice(0,pos)+v+ta.value.slice(ta.selectionEnd);
  ta.focus();
  ta.setSelectionRange(pos+v.length,pos+v.length);
  saveSettings();
}
function resetTemplate(){
  document.getElementById('waTmpl').value='';
  saveSettings();
  toast('تم إعادة ضبط القالب الافتراضي','success');
}

function sendAbsenceWA(){
  const sid=document.getElementById('sesSt').value;
  if(!sid){ toast('اختر الطالب أولاً','error'); return; }
  const s=students.find(x=>x.id===sid);
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const d=new Date(dateKey+'T12:00:00').toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const reason=sesStatus==='إجازة'?'🌙 إجازة':'❌ غياب';
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\nمتابعة الطالب: ✨ ${s.name}\n📅 ${d}\n\n${reason}\n\nسيتم تكليف الطالب بمقدار الحصة السابقة إن شاء الله.\n\nجزاكم الله خيراً 🤲`;
  if(settings.name) msg+=`\n\n— ${settings.name}`;
  if(settings.circle) msg+=`\n${settings.circle}`;
  openWhatsApp(s,msg);
}

function directWA(id){
  const s=students.find(x=>x.id===id);
  const hist=sessions.filter(x=>x.studentId===id&&x.status==='حضر').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const lastSes=hist.length?hist[hist.length-1]:null;
  const msg=buildWAMsg(s,lastSes);
  openWhatsApp(s,msg);
}

// ══════════════════════════════════════
// WA MESSAGE BUILDER
// ══════════════════════════════════════
function fmtSection(sec){
  if(!sec)return'';
  return sec.full?`سورة ${sec.surah} كاملة`:`سورة ${sec.surah} (${sec.from}–${sec.to})`;
}

function buildWAMsg(s,ses){
  const d=new Date(ses?ses.date:Date.now()).toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Template mode
  const tmpl=settings.waTemplate||'';
  if(tmpl.trim()){
    let msg=tmpl;
    const newTxt=ses?.new?`📖 الحفظ الجديد: ${fmtSection(ses.new)}${ses.new.grade?' — '+ses.new.grade:''}`:'' ;
    const recTxt=ses?.rec?`📚 المراجعة القريبة: ${fmtSection(ses.rec)}${ses.rec.grade?' — '+ses.rec.grade:''}`:'' ;
    const farTxt=ses?.far?`📘 المراجعة البعيدة: ${fmtSection(ses.far)}${ses.far.grade?' — '+ses.far.grade:''}`:'' ;
    msg=msg.replace(/{{اسم_الطالب}}/g,s.name)
           .replace(/{{التاريخ}}/g,d)
           .replace(/{{الحفظ_الجديد}}/g,newTxt)
           .replace(/{{المراجعة_القريبة}}/g,recTxt)
           .replace(/{{المراجعة_البعيدة}}/g,farTxt)
           .replace(/{{الملاحظات}}/g,ses?.notes||'')
           .replace(/{{اسم_المحفظ}}/g,settings.name||'');
    return msg;
  }

  // Default message
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n✨ متابعة الطالب: *${s.name}*\n📅 ${d}\n\n━━━━━━━━━━━━━━━━━━`;
  const pg=ses?ses.prevGrades:{};
  const hasPrev=pg&&(pg.new||pg.rec||pg.far||pg.juz);
  if(hasPrev){
    msg+=`\n\n📋 *نتيجة التسميع:*\n`;
    if(pg.new) msg+=`📖 الحفظ: ${grIcon(pg.new)} ${pg.new}\n`;
    if(pg.rec) msg+=`📚 المراجعة القريبة: ${grIcon(pg.rec)} ${pg.rec}\n`;
    if(pg.far) msg+=`📘 المراجعة البعيدة: ${grIcon(pg.far)} ${pg.far}\n`;
    if(pg.juz) msg+=`📜 الأجزاء: ${grIcon(pg.juz)} ${pg.juz}\n`;
    msg+=`\n━━━━━━━━━━━━━━━━━━`;
  }
  msg+=`\n\n📝 *تكليف الحصة القادمة:*\n`;
  let hasTak=false;
  if(ses&&ses.new){hasTak=true;msg+=`\n📖 *الحفظ الجديد:*\n${fmtSection(ses.new)}\n${ses.new.grade?grIcon(ses.new.grade)+' '+ses.new.grade+'\n':''}` ;}
  if(ses&&ses.rec){hasTak=true;msg+=`\n📚 *المراجعة القريبة:*\n${fmtSection(ses.rec)}\n${ses.rec.grade?grIcon(ses.rec.grade)+' '+ses.rec.grade+'\n':''}` ;}
  if(ses&&ses.far){hasTak=true;msg+=`\n📘 *المراجعة البعيدة:*\n${fmtSection(ses.far)}\n${ses.far.grade?grIcon(ses.far.grade)+' '+ses.far.grade+'\n':''}` ;}
  if(ses&&ses.juz){hasTak=true;msg+=`\n📜 *مراجعة أجزاء/سور:*\n${(ses.juz.chips||[]).join('، ')}\n${ses.juz.grade?grIcon(ses.juz.grade)+' '+ses.juz.grade+'\n':''}` ;}
  if(!hasTak) msg+=`لا يوجد تكليف جديد\n`;
  msg+=`\n━━━━━━━━━━━━━━━━━━`;
  if(ses&&ses.notes) msg+=`\n\n💬 *ملاحظات المحفظ:*\n${ses.notes}\n\n━━━━━━━━━━━━━━━━━━`;
  msg+=`\n\nجزاكم الله خيراً 🤲`;
  if(settings.name) msg+=`\n\n— ${settings.name}`;
  if(settings.circle) msg+=`\n${settings.circle}`;
  return msg;
}
function grIcon(g){ return g==='ممتاز'?'⭐⭐⭐':g==='جيد جداً'?'⭐⭐':g==='جيد'?'⭐':'⚠️'; }

// ══════════════════════════════════════
// CUMULATIVE TRACKING
// ══════════════════════════════════════
function calcTotalAyat(id){
  return countUniqueAyatFromSections(getVerifiedNewSections(id));
}
function buildTrackHTML(id){
  const total=calcTotalAyat(id),pct=Math.min(100,Math.round(total/6236*100));
  const stSes=sessions.filter(x=>x.studentId===id&&x.status==='حضر'&&x.new).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const assigned=countUniqueAyatFromSessions(stSes),lastNew=stSes.length?stSes[stSes.length-1]:null;
  const lastSurah=lastNew?`سورة ${esc(lastNew.new.surah)} (الآية ${esc(lastNew.new.to)})`:'—';
  return `
    <div class="ir"><span class="ir-k">✅ آيات تم تسميعها وتقييمها</span><span style="font-weight:700;color:var(--gm)">${total} آية</span></div>
    <div class="ir"><span class="ir-k">📝 آيات كُلِّف بها</span><span>${assigned} آية</span></div>
    <div class="ir"><span class="ir-k">📍 آخر موضع تكليف جديد</span><span>${lastSurah}</span></div>
    <div class="ir"><span class="ir-k">📊 نسبة المُسمَّع من القرآن</span><span>${pct}%</span></div>
    <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>`;
}

// ══════════════════════════════════════
// REPORTS
// ══════════════════════════════════════
function initReports(){
  const sel=document.getElementById('repSt');
  sel.innerHTML='<option value="">— اختر الطالب —</option>';
  students.forEach(s=>{ sel.innerHTML+=`<option value="${esc(s.id)}">${esc(s.name)}</option>`; });
  const mSel=document.getElementById('repMonth');mSel.innerHTML='';
  const now=new Date();
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const val=`${d.getFullYear()}-${d.getMonth()}`;
    const lbl=d.toLocaleDateString('ar-EG',{year:'numeric',month:'long'});
    mSel.innerHTML+=`<option value="${val}">${lbl}</option>`;
  }
  renderReport();
}

function renderReport(){
  const sid=document.getElementById('repSt').value,mv=document.getElementById('repMonth').value;
  const el=document.getElementById('reportContent'),calCard=document.getElementById('calCard'),chartsEl=document.getElementById('reportCharts');
  if(!sid||!mv){el.innerHTML='<div class="empty"><div class="ei">📊</div><p>اختر الطالب والشهر</p></div>';calCard.style.display='none';chartsEl.innerHTML='';return;}
  const[y,m]=mv.split('-').map(Number),student=students.find(x=>x.id===sid);
  const stSes=sessions.filter(x=>{if(x.studentId!==sid)return false;const d=new Date(x.date);return d.getFullYear()===y&&d.getMonth()===m;}).sort((a,b)=>new Date(a.date)-new Date(b.date));
  calCard.style.display='block';renderCalendar(sid,y,m);
  if(!stSes.length){el.innerHTML='<div class="card"><div class="empty"><p>لا توجد حصص في هذا الشهر</p></div></div>';chartsEl.innerHTML='';return;}
  const present=stSes.filter(x=>x.status==='حضر'),absent=stSes.filter(x=>x.status==='غاب'),vacation=stSes.filter(x=>x.status==='إجازة');
  const totalAyat=countUniqueAyatFromSessions(present);
  const allGrades=present.flatMap(getAssessmentGrades),gradeVals=allGrades.map(g=>GRADE_MAP[g]||0).filter(Boolean);
  const avgG=gradeVals.length?gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length:0,avgLabel=gradeLabel(avgG);
  const eligible=present.length+absent.length,attendancePct=eligible?Math.round(present.length/eligible*100):0;
  const monthName=new Date(y,m,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  renderReportCharts(present.length,absent.length,vacation.length,present);
  let html=`<div class="card"><div class="ch">📊 تقرير ${esc(student?.name||'')} — ${monthName}</div><div class="month-stat">
      <div class="ms-item"><div class="ms-num">${present.length}</div><div class="ms-lbl">✅ حضور</div></div>
      <div class="ms-item"><div class="ms-num">${absent.length}</div><div class="ms-lbl">❌ غياب</div></div>
      <div class="ms-item"><div class="ms-num">${vacation.length}</div><div class="ms-lbl">🌙 إجازة</div></div>
      <div class="ms-item"><div class="ms-num">${totalAyat}</div><div class="ms-lbl">📖 آيات تكليف جديد</div></div>
      <div class="ms-item"><div class="ms-num">${attendancePct}%</div><div class="ms-lbl">📅 نسبة الحضور</div></div>
      <div class="ms-item"><div class="ms-num" style="font-size:15px">${avgLabel}</div><div class="ms-lbl">⭐ متوسط التسميع</div></div>
    </div><button class="btn btn-wa mt8" onclick="sendMonthlyReport('${esc(sid)}','${esc(mv)}')">📲 إرسال التقرير الشهري لولي الأمر</button></div>`;
  html+=`<div class="card"><div class="ch">📋 تفصيل الحصص</div>`;
  [...stSes].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(ses=>{const d=new Date(ses.date).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'}),icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';html+=`<div class="hi"><div class="fb"><span style="font-weight:700">${d} ${icon}</span></div><div class="hi-content txt-mut">${buildSumHTML(ses)}</div></div>`;});
  html+='</div>';el.innerHTML=html;
}

// ── Report Charts ──
function renderReportCharts(pres,abs,vac,presentSes){
  const host=document.getElementById('reportCharts');if(!host)return;
  host.innerHTML=`<div class="card"><div class="ch">📊 توزيع الحضور</div><div style="position:relative;height:200px"><canvas id="attChart"></canvas></div></div><div class="card"><div class="ch">📈 مسار تقييم التسميع</div><div class="chart-wrap"><canvas id="grChart"></canvas></div></div>`;
  drawDoughnutChart(document.getElementById('attChart'),[pres,abs,vac],['حضور','غياب','إجازة']);
  const graded=presentSes.map(s=>({s,val:getAssessmentAverage(s)})).filter(x=>x.val>0);
  const lineCanvas=document.getElementById('grChart');
  if(graded.length>1){
    const labels=graded.map(x=>new Date(x.s.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}));
    const vals=graded.map(x=>Number(x.val.toFixed(2)));
    drawLineChart(lineCanvas,labels,vals);
  }else if(lineCanvas){
    const box=prepareCanvas(lineCanvas,170);
    if(box){box.ctx.fillStyle=getChartColors().muted;box.ctx.textAlign='center';box.ctx.fillText('يلزم تقييم حصتين على الأقل لإظهار المسار',box.w/2,box.h/2);}
  }
}

// ── Calendar ──
function renderCalendar(sid,year,month){
  const el=document.getElementById('calGrid');if(!el)return;
  const firstDay=new Date(year,month,1),lastDay=new Date(year,month+1,0),startDow=firstDay.getDay(),dayMap={};
  sessions.filter(s=>s.studentId===sid).forEach(s=>{const parts=sessionDay(s).split('-').map(Number);if(parts[0]===year&&parts[1]-1===month)dayMap[parts[2]]=s.status;});
  const today=new Date(),dayNames=['أح','إث','ثل','أر','خم','جم','سب'];let html='<div class="cal-grid">';dayNames.forEach(d=>{html+=`<div class="cal-head">${d}</div>`;});for(let i=0;i<startDow;i++)html+='<div class="cal-day empty"></div>';
  for(let day=1;day<=lastDay.getDate();day++){const status=dayMap[day],cls=status==='حضر'?'present':status==='غاب'?'absent':status==='إجازة'?'vacation':'',isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;html+=`<div class="cal-day ${cls}${isToday?' today':''}">${day}</div>`;}
  el.innerHTML=html+'</div>';
}

// ── Monthly Report WhatsApp ──
function sendMonthlyReport(sid,mv){
  const[y,m]=mv.split('-').map(Number),st=students.find(x=>x.id===sid);if(!st)return;
  const stSes=sessions.filter(x=>{if(x.studentId!==sid)return false;const d=new Date(x.date);return d.getFullYear()===y&&d.getMonth()===m;}).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const present=stSes.filter(x=>x.status==='حضر'),absent=stSes.filter(x=>x.status==='غاب'),vacation=stSes.filter(x=>x.status==='إجازة');
  const totalAyat=countUniqueAyatFromSessions(present),vals=present.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean),avgG=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,eligible=present.length+absent.length,attendancePct=eligible?Math.round(present.length/eligible*100):0;
  const monthName=new Date(y,m,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n📊 *التقرير الشهري*\n✨ الطالب: ${st.name}\n📅 شهر: ${monthName}\n\n━━━━━━━━━━━━━━━━━━\n✅ أيام الحضور: ${present.length}\n❌ أيام الغياب: ${absent.length}\n🌙 الإجازات: ${vacation.length}\n📅 نسبة الحضور: ${attendancePct}%\n📖 آيات التكليف الجديد الفريدة: ${totalAyat} آية\n⭐ متوسط التسميع: ${gradeLabel(avgG)}\n\n━━━━━━━━━━━━━━━━━━\n\n📋 تفصيل الحصص:\n`;
  stSes.forEach(ses=>{const d=new Date(ses.date).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'}),icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';msg+=`${icon} ${d}: ${buildSumText(ses)}\n`;});
  msg+='\n━━━━━━━━━━━━━━━━━━\nجزاكم الله خيراً 🤲';if(settings.name)msg+=`\n\n— ${settings.name}`;if(settings.circle)msg+=`\n${settings.circle}`;openWhatsApp(st,msg);
}

// ══════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════
function exportCSV(){
  const sid=document.getElementById('repSt').value,mv=document.getElementById('repMonth').value,rows=[['التاريخ','الطالب','الحالة','الحفظ الجديد','تقييم التسميع','المراجعة القريبة','المراجعة البعيدة','ملاحظات']];
  const base=sid?sessions.filter(s=>s.studentId===sid):sessions,filtered=mv?base.filter(s=>{const[y,m]=mv.split('-').map(Number),d=new Date(s.date);return d.getFullYear()===y&&d.getMonth()===m;}):base;
  filtered.forEach(ses=>{const st=students.find(x=>x.id===ses.studentId),d=new Date(ses.date).toLocaleDateString('ar-EG'),assessment=getAssessmentGrades(ses).join(' / ');rows.push([d,st?.name||'',ses.status,ses.new?fmtSection(ses.new):'',assessment,ses.rec?fmtSection(ses.rec):'',ses.far?fmtSection(ses.far):'',ses.notes||'']);});
  const csvCell=c=>{let v=String(c==null?'':c);if(/^[=+\-@]/.test(v))v="'"+v;return `"${v.replace(/"/g,'""')}"`;};
  const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`quran-report-${localDateKey()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تصدير التقرير CSV','success');vibrate([50,25,50]);
}

// ══════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════
function initSettings(){
  document.getElementById('setName').value=settings.name||'';
  document.getElementById('setCircle').value=settings.circle||'';
  const tmpl=document.getElementById('waTmpl');if(tmpl)tmpl.value=settings.waTemplate||'';
  const sel=document.getElementById('trackSt');sel.innerHTML='<option value="">— اختر الطالب —</option>';students.forEach(st=>{sel.innerHTML+=`<option value="${esc(st.id)}">${esc(st.name)}</option>`;});
  renderTrack();applyFontSize();renderPlatformStatus();
  const av=document.getElementById('appVersionText'),sv=document.getElementById('schemaVersionText');if(av)av.textContent=APP_VERSION;if(sv)sv.textContent='v'+SCHEMA_VERSION;
  const nb=document.getElementById('notifBtn');
  if(nb&&'Notification' in window&&Notification.permission==='granted'){nb.textContent='✅ الإشعارات مفعّلة';nb.disabled=true;}
}
function saveSettings(){
  settings.name=document.getElementById('setName').value;settings.circle=document.getElementById('setCircle').value;
  const tmpl=document.getElementById('waTmpl');if(tmpl)settings.waTemplate=tmpl.value;settings.schemaVersion=SCHEMA_VERSION;save();
}
function renderTrack(){
  const id=document.getElementById('trackSt').value,el=document.getElementById('trackContent');if(!id){el.innerHTML='';return;}el.innerHTML=buildTrackHTML(id);
}
function runDataHealthCheck(){
  const issues=[];const studentIds=new Set(students.map(x=>x.id));
  const orphans=sessions.filter(x=>!studentIds.has(x.studentId));if(orphans.length)issues.push(`${orphans.length} حصة بلا طالب مرتبط`);
  const groups=new Map();sessions.forEach(x=>{const k=`${x.studentId}|${sessionDay(x)}`;groups.set(k,(groups.get(k)||0)+1);});
  const dup=[...groups.values()].filter(n=>n>1).length;if(dup)issues.push(`${dup} يوم به أكثر من سجل لنفس الطالب`);
  let badRanges=0;sessions.forEach(x=>['new','rec','far'].forEach(k=>{const v=x[k];if(v&&(Number(v.from)<1||Number(v.to)<Number(v.from)))badRanges++;}));if(badRanges)issues.push(`${badRanges} نطاق آيات غير صالح`);
  const badPhones=students.filter(x=>!/^20\d{10}$/.test(String(x.phone||''))).length;if(badPhones)issues.push(`${badPhones} رقم واتساب يحتاج مراجعة`);
  const scheduleConflicts=allScheduleConflicts();if(scheduleConflicts.length)issues.push(`${scheduleConflicts.length} تعارضاً في مواعيد الطلاب`);
  const orphanTasks=tasks.filter(t=>t.studentId&&!studentIds.has(t.studentId)).length;if(orphanTasks)issues.push(`${orphanTasks} مهمة مرتبطة بطالب غير موجود`);
  const draftCount=Object.keys(localStorage).filter(k=>/^qt_draft_v[678]_/.test(k)).length;if(draftCount)issues.push(`${draftCount} مسودة حصة محفوظة تلقائياً`);
  const el=document.getElementById('dataHealthResult');
  if(!issues.length){el.innerHTML='✅ لا توجد مشكلات بنيوية ظاهرة في البيانات.';toast('فحص البيانات سليم','success');}
  else{el.innerHTML='⚠️ '+issues.map(esc).join('<br>⚠️ ');toast(`تم العثور على ${issues.length} ملاحظة`,'info');}
}

// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════
async function showAppNotification(title,options={}){
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  try{
    if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{icon:'./icon-192.png',badge:'./icon-96.png',...options});return true;}
    new Notification(title,{icon:'./icon-192.png',...options});return true;
  }catch(e){return false;}
}
async function requestNotif(){
  if(!('Notification' in window)){toast('المتصفح لا يدعم الإشعارات','error');return;}
  const perm=await Notification.requestPermission();
  if(perm==='granted'){
    settings.notifEnabled=true;save();await showAppNotification('بالقرآن نحيا 📿',{body:'تم تفعيل تذكير المتابعة',tag:'notif-enabled'});
    const nb=document.getElementById('notifBtn');if(nb){nb.textContent='✅ الإشعارات مفعّلة';nb.disabled=true;}toast('تم تفعيل الإشعارات','success');
  }else toast('تم رفض الإشعارات من المتصفح','error');
}
async function checkAndNotify(){
  if(!settings.notifEnabled||!('Notification' in window)||Notification.permission!=='granted'||!students.length)return;
  const today=localDateKey(),expected=expectedStudentsForDate(today);if(!expected.length)return;
  const done=expected.filter(st=>findDailySession(st.id,today)).length;
  if(done<expected.length)await showAppNotification('تذكير بالقرآن نحيا 📿',{body:`تم تسجيل متابعة ${done} من ${expected.length} طالب مجدول اليوم`,tag:'daily-reminder',renotify:false});
}

// ══════════════════════════════════════
// BACKUP — VERSIONED + VALIDATED
// ══════════════════════════════════════
function backupPayload(){return {meta:{app:'أكاديمية الإمام — بالقرآن نحيا',appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportDate:new Date().toISOString()},students,sessions,tasks,settings};}
function exportData(){
  const data=JSON.stringify(backupPayload(),null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`quran-backup-v${SCHEMA_VERSION}-${localDateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تصدير النسخة الاحتياطية','success');
}
function validateBackup(d){
  if(!d||typeof d!=='object'||!Array.isArray(d.students)||!Array.isArray(d.sessions||[]))throw new Error('بنية الملف غير صحيحة');
  if(d.students.length>10000||(d.sessions||[]).length>200000||(d.tasks||[]).length>50000)throw new Error('حجم الملف غير منطقي');
  d.students.forEach(st=>{if(!st||typeof st!=='object'||typeof st.name!=='string')throw new Error('بيانات طالب غير صالحة');});
  (d.sessions||[]).forEach(se=>{if(!se||typeof se!=='object'||se.studentId==null)throw new Error('بيانات حصة غير صالحة');});
  return true;
}
function cleanText(v,max=1000){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max);}
function safeImportedId(v,prefix,used){
  let id=cleanText(v,128);
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id)||used.has(id))id=makeId(prefix);
  used.add(id);return id;
}
function cleanImportedSection(sec){
  if(!sec||typeof sec!=='object')return null;
  const surah=cleanText(sec.surah,40);if(!S.some(x=>x.n===surah))return null;
  const cleaned=clampSection({surah,from:Number(sec.from)||1,to:Number(sec.to)||Number(sec.from)||1,full:!!sec.full});
  const grade=cleanText(sec.grade,20);if(GRADE_MAP[grade])cleaned.grade=grade;
  return cleaned;
}
function sanitizeBackupData(d){
  const usedStudents=new Set(),usedSessions=new Set(),idMap=new Map();
  const safeStudents=d.students.map(raw=>{
    const oldId=String(raw.id==null?'':raw.id),id=safeImportedId(oldId,'st',usedStudents);idMap.set(oldId,id);
    return {
      id,name:cleanText(raw.name,160),parent:cleanText(raw.parent,160),phone:cleanText(raw.phone,30),
      startDate:/^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate||''))?String(raw.startDate):'',
      level:['مبتدئ','متوسط','متقدم'].includes(raw.level)?raw.level:'مبتدئ',group:cleanText(raw.group,120),
      scheduleDays:Array.isArray(raw.scheduleDays)?[...new Set(raw.scheduleDays.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))]:[],
      scheduleTime:/^\d{2}:\d{2}$/.test(String(raw.scheduleTime||''))?String(raw.scheduleTime):'',
      sessionDuration:Math.min(180,Math.max(15,parseInt(raw.sessionDuration)||30)),notes:cleanText(raw.notes,5000),
      createdAt:cleanText(raw.createdAt,40),updatedAt:cleanText(raw.updatedAt,40)
    };
  });
  const safeSessions=[];
  (d.sessions||[]).forEach(raw=>{
    const mapped=idMap.get(String(raw.studentId));if(!mapped)return; // تجاهل السجلات اليتيمة في النسخة المستوردة
    const status=['حضر','غاب','إجازة'].includes(raw.status)?raw.status:'حضر';
    const pg={};['new','rec','far','juz','surahReview'].forEach(k=>{const g=cleanText(raw.prevGrades?.[k],20);pg[k]=GRADE_MAP[g]?g:'';});
    const ses={
      id:safeImportedId(raw.id,'ses',usedSessions),studentId:mapped,status,
      sessionDate:/^\d{4}-\d{2}-\d{2}$/.test(String(raw.sessionDate||''))?String(raw.sessionDate):'',
      date:cleanText(raw.date,40),createdAt:cleanText(raw.createdAt,40),updatedAt:cleanText(raw.updatedAt,40),
      notes:cleanText(raw.notes,8000),prevGrades:pg,source:cleanText(raw.source,30),completed:!!raw.completed
    };
    ['new','rec','far'].forEach(k=>{const x=cleanImportedSection(raw[k]);if(x)ses[k]=x;});
    const actual={};['new','rec','far'].forEach(k=>{const x=cleanImportedSection(raw.actualRecitation?.[k]);if(x)actual[k]=x;});if(Object.keys(actual).length)ses.actualRecitation=actual;
    if(raw.juz&&typeof raw.juz==='object'){
      const chips=Array.isArray(raw.juz.chips)?raw.juz.chips.map(x=>normalizeJuzChip(cleanText(x,80))).filter(Boolean).slice(0,30):[];
      if(chips.length)ses.juz={chips:[...new Set(chips)]};
    }
    if(raw.surahReview&&typeof raw.surahReview==='object'){
      const chips=Array.isArray(raw.surahReview.chips)?raw.surahReview.chips.map(x=>normalizeSurahReviewChip(cleanText(x,80))).filter(Boolean).slice(0,114):[];
      if(chips.length)ses.surahReview={chips:[...new Set(chips)]};
    }
    const dirs=raw.directions&&typeof raw.directions==='object'?raw.directions:{};
    ses.directions={};['new','rec','far','juz','surahReview'].forEach(k=>{ses.directions[k]=Number(dirs[k])===-1?-1:1;});
    safeSessions.push(ses);
  });
  const usedTasks=new Set();
  const safeTasks=(Array.isArray(d.tasks)?d.tasks:[]).map(raw=>{
    const sid=raw.studentId?idMap.get(String(raw.studentId))||'':'';
    return {
      id:safeImportedId(raw.id,'task',usedTasks),studentId:sid,title:cleanText(raw.title,240),notes:cleanText(raw.notes,4000),
      dueDate:/^\d{4}-\d{2}-\d{2}$/.test(String(raw.dueDate||''))?String(raw.dueDate):'',
      priority:['normal','high'].includes(raw.priority)?raw.priority:'normal',done:!!raw.done,
      createdAt:cleanText(raw.createdAt,40),updatedAt:cleanText(raw.updatedAt,40)
    };
  }).filter(x=>x.title);
  return{students:safeStudents,sessions:safeSessions,tasks:safeTasks};
}
function importData(e){
  const file=e.target.files[0];if(!file)return;const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);validateBackup(d);
      const safe=sanitizeBackupData(d),importedSessions=safe.sessions;
      if(!confirm(`سيتم استبدال البيانات الحالية واستيراد ${safe.students.length} طالب و${importedSessions.length} حصة.\nيفضل تصدير نسخة احتياطية قبل المتابعة.\n\nهل تريد الاستمرار؟`))return;
      const old={students,sessions,tasks,settings};
      try{
        students=safe.students;sessions=importedSessions;tasks=safe.tasks||[];
        const cfg=d.settings&&typeof d.settings==='object'?d.settings:{};
        settings={...settings,name:cleanText(cfg.name,160),circle:cleanText(cfg.circle,200),theme:['light','dark'].includes(cfg.theme)?cfg.theme:'light',fontSize:['md','lg','xl'].includes(cfg.fontSize)?cfg.fontSize:'md',notifEnabled:!!cfg.notifEnabled,waTemplate:cleanText(cfg.waTemplate,8000),schemaVersion:SCHEMA_VERSION};
        migrateData();save();applyTheme();applyFontSize();toast('تم استيراد البيانات وفحصها وترقيتها بنجاح','success');goPage('home');
      }catch(inner){students=old.students;sessions=old.sessions;tasks=old.tasks;settings=old.settings;save();throw inner;}
    }catch(err){toast(`ملف غير صالح: ${err.message||'تعذر القراءة'}`,'error');}
    finally{e.target.value='';}
  };reader.readAsText(file);
}
function clearAll(){
  if(!confirm('⚠️ هذا سيحذف جميع الطلاب والحصص من هذا الجهاز. هل أنت متأكد؟'))return;
  if(!confirm('تأكيد أخير: احذف كل البيانات المحلية؟'))return;
  students=[];sessions=[];tasks=[];Object.keys(localStorage).filter(k=>/^qt_draft_v[678]_/.test(k)).forEach(k=>localStorage.removeItem(k));save();toast('تم مسح جميع البيانات','success');goPage('home');
}

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
let toastTimer=null;
function toast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className='toast show'+(type?' t-'+type:'');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}

// ══════════════════════════════════════
// PWA — INSTALL PROMPT
// ══════════════════════════════════════
let deferredInstall=null;

function setupInstallPrompt(){
  window.addEventListener('appinstalled',()=>{document.getElementById('install-banner').classList.remove('show');deferredInstall=null;toast('تم تثبيت التطبيق بنجاح! 🎉','success');});
}

async function installPWA(){
  if(!deferredInstall){toast('قم بفتح التطبيق في المتصفح للتثبيت','info');return;}
  deferredInstall.prompt();
  const{outcome}=await deferredInstall.userChoice;
  if(outcome==='accepted') toast('جاري التثبيت...','success');
  deferredInstall=null;
  document.getElementById('install-banner').classList.remove('show');
}

function dismissInstall(){
  document.getElementById('install-banner').classList.remove('show');
  deferredInstall=null;
}

// ══════════════════════════════════════
// NETWORK DETECTION
// ══════════════════════════════════════
function setupNetworkDetection(){
  function update(){
    const offline=!navigator.onLine;
    document.getElementById('offline-bar').classList.toggle('show',offline);
    document.body.classList.toggle('offline-mode',offline);
  }
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  update();
}

// ══════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════
async function registerSW(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js');
    if(reg.waiting){waitingSW=reg.waiting;document.getElementById('update-banner')?.classList.add('show');}
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){waitingSW=worker;document.getElementById('update-banner')?.classList.add('show');}});
    });
    reg.update().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});});
  }catch(e){console.warn('Service worker registration failed',e);}
}
function applyUpdate(){
  if(waitingSW){waitingSW.postMessage('SKIP_WAITING');document.getElementById('update-banner')?.classList.remove('show');}
  else location.reload();
}
function dismissUpdate(){document.getElementById('update-banner')?.classList.remove('show');}
let reloadingForSW=false;
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadingForSW)return;reloadingForSW=true;location.reload();});

// ══════════════════════════════════════
// URL PARAMS (for shortcuts)
// ══════════════════════════════════════
function handleURLParams(){
  const params=new URLSearchParams(location.search);
  const page=params.get('page');
  if(page&&['session','students','reports','settings','tasks','checkin','mushaf'].includes(page)) goPage(page);
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
// Capture install prompt ASAP
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredInstall=e;
  setTimeout(()=>document.getElementById('install-banner').classList.add('show'),10000);
});

let chartResizeTimer=null;
window.addEventListener('resize',()=>{
  clearTimeout(chartResizeTimer);
  chartResizeTimer=setTimeout(()=>{
    if(curPage==='home')renderHomeCharts();
    else if(curPage==='profile'&&curStId)renderProfileChart(curStId);
    else if(curPage==='reports')renderReport();
  },180);
});

window.addEventListener('load',async ()=>{
  // 1. Load data (IndexedDB + localStorage fallback)
  await initDB();

  // 2. Apply saved preferences
  applyTheme();
  applyFontSize();

  // 3. Fill Quran selects
  fillSurahSelects();
  fillJuzSelect();
  setupSessionDraftAutosave();

  // 4. Render initial page
  renderHome();
  renderSt();

  // 5. Hide splash
  setTimeout(()=>document.getElementById('splash').classList.add('hide'),650);

  // 6. PWA setup
  setupInstallPrompt();
  setupNetworkDetection();
  setupKeyboardShortcuts();
  setupPlatformUX();
  registerSW();

  // 7. Handle URL shortcuts
  handleURLParams();

  // 8. Check and show notification reminder
  setTimeout(checkAndNotify, 5000);

  // 9. v8 feature layer
  if(typeof initV8Layer==='function') await initV8Layer();
  if(typeof initV9Layer==='function') await initV9Layer();
});

// ══════════════════════════════════════
// v6.2 — SMART QURAN WORKFLOW + BROADCASTS
// ══════════════════════════════════════
var broadcastSelected=new Set();
var broadcastQueue=[];
var broadcastQueueIndex=0;

function normalizeSurahName(v){
  return String(v||'').trim().replace(/^\d+[\.\-\s]*/,'').replace(/^سورة\s+/,'').trim();
}
function getSurahIndex(v){
  const name=normalizeSurahName(v);
  if(!name)return -1;
  return S.findIndex(x=>x.n===name);
}
function getLastSection(studentId,key,beforeDateKey,excludeId=''){
  return sessions.filter(x=>x.studentId===studentId&&x.id!==excludeId&&x.status==='حضر'&&sessionDay(x)<beforeDateKey&&x[key]?.surah)
    .sort((a,b)=>new Date(a.date)-new Date(b.date)).pop()?.[key]||null;
}
function fillSurahSelects(){
  const dl=document.getElementById('surahList');
  if(dl) dl.innerHTML=S.map((x,i)=>`<option value="${esc(x.n)}">${i+1}. سورة ${esc(x.n)}</option>`).join('');
  renderSurahChecklist();
}
function fillAyah(p){
  const input=document.getElementById(p+'-s');
  const idx=getSurahIndex(input?.value);
  const rng=document.getElementById(p+'-range');
  const fc=document.getElementById(p+'-full');
  const f=document.getElementById(p+'-f');
  const t=document.getElementById(p+'-t');
  if(idx<0){
    if(rng)rng.style.display='none';
    if(fc)fc.checked=false;
    if(f)f.removeAttribute('max');if(t)t.removeAttribute('max');
    return;
  }
  if(input)input.value=S[idx].n;
  const cnt=S[idx].a;
  if(f){f.max=cnt;if(Number(f.value)>cnt)f.value='';}
  if(t){t.max=cnt;if(Number(t.value)>cnt)t.value='';}
  if(rng&&(!fc||!fc.checked))rng.style.display='flex';
  scheduleDraftSave();
}
function toggleFull(p){
  const fc=document.getElementById(p+'-full');
  const rng=document.getElementById(p+'-range');
  const idx=getSurahIndex(document.getElementById(p+'-s')?.value);
  if(!rng)return;
  rng.style.display=(fc&&fc.checked)?'none':(idx>=0?'flex':'none');
  scheduleDraftSave();
}
function suggestSectionSurah(k){
  if(!curStId)return;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const input=document.getElementById(k+'-s');if(!input||input.value.trim())return;
  let last=getLastSection(curStId,k,dateKey,editingSessionId||''),source=k;
  if(!last?.surah&&k!=='new'){last=getLastSection(curStId,'new',dateKey,editingSessionId||'');source='new';}
  if(!last?.surah)return;
  input.value=last.surah;fillAyah(k);
  const hint=document.getElementById(k+'-auto-hint');
  if(hint)hint.textContent=source===k?'اقتراح تلقائي من آخر '+(k==='new'?'حفظ جديد':k==='rec'?'مراجعة قريبة':'مراجعة بعيدة')+' — يمكنك تغييره.':'اقتراح من آخر موضع حفظ — يمكنك تغييره.';
}
function autoSuggestSections(){
  ['new','rec','far'].forEach(suggestSectionSurah);
}
function togSec(k){
  secOn[k]=!secOn[k];updateTogs();
  if(secOn[k]&&['new','rec','far'].includes(k))suggestSectionSurah(k);
  if(k==='juz'&&secOn[k])renderSurahChecklist();
  scheduleDraftSave();
}

function resetSession(){
  draftSuspend=true;
  editingSessionId=null;
  grades={new:'',rec:'',far:'',juz:''};prevGrades={new:'',rec:'',far:'',juz:''};
  actualRecitation={new:null,rec:null,far:null};
  secOn={new:true,rec:false,far:false,juz:false};juzChips=[];sesStatus='حضر';
  const notes=document.getElementById('sesNotes');if(notes)notes.value='';
  document.querySelectorAll('.gb').forEach(b=>b.classList.remove('sel'));
  ['new','rec','far'].forEach(k=>{
    const se=document.getElementById(k+'-s');if(se)se.value='';
    const f=document.getElementById(k+'-f');if(f){f.value='';f.max=999;}
    const t=document.getElementById(k+'-t');if(t){t.value='';t.max=999;}
    const fc=document.getElementById(k+'-full');if(fc)fc.checked=false;
    const rng=document.getElementById(k+'-range');if(rng)rng.style.display='none';
    const hint=document.getElementById(k+'-auto-hint');if(hint)hint.textContent='';
  });
  const chips=document.getElementById('juz-chips');if(chips)chips.innerHTML='';
  const search=document.getElementById('juz-surah-search');if(search)search.value='';
  renderSurahChecklist();
  updateTogs();setStatusUI('حضر');
  document.getElementById('absentNotice').style.display='none';
  document.getElementById('sesContent').style.display='block';
  document.getElementById('repeatBar').style.display='none';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 حفظ الحصة';
  setDraftState('جاهز','');
  draftSuspend=false;
}

function actualBlockHTML(key,x){
  if(key==='juz')return '';
  const idx=S.findIndex(q=>q.n===x.surah),max=idx>=0?S[idx].a:Number(x.to)||1;
  const from=x.full?1:Number(x.from)||1,to=x.full?max:Number(x.to)||from;
  return `<div class="actual-box">
    <div class="actual-title">🎧 ما تم تسميعه فعليًا</div>
    <div class="actual-help">القيم تبدأ بالمقدار المطلوب. إذا سمّع الطالب أكثر أو أقل، عدّل النطاق الفعلي فقط.</div>
    <div class="actual-grid">
      <div class="fld"><label>السورة</label><input type="text" id="act-${key}-s" list="surahList" value="${esc(x.surah)}" onchange="actualSurahChanged('${key}')"></div>
      <div class="fld"><label>من</label><input type="number" inputmode="numeric" id="act-${key}-f" min="1" max="${max}" value="${from}" oninput="updateActualResult('${key}')"></div>
      <div class="fld"><label>إلى</label><input type="number" inputmode="numeric" id="act-${key}-t" min="1" max="${max}" value="${to}" oninput="updateActualResult('${key}')"></div>
    </div>
    <div class="actual-result" id="act-${key}-result"></div>
  </div>`;
}
function loadPrevTask(excludeId=''){
  if(!curStId)return;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  const prev=getPreviousPresentSession(curStId,dateKey,excludeId);
  const el=document.getElementById('prevContent');
  actualRecitation={new:null,rec:null,far:null};
  if(!prev){el.innerHTML='<div class="txt-mut" style="padding:8px;text-align:center">لا توجد حصة سابقة</div>';return;}
  const d=new Date(prev.date).toLocaleDateString('ar-EG',{weekday:'long',month:'long',day:'numeric'});
  let html=`<div class="txt-mut mb8">التكليف من حصة: ${d}</div>`;
  const sections=[{key:'new',label:'📖 الحفظ الجديد'},{key:'rec',label:'📚 المراجعة القريبة'},{key:'far',label:'📘 المراجعة البعيدة'},{key:'juz',label:'📜 الأجزاء والسور'}];
  let hasAny=false;
  sections.forEach(({key,label})=>{
    if(!prev[key])return;hasAny=true;
    const x=prev[key];
    if(key!=='juz')actualRecitation[key]={surahId:x.surahId||S.findIndex(q=>q.n===x.surah)+1,surah:x.surah,from:Number(x.from)||1,to:Number(x.to)||Number(x.from)||1,full:!!x.full};
    const desc=key==='juz'?(x.chips||[]).map(c=>esc(c)).join('، '):x.full?`سورة ${esc(x.surah)} كاملة`:`سورة ${esc(x.surah)} من الآية ${esc(x.from)} إلى الآية ${esc(x.to)}`;
    html+=`<div class="prev-task-card" id="prev-task-${key}"><div style="font-weight:700;margin-bottom:6px;font-size:13px">${label}</div><div class="assigned-range">المطلوب: ${desc}</div>${actualBlockHTML(key,x)}<div class="gbs" id="pgr-${key}">${['ممتاز','جيد جداً','جيد','ضعيف'].map(g=>`<div class="gb" data-g="${g}" onclick="setPrevGr('${key}','${g}')">${g==='ممتاز'?'⭐ ':''}${g}</div>`).join('')}</div></div>`;
  });
  if(!hasAny)html+='<div class="txt-mut">لا يوجد تكليف للحصة السابقة</div>';
  el.innerHTML=html;
  ['new','rec','far'].forEach(updateActualResult);
}
function actualSurahChanged(key){
  const input=document.getElementById(`act-${key}-s`),idx=getSurahIndex(input?.value);
  const f=document.getElementById(`act-${key}-f`),t=document.getElementById(`act-${key}-t`);
  if(idx<0){updateActualResult(key);return;}
  input.value=S[idx].n;if(f)f.max=S[idx].a;if(t)t.max=S[idx].a;
  if(Number(f?.value)>S[idx].a)f.value='1';if(Number(t?.value)>S[idx].a)t.value=String(S[idx].a);
  updateActualResult(key);scheduleDraftSave();
}
function readActualSection(key){
  const s=document.getElementById(`act-${key}-s`),f=document.getElementById(`act-${key}-f`),t=document.getElementById(`act-${key}-t`);
  if(!s||!f||!t)return null;
  const idx=getSurahIndex(s.value);if(idx<0)return null;
  let from=parseInt(f.value),to=parseInt(t.value);if(!Number.isFinite(from)||!Number.isFinite(to))return null;
  from=Math.max(1,Math.min(S[idx].a,from));to=Math.max(1,Math.min(S[idx].a,to));if(to<from)[from,to]=[to,from];
  return {surahId:idx+1,surah:S[idx].n,from,to,full:from===1&&to===S[idx].a};
}
function getAssignedPreviousSection(key){
  if(!curStId)return null;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  return getPreviousPresentSession(curStId,dateKey,editingSessionId||'')?.[key]||null;
}
function updateActualResult(key){
  const out=document.getElementById(`act-${key}-result`);if(!out)return;
  const assigned=getAssignedPreviousSection(key),act=readActualSection(key);
  if(!assigned||!act){out.textContent='أدخل نطاق التسميع الفعلي';out.className='actual-result';return;}
  if(assigned.surah!==act.surah){out.textContent='تم تسجيل سورة مختلفة عن التكليف الأصلي.';out.className='actual-result neutral';scheduleDraftSave();return;}
  const assignedCount=(Number(assigned.to)||1)-(Number(assigned.from)||1)+1;
  const actualCount=act.to-act.from+1;
  if(act.from<=Number(assigned.from)&&act.to>Number(assigned.to)){
    out.textContent=`🌟 سمّع ${act.to-Number(assigned.to)} آية إضافية فوق المطلوب (${actualCount} آية فعليًا).`;out.className='actual-result extra';
  }else if(act.from===Number(assigned.from)&&act.to===Number(assigned.to)){
    out.textContent=`✅ أتم المقدار المطلوب كاملًا (${assignedCount} آية).`;out.className='actual-result complete';
  }else if(act.from<=Number(assigned.from)&&act.to<Number(assigned.to)){
    out.textContent=`⏳ تم تسميع ${actualCount} آية، والمتبقي ${Math.max(0,Number(assigned.to)-act.to)} آية من المطلوب.`;out.className='actual-result partial';
  }else{
    out.textContent=`🎧 النطاق الفعلي: ${act.from}–${act.to} (${actualCount} آية).`;out.className='actual-result neutral';
  }
  actualRecitation[key]=act;scheduleDraftSave();
}
function applyActualRecitationToFields(actual){
  if(!actual)return;
  ['new','rec','far'].forEach(key=>{
    const x=actual[key];if(!x)return;
    const s=document.getElementById(`act-${key}-s`),f=document.getElementById(`act-${key}-f`),t=document.getElementById(`act-${key}-t`);
    if(s)s.value=x.surah||'';if(f)f.value=x.from||1;if(t)t.value=x.to||x.from||1;
    actualRecitation[key]={...x};actualSurahChanged(key);updateActualResult(key);
  });
}
function onSesSt(){
  curStId=document.getElementById('sesSt').value;
  const dateKey=document.getElementById('sesDate')?.value||localDateKey();
  resetSession();
  if(!curStId){document.getElementById('prevContent').innerHTML='<div class="txt-mut" style="text-align:center;padding:10px">اختر الطالب لعرض تكليف الحصة السابقة</div>';return;}
  const existing=findDailySession(curStId,dateKey);editingSessionId=existing?.id||null;
  loadPrevTask(existing?.id||'');
  const prev=getPreviousPresentSession(curStId,dateKey,existing?.id||'');
  const rb=document.getElementById('repeatBar');
  if(prev&&(prev.new||prev.rec||prev.far||prev.juz||prev.surahReview)){
    const d=new Date(prev.date).toLocaleDateString('ar-EG',{month:'short',day:'numeric'});
    document.getElementById('repeatHint').textContent=`آخر حصة: ${d} — اضغط لملء الحقول`;
    rb.style.display='flex';
  }else rb.style.display='none';
  draftSuspend=true;
  if(existing)applySessionToEditor(existing);
  const restored=restoreDraft(existing);
  if(!existing&&!restored)autoSuggestSections();
  draftSuspend=false;
  if(restored)setDraftState('تم استعادة مسودة أحدث','editing');
  else if(existing)setDraftState('تعديل حصة مسجلة','editing');
  else setDraftState('جاهز — تم اقتراح السور تلقائيًا','saved');
}
function applySessionToEditor(ses){
  if(!ses)return;
  sesStatus=ses.status||'حضر';setStatusUI(sesStatus);
  const isAbsent=sesStatus!=='حضر';document.getElementById('absentNotice').style.display=isAbsent?'block':'none';document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 تحديث الحصة';
  prevGrades={new:'',rec:'',far:'',juz:'',...(ses.prevGrades||{})};
  Object.entries(prevGrades).forEach(([k,g])=>{if(g)setPrevGr(k,g);});
  actualRecitation={new:null,rec:null,far:null,...(ses.actualRecitation||{})};
  grades={new:'',rec:'',far:'',juz:''};secOn={new:false,rec:false,far:false,juz:false};
  ['new','rec','far'].forEach(k=>{
    const x=ses[k];if(!x)return;const idx=S.findIndex(q=>q.n===x.surah);if(idx<0)return;
    secOn[k]=true;updateTogs();document.getElementById(k+'-s').value=x.surah;fillAyah(k);
    const full=!!x.full||(parseInt(x.from)===1&&parseInt(x.to)===S[idx].a);document.getElementById(k+'-full').checked=full;toggleFull(k);
    if(!full){document.getElementById(k+'-f').value=x.from;document.getElementById(k+'-t').value=x.to;}
    if(x.grade)setGr(k,x.grade);
  });
  if(ses.juz){secOn.juz=true;juzChips=[...(ses.juz.chips||[])];updateTogs();renderChips();if(ses.juz.grade)setGr('juz',ses.juz.grade);}
  if(!ses.new&&!ses.rec&&!ses.far&&!ses.juz){secOn.new=true;updateTogs();suggestSectionSurah('new');}
  applyActualRecitationToFields(ses.actualRecitation||{});
  document.getElementById('sesNotes').value=ses.notes||'';
}
function captureDraft(){
  const fields={};['new','rec','far'].forEach(k=>{fields[k]={surah:document.getElementById(k+'-s')?.value||'',from:document.getElementById(k+'-f')?.value||'',to:document.getElementById(k+'-t')?.value||'',full:!!document.getElementById(k+'-full')?.checked};});
  const actual={};['new','rec','far'].forEach(k=>{const x=readActualSection(k);if(x)actual[k]=x;});
  return {savedAt:new Date().toISOString(),editingSessionId,sesStatus,secOn:{...secOn},grades:{...grades},prevGrades:{...prevGrades},actualRecitation:actual,juzChips:[...juzChips],notes:document.getElementById('sesNotes')?.value||'',fields};
}
function draftKey(){
  const sid=document.getElementById('sesSt')?.value,date=document.getElementById('sesDate')?.value;
  return sid&&date?`qt_draft_v7_${sid}_${date}`:'';
}
function applyDraft(d){
  if(!d)return;
  sesStatus=d.sesStatus||'حضر';setStatusUI(sesStatus);const isAbsent=sesStatus!=='حضر';document.getElementById('absentNotice').style.display=isAbsent?'block':'none';document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  secOn={new:true,rec:false,far:false,juz:false,...(d.secOn||{})};grades={new:'',rec:'',far:'',juz:'',...(d.grades||{})};prevGrades={new:'',rec:'',far:'',juz:'',...(d.prevGrades||{})};actualRecitation={new:null,rec:null,far:null,...(d.actualRecitation||{})};juzChips=[...(d.juzChips||[])];updateTogs();
  ['new','rec','far'].forEach(k=>{const f=d.fields?.[k]||{},se=document.getElementById(k+'-s');if(!se)return;se.value=f.surah??'';if(se.value!=='')fillAyah(k);const fc=document.getElementById(k+'-full');if(fc)fc.checked=!!f.full;toggleFull(k);if(document.getElementById(k+'-f'))document.getElementById(k+'-f').value=f.from||'';if(document.getElementById(k+'-t'))document.getElementById(k+'-t').value=f.to||'';if(grades[k])setGr(k,grades[k]);});
  renderChips();if(grades.juz)setGr('juz',grades.juz);Object.entries(prevGrades).forEach(([k,g])=>{if(g)setPrevGr(k,g);});applyActualRecitationToFields(d.actualRecitation||{});document.getElementById('sesNotes').value=d.notes||'';
}

function renderSurahChecklist(){
  const el=document.getElementById('juz-surah-list');if(!el)return;
  const q=normalizeSurahName(document.getElementById('juz-surah-search')?.value||'');
  const picked=new Set(juzChips.filter(c=>c.startsWith('سورة ')).map(c=>c.slice(5)));
  const rows=S.map((surah,i)=>({surah,i})).filter(x=>!q||x.surah.n.includes(q));
  el.innerHTML=rows.map(({surah,i})=>`<label class="surah-check-item"><input type="checkbox" ${picked.has(surah.n)?'checked':''} onchange="toggleJuzSurah(${i},this.checked)"><span>${i+1}. ${esc(surah.n)}</span></label>`).join('')||'<div class="txt-mut" style="padding:10px">لا توجد سورة مطابقة</div>';
  syncJuzSurahCount();
}
function toggleJuzSurah(i,checked){
  if(!S[i])return;const chip='سورة '+S[i].n;const at=juzChips.indexOf(chip);
  if(checked&&at<0)juzChips.push(chip);if(!checked&&at>=0)juzChips.splice(at,1);
  renderChips();scheduleDraftSave();
}
function selectJuzAmmaSurahs(){
  S.slice(77).forEach(x=>{const c='سورة '+x.n;if(!juzChips.includes(c))juzChips.push(c);});renderChips();toast('تم تحديد سور جزء عم','success');scheduleDraftSave();
}
function clearSelectedSurahs(){juzChips=juzChips.filter(c=>!c.startsWith('سورة '));renderChips();scheduleDraftSave();}
function syncJuzSurahCount(){
  const n=juzChips.filter(c=>c.startsWith('سورة ')).length,el=document.getElementById('juz-surah-count');if(el)el.textContent=`${n} سورة محددة`;
}
function renderChips(){
  const el=document.getElementById('juz-chips');if(el)el.innerHTML=juzChips.map((c,i)=>`<span class="chip">${esc(c)}<span class="chip-x" onclick="rmChip(${i})">✕</span></span>`).join('');
  syncJuzSurahCount();
  const list=document.getElementById('juz-surah-list');if(list)renderSurahChecklist();
}
function rmChip(i){juzChips.splice(i,1);renderChips();scheduleDraftSave();}
function addJuzSurah(){/* v6.2 uses the checkbox multi-selector */}

function readSection(k){
  if(!secOn[k])return null;const sel=document.getElementById(k+'-s');if(!sel||!sel.value.trim())return null;
  const idx=getSurahIndex(sel.value);if(idx<0)return null;const full=!!document.getElementById(k+'-full')?.checked;
  let from=full?1:parseInt(document.getElementById(k+'-f')?.value),to=full?S[idx].a:parseInt(document.getElementById(k+'-t')?.value);
  if(!full&&(!Number.isFinite(from)||!Number.isFinite(to)))return null;
  from=Math.max(1,Math.min(S[idx].a,from));to=Math.max(1,Math.min(S[idx].a,to));if(to<from)[from,to]=[to,from];
  return {surahId:idx+1,surah:S[idx].n,from,to,grade:grades[k]||'',full};
}
function validateSessionSections(){
  for(const k of ['new','rec','far']){
    if(!secOn[k])continue;const input=document.getElementById(k+'-s'),raw=input?.value.trim()||'';if(!raw)continue;
    const idx=getSurahIndex(raw);if(idx<0)return `اسم السورة في ${k==='new'?'الحفظ الجديد':k==='rec'?'المراجعة القريبة':'المراجعة البعيدة'} غير صحيح`;
    if(!document.getElementById(k+'-full')?.checked){const f=parseInt(document.getElementById(k+'-f')?.value),t=parseInt(document.getElementById(k+'-t')?.value);if(!Number.isFinite(f)||!Number.isFinite(t))return `أدخل رقم الآية من وإلى في ${k==='new'?'الحفظ الجديد':k==='rec'?'المراجعة القريبة':'المراجعة البعيدة'}`;if(f<1||t<1||f>S[idx].a||t>S[idx].a)return `نطاق الآيات خارج حدود سورة ${S[idx].n}`;}
  }
  return '';
}
function buildSesData(){
  const d={},n=readSection('new'),r=readSection('rec'),f=readSection('far');if(n)d.new=n;if(r)d.rec=r;if(f)d.far=f;
  if(secOn.juz&&juzChips.length)d.juz={chips:[...juzChips],grade:grades.juz||''};
  d.notes=document.getElementById('sesNotes').value.trim();d.prevGrades={...prevGrades};
  const actual={};['new','rec','far'].forEach(k=>{const x=readActualSection(k);if(x)actual[k]=x;});if(Object.keys(actual).length)d.actualRecitation=actual;
  return d;
}
function saveSession(opts={}){
  const sid=document.getElementById('sesSt').value,dateKey=document.getElementById('sesDate')?.value||localDateKey();if(!sid){toast('اختر الطالب أولاً','error');return null;}if(!dateKey){toast('اختر تاريخ الحصة','error');return null;}
  if(sesStatus==='حضر'){const err=validateSessionSections();if(err){toast(err,'error');return null;}}
  const data=sesStatus==='حضر'?buildSesData():{},now=new Date().toISOString(),existing=(editingSessionId&&sessions.find(x=>x.id===editingSessionId))||findDailySession(sid,dateKey);
  const core={id:existing?.id||makeId('ses'),studentId:sid,sessionDate:dateKey,date:existing?.date||makeSessionISO(dateKey),status:sesStatus,createdAt:existing?.createdAt||now,updatedAt:now,source:'session',completed:true,...data};core.summary=buildSumText(core);
  if(existing){const idx=sessions.findIndex(x=>x.id===existing.id);sessions[idx]=core;}else sessions.push(core);editingSessionId=core.id;save();clearDraft();const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 تحديث الحصة';setDraftState('تم حفظ الحصة ✓','saved');
  if(!opts.silent){vibrate([50,25,100]);toast(existing?'تم تحديث الحصة بنجاح ✓':'تم حفظ الحصة بنجاح ✓','success');}if(sesStatus==='حضر'&&data.juz&&grades.juz==='ممتاز'&&!opts.noCelebrate)setTimeout(celebrate,350);renderHome();return core;
}
function fillFromLast(){
  if(!curStId)return;const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=getPreviousPresentSession(curStId,dateKey,editingSessionId||'');if(!prev){toast('لا توجد حصة سابقة','error');return;}
  ['new','rec','far'].forEach(k=>{const x=prev[k];if(!x)return;secOn[k]=true;updateTogs();document.getElementById(k+'-s').value=x.surah;fillAyah(k);document.getElementById(k+'-full').checked=!!x.full;toggleFull(k);if(!x.full){document.getElementById(k+'-f').value=x.from;document.getElementById(k+'-t').value=x.to;}});
  if(prev.juz?.chips){secOn.juz=true;updateTogs();juzChips=[...prev.juz.chips];renderChips();}scheduleDraftSave();toast('تم تحميل التكليف السابق ✓','success');vibrate([30,20,60]);
}
function parseVoiceInput(sec,txt){
  const idx=S.findIndex(s=>txt.includes(s.n));if(idx>=0){document.getElementById(sec+'-s').value=S[idx].n;fillAyah(sec);}if(txt.includes('كامل')||txt.includes('كاملة')){const fc=document.getElementById(sec+'-full');if(fc){fc.checked=true;toggleFull(sec);}}
  const grade=Object.keys(GRADE_MAP).find(g=>txt.includes(g));if(grade)setGr(sec,grade);
  const nums=(txt.match(/\d+/g)||[]).map(Number);if(nums.length>=2&&idx>=0){const f=document.getElementById(sec+'-f'),t=document.getElementById(sec+'-t');if(f)f.value=nums[0];if(t)t.value=nums[1];}
  scheduleDraftSave();
}

function fmtActualResult(ses,key){const x=ses?.actualRecitation?.[key];return x?fmtSection(x):'';}
function buildSumText(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'❌ غائب':ses.status==='إجازة'?'🌙 إجازة':ses.status||'غير حاضر';
  const parts=[],pg=ses.prevGrades||{};if(pg.new&&ses.actualRecitation?.new)parts.push(`تسميع فعلي: ${ses.actualRecitation.new.surah}(${ses.actualRecitation.new.from}-${ses.actualRecitation.new.to})`);
  const fmt=sec=>sec.full?`${sec.surah} كاملة`:`${sec.surah}(${sec.from}-${sec.to})`;if(ses.new)parts.push(`حفظ: ${fmt(ses.new)}`);if(ses.rec)parts.push(`مراجعة قريبة: ${fmt(ses.rec)}`);if(ses.far)parts.push(`مراجعة بعيدة: ${fmt(ses.far)}`);if(ses.juz)parts.push((ses.juz.chips||[]).join('، '));return parts.join(' · ')||'حصة مسجلة';
}
function buildSumHTML(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'<span style="color:var(--red)">❌ غائب</span>':'<span style="color:var(--gold)">🌙 إجازة</span>';
  const parts=[],fmt=sec=>sec.full?`سورة ${esc(sec.surah)} كاملة`:`سورة ${esc(sec.surah)} (${esc(sec.from)}–${esc(sec.to)})`,pg=ses.prevGrades||{};
  if(Object.values(pg).some(Boolean)){const x=[];if(pg.new)x.push(`الحفظ: ${esc(pg.new)}${ses.actualRecitation?.new?' — '+fmt(ses.actualRecitation.new):''}`);if(pg.rec)x.push(`المراجعة القريبة: ${esc(pg.rec)}${ses.actualRecitation?.rec?' — '+fmt(ses.actualRecitation.rec):''}`);if(pg.far)x.push(`المراجعة البعيدة: ${esc(pg.far)}${ses.actualRecitation?.far?' — '+fmt(ses.actualRecitation.far):''}`);if(pg.juz)x.push(`الأجزاء: ${esc(pg.juz)}`);parts.push(`⭐ نتيجة التسميع: ${x.join(' · ')}`);}
  if(ses.new)parts.push(`📖 ${fmt(ses.new)}`);if(ses.rec)parts.push(`📚 ${fmt(ses.rec)}`);if(ses.far)parts.push(`📘 ${fmt(ses.far)}`);if(ses.juz)parts.push(`📜 ${(ses.juz.chips||[]).map(c=>esc(c)).join('، ')}`);if(ses.notes)parts.push(`💬 <em>${esc(ses.notes)}</em>`);return parts.join('<br>')||'حصة مسجلة';
}
function getVerifiedNewSections(id){
  const ordered=sessions.filter(x=>x.studentId===id&&x.status==='حضر').sort((a,b)=>new Date(a.date)-new Date(b.date)),verified=[];
  ordered.forEach((ses,i)=>{
    if(ses.new?.surah&&ses.new?.grade)verified.push(ses.new);
    if(ses.prevGrades?.new){if(ses.actualRecitation?.new?.surah)verified.push(ses.actualRecitation.new);else{for(let j=i-1;j>=0;j--){if(ordered[j].new?.surah){verified.push(ordered[j].new);break;}}}}
  });return verified;
}
function getMemorizationQualityPercent(id){
  const vals=sessions.filter(x=>x.studentId===id&&x.status==='حضر').sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-8).flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean);if(!vals.length)return null;return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length/4*100);
}
function getQuranProgressPercent(id){return Math.min(100,Number((calcTotalAyat(id)/6236*100).toFixed(1)));}
function buildWAMsg(s,ses){
  const d=new Date(ses?ses.date:Date.now()).toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),quality=getMemorizationQualityPercent(s.id),progress=getQuranProgressPercent(s.id),qualityText=quality==null?'لا توجد تقييمات كافية':`${quality}%`;
  const tmpl=settings.waTemplate||'';
  if(tmpl.trim()){
    const newTxt=ses?.new?`📖 الحفظ الجديد: ${fmtSection(ses.new)}${ses.new.grade?' — '+ses.new.grade:''}`:'',recTxt=ses?.rec?`📚 المراجعة القريبة: ${fmtSection(ses.rec)}${ses.rec.grade?' — '+ses.rec.grade:''}`:'',farTxt=ses?.far?`📘 المراجعة البعيدة: ${fmtSection(ses.far)}${ses.far.grade?' — '+ses.far.grade:''}`:'';
    return tmpl.replace(/{{اسم_الطالب}}/g,s.name).replace(/{{التاريخ}}/g,d).replace(/{{الحفظ_الجديد}}/g,newTxt).replace(/{{المراجعة_القريبة}}/g,recTxt).replace(/{{المراجعة_البعيدة}}/g,farTxt).replace(/{{الملاحظات}}/g,ses?.notes||'').replace(/{{اسم_المحفظ}}/g,settings.name||'').replace(/{{نسبة_الحفظ}}/g,qualityText).replace(/{{نسبة_الإنجاز}}/g,`${progress}%`);
  }
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n✨ متابعة الطالب: *${s.name}*\n📅 ${d}\n\n📊 *مستوى الحفظ الحالي:* ${qualityText}\n📈 *الإنجاز الموثق:* ${progress}% من القرآن\n\n━━━━━━━━━━━━━━━━━━`;
  const pg=ses?ses.prevGrades:{};const hasPrev=pg&&(pg.new||pg.rec||pg.far||pg.juz);if(hasPrev){msg+=`\n\n🎧 *نتيجة التسميع الفعلي:*\n`;if(pg.new)msg+=`📖 الحفظ: ${grIcon(pg.new)} ${pg.new}${ses.actualRecitation?.new?' — '+fmtSection(ses.actualRecitation.new):''}\n`;if(pg.rec)msg+=`📚 المراجعة القريبة: ${grIcon(pg.rec)} ${pg.rec}${ses.actualRecitation?.rec?' — '+fmtSection(ses.actualRecitation.rec):''}\n`;if(pg.far)msg+=`📘 المراجعة البعيدة: ${grIcon(pg.far)} ${pg.far}${ses.actualRecitation?.far?' — '+fmtSection(ses.actualRecitation.far):''}\n`;if(pg.juz)msg+=`📜 الأجزاء/السور: ${grIcon(pg.juz)} ${pg.juz}\n`;msg+=`\n━━━━━━━━━━━━━━━━━━`;}
  msg+=`\n\n📝 *تكليف الحصة القادمة:*\n`;let hasTak=false;if(ses?.new){hasTak=true;msg+=`\n📖 *الحفظ الجديد:*\n${fmtSection(ses.new)}\n`;}if(ses?.rec){hasTak=true;msg+=`\n📚 *المراجعة القريبة:*\n${fmtSection(ses.rec)}\n`;}if(ses?.far){hasTak=true;msg+=`\n📘 *المراجعة البعيدة:*\n${fmtSection(ses.far)}\n`;}if(ses?.juz){hasTak=true;msg+=`\n📜 *مراجعة أجزاء/سور:*\n${(ses.juz.chips||[]).join('، ')}\n`;}if(!hasTak)msg+=`لا يوجد تكليف جديد\n`;msg+=`\n━━━━━━━━━━━━━━━━━━`;if(ses?.notes)msg+=`\n\n💬 *ملاحظات المحفظ:*\n${ses.notes}\n\n━━━━━━━━━━━━━━━━━━`;msg+=`\n\nجزاكم الله خيراً 🤲`;if(settings.name)msg+=`\n\n— ${settings.name}`;msg+=`\n${settings.circle||ACADEMY_NAME}\n${ACADEMY_TAGLINE}`;return msg;
}

function broadcastPresetText(type){
  const academy=settings.circle||ACADEMY_NAME;
  const map={
    general:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\n\n[اكتب رسالتك هنا]\n\nجزاكم الله خيرًا.\n${academy}\n${ACADEMY_TAGLINE}`,
    schedule:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\nنحيطكم علمًا بتغيير موعد الحصة.\n\n🕐 الموعد الجديد: [اكتب اليوم والساعة]\n\nنرجو تأكيد الاطلاع، وجزاكم الله خيرًا.\n${academy}\n${ACADEMY_TAGLINE}`,
    holiday:`السلام عليكم ورحمة الله وبركاته 🌿\n\nنحيطكم علمًا بأن الحصص ستكون إجازة في: [اكتب التاريخ/الفترة]\nوتُستأنف الحصص بإذن الله في: [اكتب الموعد].\n\nكل عام وأنتم بخير.\n${academy}\n${ACADEMY_TAGLINE}`,
    greeting:`السلام عليكم ورحمة الله وبركاته 🌿\n\nيتقدم ${academy} بأطيب التهاني لأسرتكم الكريمة بمناسبة [اكتب المناسبة].\nنسأل الله أن يعيدها عليكم بالخير والبركة، وأن يجعل أبناءنا من أهل القرآن وخاصته.\n\n${ACADEMY_TAGLINE}`,
    course:`السلام عليكم ورحمة الله وبركاته 🌿\n\n📣 *إعلان من ${academy}*\n\nيسرنا الإعلان عن: [اسم الكورس/البرنامج]\n👥 الفئة: [اكتب الفئة]\n📅 البداية: [اكتب الموعد]\n📝 التفاصيل: [اكتب التفاصيل]\n\nللاستفسار والتسجيل يرجى التواصل معنا.\n${ACADEMY_TAGLINE}`,
    reminder:`السلام عليكم ورحمة الله وبركاته 🌿\n\nتذكير لولي أمر الطالب {{اسم_الطالب}}:\n[اكتب التذكير هنا]\n\n📊 مستوى الحفظ الحالي: {{نسبة_الحفظ}}\n📈 الإنجاز الموثق: {{نسبة_الإنجاز}}\n\nجزاكم الله خيرًا.\n${academy}`
  };return map[type]||map.general;
}
function openBroadcastComposer(){
  broadcastSelected=new Set(students.filter(st=>/^20\d{10}$/.test(String(st.phone||''))).map(st=>st.id));document.getElementById('broadcastPreset').value='general';document.getElementById('broadcastText').value=broadcastPresetText('general');document.getElementById('broadcastSearch').value='';renderBroadcastRecipients();updateBroadcastPreview();document.getElementById('broadcastProgress').style.display='none';document.getElementById('broadcastModal').classList.add('open');
}
function closeBroadcastComposer(){document.getElementById('broadcastModal').classList.remove('open');broadcastQueue=[];broadcastQueueIndex=0;}
function applyBroadcastPreset(){document.getElementById('broadcastText').value=broadcastPresetText(document.getElementById('broadcastPreset').value);updateBroadcastPreview();}
function renderBroadcastRecipients(){
  const el=document.getElementById('broadcastRecipients');if(!el)return;const q=(document.getElementById('broadcastSearch')?.value||'').trim();const rows=students.filter(st=>!q||st.name.includes(q)||(st.parent||'').includes(q));
  el.innerHTML=rows.map(st=>`<label class="recipient-item ${!st.phone?'disabled':''}"><input type="checkbox" ${broadcastSelected.has(st.id)?'checked':''} ${!st.phone?'disabled':''} onchange="toggleBroadcastRecipient('${esc(st.id)}',this.checked)"><span><strong>${esc(st.name)}</strong><small>${esc(st.parent||'ولي الأمر')} · ${st.phone?esc(st.phone):'لا يوجد رقم'}</small></span></label>`).join('')||'<div class="txt-mut" style="padding:10px">لا توجد نتائج</div>';updateBroadcastCount();
}
function toggleBroadcastRecipient(id,checked){if(checked)broadcastSelected.add(id);else broadcastSelected.delete(id);updateBroadcastCount();updateBroadcastPreview();}
function setBroadcastRecipients(mode){
  if(mode==='none')broadcastSelected.clear();else if(mode==='all')students.filter(st=>st.phone).forEach(st=>broadcastSelected.add(st.id));else if(mode==='today'){broadcastSelected.clear();const ids=new Set(expectedStudentsForDate(localDateKey()).map(st=>st.id));students.filter(st=>ids.has(st.id)&&st.phone).forEach(st=>broadcastSelected.add(st.id));}renderBroadcastRecipients();updateBroadcastPreview();
}
function updateBroadcastCount(){const el=document.getElementById('broadcastCount');if(el)el.textContent=`${broadcastSelected.size} محدد`;}
function personalizeBroadcast(text,st){const q=getMemorizationQualityPercent(st.id),p=getQuranProgressPercent(st.id);return String(text||'').replace(/{{اسم_الطالب}}/g,st.name||'').replace(/{{اسم_ولي_الأمر}}/g,st.parent||'ولي الأمر').replace(/{{نسبة_الحفظ}}/g,q==null?'—':q+'%').replace(/{{نسبة_الإنجاز}}/g,p+'%').replace(/{{اسم_المحفظ}}/g,settings.name||'').replace(/{{اسم_الأكاديمية}}/g,settings.circle||ACADEMY_NAME);}
function insertBroadcastVar(v){const ta=document.getElementById('broadcastText');if(!ta)return;const pos=ta.selectionStart;ta.value=ta.value.slice(0,pos)+v+ta.value.slice(ta.selectionEnd);ta.focus();ta.setSelectionRange(pos+v.length,pos+v.length);updateBroadcastPreview();}
function updateBroadcastPreview(){const el=document.getElementById('broadcastPreview');if(!el)return;const st=students.find(x=>broadcastSelected.has(x.id))||students[0];el.innerHTML=st?`<div class="preview-title">معاينة للطالب ${esc(st.name)}</div><div class="preview-msg">${esc(personalizeBroadcast(document.getElementById('broadcastText')?.value||'',st)).replace(/\n/g,'<br>')}</div>`:'<div class="txt-mut">حدد مستلمًا لعرض المعاينة.</div>';}
async function copyTextSafe(text){try{await navigator.clipboard.writeText(text);return true;}catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}ta.remove();return ok;}}
async function copyBroadcastMessage(){const text=document.getElementById('broadcastText')?.value||'';if(!text.trim()){toast('اكتب الرسالة أولاً','error');return;}await copyTextSafe(text);toast('تم نسخ الرسالة','success');}
function startBroadcastQueue(){
  const text=document.getElementById('broadcastText')?.value||'';if(!text.trim()){toast('اكتب الرسالة أولاً','error');return;}broadcastQueue=students.filter(st=>broadcastSelected.has(st.id)&&st.phone);broadcastQueueIndex=0;if(!broadcastQueue.length){toast('حدد ولي أمر واحدًا على الأقل','error');return;}sendNextBroadcast();
}
function sendNextBroadcast(){
  if(broadcastQueueIndex>=broadcastQueue.length){const p=document.getElementById('broadcastProgress');p.style.display='block';p.innerHTML=`✅ تم فتح رسائل ${broadcastQueue.length} ولي أمر. الإرسال النهائي يتم من داخل واتساب.`;toast('اكتملت قائمة الإرسال','success');return;}
  const st=broadcastQueue[broadcastQueueIndex],text=personalizeBroadcast(document.getElementById('broadcastText')?.value||'',st);openWhatsApp(st,text);broadcastQueueIndex++;
  const p=document.getElementById('broadcastProgress');p.style.display='block';const left=broadcastQueue.length-broadcastQueueIndex;p.innerHTML=`<strong>تم فتح ${broadcastQueueIndex} من ${broadcastQueue.length}</strong><br><span class="txt-mut">${left?`بعد إرسال الرسالة الحالية في واتساب اضغط «التالي».`:'انتهت القائمة.'}</span>${left?'<button class="btn btn-wa btn-sm mt8" onclick="sendNextBroadcast()">فتح الرسالة التالية ←</button>':''}`;
}


// ══════════════════════════════════════
// v7.0 — CROSS-PLATFORM UX, TASKS & SMART FOLLOW-UP
// ══════════════════════════════════════
let taskFilter='open';
let editingTaskId=null;

function refreshGroupOptions(){
  const groups=[...new Set(students.map(s=>String(s.group||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const dl=document.getElementById('groupList');if(dl)dl.innerHTML=groups.map(g=>`<option value="${esc(g)}"></option>`).join('');
  const sel=document.getElementById('filterGroup');
  if(sel){const keep=sel.value;sel.innerHTML='<option value="">كل المجموعات</option>'+groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');if(groups.includes(keep))sel.value=keep;}
}

function taskDueState(task,today=localDateKey()){
  if(task.done)return'done';
  if(!task.dueDate)return'open';
  if(task.dueDate<today)return'overdue';
  if(task.dueDate===today)return'today';
  return'open';
}
function getOpenTasks(){return tasks.filter(t=>!t.done);}
function updateTaskBadge(){
  const count=getOpenTasks().length,b=document.getElementById('taskBadge'),q=document.getElementById('quickTaskCount');
  if(b){b.hidden=!count;b.textContent=count>99?'99+':String(count);}
  if(q)q.textContent=count?`${count} مفتوحة`:'';
}
function setTaskFilter(filter){taskFilter=filter;document.querySelectorAll('#taskFilters button').forEach(b=>b.classList.toggle('on',b.dataset.filter===filter));renderTasks();}
function openTaskModal(studentId='',taskId=''){
  editingTaskId=taskId||null;
  const modal=document.getElementById('taskModal');if(!modal)return;
  const sel=document.getElementById('taskStudent');sel.innerHTML='<option value="">— مهمة عامة —</option>'+students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  const task=taskId?tasks.find(t=>t.id===taskId):null;
  document.getElementById('taskModalTitle').textContent=task?'تعديل المهمة':'مهمة جديدة';
  document.getElementById('taskTitle').value=task?.title||'';
  document.getElementById('taskStudent').value=task?.studentId||studentId||'';
  document.getElementById('taskDue').value=task?.dueDate||localDateKey();
  document.getElementById('taskPriority').value=task?.priority||'normal';
  document.getElementById('taskNotes').value=task?.notes||'';
  modal.classList.add('open');setTimeout(()=>document.getElementById('taskTitle')?.focus(),60);
}
function closeTaskModal(){document.getElementById('taskModal')?.classList.remove('open');editingTaskId=null;}
function saveTask(){
  const wasEditing=!!editingTaskId;
  const title=document.getElementById('taskTitle').value.trim();if(!title){toast('اكتب المهمة أولاً','error');return;}
  const now=new Date().toISOString(),data={title:title.slice(0,240),studentId:document.getElementById('taskStudent').value||'',dueDate:document.getElementById('taskDue').value||'',priority:document.getElementById('taskPriority').value==='high'?'high':'normal',notes:document.getElementById('taskNotes').value.trim().slice(0,4000),updatedAt:now};
  if(editingTaskId){const i=tasks.findIndex(t=>t.id===editingTaskId);if(i>=0)tasks[i]={...tasks[i],...data};}
  else tasks.unshift({id:makeId('task'),...data,done:false,createdAt:now});
  save();closeTaskModal();renderTasks();renderSmartHub();toast(wasEditing?'تم تحديث المهمة':'تمت إضافة المهمة','success');
}
function toggleTask(id){const t=tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;t.updatedAt=new Date().toISOString();save();renderTasks();renderSmartHub();vibrate([25]);}
function deleteTaskItem(id){const t=tasks.find(x=>x.id===id);if(!t)return;if(!confirm(`حذف المهمة: ${t.title}؟`))return;tasks=tasks.filter(x=>x.id!==id);save();renderTasks();renderSmartHub();toast('تم حذف المهمة','success');}
function renderTasks(){
  updateTaskBadge();
  const today=localDateKey(),open=tasks.filter(t=>!t.done),overdue=open.filter(t=>t.dueDate&&t.dueDate<today),todayTasks=open.filter(t=>t.dueDate===today),done=tasks.filter(t=>t.done);
  const ids={taskOpenCount:open.length,taskOverdueCount:overdue.length,taskTodayCount:todayTasks.length,taskDoneCount:done.length};Object.entries(ids).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v;});
  document.querySelectorAll('#taskFilters button').forEach(b=>b.classList.toggle('on',b.dataset.filter===taskFilter));
  const el=document.getElementById('taskList');if(!el)return;
  const q=String(document.getElementById('taskSearch')?.value||'').trim().toLowerCase();
  let list=[...tasks];
  list=list.filter(t=>{const state=taskDueState(t,today);if(taskFilter==='all')return true;if(taskFilter==='open')return !t.done;return state===taskFilter;});
  if(q)list=list.filter(t=>`${t.title} ${t.notes||''} ${students.find(s=>s.id===t.studentId)?.name||''}`.toLowerCase().includes(q));
  list.sort((a,b)=>Number(a.done)-Number(b.done)||(a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99')||(a.priority==='high'?-1:1));
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">☑️</div><p>لا توجد مهام في هذا العرض</p></div>';return;}
  el.innerHTML=list.map(t=>{const st=students.find(s=>s.id===t.studentId),state=taskDueState(t,today),due=t.dueDate?new Date(t.dueDate+'T12:00:00').toLocaleDateString('ar-EG',{month:'short',day:'numeric'}):'بدون موعد';return `<div class="task-item ${state} ${t.priority==='high'?'priority-high':''}">
    <button class="task-check ${t.done?'done':''}" onclick="toggleTask('${esc(t.id)}')" aria-label="${t.done?'إعادة فتح':'إكمال'} المهمة">${t.done?'✓':''}</button>
    <div class="task-main"><div class="task-title">${esc(t.title)}</div><div class="task-meta">${st?`👤 ${esc(st.name)} · `:''}${state==='overdue'?'⚠️ متأخرة · ':state==='today'?'📌 اليوم · ':''}📅 ${esc(due)}${t.priority==='high'?' · 🔴 أولوية عالية':''}</div>${t.notes?`<div class="task-notes">${esc(t.notes)}</div>`:''}</div>
    <div class="task-menu"><button onclick="openTaskModal('${esc(t.studentId||'')}','${esc(t.id)}')">✏️</button><button onclick="deleteTaskItem('${esc(t.id)}')">🗑️</button></div>
  </div>`;}).join('');
}

function getAttentionStudents(){
  const now=Date.now();
  return students.map(st=>{
    const hist=sessions.filter(s=>s.studentId===st.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const last=hist[0]||null,days=last?Math.max(0,Math.floor((now-new Date(last.date).getTime())/86400000)):999;
    const recent=hist.filter(s=>s.status==='حضر').slice(0,5),gradesArr=recent.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]).filter(Boolean),avg=gradesArr.length?gradesArr.reduce((a,b)=>a+b,0)/gradesArr.length:null;
    const absences=hist.slice(0,6).filter(s=>s.status==='غاب').length;
    let score=0,reasons=[];
    if(days===999){score+=3;reasons.push('لم تبدأ المتابعة بعد');}
    else if(days>14){score+=3;reasons.push(`آخر حصة منذ ${days} يومًا`);}else if(days>7){score+=2;reasons.push(`مرّ ${days} أيام على آخر حصة`);}
    if(avg!=null&&avg<2.25){score+=3;reasons.push('متوسط التسميع يحتاج تقوية');}else if(avg!=null&&avg<3){score+=1;reasons.push('التقييم الأخير متوسط');}
    if(absences>=2){score+=2;reasons.push(`${absences} غياب في آخر المتابعات`);}
    const openTasks=tasks.filter(t=>!t.done&&t.studentId===st.id).length;if(openTasks){score+=Math.min(2,openTasks);reasons.push(`${openTasks} مهمة مفتوحة`);}
    return{st,score,reasons,days};
  }).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score||b.days-a.days).slice(0,6);
}
function renderSmartHub(){
  const nextEl=document.getElementById('smartNext'),attCard=document.getElementById('attentionCard'),attList=document.getElementById('attentionList');if(!nextEl)return;
  const today=localDateKey(),expected=expectedStudentsForDate(today),now=new Date(),mins=now.getHours()*60+now.getMinutes();
  const pending=expected.filter(st=>!findDailySession(st.id,today));
  let next=pending.filter(st=>timeToMinutes(st.scheduleTime)!=null&&timeToMinutes(st.scheduleTime)>=mins).sort((a,b)=>timeToMinutes(a.scheduleTime)-timeToMinutes(b.scheduleTime))[0]||pending[0]||null;
  if(next){const t=next.scheduleTime?`الساعة ${esc(next.scheduleTime)}`:'اليوم';nextEl.innerHTML=`<div class="smart-next-label">الحصة التالية</div><div class="smart-next-name">${esc(next.name)}</div><div class="smart-next-meta">${t}${next.group?` · ${esc(next.group)}`:''}</div><button class="btn btn-g btn-sm" onclick="startFor('${esc(next.id)}')">ابدأ الآن</button>`;}
  else if(expected.length)nextEl.innerHTML='<div class="smart-next-label">متابعة اليوم</div><div class="smart-next-name">تم تسجيل الجميع ✓</div><div class="smart-next-meta">يمكنك مراجعة التقارير أو إضافة مهمة للغد.</div>';
  else nextEl.innerHTML='<div class="smart-next-label">اليوم</div><div class="smart-next-name">لا توجد حصص مجدولة</div><div class="smart-next-meta">ابدأ حصة استثنائية أو رتّب مهام المتابعة.</div>';
  const attention=getAttentionStudents();
  if(attCard&&attList){attCard.style.display=attention.length?'block':'none';attList.innerHTML=attention.map(x=>`<button class="attention-item" onclick="openProf('${esc(x.st.id)}')"><span class="attention-avatar">${esc(x.st.name.trim().slice(0,1))}</span><span><b>${esc(x.st.name)}</b><small>${esc(x.reasons.slice(0,2).join(' · '))}</small></span><i>‹</i></button>`).join('');}
  updateTaskBadge();
}

function openQuickSearch(){const m=document.getElementById('quickSearchModal');if(!m)return;m.classList.add('open');const i=document.getElementById('quickSearchInput');if(i){i.value='';renderQuickSearch();setTimeout(()=>i.focus(),40);}}
function closeQuickSearch(){document.getElementById('quickSearchModal')?.classList.remove('open');}
function quickOpenStudent(id){closeQuickSearch();openProf(id);}
function quickOpenTask(id){closeQuickSearch();goPage('tasks');taskFilter='all';const input=document.getElementById('taskSearch');const t=tasks.find(x=>x.id===id);if(input&&t)input.value=t.title;renderTasks();}
function quickGo(page){closeQuickSearch();goPage(page);}
function renderQuickSearch(){
  const el=document.getElementById('quickSearchResults');if(!el)return;const q=String(document.getElementById('quickSearchInput')?.value||'').trim().toLowerCase();
  const pages=[['home','🏠','الرئيسية'],['students','👥','الطلاب'],['checkin','✅','الحضور'],['session','📖','بدء حصة'],['reports','📊','التقارير'],['tasks','☑️','المهام'],['settings','⚙️','الإعدادات']];
  const pageMatches=pages.filter(x=>!q||x[2].includes(q)).slice(0,5);
  const stMatches=students.filter(s=>!q||`${s.name} ${s.parent||''} ${s.group||''}`.toLowerCase().includes(q)).slice(0,7);
  const taskMatches=tasks.filter(t=>!q||`${t.title} ${t.notes||''}`.toLowerCase().includes(q)).slice(0,5);
  el.innerHTML=`<div class="command-section"><span>تنقل سريع</span>${pageMatches.map(x=>`<button onclick="quickGo('${x[0]}')"><i>${x[1]}</i><b>${x[2]}</b><small>فتح</small></button>`).join('')}</div>`+
    (stMatches.length?`<div class="command-section"><span>الطلاب</span>${stMatches.map(st=>`<button onclick="quickOpenStudent('${esc(st.id)}')"><i>👤</i><b>${esc(st.name)}</b><small>${esc(st.group||st.level||'')}</small></button>`).join('')}</div>`:'')+
    (taskMatches.length?`<div class="command-section"><span>المهام</span>${taskMatches.map(t=>`<button onclick="quickOpenTask('${esc(t.id)}')"><i>${t.done?'✅':'☑️'}</i><b>${esc(t.title)}</b><small>${esc(t.dueDate||'بدون موعد')}</small></button>`).join('')}</div>`:'');
}

function setupKeyboardShortcuts(){
  document.addEventListener('keydown',e=>{
    const tag=document.activeElement?.tagName,typing=['INPUT','TEXTAREA','SELECT'].includes(tag);
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openQuickSearch();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'&&!typing){e.preventDefault();openAddSt();return;}
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&curPage==='session'){e.preventDefault();saveSession();return;}
    if(e.altKey&&/^[1-6]$/.test(e.key)){e.preventDefault();const pages=['home','students','checkin','session','reports','settings'];goPage(pages[Number(e.key)-1]);return;}
    if(e.key==='Escape'){
      const open=[...document.querySelectorAll('.mo.open')].pop();if(open){open.classList.remove('open');return;}
      if(curPage==='profile'||curPage==='compare'||curPage==='tasks')goBack();
    }
  });
}
function setupPlatformUX(){
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  document.body.classList.toggle('standalone-app',!!standalone);
  document.body.classList.toggle('touch-device',matchMedia?.('(pointer: coarse)').matches||false);
  refreshGroupOptions();updateTaskBadge();
}
async function renderPlatformStatus(){
  const el=document.getElementById('platformStatus');if(!el)return;
  const ua=(navigator.userAgentData?.platform||navigator.platform||navigator.userAgent||'').toLowerCase(),platform=ua.includes('win')?'Windows':ua.includes('android')?'Android':ua.includes('iphone')||ua.includes('ipad')?'iOS':'متصفح ويب';
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  let storage='غير متاح',persist='غير معروف';
  try{if(navigator.storage?.estimate){const e=await navigator.storage.estimate();const used=(e.usage||0)/1048576,quota=(e.quota||0)/1048576;storage=`${used.toFixed(1)} MB / ${quota>=1024?(quota/1024).toFixed(1)+' GB':quota.toFixed(0)+' MB'}`;}if(navigator.storage?.persisted)persist=(await navigator.storage.persisted())?'محمي':'قابل للتنظيف';}catch(_){}
  el.innerHTML=`<div><span>النظام</span><b>${esc(platform)}</b></div><div><span>وضع التشغيل</span><b>${standalone?'تطبيق مثبت':'داخل المتصفح'}</b></div><div><span>الاتصال</span><b>${navigator.onLine?'متصل':'بدون إنترنت'}</b></div><div><span>التخزين</span><b>${esc(storage)}</b></div><div><span>حماية التخزين</span><b>${esc(persist)}</b></div><div><span>الإصدار</span><b>${APP_VERSION}</b></div>`;
}
async function requestPersistentStorage(){
  if(!navigator.storage?.persist){toast('هذا المتصفح لا يدعم طلب حماية التخزين','info');return;}
  try{const ok=await navigator.storage.persist();toast(ok?'تم طلب حماية البيانات المحلية بنجاح':'لم يمنح المتصفح حماية دائمة للتخزين',ok?'success':'info');renderPlatformStatus();}catch(_){toast('تعذر تغيير حالة التخزين','error');}
}
function buildBackupFile(){const data=JSON.stringify(backupPayload(),null,2);return new File([data],`quran-backup-v${SCHEMA_VERSION}-${localDateKey()}.json`,{type:'application/json'});}
async function shareBackup(){
  const file=buildBackupFile();
  try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'نسخة احتياطية — أكاديمية الإمام',text:'نسخة احتياطية لبيانات أكاديمية الإمام',files:[file]});toast('تم فتح المشاركة','success');return;}}catch(e){if(e?.name==='AbortError')return;}
  exportData();toast('المشاركة بالملفات غير مدعومة هنا؛ تم تنزيل النسخة بدلاً منها','info');
}

// ══════════════════════════════════════
// v7.1 — SIMPLIFIED RECITATION WORKFLOW
// فصل مراجعة الأجزاء عن السور + استكمال ذكي + اتجاه المراجعة
// ══════════════════════════════════════
function normalizeJuzChip(raw){
  let c=String(raw||'').trim().replace(/^جزء\s*:\s*/,'').trim();
  if(!c)return'';
  if(JZ.includes(c))return c;
  const m=c.match(/^(?:الجزء|جزء)?\s*(\d{1,2})$/);
  if(m){const n=Number(m[1]);return n>=1&&n<=30?JZ[n-1]:'';}
  const aliases={
    'عم':'جزء عمّ','عمّ':'جزء عمّ','تبارك':'جزء تبارك','قد سمع':'جزء قد سمع',
    'قال فما خطبكم':'جزء قال فما خطبكم','حم':'جزء حم','إليه يرد':'جزء إليه يرد'
  };
  if(aliases[c])return aliases[c];
  if(!c.startsWith('جزء '))c='جزء '+c;
  return JZ.includes(c)?c:'';
}
function normalizeSurahReviewChip(raw){
  let c=String(raw||'').trim().replace(/^سورة\s+/,'').trim();
  const idx=getSurahIndex(c);return idx>=0?'سورة '+S[idx].n:'';
}
function directionLabel(key,dir){
  if(key==='juz')return dir===-1?'↑ نحو الجزء السابق':'↓ نحو الجزء التالي';
  return dir===-1?'↑ نحو السورة السابقة في المصحف':'↓ نحو السورة التالية في المصحف';
}
function setDirection(key,dir){
  reviewDirections[key]=dir===-1?-1:1;
  renderDirections();scheduleDraftSave();
}
function renderDirections(){
  ['new','rec','far','juz','surahReview'].forEach(key=>{
    const dir=reviewDirections[key]===-1?-1:1;
    document.getElementById(`dir-${key}-up`)?.classList.toggle('selected',dir===-1);
    document.getElementById(`dir-${key}-down`)?.classList.toggle('selected',dir===1);
    const txt=document.getElementById(`dir-${key}-text`);if(txt)txt.textContent=directionLabel(key,dir);
  });
}
function fillJuzSelect(){
  const el=document.getElementById('juz-j');if(!el)return;
  el.innerHTML='<option value="">— اختر الجزء باسمه —</option>'+JZ.map((j,i)=>`<option value="${i}">${esc(j)}</option>`).join('');
}
function fillSurahSelects(){
  const dl=document.getElementById('surahList');
  if(dl)dl.innerHTML=S.map((x,i)=>`<option value="${esc(x.n)}">${i+1}. سورة ${esc(x.n)}</option>`).join('');
  ['new','rec','far'].forEach(k=>{
    const input=document.getElementById(k+'-s');if(!input)return;
    input.addEventListener('blur',()=>setTimeout(()=>closeSurahDropdown(k),180));
  });
  renderSurahChecklist();
}
function openSurahDropdown(key){
  const el=document.getElementById(`${key}-surah-dropdown`);if(!el)return;
  el.classList.add('open');filterSurahDropdown(key);
}
function closeSurahDropdown(key){document.getElementById(`${key}-surah-dropdown`)?.classList.remove('open');}
function toggleSurahDropdown(key){const el=document.getElementById(`${key}-surah-dropdown`);if(!el)return;el.classList.contains('open')?closeSurahDropdown(key):openSurahDropdown(key);document.getElementById(key+'-s')?.focus();}
function filterSurahDropdown(key){
  const input=document.getElementById(key+'-s'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el)return;
  input.dataset.userTouched='1';
  const q=normalizeSurahName(input.value);const rows=S.map((surah,i)=>({surah,i})).filter(x=>!q||x.surah.n.includes(q)||String(x.i+1).includes(q)).slice(0,114);
  el.innerHTML=rows.map(({surah,i})=>`<button type="button" onmousedown="event.preventDefault();selectSurahOption('${key}',${i})"><b>${i+1}</b><span>سورة ${esc(surah.n)}</span><small>${surah.a} آية</small></button>`).join('')||'<div class="surah-dropdown-empty">لا توجد سورة مطابقة</div>';
  el.classList.add('open');
}
function selectSurahOption(key,i){
  if(!S[i])return;const input=document.getElementById(key+'-s');if(!input)return;
  input.value=S[i].n;input.dataset.userTouched='1';fillAyah(key);closeSurahDropdown(key);scheduleDraftSave();
}
function setSectionAutoValue(key,surahIndex,from,to=''){
  if(!S[surahIndex])return;
  secOn[key]=true;updateTogs();
  const input=document.getElementById(key+'-s');if(!input)return;
  input.value=S[surahIndex].n;input.dataset.userTouched='0';fillAyah(key);
  const full=document.getElementById(key+'-full');if(full){full.checked=false;toggleFull(key);}
  const f=document.getElementById(key+'-f'),t=document.getElementById(key+'-t');if(f)f.value=String(Math.max(1,Math.min(S[surahIndex].a,Number(from)||1)));if(t)t.value=to===''?'':String(to);
}
function updateTogs(){
  ['new','rec','far','juz','surahReview'].forEach(k=>{
    const tog=document.getElementById('tog-'+k),bod=document.getElementById('bod-'+k);if(!tog||!bod)return;
    tog.classList.toggle('on',!!secOn[k]);bod.style.display=secOn[k]?'block':'none';
  });
  renderDirections();
}
function togSec(k){
  secOn[k]=!secOn[k];updateTogs();
  if(secOn[k]&&['new','rec','far'].includes(k))openSurahDropdown(k);
  if(k==='surahReview'&&secOn[k])renderSurahChecklist();
  scheduleDraftSave();
}
function resetSession(){
  draftSuspend=true;editingSessionId=null;
  grades={new:'',rec:'',far:'',juz:''};prevGrades={new:'',rec:'',far:'',juz:'',surahReview:''};actualRecitation={new:null,rec:null,far:null};
  secOn={new:true,rec:false,far:false,juz:false,surahReview:false};juzChips=[];surahReviewChips=[];reviewDirections={new:1,rec:1,far:1,juz:1,surahReview:1};sesStatus='حضر';
  const notes=document.getElementById('sesNotes');if(notes)notes.value='';
  document.querySelectorAll('.gb').forEach(b=>b.classList.remove('sel'));
  ['new','rec','far'].forEach(k=>{
    const se=document.getElementById(k+'-s');if(se){se.value='';se.dataset.userTouched='0';}
    const f=document.getElementById(k+'-f');if(f){f.value='';f.max=999;}const t=document.getElementById(k+'-t');if(t){t.value='';t.max=999;}
    const fc=document.getElementById(k+'-full');if(fc)fc.checked=false;const rng=document.getElementById(k+'-range');if(rng)rng.style.display='none';
    const hint=document.getElementById(k+'-auto-hint');if(hint)hint.textContent='';closeSurahDropdown(k);
  });
  const search=document.getElementById('surah-review-search');if(search)search.value='';
  renderChips();renderSurahChecklist();updateTogs();setStatusUI('حضر');
  document.getElementById('absentNotice').style.display='none';document.getElementById('sesContent').style.display='block';document.getElementById('repeatBar').style.display='none';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 حفظ الحصة';setDraftState('جاهز','');draftSuspend=false;
}
function paintPrevGrades(){
  Object.entries(prevGrades||{}).forEach(([key,g])=>document.querySelectorAll(`#pgr-${key} .gb`).forEach(b=>b.classList.toggle('sel',b.dataset.g===g)));
}
function onSesSt(){
  curStId=document.getElementById('sesSt').value;const dateKey=document.getElementById('sesDate')?.value||localDateKey();resetSession();
  if(!curStId){document.getElementById('prevContent').innerHTML='<div class="txt-mut" style="text-align:center;padding:10px">اختر الطالب لعرض تكليف الحصة السابقة</div>';return;}
  const existing=findDailySession(curStId,dateKey);editingSessionId=existing?.id||null;loadPrevTask(existing?.id||'');
  const prev=getPreviousPresentSession(curStId,dateKey,existing?.id||'');if(prev?.directions)reviewDirections={...reviewDirections,...prev.directions};renderDirections();
  const rb=document.getElementById('repeatBar');if(prev&&(prev.new||prev.rec||prev.far||prev.juz||prev.surahReview)){const d=new Date(prev.date).toLocaleDateString('ar-EG',{month:'short',day:'numeric'});document.getElementById('repeatHint').textContent=`آخر حصة: ${d} — اضغط لملء الحقول`;rb.style.display='flex';}else rb.style.display='none';
  draftSuspend=true;if(existing)applySessionToEditor(existing);const restored=restoreDraft(existing);draftSuspend=false;
  if(restored)setDraftState('تم استعادة مسودة أحدث','editing');else if(existing)setDraftState('تعديل حصة مسجلة','editing');else setDraftState(prev?'قيّم التسميع وسيُقترح التكليف التالي تلقائياً':'جاهز — ابدأ بإدخال التكليف','saved');
}
function applySessionToEditor(ses){
  if(!ses)return;sesStatus=ses.status||'حضر';setStatusUI(sesStatus);const isAbsent=sesStatus!=='حضر';document.getElementById('absentNotice').style.display=isAbsent?'block':'none';document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  const btn=document.getElementById('saveSessionBtn');if(btn)btn.textContent='💾 تحديث الحصة';
  prevGrades={new:'',rec:'',far:'',juz:'',surahReview:'',...(ses.prevGrades||{})};actualRecitation={new:null,rec:null,far:null,...(ses.actualRecitation||{})};
  reviewDirections={new:1,rec:1,far:1,juz:1,surahReview:1,...(ses.directions||{})};secOn={new:false,rec:false,far:false,juz:false,surahReview:false};juzChips=[];surahReviewChips=[];
  ['new','rec','far'].forEach(k=>{const x=ses[k];if(!x)return;const idx=S.findIndex(q=>q.n===x.surah);if(idx<0)return;secOn[k]=true;document.getElementById(k+'-s').value=x.surah;document.getElementById(k+'-s').dataset.userTouched='1';fillAyah(k);const full=!!x.full||(parseInt(x.from)===1&&parseInt(x.to)===S[idx].a);document.getElementById(k+'-full').checked=full;toggleFull(k);if(!full){document.getElementById(k+'-f').value=x.from;document.getElementById(k+'-t').value=x.to;}});
  if(ses.juz?.chips?.length){secOn.juz=true;juzChips=ses.juz.chips.map(normalizeJuzChip).filter(Boolean);}
  if(ses.surahReview?.chips?.length){secOn.surahReview=true;surahReviewChips=ses.surahReview.chips.map(normalizeSurahReviewChip).filter(Boolean);}
  if(!ses.new&&!ses.rec&&!ses.far&&!ses.juz&&!ses.surahReview)secOn.new=true;
  updateTogs();renderChips();renderSurahChecklist();paintPrevGrades();applyActualRecitationToFields(ses.actualRecitation||{});document.getElementById('sesNotes').value=ses.notes||'';
}
function captureDraft(){
  const fields={};['new','rec','far'].forEach(k=>{fields[k]={surah:document.getElementById(k+'-s')?.value||'',from:document.getElementById(k+'-f')?.value||'',to:document.getElementById(k+'-t')?.value||'',full:!!document.getElementById(k+'-full')?.checked};});
  const actual={};['new','rec','far'].forEach(k=>{const x=readActualSection(k);if(x)actual[k]=x;});
  return{savedAt:new Date().toISOString(),editingSessionId,sesStatus,secOn:{...secOn},prevGrades:{...prevGrades},actualRecitation:actual,juzChips:[...juzChips],surahReviewChips:[...surahReviewChips],directions:{...reviewDirections},notes:document.getElementById('sesNotes')?.value||'',fields};
}
function applyDraft(d){
  if(!d)return;sesStatus=d.sesStatus||'حضر';setStatusUI(sesStatus);const isAbsent=sesStatus!=='حضر';document.getElementById('absentNotice').style.display=isAbsent?'block':'none';document.getElementById('sesContent').style.display=isAbsent?'none':'block';
  secOn={new:true,rec:false,far:false,juz:false,surahReview:false,...(d.secOn||{})};prevGrades={new:'',rec:'',far:'',juz:'',surahReview:'',...(d.prevGrades||{})};actualRecitation={new:null,rec:null,far:null,...(d.actualRecitation||{})};juzChips=[...(d.juzChips||[])].map(normalizeJuzChip).filter(Boolean);surahReviewChips=[...(d.surahReviewChips||[])].map(normalizeSurahReviewChip).filter(Boolean);reviewDirections={new:1,rec:1,far:1,juz:1,surahReview:1,...(d.directions||{})};updateTogs();
  ['new','rec','far'].forEach(k=>{const f=d.fields?.[k]||{},se=document.getElementById(k+'-s');if(!se)return;se.value=f.surah??'';se.dataset.userTouched=se.value?'1':'0';if(se.value!=='')fillAyah(k);const fc=document.getElementById(k+'-full');if(fc)fc.checked=!!f.full;toggleFull(k);if(document.getElementById(k+'-f'))document.getElementById(k+'-f').value=f.from||'';if(document.getElementById(k+'-t'))document.getElementById(k+'-t').value=f.to||'';});
  renderChips();renderSurahChecklist();paintPrevGrades();applyActualRecitationToFields(d.actualRecitation||{});document.getElementById('sesNotes').value=d.notes||'';
}
function addJuz(){
  const v=document.getElementById('juz-j')?.value;if(v===''||!JZ[Number(v)])return;const name=JZ[Number(v)];if(!juzChips.includes(name))juzChips.push(name);document.getElementById('juz-j').value='';renderJuzChips();scheduleDraftSave();
}
function renderJuzChips(){const el=document.getElementById('juz-chips');if(el)el.innerHTML=juzChips.map((c,i)=>`<span class="chip">${esc(c)}<span class="chip-x" onclick="rmJuzChip(${i})">✕</span></span>`).join('');}
function rmJuzChip(i){juzChips.splice(i,1);renderJuzChips();scheduleDraftSave();}
function renderSurahChecklist(){
  const el=document.getElementById('surah-review-list');if(!el)return;const q=normalizeSurahName(document.getElementById('surah-review-search')?.value||'');const picked=new Set(surahReviewChips.map(c=>c.replace(/^سورة\s+/,'')));
  const rows=S.map((surah,i)=>({surah,i})).filter(x=>!q||x.surah.n.includes(q));
  el.innerHTML=rows.map(({surah,i})=>`<label class="surah-check-item"><input type="checkbox" ${picked.has(surah.n)?'checked':''} onchange="toggleReviewSurah(${i},this.checked)"><span>${i+1}. ${esc(surah.n)}</span></label>`).join('')||'<div class="txt-mut" style="padding:10px">لا توجد سورة مطابقة</div>';syncSurahReviewCount();
}
function toggleReviewSurah(i,checked){if(!S[i])return;const chip='سورة '+S[i].n,at=surahReviewChips.indexOf(chip);if(checked&&at<0)surahReviewChips.push(chip);if(!checked&&at>=0)surahReviewChips.splice(at,1);renderSurahReviewChips();scheduleDraftSave();}
function selectJuzAmmaSurahs(){S.slice(77).forEach(x=>{const c='سورة '+x.n;if(!surahReviewChips.includes(c))surahReviewChips.push(c);});renderSurahReviewChips();renderSurahChecklist();toast('تم تحديد سور جزء عمّ','success');scheduleDraftSave();}
function clearSelectedSurahs(){surahReviewChips=[];renderSurahReviewChips();renderSurahChecklist();scheduleDraftSave();}
function syncSurahReviewCount(){const el=document.getElementById('surah-review-count');if(el)el.textContent=`${surahReviewChips.length} سورة محددة`;}
function renderSurahReviewChips(){const el=document.getElementById('surah-review-chips');if(el)el.innerHTML=surahReviewChips.map((c,i)=>`<span class="chip">${esc(c)}<span class="chip-x" onclick="rmSurahReviewChip(${i})">✕</span></span>`).join('');syncSurahReviewCount();}
function rmSurahReviewChip(i){surahReviewChips.splice(i,1);renderSurahReviewChips();renderSurahChecklist();scheduleDraftSave();}
function renderChips(){renderJuzChips();renderSurahReviewChips();}
function readSection(k){
  if(!secOn[k])return null;const sel=document.getElementById(k+'-s');if(!sel||!sel.value.trim())return null;const idx=getSurahIndex(sel.value);if(idx<0)return null;const full=!!document.getElementById(k+'-full')?.checked;
  let from=full?1:parseInt(document.getElementById(k+'-f')?.value),to=full?S[idx].a:parseInt(document.getElementById(k+'-t')?.value);if(!full&&(!Number.isFinite(from)||!Number.isFinite(to)))return null;from=Math.max(1,Math.min(S[idx].a,from));to=Math.max(1,Math.min(S[idx].a,to));if(to<from)[from,to]=[to,from];return{surahId:idx+1,surah:S[idx].n,from,to,full};
}
function buildSesData(){
  const d={},n=readSection('new'),r=readSection('rec'),f=readSection('far');if(n)d.new=n;if(r)d.rec=r;if(f)d.far=f;
  if(secOn.juz&&juzChips.length)d.juz={chips:[...juzChips]};if(secOn.surahReview&&surahReviewChips.length)d.surahReview={chips:[...surahReviewChips]};
  d.notes=document.getElementById('sesNotes').value.trim();d.prevGrades={...prevGrades};d.directions={...reviewDirections};
  const actual={};['new','rec','far'].forEach(k=>{const x=readActualSection(k);if(x)actual[k]=x;});if(Object.keys(actual).length)d.actualRecitation=actual;return d;
}
function fillFromLast(){
  if(!curStId)return;const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=getPreviousPresentSession(curStId,dateKey,editingSessionId||'');if(!prev){toast('لا توجد حصة سابقة','error');return;}
  ['new','rec','far'].forEach(k=>{const x=prev[k];if(!x)return;secOn[k]=true;document.getElementById(k+'-s').value=x.surah;document.getElementById(k+'-s').dataset.userTouched='1';fillAyah(k);document.getElementById(k+'-full').checked=!!x.full;toggleFull(k);if(!x.full){document.getElementById(k+'-f').value=x.from;document.getElementById(k+'-t').value=x.to;}});
  if(prev.juz?.chips?.length){secOn.juz=true;juzChips=prev.juz.chips.map(normalizeJuzChip).filter(Boolean);}if(prev.surahReview?.chips?.length){secOn.surahReview=true;surahReviewChips=prev.surahReview.chips.map(normalizeSurahReviewChip).filter(Boolean);}reviewDirections={...reviewDirections,...(prev.directions||{})};updateTogs();renderChips();renderSurahChecklist();scheduleDraftSave();toast('تم تحميل التكليف السابق ✓','success');vibrate([30,20,60]);
}
function loadPrevTask(excludeId=''){
  if(!curStId)return;const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=getPreviousPresentSession(curStId,dateKey,excludeId),el=document.getElementById('prevContent');actualRecitation={new:null,rec:null,far:null};
  if(!prev){el.innerHTML='<div class="txt-mut" style="padding:8px;text-align:center">لا توجد حصة سابقة</div>';return;}
  const d=new Date(prev.date).toLocaleDateString('ar-EG',{weekday:'long',month:'long',day:'numeric'});let html=`<div class="txt-mut mb8">التكليف من حصة: ${d}</div>`;
  const sections=[{key:'new',label:'📖 الحفظ الجديد'},{key:'rec',label:'📚 المراجعة القريبة'},{key:'far',label:'📘 المراجعة البعيدة'},{key:'juz',label:'📜 مراجعة الأجزاء'},{key:'surahReview',label:'🕌 مراجعة السور'}];let hasAny=false;
  sections.forEach(({key,label})=>{if(!prev[key])return;hasAny=true;const x=prev[key];if(['new','rec','far'].includes(key))actualRecitation[key]={surahId:x.surahId||S.findIndex(q=>q.n===x.surah)+1,surah:x.surah,from:Number(x.from)||1,to:Number(x.to)||Number(x.from)||1,full:!!x.full};
    const desc=['juz','surahReview'].includes(key)?(x.chips||[]).map(c=>esc(c)).join('، '):x.full?`سورة ${esc(x.surah)} كاملة`:`سورة ${esc(x.surah)} من الآية ${esc(x.from)} إلى الآية ${esc(x.to)}`;
    const actual=['new','rec','far'].includes(key)?actualBlockHTML(key,x):'';
    html+=`<div class="prev-task-card" id="prev-task-${key}"><div style="font-weight:700;margin-bottom:6px;font-size:13px">${label}</div><div class="assigned-range">المطلوب: ${desc}</div>${actual}<div class="assessment-label">تقييم التسميع</div><div class="gbs" id="pgr-${key}">${['ممتاز','جيد جداً','جيد','ضعيف'].map(g=>`<div class="gb" data-g="${g}" onclick="setPrevGr('${key}','${g}')">${g==='ممتاز'?'⭐ ':''}${g}</div>`).join('')}</div></div>`;
  });
  if(!hasAny)html+='<div class="txt-mut">لا يوجد تكليف للحصة السابقة</div>';el.innerHTML=html;['new','rec','far'].forEach(updateActualResult);paintPrevGrades();
}
function setPrevGr(key,g){
  prevGrades[key]=g;document.querySelectorAll(`#pgr-${key} .gb`).forEach(b=>b.classList.toggle('sel',b.dataset.g===g));
  smartContinueFromAssessment(key,g);scheduleDraftSave();
}
function isPassingGrade(g){return g==='ممتاز'||g==='جيد جداً'||g==='جيد';}
function smartContinueFromAssessment(key,grade){
  if(!isPassingGrade(grade)){
    if(['new','rec','far'].includes(key)){const hint=document.getElementById(key+'-auto-hint');if(hint)hint.textContent='لم يتم التقديم تلقائيًا لأن التقييم ضعيف؛ حدّد التكليف التالي يدويًا.';}
    return;
  }
  if(!curStId)return;const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=getPreviousPresentSession(curStId,dateKey,editingSessionId||'');if(!prev?.[key])return;const dir=reviewDirections[key]===-1?-1:1;
  if(['new','rec','far'].includes(key)){
    const assigned=prev[key],actual=readActualSection(key)||actualRecitation[key]||assigned,idx=S.findIndex(x=>x.n===actual.surah);if(idx<0)return;
    const reachedEnd=Number(actual.to)>=S[idx].a||actual.full;
    if(reachedEnd){const next=idx+dir;if(next<0||next>=S.length){toast('وصلت إلى طرف ترتيب السور؛ اختر السورة التالية يدويًا','info');return;}setSectionAutoValue(key,next,1,'');const hint=document.getElementById(key+'-auto-hint');if(hint)hint.textContent=`استكمال تلقائي: ${directionLabel(key,dir)} — حدّد آية النهاية بنفسك.`;}
    else{setSectionAutoValue(key,idx,Number(actual.to)||Number(assigned.to)||1,'');const hint=document.getElementById(key+'-auto-hint');if(hint)hint.textContent=`استكمال تلقائي من آخر آية تم تسميعها (${Number(actual.to)||Number(assigned.to)||1}) — آية النهاية متروكة لك.`;}
    return;
  }
  if(key==='juz'){
    const chips=(prev.juz?.chips||[]).map(normalizeJuzChip).filter(Boolean);if(!chips.length)return;const idx=JZ.indexOf(chips[chips.length-1]),next=idx+dir;if(next<0||next>=JZ.length){toast('وصلت إلى أول/آخر الأجزاء','info');return;}secOn.juz=true;juzChips=[JZ[next]];updateTogs();renderJuzChips();return;
  }
  if(key==='surahReview'){
    const chips=(prev.surahReview?.chips||[]).map(normalizeSurahReviewChip).filter(Boolean);if(!chips.length)return;const last=chips[chips.length-1].replace(/^سورة\s+/,''),idx=S.findIndex(x=>x.n===last),next=idx+dir;if(next<0||next>=S.length){toast('وصلت إلى طرف ترتيب السور','info');return;}secOn.surahReview=true;surahReviewChips=['سورة '+S[next].n];updateTogs();renderSurahReviewChips();renderSurahChecklist();
  }
}
function buildSumText(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'❌ غائب':ses.status==='إجازة'?'🌙 إجازة':ses.status||'غير حاضر';const parts=[],fmt=sec=>sec.full?`${sec.surah} كاملة`:`${sec.surah}(${sec.from}-${sec.to})`;
  if(ses.new)parts.push(`حفظ: ${fmt(ses.new)}`);if(ses.rec)parts.push(`مراجعة قريبة: ${fmt(ses.rec)}`);if(ses.far)parts.push(`مراجعة بعيدة: ${fmt(ses.far)}`);if(ses.juz)parts.push(`أجزاء: ${(ses.juz.chips||[]).join('، ')}`);if(ses.surahReview)parts.push(`سور: ${(ses.surahReview.chips||[]).join('، ')}`);return parts.join(' · ')||'حصة مسجلة';
}
function buildSumHTML(ses){
  if(ses.status!=='حضر')return ses.status==='غاب'?'<span style="color:var(--red)">❌ غائب</span>':'<span style="color:var(--gold)">🌙 إجازة</span>';const parts=[],fmt=sec=>sec.full?`سورة ${esc(sec.surah)} كاملة`:`سورة ${esc(sec.surah)} (${esc(sec.from)}–${esc(sec.to)})`,pg=ses.prevGrades||{};
  if(Object.values(pg).some(Boolean)){const x=[];if(pg.new)x.push(`الحفظ: ${esc(pg.new)}${ses.actualRecitation?.new?' — '+fmt(ses.actualRecitation.new):''}`);if(pg.rec)x.push(`المراجعة القريبة: ${esc(pg.rec)}${ses.actualRecitation?.rec?' — '+fmt(ses.actualRecitation.rec):''}`);if(pg.far)x.push(`المراجعة البعيدة: ${esc(pg.far)}${ses.actualRecitation?.far?' — '+fmt(ses.actualRecitation.far):''}`);if(pg.juz)x.push(`الأجزاء: ${esc(pg.juz)}`);if(pg.surahReview)x.push(`السور: ${esc(pg.surahReview)}`);if(x.length)parts.push(`⭐ نتيجة التسميع: ${x.join(' · ')}`);}
  if(ses.new)parts.push(`📖 ${fmt(ses.new)}`);if(ses.rec)parts.push(`📚 ${fmt(ses.rec)}`);if(ses.far)parts.push(`📘 ${fmt(ses.far)}`);if(ses.juz)parts.push(`📜 ${(ses.juz.chips||[]).map(c=>esc(c)).join('، ')}`);if(ses.surahReview)parts.push(`🕌 ${(ses.surahReview.chips||[]).map(c=>esc(c)).join('، ')}`);if(ses.notes)parts.push(`💬 <em>${esc(ses.notes)}</em>`);return parts.join('<br>')||'حصة مسجلة';
}
function getAssessmentGrades(ses){
  const pg=ses?.prevGrades||{},assessed=[pg.new,pg.rec,pg.far,pg.juz,pg.surahReview].filter(Boolean);if(assessed.length)return assessed;return[ses?.new?.grade,ses?.rec?.grade,ses?.far?.grade,ses?.juz?.grade,ses?.surahReview?.grade].filter(Boolean);
}
function renderHomeAnalysis(){
  const now=new Date(),weekAgo=new Date();weekAgo.setHours(0,0,0,0);weekAgo.setDate(weekAgo.getDate()-6);const week=sessions.filter(s=>new Date(s.date)>=weekAgo),present=week.filter(s=>s.status==='حضر'),absent=week.filter(s=>s.status==='غاب');
  const month=sessions.filter(s=>{const d=new Date(s.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&s.status==='حضر';});const vals=month.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean);const avg=vals.length?gradeLabel(vals.reduce((a,b)=>a+b,0)/vals.length):'—';const newAyat=countUniqueAyatFromSessions(month);
  const valsById={anWeekPresent:present.length,anWeekAbsent:absent.length,anAvgGrade:avg,anNewAyat:newAyat};Object.entries(valsById).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
}
function renderSmartHub(){updateTaskBadge();}
function academyFooter(){return `\n\n━━━━━━━━━━━━━━━━━━\n🏛️ *${ACADEMY_NAME}*\n🌿 *${ACADEMY_TAGLINE}*\nنسأل الله أن يجعل أبناءنا من أهل القرآن وخاصته.`;}
function buildWAMsg(s,ses){
  const d=new Date(ses?ses.date:Date.now()).toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),tmpl=settings.waTemplate||'';
  if(tmpl.trim()){
    const newTxt=ses?.new?`📖 الحفظ الجديد: ${fmtSection(ses.new)}`:'',recTxt=ses?.rec?`📚 المراجعة القريبة: ${fmtSection(ses.rec)}`:'',farTxt=ses?.far?`📘 المراجعة البعيدة: ${fmtSection(ses.far)}`:'';
    let out=tmpl.replace(/{{اسم_الطالب}}/g,s.name).replace(/{{التاريخ}}/g,d).replace(/{{الحفظ_الجديد}}/g,newTxt).replace(/{{المراجعة_القريبة}}/g,recTxt).replace(/{{المراجعة_البعيدة}}/g,farTxt).replace(/{{الملاحظات}}/g,ses?.notes||'').replace(/{{اسم_المحفظ}}/g,settings.name||'').replace(/{{مستوى_التسميع}}/g,gradeLabel(getAssessmentAverage(ses||{}))).replace(/{{إجمالي_الآيات}}/g,`${calcTotalAyat(s.id)} آية`).replace(/{{نسبة_الحفظ}}/g,gradeLabel(getAssessmentAverage(ses||{}))).replace(/{{نسبة_الإنجاز}}/g,`${calcTotalAyat(s.id)} آية`);
    return out+academyFooter();
  }
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n✨ متابعة الطالب: *${s.name}*\n📅 ${d}\n\n━━━━━━━━━━━━━━━━━━`;
  const pg=ses?.prevGrades||{},hasPrev=pg.new||pg.rec||pg.far||pg.juz||pg.surahReview;if(hasPrev){msg+=`\n\n🎧 *نتيجة التسميع:*\n`;if(pg.new)msg+=`📖 الحفظ: ${grIcon(pg.new)} ${pg.new}${ses.actualRecitation?.new?' — '+fmtSection(ses.actualRecitation.new):''}\n`;if(pg.rec)msg+=`📚 المراجعة القريبة: ${grIcon(pg.rec)} ${pg.rec}${ses.actualRecitation?.rec?' — '+fmtSection(ses.actualRecitation.rec):''}\n`;if(pg.far)msg+=`📘 المراجعة البعيدة: ${grIcon(pg.far)} ${pg.far}${ses.actualRecitation?.far?' — '+fmtSection(ses.actualRecitation.far):''}\n`;if(pg.juz)msg+=`📜 مراجعة الأجزاء: ${grIcon(pg.juz)} ${pg.juz}\n`;if(pg.surahReview)msg+=`🕌 مراجعة السور: ${grIcon(pg.surahReview)} ${pg.surahReview}\n`;msg+=`\n━━━━━━━━━━━━━━━━━━`;}
  msg+=`\n\n📝 *تكليف الحصة القادمة:*\n`;let hasTak=false;if(ses?.new){hasTak=true;msg+=`\n📖 *الحفظ الجديد:*\n${fmtSection(ses.new)}\n`;}if(ses?.rec){hasTak=true;msg+=`\n📚 *المراجعة القريبة:*\n${fmtSection(ses.rec)}\n`;}if(ses?.far){hasTak=true;msg+=`\n📘 *المراجعة البعيدة:*\n${fmtSection(ses.far)}\n`;}if(ses?.juz){hasTak=true;msg+=`\n📜 *مراجعة الأجزاء:*\n${(ses.juz.chips||[]).join('، ')}\n`;}if(ses?.surahReview){hasTak=true;msg+=`\n🕌 *مراجعة السور:*\n${(ses.surahReview.chips||[]).join('، ')}\n`;}if(!hasTak)msg+=`لا يوجد تكليف جديد\n`;msg+=`\n━━━━━━━━━━━━━━━━━━`;if(ses?.notes)msg+=`\n\n💬 *ملاحظات المحفظ:*\n${ses.notes}\n\n━━━━━━━━━━━━━━━━━━`;msg+=`\n\nجزاكم الله خيراً 🤲`;if(settings.name)msg+=`\n— ${settings.name}`;return msg+academyFooter();
}
function broadcastPresetText(type){
  const academy=settings.circle||ACADEMY_NAME,footer=`${academy}\n${ACADEMY_TAGLINE}`;const map={
    general:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\n\n[اكتب رسالتك هنا]\n\nجزاكم الله خيرًا.\n${footer}`,
    schedule:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\nنحيطكم علمًا بتغيير موعد الحصة.\n\n🕐 الموعد الجديد: [اكتب اليوم والساعة]\n\nنرجو تأكيد الاطلاع، وجزاكم الله خيرًا.\n${footer}`,
    holiday:`السلام عليكم ورحمة الله وبركاته 🌿\n\nنحيطكم علمًا بأن الحصص ستكون إجازة في: [اكتب التاريخ/الفترة]\nوتُستأنف الحصص بإذن الله في: [اكتب الموعد].\n\nكل عام وأنتم بخير.\n${footer}`,
    greeting:`السلام عليكم ورحمة الله وبركاته 🌿\n\nيتقدم ${academy} بأطيب التهاني لأسرتكم الكريمة بمناسبة [اكتب المناسبة].\nنسأل الله أن يعيدها عليكم بالخير والبركة، وأن يجعل أبناءنا من أهل القرآن وخاصته.\n\n${ACADEMY_TAGLINE}`,
    course:`السلام عليكم ورحمة الله وبركاته 🌿\n\n📣 *إعلان من ${academy}*\n\nيسرنا الإعلان عن: [اسم الكورس/البرنامج]\n👥 الفئة: [اكتب الفئة]\n📅 البداية: [اكتب الموعد]\n📝 التفاصيل: [اكتب التفاصيل]\n\nللاستفسار والتسجيل يرجى التواصل معنا.\n${footer}`,
    reminder:`السلام عليكم ورحمة الله وبركاته 🌿\n\nتذكير لولي أمر الطالب {{اسم_الطالب}}:\n[اكتب التذكير هنا]\n\nجزاكم الله خيرًا.\n${footer}`
  };return map[type]||map.general;
}
function personalizeBroadcast(text,st){const last=[...sessions].filter(x=>x.studentId===st.id&&x.status==='حضر').sort((a,b)=>new Date(b.date)-new Date(a.date))[0],level=last?gradeLabel(getAssessmentAverage(last)):'—',ayat=calcTotalAyat(st.id);return String(text||'').replace(/{{اسم_الطالب}}/g,st.name||'').replace(/{{اسم_ولي_الأمر}}/g,st.parent||'ولي الأمر').replace(/{{مستوى_التسميع}}/g,level).replace(/{{إجمالي_الآيات}}/g,`${ayat} آية`).replace(/{{نسبة_الحفظ}}/g,level).replace(/{{نسبة_الإنجاز}}/g,`${ayat} آية`).replace(/{{اسم_المحفظ}}/g,settings.name||'').replace(/{{اسم_الأكاديمية}}/g,settings.circle||ACADEMY_NAME);}

// v7.1 — واجهات بلا نسب مئوية
function renderSt(q='',lvl='',group=''){
  const el=document.getElementById('stList');refreshGroupOptions();const nq=String(q||'').trim().toLowerCase();
  const list=students.filter(s=>(!nq||String(s.name||'').toLowerCase().includes(nq)||String(s.parent||'').toLowerCase().includes(nq)||String(s.group||'').toLowerCase().includes(nq))&&(!lvl||s.level===lvl)&&(!group||s.group===group));
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">👥</div><p>لا يوجد طلاب — اضغط + للإضافة</p></div>';return;}
  el.innerHTML=list.map(s=>{const init=s.name.trim().split(' ').slice(0,2).map(x=>x[0]).join(''),cls=s.level==='متقدم'?'lv1':s.level==='متوسط'?'lv2':'lv3',cnt=sessions.filter(x=>x.studentId===s.id&&x.status==='حضر').length,studentSes=sessions.filter(x=>x.studentId===s.id).sort((a,b)=>new Date(a.date)-new Date(b.date)),lastSes=studentSes.at(-1)||null,lastDate=lastSes?new Date(lastSes.date).toLocaleDateString('ar-EG',{month:'short',day:'numeric'}):'—',total=calcTotalAyat(s.id),daysSince=lastSes?Math.floor((Date.now()-new Date(lastSes.date))/86400000):999,urgency=daysSince>14?'urgency-red':daysSince>7?'urgency-yellow':'urgency-none';
    return `<div class="stc" onclick="openProf('${esc(s.id)}')"><div class="av" style="background:${avBg(s.id)};color:${avTx(s.id)}">${esc(init)}</div><div class="si"><div class="fb"><div class="sn2">${esc(s.name)}</div><div class="urgency-dot ${urgency}" title="${daysSince<999?daysSince+' يوم':'لا حصص'}"></div></div><div class="sm">آخر حصة: ${lastDate} · ${cnt} حضور · ${total} آية مُقيّمة</div>${s.group?`<span class="group-chip">👥 ${esc(s.group)}</span>`:''}${s.scheduleTime&&s.scheduleDays?.length?`<span class="schedule-chip">🕐 ${esc(s.scheduleTime)}</span>`:''}<div style="margin-top:5px"><span class="lv ${cls}">${esc(s.level)}</span></div></div><div style="color:var(--mut);font-size:20px">‹</div></div>`;
  }).join('');
}
function openProf(id){
  curStId=id;const s=students.find(x=>x.id===id);if(!s)return;const init=s.name.trim().split(' ').slice(0,2).map(x=>x[0]).join(''),cls=s.level==='متقدم'?'lv1':s.level==='متوسط'?'lv2':'lv3',stSes=sessions.filter(x=>x.studentId===id),present=stSes.filter(x=>x.status==='حضر').length,absent=stSes.filter(x=>x.status==='غاب').length,streak=calcStreakSt(id),total=calcTotalAyat(id);
  document.getElementById('profHdr').innerHTML=`<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div class="av" style="width:58px;height:58px;font-size:22px;background:${avBg(s.id)};color:${avTx(s.id)}">${esc(init)}</div><div><div style="font-size:19px;font-weight:800">${esc(s.name)}</div><span class="lv ${cls}">${esc(s.level)}</span>${streak>=3?`<span class="lv lv1" style="margin-right:4px">🔥 ${streak} أيام</span>`:''}</div></div>
    <div class="ir"><span class="ir-k">👨‍👦 ولي الأمر</span><span>${esc(s.parent||'—')}</span></div><div class="ir"><span class="ir-k">👥 المجموعة</span><span>${esc(s.group||'—')}</span></div><div class="ir"><span class="ir-k">📱 واتساب</span><span dir="ltr">${esc(s.phone)}</span></div><div class="ir"><span class="ir-k">📅 بداية الحفظ</span><span>${esc(s.startDate||'—')}</span></div><div class="ir"><span class="ir-k">🗓️ الموعد الأسبوعي</span><span>${esc(scheduleText(s))}</span></div><div class="ir"><span class="ir-k">✅ حضور</span><span>${present} حصة</span></div><div class="ir"><span class="ir-k">❌ غياب</span><span>${absent} مرة</span></div><div class="ir"><span class="ir-k">📖 آيات تم تقييمها</span><span>${total} آية</span></div><div class="ir"><span class="ir-k">📝 ملاحظات</span><span>${esc(s.notes||'—')}</span></div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-g btn-sm" onclick="startFor('${esc(id)}')">📖 ابدأ حصة</button><button class="btn btn-wa btn-sm" onclick="directWA('${esc(id)}')">📲 واتساب</button></div>`;
  document.getElementById('profTrack').innerHTML='<div class="ch">📈 الحفظ التراكمي</div>'+buildTrackHTML(id);renderWeakness(id);renderProfileChart(id);const hist=[...stSes].sort((a,b)=>new Date(b.date)-new Date(a.date));document.getElementById('profHist').innerHTML=`<div class="ch">📋 سجل الحصص (${stSes.length})</div>`+(!hist.length?'<div class="empty"><p>لا توجد حصص</p></div>':hist.map(ses=>{const d=new Date(ses.date).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}),icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';return `<div class="hi"><div class="fb"><span style="font-weight:700">${d} ${icon}</span></div><div class="hi-content">${buildSumHTML(ses)}</div></div>`;}).join(''));goPage('profile');
}
function buildTrackHTML(id){
  const total=calcTotalAyat(id),stSes=sessions.filter(x=>x.studentId===id&&x.status==='حضر'&&x.new).sort((a,b)=>new Date(a.date)-new Date(b.date)),assigned=countUniqueAyatFromSessions(stSes),lastNew=stSes.at(-1)||null,lastSurah=lastNew?`سورة ${esc(lastNew.new.surah)} (الآية ${esc(lastNew.new.to)})`:'—';
  return `<div class="ir"><span class="ir-k">✅ آيات تم تسميعها وتقييمها</span><span style="font-weight:700;color:var(--gm)">${total} آية</span></div><div class="ir"><span class="ir-k">📝 آيات كُلِّف بها</span><span>${assigned} آية</span></div><div class="ir"><span class="ir-k">📍 آخر موضع تكليف جديد</span><span>${lastSurah}</span></div>`;
}
function renderComparison(){
  const tbl=document.getElementById('compTbl');if(!tbl||!students.length){if(tbl)tbl.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--mut)">لا يوجد طلاب</td></tr>';return;}
  const data=students.map(st=>{const stSes=sessions.filter(x=>x.studentId===st.id),present=stSes.filter(x=>x.status==='حضر'),totalAyat=calcTotalAyat(st.id),gradeVals=present.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean),avgG=gradeVals.length?gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length:0;return{s:st,present:present.length,totalAyat,avgG,avgLabel:gradeLabel(avgG)};}).sort((a,b)=>b.totalAyat-a.totalAyat||b.avgG-a.avgG);const maxAyat=Math.max(...data.map(d=>d.totalAyat),1),medals=['🥇','🥈','🥉'];
  tbl.innerHTML=`<thead><tr><th>#</th><th>الطالب</th><th>آيات مُسمّعة</th><th>الحضور</th><th>متوسط التقييم</th></tr></thead><tbody>${data.map((d,i)=>`<tr><td><span class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${medals[i]||i+1}</span></td><td style="font-weight:700;cursor:pointer" onclick="openProf('${esc(d.s.id)}')">${esc(d.s.name)}</td><td><div style="font-weight:700;color:var(--gm)">${d.totalAyat}</div><div class="comp-bar"><div class="comp-fill" style="width:${Math.round(d.totalAyat/maxAyat*100)}%"></div></div></td><td>${d.present} حصة</td><td>${esc(d.avgLabel)}</td></tr>`).join('')}</tbody>`;
}
function openCert(){
  if(!curStId)return;const s=students.find(x=>x.id===curStId);if(!s)return;const total=calcTotalAyat(curStId),d=new Date().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}),verified=getVerifiedNewSections(curStId),lastVerified=verified.at(-1)||null,wصل=lastVerified?`سورة ${lastVerified.surah} الآية ${lastVerified.to}`:'—';
  document.getElementById('certContent').innerHTML=`<div class="cert-box"><div class="cert-seal">📿</div><div class="cert-title">شهادة تقدير</div><div class="cert-sub">${esc(settings.circle)||'حلقة تحفيظ القرآن الكريم'}</div><div class="cert-name">${esc(s.name)}</div><div class="cert-body">أتم بحمد الله تسميع وتقييم<br><strong style="font-size:18px;color:var(--gm)">${total} آية كريمة</strong><br>آخر موضع تم تقييمه: ${esc(wصل)}</div><div style="font-size:12px;color:var(--mut);margin-bottom:8px">📅 ${d}</div><div class="cert-teacher">${settings.name?'المحفظ: '+esc(settings.name):''}</div></div>`;document.getElementById('certModal').classList.add('open');
}
function renderReport(){
  const sid=document.getElementById('repSt').value,mv=document.getElementById('repMonth').value,el=document.getElementById('reportContent'),calCard=document.getElementById('calCard'),chartsEl=document.getElementById('reportCharts');if(!sid||!mv){el.innerHTML='<div class="empty"><div class="ei">📊</div><p>اختر الطالب والشهر</p></div>';calCard.style.display='none';chartsEl.innerHTML='';return;}
  const[y,m]=mv.split('-').map(Number),student=students.find(x=>x.id===sid),stSes=sessions.filter(x=>{if(x.studentId!==sid)return false;const d=new Date(x.date);return d.getFullYear()===y&&d.getMonth()===m;}).sort((a,b)=>new Date(a.date)-new Date(b.date));calCard.style.display='block';renderCalendar(sid,y,m);if(!stSes.length){el.innerHTML='<div class="card"><div class="empty"><p>لا توجد حصص في هذا الشهر</p></div></div>';chartsEl.innerHTML='';return;}
  const present=stSes.filter(x=>x.status==='حضر'),absent=stSes.filter(x=>x.status==='غاب'),vacation=stSes.filter(x=>x.status==='إجازة'),totalAyat=countUniqueAyatFromSessions(present),allGrades=present.flatMap(getAssessmentGrades),gradeVals=allGrades.map(g=>GRADE_MAP[g]||0).filter(Boolean),avgG=gradeVals.length?gradeVals.reduce((a,b)=>a+b,0)/gradeVals.length:0,avgLabel=gradeLabel(avgG),monthName=new Date(y,m,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});renderReportCharts(present.length,absent.length,vacation.length,present);
  let html=`<div class="card"><div class="ch">📊 تقرير ${esc(student?.name||'')} — ${monthName}</div><div class="month-stat"><div class="ms-item"><div class="ms-num">${present.length}</div><div class="ms-lbl">✅ حضور</div></div><div class="ms-item"><div class="ms-num">${absent.length}</div><div class="ms-lbl">❌ غياب</div></div><div class="ms-item"><div class="ms-num">${vacation.length}</div><div class="ms-lbl">🌙 إجازة</div></div><div class="ms-item"><div class="ms-num">${totalAyat}</div><div class="ms-lbl">📖 آيات تكليف جديد</div></div><div class="ms-item"><div class="ms-num">${stSes.length}</div><div class="ms-lbl">📅 إجمالي السجلات</div></div><div class="ms-item"><div class="ms-num" style="font-size:15px">${avgLabel}</div><div class="ms-lbl">⭐ متوسط التسميع</div></div></div><button class="btn btn-wa mt8" onclick="sendMonthlyReport('${esc(sid)}','${esc(mv)}')">📲 إرسال التقرير الشهري لولي الأمر</button></div><div class="card"><div class="ch">📋 تفصيل الحصص</div>`;[...stSes].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(ses=>{const d=new Date(ses.date).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'}),icon=ses.status==='حضر'?'✅':ses.status==='غاب'?'❌':'🌙';html+=`<div class="hi"><div class="fb"><span style="font-weight:700">${d} ${icon}</span></div><div class="hi-content txt-mut">${buildSumHTML(ses)}</div></div>`;});el.innerHTML=html+'</div>';
}
function sendMonthlyReport(sid,mv){
  const st=students.find(x=>x.id===sid);if(!st)return;const[y,m]=mv.split('-').map(Number),stSes=sessions.filter(x=>{if(x.studentId!==sid)return false;const d=new Date(x.date);return d.getFullYear()===y&&d.getMonth()===m;}).sort((a,b)=>new Date(a.date)-new Date(b.date)),present=stSes.filter(x=>x.status==='حضر'),absent=stSes.filter(x=>x.status==='غاب'),vacation=stSes.filter(x=>x.status==='إجازة'),totalAyat=countUniqueAyatFromSessions(present),vals=present.flatMap(getAssessmentGrades).map(g=>GRADE_MAP[g]||0).filter(Boolean),avgG=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,monthName=new Date(y,m,1).toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\n📊 *التقرير الشهري*\n✨ الطالب: ${st.name}\n📅 شهر: ${monthName}\n\n━━━━━━━━━━━━━━━━━━\n✅ أيام الحضور: ${present.length}\n❌ أيام الغياب: ${absent.length}\n🌙 الإجازات: ${vacation.length}\n📖 آيات التكليف الجديد الفريدة: ${totalAyat} آية\n⭐ متوسط التسميع: ${gradeLabel(avgG)}\n\n━━━━━━━━━━━━━━━━━━\n\n📋 تفصيل الحصص:\n`;stSes.forEach(s=>{const d=new Date(s.date).toLocaleDateString('ar-EG',{day:'numeric',month:'short'});msg+=`\n${d} — ${s.status}\n${buildSumText(s)}\n`;});msg+=academyFooter();openWhatsApp(st,msg);
}

// Bridge for the v8 feature layer. Captures the final v7.1-compatible implementations
// before v8.js intentionally overrides selected UI/workflow functions.
globalThis.__IMAM_BASE__={
  renderHome,renderHomeAnalysis,renderHomeCharts,initSettings,openAddSt,editSt,saveSt,openProf,renderSt,
  initSession,onSesSt,applySessionToEditor,captureDraft,applyDraft,buildSesData,saveSession,loadPrevTask,setPrevGr,
  smartContinueFromAssessment,buildWAMsg,fillFromLast,renderReport,renderComparison,academyFooter,save,
  fillAyah,fillSurahSelects,filterSurahDropdown,selectSurahOption,sanitizeBackupData,importData
};
