/* أكاديمية الإمام — Feature Layer v8.0.0
 * Local-first teaching cockpit + Quran text/audio + smart review + backups + optional encrypted sync.
 */
'use strict';

const V8_PLANS={
  balanced:{label:'متوازنة',icon:'⚖️',sections:{new:true,rec:true,far:true,juz:false,surahReview:false}},
  beginner:{label:'مبتدئ',icon:'🌱',sections:{new:true,rec:true,far:false,juz:false,surahReview:false}},
  intensive:{label:'حفظ مكثف',icon:'🚀',sections:{new:true,rec:true,far:true,juz:false,surahReview:true}},
  reviewOnly:{label:'مراجعة فقط',icon:'🔁',sections:{new:false,rec:true,far:true,juz:true,surahReview:true}},
  stabilize:{label:'ختمة تثبيت',icon:'🧱',sections:{new:false,rec:true,far:true,juz:true,surahReview:true}},
  shortSurahs:{label:'قصار السور',icon:'🌙',sections:{new:true,rec:true,far:false,juz:false,surahReview:true}}
};
const V8_ERROR_TYPES=['حفظ','تردد','تلقين','تجويد','تشكيل','نسيان آية'];
const V8_PASS_GRADES=new Set(['ممتاز','جيد جداً','جيد']);
const V8={
  inited:false,sessionErrors:[],voiceNoteId:'',pendingVoiceBlob:null,mediaRecorder:null,mediaChunks:[],recordStartedAt:0,
  quranRange:null,quranVerses:[],quranAudioQueue:[],quranAudioIndex:-1,quranFetchController:null,quranObjectURL:'',
  backupTimer:null,syncTimer:null,syncing:false,lastSyncWrite:0,hiddenAt:0,lockOpen:false,webAuthnChallenge:null,
  currentReportPrint:null
};

function v8Esc(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function v8Clamp(n,min,max){n=Number(n);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
function v8Now(){return new Date().toISOString();}
function v8Student(){return students.find(x=>x.id===curStId)||null;}
function v8Date(d){try{return new Date(d).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'});}catch(_){return '—';}}
function v8GradeScore(g){return GRADE_MAP[g]||0;}
function v8Plan(st){return V8_PLANS[st?.plan]||V8_PLANS.balanced;}
function v8NormArabic(s){return String(s||'').trim().replace(/^سورة\s+/,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ').toLowerCase();}
function v8SectionText(sec){if(!sec)return '—';return sec.full?`سورة ${sec.surah} كاملة`:`سورة ${sec.surah} من ${sec.from} إلى ${sec.to}`;}
function v8SectionShort(sec){if(!sec)return '—';return sec.full?`${sec.surah} كاملة`:`${sec.surah} ${sec.from}–${sec.to}`;}
function v8LatestPresent(studentId,beforeDate='9999-12-31',exclude=''){
  return sessions.filter(s=>s.studentId===studentId&&s.status==='حضر'&&s.id!==exclude&&sessionDay(s)<beforeDate).sort((a,b)=>sessionDay(b).localeCompare(sessionDay(a))||String(b.updatedAt||b.date).localeCompare(String(a.updatedAt||a.date)))[0]||null;
}
function v8SortedSessions(studentId){return sessions.filter(s=>s.studentId===studentId).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));}
function v8SurahIndex(v){
  const raw=String(v||'').trim();
  let idx=typeof getSurahIndex==='function'?getSurahIndex(raw):-1;
  if(idx>=0)return idx;
  const q=v8NormArabic(raw);return S.findIndex(x=>v8NormArabic(x.n)===q);
}
function v8EnsureId(obj,prefix){if(!obj.id)obj.id=makeId(prefix);return obj.id;}
function v8SafeText(v,max=5000){return String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max);}
function v8Toast(msg,type='info'){try{toast(msg,type);}catch(_){console.log(msg);}}

function migrateV8Data(){
  let changed=false;
  students.forEach(st=>{
    if(!V8_PLANS[st.plan]){st.plan='balanced';changed=true;}
    if(!['same','next'].includes(st.nextMode)){st.nextMode='same';changed=true;}
    if(!st.updatedAt){st.updatedAt=st.createdAt||v8Now();changed=true;}
  });
  sessions.forEach(se=>{
    if(!Array.isArray(se.recitationErrors)){se.recitationErrors=[];changed=true;}
    if(se.recitationErrors.some(x=>typeof x==='string')){se.recitationErrors=se.recitationErrors.map(x=>typeof x==='string'?{type:x,at:se.updatedAt||se.date||v8Now()}:x);changed=true;}
    se.recitationErrors=se.recitationErrors.filter(x=>x&&V8_ERROR_TYPES.includes(x.type)).map(x=>({type:x.type,at:x.at||se.date||v8Now()}));
    if(se.voiceNoteId!=null)se.voiceNoteId=v8SafeText(se.voiceNoteId,160);
    if(!se.updatedAt){se.updatedAt=se.createdAt||se.date||v8Now();changed=true;}
  });
  const wg=settings.weeklyGoals||{};
  if(!settings.weeklyGoals||settings.quranReciter==null||!settings.security||!settings.sync)changed=true;
  settings.weeklyGoals={
    newAyat:v8Clamp(wg.newAyat??40,0,5000),reviews:v8Clamp(wg.reviews??6,0,500),sessions:v8Clamp(wg.sessions??8,0,500),attendance:v8Clamp(wg.attendance??8,0,500)
  };
  settings.quranReciter=['Husary_128kbps','Alafasy_128kbps'].includes(settings.quranReciter)?settings.quranReciter:'Husary_128kbps';
  settings.security={lockEnabled:false,pinHash:'',credentialId:'',...(settings.security||{})};
  settings.sync={url:'',key:'',id:'',passphrase:'',auto:false,lastPush:'',lastPull:'',...(settings.sync||{})};
  settings.schemaVersion=SCHEMA_VERSION;
  return changed;
}

async function initV8Layer(){
  if(V8.inited)return;V8.inited=true;
  const changed=migrateV8Data();
  if(changed)try{__IMAM_BASE__.save();}catch(_){}
  await ensureMediaStore().catch(()=>{});
  initV8DOM();
  renderV8Settings();
  renderWeeklyGoals();
  await createAutoBackup(false).catch(()=>{});
  initSecurityLayer();
  if(settings.sync?.auto)setTimeout(()=>autoCloudSync(),2500);
}

function initV8DOM(){
  // IDs for quick-session navigation.
  const ids={new:'sessionCard-new',rec:'sessionCard-rec',far:'sessionCard-far',juz:'sessionCard-juz',surahReview:'sessionCard-surahReview'};
  Object.entries(ids).forEach(([k,id])=>{const c=document.getElementById(`tog-${k}`)?.closest('.card');if(c)c.id=id;});
  const notes=document.getElementById('sesNotes')?.closest('.card');if(notes)notes.id='sessionCard-notes';
  const content=document.getElementById('sesContent');
  if(content&&!document.getElementById('quickSessionCockpit')){
    const bar=document.createElement('div');bar.id='quickSessionCockpit';bar.className='quick-session-cockpit';
    bar.innerHTML='<div class="quick-session-steps"><button onclick="scrollSessionStep(\'prevCard\')">🎧 التسميع</button><button onclick="scrollSessionStep(\'sessionErrorsCard\')">🧭 الأخطاء</button><button onclick="scrollSessionStep(\'sessionCard-new\')">📖 الحفظ</button><button onclick="scrollSessionStep(\'sessionCard-rec\')">📚 قريب</button><button onclick="scrollSessionStep(\'sessionCard-far\')">📘 بعيد</button><button onclick="scrollSessionStep(\'sessionCard-juz\')">📜 الأجزاء</button><button onclick="scrollSessionStep(\'sessionCard-surahReview\')">🕌 السور</button><button onclick="scrollSessionStep(\'sessionCard-notes\')">💬 الملاحظات</button></div>';
    content.prepend(bar);
  }
  ['new','rec','far'].forEach(k=>{
    ['f','t'].forEach(s=>{const el=document.getElementById(`${k}-${s}`);if(el&&!el.dataset.v8bound){el.dataset.v8bound='1';el.addEventListener('blur',()=>validateAyahRangeInputs(k,true));el.addEventListener('input',()=>validateAyahRangeInputs(k,false));}});
  });
  const rec=document.getElementById('quranReciter');if(rec){rec.value=settings.quranReciter||'Husary_128kbps';rec.addEventListener('change',()=>{settings.quranReciter=rec.value;save();stopQuranAudio();});}
  const audio=document.getElementById('quranAudioPlayer');if(audio&&!audio.dataset.v8bound){audio.dataset.v8bound='1';audio.addEventListener('ended',playNextQuranAudio);audio.addEventListener('error',()=>{if(V8.quranAudioQueue.length){v8Toast('تعذر تشغيل هذا المقطع. تحقق من الإنترنت.','error');playNextQuranAudio();}});}
  const reports=document.querySelector('#pg-reports .export-row');if(reports&&!document.getElementById('monthlyPdfBtn')){const b=document.createElement('button');b.id='monthlyPdfBtn';b.className='btn btn-out btn-sm';b.textContent='📄 تقرير PDF';b.onclick=printMonthlyStudentReport;reports.appendChild(b);}
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)V8.hiddenAt=Date.now();
    else if(settings.security?.lockEnabled&&V8.hiddenAt&&Date.now()-V8.hiddenAt>180000)lockApp();
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('.surah-combo'))document.querySelectorAll('.surah-dropdown.open').forEach(x=>x.classList.remove('open'));
  });
}

function scrollSessionStep(id){const el=document.getElementById(id);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('.quick-session-steps button').forEach(b=>b.classList.remove('active'));const text=el.querySelector('.badge,.ch')?.textContent||'';document.querySelectorAll('.quick-session-steps button').forEach(b=>{if(text&&b.textContent.split(' ').slice(-1)[0]&&text.includes(b.textContent.split(' ').slice(-1)[0]))b.classList.add('active');});}

// ──────────────────────────────────────
// Student plans + continuation preference
// ──────────────────────────────────────
function openAddSt(){__IMAM_BASE__.openAddSt();const p=document.getElementById('m-plan'),n=document.getElementById('m-next-mode');if(p)p.value='balanced';if(n)n.value='same';}
function editSt(){__IMAM_BASE__.editSt();const st=students.find(x=>x.id===curStId);if(!st)return;const p=document.getElementById('m-plan'),n=document.getElementById('m-next-mode');if(p)p.value=V8_PLANS[st.plan]?st.plan:'balanced';if(n)n.value=['same','next'].includes(st.nextMode)?st.nextMode:'same';}
function saveSt(){
  const editing=editId;const plan=document.getElementById('m-plan')?.value||'balanced',nextMode=document.getElementById('m-next-mode')?.value||'same';const before=students.length;
  __IMAM_BASE__.saveSt();
  if(document.getElementById('stModal')?.classList.contains('open'))return; // validation failed
  let st=editing?students.find(x=>x.id===editing):(students.length>before?students.at(-1):null);if(!st)return;
  st.plan=V8_PLANS[plan]?plan:'balanced';st.nextMode=['same','next'].includes(nextMode)?nextMode:'same';st.updatedAt=v8Now();save();if(curPage==='students')renderSt();
}
function applyStudentPlanToSession(force=false){
  const st=v8Student();if(!st)return;const plan=v8Plan(st);
  const dateKey=document.getElementById('sesDate')?.value||localDateKey(),existing=findDailySession(st.id,dateKey);
  if(existing&&!force)return;
  const hasDraftContent=['new','rec','far'].some(k=>(document.getElementById(k+'-s')?.value||'').trim())||juzChips.length||surahReviewChips.length||(document.getElementById('sesNotes')?.value||'').trim();
  if(hasDraftContent&&!force)return;
  Object.entries(plan.sections).forEach(([k,v])=>{if(k in secOn)secOn[k]=!!v;});updateTogs();
  if(st.plan==='shortSurahs'&&!document.getElementById('new-s')?.value){setSectionAutoValue('new',Math.max(77,S.length-1),1,'');}
}
function planBadge(st){const p=v8Plan(st);return `<span class="plan-chip">${p.icon} ${v8Esc(p.label)}</span>`;}

// ──────────────────────────────────────
// Session wrappers, journey and draft extensions
// ──────────────────────────────────────
function initSession(){__IMAM_BASE__.initSession();renderSessionJourney();renderSessionErrors();renderVoiceNoteUI();}
function onSesSt(){
  V8.sessionErrors=[];V8.voiceNoteId='';V8.pendingVoiceBlob=null;
  __IMAM_BASE__.onSesSt();
  if(curStId){applyStudentPlanToSession(false);renderSessionJourney();renderReviewSuggestions();renderSessionErrors();renderVoiceNoteUI();}
  else{document.getElementById('sessionJourneyCard')?.style.setProperty('display','none');}
}
function applySessionToEditor(ses){
  __IMAM_BASE__.applySessionToEditor(ses);V8.sessionErrors=(ses?.recitationErrors||[]).map(x=>({...x}));V8.voiceNoteId=ses?.voiceNoteId||'';V8.pendingVoiceBlob=null;renderSessionErrors();renderVoiceNoteUI();renderSessionJourney();
}
function captureDraft(){const d=__IMAM_BASE__.captureDraft();d.recitationErrors=V8.sessionErrors.map(x=>({...x}));d.voiceNoteId=V8.voiceNoteId||'';return d;}
function applyDraft(d){__IMAM_BASE__.applyDraft(d);V8.sessionErrors=Array.isArray(d?.recitationErrors)?d.recitationErrors.map(x=>({...x})):[];V8.voiceNoteId=d?.voiceNoteId||V8.voiceNoteId||'';renderSessionErrors();renderVoiceNoteUI();renderSessionJourney();}
function buildSesData(){const d=__IMAM_BASE__.buildSesData();d.recitationErrors=V8.sessionErrors.map(x=>({...x}));if(V8.voiceNoteId)d.voiceNoteId=V8.voiceNoteId;return d;}
function saveSession(opts={}){const ses=__IMAM_BASE__.saveSession(opts);if(ses){renderSessionJourney();renderReviewSuggestions();scheduleAutoBackup();if(settings.sync?.auto)scheduleCloudPush();}return ses;}

function getStopPoints(studentId){
  const ordered=v8SortedSessions(studentId).filter(x=>x.status==='حضر');
  const result={new:null,rec:null,far:null,juz:null,surahReview:null};
  ordered.forEach(s=>{
    ['new','rec','far'].forEach(k=>{const actual=s.actualRecitation?.[k]||s[k];if(actual)result[k]={...actual,date:s.date,grade:s.prevGrades?.[k]||s[k]?.grade||''};});
    if(s.juz?.chips?.length)result.juz={chips:[...s.juz.chips],date:s.date,grade:s.prevGrades?.juz||''};
    if(s.surahReview?.chips?.length)result.surahReview={chips:[...s.surahReview.chips],date:s.date,grade:s.prevGrades?.surahReview||''};
  });return result;
}
function getUpcomingAssignment(studentId,dateKey=localDateKey()){
  const list=sessions.filter(s=>s.studentId===studentId&&s.status==='حضر'&&sessionDay(s)<=dateKey).sort((a,b)=>sessionDay(b).localeCompare(sessionDay(a))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const s=list[0]||null;if(!s)return{};return{new:s.new||null,rec:s.rec||null,far:s.far||null,juz:s.juz||null,surahReview:s.surahReview||null,date:s.date};
}
function renderSessionJourney(){
  const card=document.getElementById('sessionJourneyCard'),strip=document.getElementById('sessionJourneyStrip');if(!card||!strip)return;
  if(!curStId){card.style.display='none';return;}card.style.display='block';
  const stops=getStopPoints(curStId),up=getUpcomingAssignment(curStId,document.getElementById('sesDate')?.value||localDateKey());
  const rows=[
    ['📖 الحفظ',stops.new,up.new],['📚 قريب',stops.rec,up.rec],['📘 بعيد',stops.far,up.far],
    ['📜 الأجزاء',stops.juz,up.juz],['🕌 السور',stops.surahReview,up.surahReview]
  ];
  strip.innerHTML=rows.map(([label,last,next])=>{
    const lastTxt=last?.surah?v8SectionShort(last):last?.chips?.join('، ')||'—';const nextTxt=next?.surah?v8SectionShort(next):next?.chips?.join('، ')||'—';
    return `<div class="journey-item"><b>${label}</b><span title="${v8Esc(lastTxt)}">آخر تسميع: ${v8Esc(lastTxt)}</span><span title="${v8Esc(nextTxt)}">القادم: ${v8Esc(nextTxt)}</span></div>`;
  }).join('');
}
function repeatSectionOnly(key){
  if(!curStId)return v8Toast('اختر الطالب أولاً','error');const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=v8LatestPresent(curStId,dateKey,editingSessionId||'');if(!prev||!prev[key])return v8Toast('لا يوجد تكليف سابق لهذا القسم','error');
  if(['new','rec','far'].includes(key)){const x=prev[key],idx=v8SurahIndex(x.surah);if(idx>=0){secOn[key]=true;updateTogs();setSectionAutoValue(key,idx,x.from,x.to);const full=document.getElementById(key+'-full');if(full){full.checked=!!x.full;toggleFull(key);}}}
  else if(key==='juz'){juzChips=[...(prev.juz?.chips||[])];secOn.juz=true;updateTogs();renderChips();}
  else if(key==='surahReview'){surahReviewChips=[...(prev.surahReview?.chips||[])];secOn.surahReview=true;updateTogs();renderSurahReviewChips();}
  scheduleDraftSave();v8Toast('تم تكرار نفس التكليف','success');
}
function markSectionComplete(key){
  if(!['new','rec','far'].includes(key))return;const idx=v8SurahIndex(document.getElementById(key+'-s')?.value);if(idx<0)return v8Toast('اختر السورة أولاً','error');const fc=document.getElementById(key+'-full');if(fc){fc.checked=true;toggleFull(key);}const f=document.getElementById(key+'-f'),t=document.getElementById(key+'-t');if(f)f.value=1;if(t)t.value=S[idx].a;scheduleDraftSave();v8Toast(`تم تحديد سورة ${S[idx].n} كاملة`,'success');
}

function smartContinueFromAssessment(key,grade){
  if(!curStId||!V8_PASS_GRADES.has(grade)){if(grade==='ضعيف')v8Toast('تم إبقاء التكليف كما هو ليُعاد تثبيته','info');return;}
  const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=v8LatestPresent(curStId,dateKey,editingSessionId||'');if(!prev)return;
  const dir=reviewDirections[key]===-1?-1:1,st=v8Student(),mode=st?.nextMode||'same';
  if(['new','rec','far'].includes(key)){
    const src=(typeof readActualSection==='function'?readActualSection(key):null)||actualRecitation?.[key]||prev[key];if(!src)return;let idx=v8SurahIndex(src.surah);if(idx<0)return;const max=S[idx].a;let end=v8Clamp(src.to||src.from||1,1,max);
    if(end>=max){idx+=dir;if(idx<0||idx>=S.length)return v8Toast('وصلت إلى نهاية ترتيب السور في هذا الاتجاه','info');setSectionAutoValue(key,idx,1,'');}
    else{let from=mode==='next'?end+1:end;if(from>max){idx+=dir;if(idx<0||idx>=S.length)return;from=1;}setSectionAutoValue(key,idx,from,'');}
    const hint=document.getElementById(`${key}-auto-hint`);if(hint)hint.textContent=`اقتراح تلقائي بعد تقييم ${grade} — قابل للتعديل`;
  }else if(key==='juz'){
    const chips=(prev.juz?.chips||[]).map(normalizeJuzChip).filter(Boolean);if(!chips.length)return;const idx=JZ.indexOf(chips.at(-1));const n=idx+dir;if(n>=0&&n<JZ.length){secOn.juz=true;juzChips=[JZ[n]];updateTogs();renderChips();}
  }else if(key==='surahReview'){
    const chips=(prev.surahReview?.chips||[]).map(normalizeSurahReviewChip).filter(Boolean);if(!chips.length)return;const last=chips.at(-1).replace(/^سورة\s+/,'');const idx=v8SurahIndex(last),n=idx+dir;if(n>=0&&n<S.length){secOn.surahReview=true;surahReviewChips=[`سورة ${S[n].n}`];updateTogs();renderSurahReviewChips();}
  }
  scheduleDraftSave();renderSessionJourney();
}

// ──────────────────────────────────────
// Intelligent surah search + ayah validation
// ──────────────────────────────────────
function filterSurahDropdown(key){
  const input=document.getElementById(key+'-s'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el)return;input.dataset.userTouched='1';const q=v8NormArabic(input.value);
  const rows=S.map((surah,i)=>({surah,i,n:v8NormArabic(surah.n)})).filter(x=>!q||x.n.includes(q)||String(x.i+1)===q||String(x.i+1).startsWith(q)).slice(0,114);
  el.innerHTML=rows.map(({surah,i})=>`<button type="button" onmousedown="event.preventDefault();selectSurahOption('${key}',${i})"><b>${i+1}</b><span>سورة ${v8Esc(surah.n)}</span><small>${surah.a} آية</small></button>`).join('')||'<div class="surah-dropdown-empty">لا توجد سورة مطابقة</div>';el.classList.add('open');
}
function validateAyahRangeInputs(key,notify=false){
  const idx=v8SurahIndex(document.getElementById(key+'-s')?.value);if(idx<0)return false;const max=S[idx].a;const f=document.getElementById(`${key}-f`),t=document.getElementById(`${key}-t`);if(f){f.max=max;if(f.value)v8ClampInput(f,1,max);}if(t){t.max=max;if(t.value)v8ClampInput(t,1,max);}if(f?.value&&t?.value&&Number(t.value)<Number(f.value)){if(notify)v8Toast('آية النهاية أصغر من آية البداية؛ سيتم ترتيب النطاق عند الحفظ','info');}return true;
}
function v8ClampInput(el,min,max){const n=Number(el.value);if(!Number.isFinite(n))return;const c=v8Clamp(n,min,max);if(c!==n){el.value=c;v8Toast(`تم ضبط رقم الآية داخل حدود السورة (${min}–${max})`,'info');}}

// ──────────────────────────────────────
// Smart spaced review engine
// ──────────────────────────────────────
function collectReviewEvents(studentId){
  const out=[];v8SortedSessions(studentId).filter(s=>s.status==='حضر').forEach(s=>{
    ['new','rec','far'].forEach(k=>{const sec=s.actualRecitation?.[k]||s[k],g=s.prevGrades?.[k]||s[k]?.grade||'';if(sec&&g)out.push({surah:sec.surah,from:sec.from||1,to:sec.to||1,grade:g,date:sessionDay(s),key:k,sessionId:s.id});});
    const g=s.prevGrades?.surahReview;if(g&&s.surahReview?.chips?.length)s.surahReview.chips.forEach(c=>{const surah=String(c).replace(/^سورة\s+/,'');if(v8SurahIndex(surah)>=0)out.push({surah,from:1,to:S[v8SurahIndex(surah)].a,grade:g,date:sessionDay(s),key:'surahReview',sessionId:s.id});});
  });return out;
}
function smartReviewLedger(studentId){
  const by=new Map();collectReviewEvents(studentId).forEach(ev=>{
    const k=ev.surah,prev=by.get(k)||{successes:0};const score=v8GradeScore(ev.grade);let days=1;if(score>=4){prev.successes++;days=Math.min(42,[3,7,14,28,42][Math.min(prev.successes-1,4)]);}else if(score===3){prev.successes=Math.max(1,prev.successes);days=Math.min(21,[2,5,10,21][Math.min(prev.successes-1,3)]);}else if(score===2){prev.successes=0;days=2;}else{prev.successes=0;days=1;}
    const due=new Date(ev.date+'T12:00:00');due.setDate(due.getDate()+days);by.set(k,{surah:k,from:ev.from,to:ev.to,lastDate:ev.date,lastGrade:ev.grade,due:localDateKey(due),successes:prev.successes});
  });return [...by.values()].sort((a,b)=>a.due.localeCompare(b.due));
}
function getDueReviewItems(studentId,limit=8){const today=document.getElementById('sesDate')?.value||localDateKey();return smartReviewLedger(studentId).filter(x=>x.due<=today).slice(0,limit);}
function renderReviewSuggestions(){
  const el=document.getElementById('smartReviewSuggestions');if(!el)return;if(!curStId){el.innerHTML='';return;}const due=getDueReviewItems(curStId,6);if(!due.length){el.innerHTML='<span class="txt-mut" style="font-size:10px">لا توجد مراجعات مستحقة اليوم وفق سجل الأداء.</span>';return;}
  el.innerHTML='<b style="font-size:10px">اقتراح مراجعة:</b>'+due.map((x,i)=>`<button class="review-suggestion" onclick="applyReviewSuggestion(${i})">${v8Esc(x.surah)} · ${v8Esc(x.lastGrade)} · استحق ${v8Esc(x.due)}</button>`).join('');
  V8.currentDue=due;
}
function applyReviewSuggestion(i){const x=V8.currentDue?.[i];if(!x)return;const idx=v8SurahIndex(x.surah);if(idx<0)return;const target=secOn.rec?'far':'rec';setSectionAutoValue(target,idx,x.from||1,x.to||S[idx].a);secOn[target]=true;updateTogs();scheduleDraftSave();v8Toast(`تم وضع سورة ${x.surah} في ${target==='rec'?'المراجعة القريبة':'المراجعة البعيدة'}`,'success');}

// ──────────────────────────────────────
// Error logging
// ──────────────────────────────────────
function addRecitationError(type){if(!V8_ERROR_TYPES.includes(type))return;V8.sessionErrors.push({type,at:v8Now()});renderSessionErrors();scheduleDraftSave();}
function removeRecitationError(i){V8.sessionErrors.splice(i,1);renderSessionErrors();scheduleDraftSave();}
function renderSessionErrors(){const n=V8.sessionErrors.length,l=document.getElementById('errorCountLabel'),el=document.getElementById('sessionErrorList');if(l)l.textContent=n===1?'خطأ واحد':`${n} أخطاء`;if(el)el.innerHTML=V8.sessionErrors.map((x,i)=>`<span class="error-log-item">${v8Esc(x.type)} <button type="button" onclick="removeRecitationError(${i})">✕</button></span>`).join('')||'<span class="txt-mut" style="font-size:10px">اضغط على نوع الخطأ أثناء التسميع؛ يمكن تكراره أكثر من مرة.</span>';}
function studentErrorSummary(studentId){const m={};sessions.filter(s=>s.studentId===studentId).forEach(s=>(s.recitationErrors||[]).forEach(e=>m[e.type]=(m[e.type]||0)+1));return Object.entries(m).sort((a,b)=>b[1]-a[1]);}

// ──────────────────────────────────────
// Voice notes (local media store)
// ──────────────────────────────────────
async function ensureMediaStore(){
  if(!('indexedDB' in window))return false;
  if(db?.objectStoreNames?.contains('media'))return true;
  if(db){const ver=db.version+1;db.close();db=null;await new Promise((resolve,reject)=>{const r=indexedDB.open('QuranApp',ver);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv',{keyPath:'key'});if(!d.objectStoreNames.contains('media'))d.createObjectStore('media',{keyPath:'id'});};r.onsuccess=()=>{db=r.result;db.onversionchange=()=>db.close();resolve();};r.onerror=()=>reject(r.error);r.onblocked=()=>console.warn('Media store upgrade is waiting for another tab');});}
  else{db=await openQuranDB();if(!db.objectStoreNames.contains('media'))return ensureMediaStore();}
  return db.objectStoreNames.contains('media');
}
function mediaPut(id,blob){return new Promise(async(resolve,reject)=>{try{await ensureMediaStore();const tx=db.transaction('media','readwrite');tx.objectStore('media').put({id,blob,createdAt:v8Now()});tx.oncomplete=()=>resolve(id);tx.onerror=()=>reject(tx.error);}catch(e){reject(e);}});}
function mediaGet(id){return new Promise(async(resolve,reject)=>{try{await ensureMediaStore();if(!id)return resolve(null);const tx=db.transaction('media','readonly'),r=tx.objectStore('media').get(id);r.onsuccess=()=>resolve(r.result?.blob||null);r.onerror=()=>reject(r.error);}catch(e){reject(e);}});}
function mediaDelete(id){return new Promise(async(resolve,reject)=>{try{await ensureMediaStore();if(!id)return resolve();const tx=db.transaction('media','readwrite');tx.objectStore('media').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}catch(e){reject(e);}});}
async function toggleVoiceNoteRecording(){
  if(V8.mediaRecorder?.state==='recording'){V8.mediaRecorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')return v8Toast('التسجيل الصوتي غير مدعوم في هذا المتصفح','error');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});let opts={};for(const t of ['audio/webm;codecs=opus','audio/webm','audio/mp4']){if(MediaRecorder.isTypeSupported?.(t)){opts={mimeType:t};break;}}
    V8.mediaChunks=[];const mr=new MediaRecorder(stream,opts);V8.mediaRecorder=mr;V8.recordStartedAt=Date.now();
    mr.ondataavailable=e=>{if(e.data?.size)V8.mediaChunks.push(e.data);};
    mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const mime=mr.mimeType||V8.mediaChunks[0]?.type||'audio/webm',blob=new Blob(V8.mediaChunks,{type:mime});if(blob.size){if(V8.voiceNoteId)await mediaDelete(V8.voiceNoteId).catch(()=>{});V8.voiceNoteId=makeId('voice');await mediaPut(V8.voiceNoteId,blob);V8.pendingVoiceBlob=blob;scheduleDraftSave();v8Toast('تم حفظ الملاحظة الصوتية محليًا','success');}V8.mediaRecorder=null;renderVoiceNoteUI();};
    mr.start(500);renderVoiceNoteUI();setTimeout(()=>{if(V8.mediaRecorder===mr&&mr.state==='recording')mr.stop();},30000);
  }catch(e){v8Toast(e?.name==='NotAllowedError'?'تم رفض إذن الميكروفون':'تعذر بدء التسجيل الصوتي','error');}
}
async function renderVoiceNoteUI(){
  const btn=document.getElementById('voiceNoteBtn'),state=document.getElementById('voiceNoteState'),audio=document.getElementById('voiceNotePreview'),del=document.getElementById('voiceNoteDeleteBtn');if(!btn||!state||!audio)return;
  if(V8.mediaRecorder?.state==='recording'){btn.textContent='■ إيقاف التسجيل';state.textContent='جاري التسجيل — الحد الأقصى 30 ثانية';audio.style.display='none';if(del)del.style.display='none';return;}
  btn.textContent='🎙️ تسجيل ملاحظة';state.textContent=V8.voiceNoteId?'ملاحظة صوتية محفوظة على هذا الجهاز':'حتى 30 ثانية';if(del)del.style.display=V8.voiceNoteId?'inline-flex':'none';
  if(V8.quranObjectURL&&audio.src===V8.quranObjectURL){URL.revokeObjectURL(V8.quranObjectURL);V8.quranObjectURL='';}
  let blob=V8.pendingVoiceBlob;if(!blob&&V8.voiceNoteId)blob=await mediaGet(V8.voiceNoteId).catch(()=>null);if(blob){const u=URL.createObjectURL(blob);if(audio.dataset.obj)URL.revokeObjectURL(audio.dataset.obj);audio.dataset.obj=u;audio.src=u;audio.style.display='block';}else{audio.removeAttribute('src');audio.style.display='none';}
}
async function deletePendingVoiceNote(){if(V8.voiceNoteId)await mediaDelete(V8.voiceNoteId).catch(()=>{});V8.voiceNoteId='';V8.pendingVoiceBlob=null;renderVoiceNoteUI();scheduleDraftSave();v8Toast('تم حذف الملاحظة الصوتية','success');}

// ──────────────────────────────────────
// Quick note templates
// ──────────────────────────────────────
function appendNoteTemplate(text){const el=document.getElementById('sesNotes');if(!el)return;el.value=(el.value.trim()?el.value.trim()+'\n':'')+String(text||'');el.focus();scheduleDraftSave();}

// ──────────────────────────────────────
// Dashboard goals
// ──────────────────────────────────────
function countSectionAyat(sec){if(!sec)return 0;const idx=v8SurahIndex(sec.surah);if(idx<0)return 0;return Math.max(0,v8Clamp(sec.to||1,1,S[idx].a)-v8Clamp(sec.from||1,1,S[idx].a)+1);}
function renderHome(){__IMAM_BASE__.renderHome();renderWeeklyGoals();}
function renderWeeklyGoals(){
  const wg=settings.weeklyGoals||{newAyat:40,reviews:6,sessions:8,attendance:8},start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-6);const rows=sessions.filter(s=>new Date(s.date)>=start),present=rows.filter(s=>s.status==='حضر');
  const newAyat=present.reduce((n,s)=>n+countSectionAyat(s.actualRecitation?.new||s.new),0),reviews=present.reduce((n,s)=>n+(s.actualRecitation?.rec||s.rec?1:0)+(s.actualRecitation?.far||s.far?1:0)+(s.juz?.chips?.length||0)+(s.surahReview?.chips?.length||0),0);
  const vals={goalNewAyatNow:newAyat,goalReviewNow:reviews,goalSessionsNow:rows.length,goalAttendanceNow:present.length,goalNewAyatTarget:`من ${wg.newAyat}`,goalReviewTarget:`من ${wg.reviews}`,goalSessionsTarget:`من ${wg.sessions}`,goalAttendanceTarget:`من ${wg.attendance}`};Object.entries(vals).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
}

// ──────────────────────────────────────
// Profile: stop point, progress map, error summary, timeline
// ──────────────────────────────────────
function openProf(id){__IMAM_BASE__.openProf(id);const st=students.find(x=>x.id===id);if(!st)return;const head=document.getElementById('profHdr');if(head&&!head.querySelector('.plan-chip')){const target=head.querySelector('.lv');target?.insertAdjacentHTML('afterend',planBadge(st));}renderStopProfile(id);renderProgressMap(id);renderErrorSummary(id);renderStudentTimeline(id);}
function renderStopProfile(id){
  const el=document.getElementById('profStopContent');if(!el)return;const p=getStopPoints(id),up=getUpcomingAssignment(id);const rows=[['📖 الحفظ',p.new,up.new],['📚 المراجعة القريبة',p.rec,up.rec],['📘 المراجعة البعيدة',p.far,up.far],['📜 الأجزاء',p.juz,up.juz],['🕌 السور',p.surahReview,up.surahReview]];
  el.innerHTML='<div class="stop-grid">'+rows.map(([name,last,next])=>`<div class="stop-item"><b>${name}</b><span>آخر ما سُمّع: ${v8Esc(last?.surah?v8SectionShort(last):last?.chips?.join('، ')||'—')}</span><span>التكليف القادم: ${v8Esc(next?.surah?v8SectionShort(next):next?.chips?.join('، ')||'—')}</span></div>`).join('')+'</div>';
}
function buildSurahCoverage(studentId){
  const map=new Map();v8SortedSessions(studentId).filter(s=>s.status==='حضر').forEach(s=>{const sec=s.actualRecitation?.new;if(!sec)return;const idx=v8SurahIndex(sec.surah);if(idx<0)return;const r=map.get(sec.surah)||[];r.push([v8Clamp(sec.from,1,S[idx].a),v8Clamp(sec.to,1,S[idx].a)]);map.set(sec.surah,r);});return map;
}
function mergeRanges(ranges){const arr=ranges.slice().sort((a,b)=>a[0]-b[0]),out=[];arr.forEach(r=>{if(!out.length||r[0]>out.at(-1)[1]+1)out.push([...r]);else out.at(-1)[1]=Math.max(out.at(-1)[1],r[1]);});return out;}
function renderProgressMap(id){
  const el=document.getElementById('profMapContent');if(!el)return;const coverage=buildSurahCoverage(id),due=new Set(getDueReviewItems(id,200).map(x=>x.surah));const statuses=S.map(s=>{const ranges=mergeRanges(coverage.get(s.n)||[]),covered=ranges.reduce((n,r)=>n+r[1]-r[0]+1,0);let status=covered>=s.a?'memorized':covered>0?'in-progress':'not-started';if(due.has(s.n)&&covered>0)status='needs-review';return{...s,status,covered};});
  const juzActive=new Set();sessions.filter(s=>s.studentId===id).forEach(s=>(s.juz?.chips||[]).forEach(c=>{const n=normalizeJuzChip(c);if(n)juzActive.add(n);}));
  el.innerHTML='<div class="progress-map-legend"><span class="l-mem">محفوظ</span><span class="l-prog">جارٍ</span><span class="l-review">يحتاج مراجعة</span><span class="l-none">لم يبدأ</span></div><div class="progress-map">'+statuses.map((x,i)=>`<button type="button" class="surah-map-cell ${x.status}" title="${v8Esc(x.n)} — ${x.covered} آية" onclick="startReviewSurahFromMap(${i})"><b>${i+1}</b><span>${v8Esc(x.n)}</span></button>`).join('')+'</div><div class="juz-map">'+JZ.map(j=>`<span class="${juzActive.has(j)?'active':''}">${v8Esc(j)}</span>`).join('')+'</div>';
}
function startReviewSurahFromMap(i){if(!S[i]||!curStId)return;goPage('session');setTimeout(()=>{document.getElementById('sesSt').value=curStId;onSesSt();setSectionAutoValue('rec',i,1,S[i].a);secOn.rec=true;updateTogs();},50);}
function renderErrorSummary(id){const el=document.getElementById('profErrorsContent');if(!el)return;const rows=studentErrorSummary(id);el.innerHTML=rows.length?'<div class="error-summary">'+rows.map(([t,n])=>`<div class="error-summary-item"><b>${n}</b><span>${v8Esc(t)}</span></div>`).join('')+'</div>':'<div class="txt-mut">لم تُسجل أخطاء بعد.</div>';}
function renderStudentTimeline(id){
  const el=document.getElementById('profHist');if(!el)return;const rows=sessions.filter(s=>s.studentId===id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,80);
  el.innerHTML='<div class="ch">🕘 الخط الزمني للطالب</div>'+(rows.length?'<div class="timeline">'+rows.map(s=>{const cls=s.status==='غاب'?'absent':s.status==='إجازة'?'vacation':'',pg=s.prevGrades||{},gradesText=Object.entries(pg).filter(([,g])=>g).map(([k,g])=>`${k==='new'?'حفظ':k==='rec'?'قريب':k==='far'?'بعيد':k==='juz'?'أجزاء':'سور'}: ${g}`).join(' · ');const body=s.status==='حضر'?[s.actualRecitation?.new?`تسميع ${v8SectionShort(s.actualRecitation.new)}`:'',s.new?`القادم ${v8SectionShort(s.new)}`:'',gradesText,s.notes||''].filter(Boolean).join(' — '):s.status;return `<div class="timeline-item ${cls}"><div class="timeline-date">${v8Date(s.date)}</div><div class="timeline-title">${s.status==='حضر'?'حصة مسجلة':v8Esc(s.status)}</div><div class="timeline-body">${v8Esc(body||'—')}</div>${s.voiceNoteId?`<button class="btn btn-out btn-xs mt4" onclick="playStoredVoiceNote('${v8Esc(s.voiceNoteId)}')">🔊 ملاحظة صوتية</button>`:''}</div>`;}).join('')+'</div>':'<div class="empty"><p>لا توجد حصص بعد</p></div>');
}
async function playStoredVoiceNote(id){const blob=await mediaGet(id).catch(()=>null);if(!blob)return v8Toast('الملاحظة الصوتية غير موجودة على هذا الجهاز','error');const u=URL.createObjectURL(blob),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);a.play().catch(()=>v8Toast('تعذر تشغيل الملاحظة','error'));}

// ──────────────────────────────────────
// WhatsApp: short/detailed modes
// ──────────────────────────────────────
function v8ErrorCounts(ses){const m={};(ses?.recitationErrors||[]).forEach(e=>m[e.type]=(m[e.type]||0)+1);return Object.entries(m).map(([k,v])=>`${k}: ${v}`).join('، ');}
function buildWAMsgMode(st,ses,mode='detailed'){
  const date=v8Date(ses?.date||Date.now()),pg=ses?.prevGrades||{},footer=typeof academyFooter==='function'?academyFooter():`\n\n🏛️ ${ACADEMY_NAME}\n🌿 ${ACADEMY_TAGLINE}`;
  const assessed=[];if(pg.new)assessed.push(`الحفظ ${pg.new}${ses.actualRecitation?.new?' — '+v8SectionShort(ses.actualRecitation.new):''}`);if(pg.rec)assessed.push(`القريب ${pg.rec}${ses.actualRecitation?.rec?' — '+v8SectionShort(ses.actualRecitation.rec):''}`);if(pg.far)assessed.push(`البعيد ${pg.far}${ses.actualRecitation?.far?' — '+v8SectionShort(ses.actualRecitation.far):''}`);if(pg.juz)assessed.push(`الأجزاء ${pg.juz}`);if(pg.surahReview)assessed.push(`السور ${pg.surahReview}`);
  const next=[];if(ses?.new)next.push(`📖 الحفظ: ${v8SectionShort(ses.new)}`);if(ses?.rec)next.push(`📚 مراجعة قريبة: ${v8SectionShort(ses.rec)}`);if(ses?.far)next.push(`📘 مراجعة بعيدة: ${v8SectionShort(ses.far)}`);if(ses?.juz?.chips?.length)next.push(`📜 الأجزاء: ${ses.juz.chips.join('، ')}`);if(ses?.surahReview?.chips?.length)next.push(`🕌 السور: ${ses.surahReview.chips.join('، ')}`);
  if(mode==='short')return `السلام عليكم ورحمة الله وبركاته 🌿\n\nمتابعة *${st.name}* — ${date}\n${assessed.length?'🎧 '+assessed.join(' | ')+'\n':''}${next.length?'📝 القادم:\n'+next.join('\n')+'\n':''}${ses?.notes?'💬 '+ses.notes+'\n':''}${footer}`;
  const errors=v8ErrorCounts(ses);return `السلام عليكم ورحمة الله وبركاته 🌿\n\n✨ *متابعة الطالب: ${st.name}*\n📅 ${date}\n\n━━━━━━━━━━━━━━━━━━\n🎧 *تسميع اليوم:*\n${assessed.length?assessed.map(x=>'• '+x).join('\n'):'لم يُسجل تقييم للتسميع'}${errors?`\n\n🧭 *ملاحظات الأخطاء:*\n${errors}`:''}\n\n━━━━━━━━━━━━━━━━━━\n📝 *تكليف الحصة القادمة:*\n${next.length?next.join('\n'):'لا يوجد تكليف جديد'}${ses?.notes?`\n\n💬 *ملاحظات المحفظ:*\n${ses.notes}`:''}\n\nجزاكم الله خيرًا 🤲${settings.name?`\n— ${settings.name}`:''}${footer}`;
}
function buildWAMsg(st,ses){if(settings.waTemplate?.trim())return __IMAM_BASE__.buildWAMsg(st,ses);return buildWAMsgMode(st,ses,'detailed');}
function saveAndSendWAMode(mode){const ses=saveSession({silent:true,noCelebrate:true});if(!ses)return;const st=students.find(x=>x.id===ses.studentId);if(!st)return;openWhatsApp(st,buildWAMsgMode(st,ses,mode));}

// ──────────────────────────────────────
// Monthly printable PDF report (browser Save as PDF)
// ──────────────────────────────────────
function printMonthlyStudentReport(){
  const sid=document.getElementById('repSt')?.value,month=document.getElementById('repMonth')?.value;if(!sid)return v8Toast('اختر الطالب أولاً','error');const st=students.find(x=>x.id===sid);if(!st)return;let y,m;if(/^\d{4}-\d{2}$/.test(month||'')){[y,m]=month.split('-').map(Number);}else{const d=new Date();y=d.getFullYear();m=d.getMonth()+1;}
  const rows=sessions.filter(s=>s.studentId===sid&&(()=>{const d=new Date(s.date);return d.getFullYear()===y&&d.getMonth()+1===m;})()).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const present=rows.filter(s=>s.status==='حضر'),abs=rows.filter(s=>s.status==='غاب'),newAyat=present.reduce((n,s)=>n+countSectionAyat(s.actualRecitation?.new||s.new),0);const gradesArr=present.flatMap(s=>Object.values(s.prevGrades||{})).filter(Boolean);const avg=gradesArr.length?(typeof gradeLabel==='function'?gradeLabel(gradesArr.reduce((a,g)=>a+v8GradeScore(g),0)/gradesArr.length):'—'):'—';
  document.getElementById('v8PrintReport')?.remove();const div=document.createElement('div');div.id='v8PrintReport';div.className='print-monthly-report';div.innerHTML=`<div class="print-brand"><img src="icon-192.png"><h1>${v8Esc(settings.circle||ACADEMY_NAME)}</h1><div>${ACADEMY_TAGLINE}</div><h2>تقرير شهري — ${m}/${y}</h2><h3>${v8Esc(st.name)}</h3></div><div class="print-summary"><div><b>${present.length}</b><br>حضور</div><div><b>${abs.length}</b><br>غياب</div><div><b>${newAyat}</b><br>آية حفظ جديد</div><div><b>${v8Esc(avg)}</b><br>مستوى التسميع</div></div><table><thead><tr><th>التاريخ</th><th>الحالة</th><th>ما تم تسميعه</th><th>التقييم</th><th>التكليف القادم</th><th>الملاحظات</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${v8Esc(v8Date(s.date))}</td><td>${v8Esc(s.status)}</td><td>${v8Esc([s.actualRecitation?.new&&v8SectionShort(s.actualRecitation.new),s.actualRecitation?.rec&&v8SectionShort(s.actualRecitation.rec),s.actualRecitation?.far&&v8SectionShort(s.actualRecitation.far)].filter(Boolean).join('، ')||'—')}</td><td>${v8Esc(Object.values(s.prevGrades||{}).filter(Boolean).join('، ')||'—')}</td><td>${v8Esc([s.new&&v8SectionShort(s.new),s.rec&&v8SectionShort(s.rec),s.far&&v8SectionShort(s.far),...(s.juz?.chips||[]),...(s.surahReview?.chips||[])].filter(Boolean).join('، ')||'—')}</td><td>${v8Esc(s.notes||'—')}</td></tr>`).join('')}</tbody></table><p style="margin-top:14px">${v8Esc(settings.name?`المحفظ: ${settings.name}`:'')} — أُنشئ بواسطة أكاديمية الإمام.</p>`;document.body.appendChild(div);document.body.classList.add('printing-monthly');const clean=()=>{document.body.classList.remove('printing-monthly');setTimeout(()=>div.remove(),200);};window.addEventListener('afterprint',clean,{once:true});window.print();setTimeout(()=>{if(document.body.classList.contains('printing-monthly'))clean();},3000);
}

// ──────────────────────────────────────
// Quran text (QPC Hafs) + Husary / Alafasy audio
// ──────────────────────────────────────
function quranRangeFromNew(){
  if(!secOn.new)return null;const idx=v8SurahIndex(document.getElementById('new-s')?.value);if(idx<0)return null;const full=!!document.getElementById('new-full')?.checked;let from=full?1:Number(document.getElementById('new-f')?.value),to=full?S[idx].a:Number(document.getElementById('new-t')?.value);if(!Number.isFinite(from)||!Number.isFinite(to))return null;from=v8Clamp(from,1,S[idx].a);to=v8Clamp(to,1,S[idx].a);if(to<from)[from,to]=[to,from];return{chapter:idx+1,surah:S[idx].n,from,to,max:S[idx].a};
}
function closeQuranTextModal(){stopQuranAudio();if(V8.quranFetchController)V8.quranFetchController.abort();document.getElementById('quranTextModal')?.classList.remove('open');}
async function openQuranTextModal(){
  const r=quranRangeFromNew();if(!r)return v8Toast('اختر سورة ونطاق آيات في الحفظ الجديد أولاً','error');V8.quranRange=r;document.getElementById('quranModalTitle').textContent=`📖 سورة ${r.surah} — الآيات ${r.from} إلى ${r.to}`;document.getElementById('quranTextModal').classList.add('open');const content=document.getElementById('quranVerseContent');content.innerHTML='<div class="quran-load">جارٍ تحميل النص العثماني…</div>';try{const all=await fetchQpcHafsChapter(r.chapter);V8.quranVerses=all.filter(v=>v.ayah>=r.from&&v.ayah<=r.to);if(!V8.quranVerses.length)throw new Error('empty');content.innerHTML=V8.quranVerses.map(v=>`<span class="quran-ayah" data-ayah="${v.ayah}">${v8Esc(v.text)} <span class="quran-ayah-num">${v.ayah}</span></span>`).join(' ');document.getElementById('quranSourceNote').textContent='الرسم: QPC Hafs بالرسم العثماني وفق خط مصحف المدينة. الصوت: الحصري أو مشاري. النص والصوت يحتاجان الإنترنت أول مرة.';}catch(e){content.innerHTML='<div class="empty"><p>تعذر تحميل النص الآن. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.</p></div>';}}
function quranCacheKey(ch){return `quran:qpc-hafs:${ch}`;}
function idbKvGet(key){return new Promise((resolve,reject)=>{try{if(!db?.objectStoreNames?.contains('kv'))return resolve(null);const tx=db.transaction('kv','readonly'),r=tx.objectStore('kv').get(key);r.onsuccess=()=>resolve(r.result?.val??null);r.onerror=()=>reject(r.error);}catch(e){reject(e);}});}
function idbKvPut(key,val){return new Promise((resolve,reject)=>{try{if(!db?.objectStoreNames?.contains('kv'))return resolve();const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put({key,val});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}catch(e){reject(e);}});}
async function fetchQpcHafsChapter(chapter){
  const cached=await idbKvGet(quranCacheKey(chapter)).catch(()=>null);if(cached){try{const arr=JSON.parse(cached);if(Array.isArray(arr)&&arr.length)return arr;}catch(_){}}
  if(V8.quranFetchController)V8.quranFetchController.abort();V8.quranFetchController=new AbortController();const sig=V8.quranFetchController.signal;
  const endpoints=[`https://api.quran.com/api/v4/quran/verses/qpc_hafs?chapter_number=${chapter}`,`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapter}`];let lastErr=null;
  for(const url of endpoints){try{const res=await fetch(url,{signal:sig,headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`HTTP ${res.status}`);const d=await res.json(),verses=Array.isArray(d.verses)?d.verses:[];const arr=verses.map((v,i)=>({ayah:Number(v.verse_key?.split(':')[1]||v.verse_number||i+1),text:v.text_qpc_hafs||v.text_uthmani||v.text||''})).filter(v=>v.ayah&&v.text);if(arr.length){idbKvPut(quranCacheKey(chapter),JSON.stringify(arr)).catch(()=>{});return arr;}}catch(e){lastErr=e;if(e?.name==='AbortError')throw e;}}
  throw lastErr||new Error('Quran fetch failed');
}
function everyAyahURL(reciter,chapter,ayah){return `https://everyayah.com/data/${encodeURIComponent(reciter)}/${String(chapter).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;}
function playQuranRange(){const r=V8.quranRange||quranRangeFromNew();if(!r)return v8Toast('لا يوجد نطاق آيات للتشغيل','error');const rec=document.getElementById('quranReciter')?.value||settings.quranReciter||'Husary_128kbps';settings.quranReciter=rec;save();V8.quranAudioQueue=[];for(let a=r.from;a<=r.to;a++)V8.quranAudioQueue.push({ayah:a,url:everyAyahURL(rec,r.chapter,a)});V8.quranAudioIndex=-1;playNextQuranAudio();}
function playNextQuranAudio(){V8.quranAudioIndex++;if(V8.quranAudioIndex>=V8.quranAudioQueue.length){stopQuranAudio(false);return;}const item=V8.quranAudioQueue[V8.quranAudioIndex],audio=document.getElementById('quranAudioPlayer');document.querySelectorAll('.quran-ayah').forEach(x=>x.classList.toggle('playing',Number(x.dataset.ayah)===item.ayah));const active=document.querySelector(`.quran-ayah[data-ayah="${item.ayah}"]`);active?.scrollIntoView({behavior:'smooth',block:'center'});audio.src=item.url;audio.play().catch(()=>v8Toast('تعذر تشغيل الصوت. تحقق من الإنترنت أو إعدادات التشغيل التلقائي.','error'));}
function stopQuranAudio(clear=true){const a=document.getElementById('quranAudioPlayer');if(a){a.pause();a.removeAttribute('src');a.load?.();}document.querySelectorAll('.quran-ayah.playing').forEach(x=>x.classList.remove('playing'));if(clear){V8.quranAudioQueue=[];V8.quranAudioIndex=-1;}}

// ──────────────────────────────────────
// Settings / PIN / WebAuthn lock
// ──────────────────────────────────────
function initSettings(){__IMAM_BASE__.initSettings();renderV8Settings();renderSecurityStatus();renderAutoBackupStatus();}
function renderV8Settings(){
  const w=settings.weeklyGoals||{};const map={goalNewAyat:w.newAyat??40,goalReviews:w.reviews??6,goalSessions:w.sessions??8,goalAttendance:w.attendance??8,syncUrl:settings.sync?.url||'',syncKey:settings.sync?.key||'',syncId:settings.sync?.id||'',syncPassphrase:settings.sync?.passphrase||''};Object.entries(map).forEach(([id,v])=>{const el=document.getElementById(id);if(el&&document.activeElement!==el)el.value=v;});const a=document.getElementById('syncAuto');if(a)a.checked=!!settings.sync?.auto;renderSecurityStatus();renderSyncStatus();renderAutoBackupStatus();
}
function saveV8Settings(){
  const num=(id,def,max)=>v8Clamp(document.getElementById(id)?.value??def,0,max);settings.weeklyGoals={newAyat:num('goalNewAyat',40,5000),reviews:num('goalReviews',6,500),sessions:num('goalSessions',8,500),attendance:num('goalAttendance',8,500)};settings.sync={...(settings.sync||{}),url:(document.getElementById('syncUrl')?.value||'').trim().replace(/\/$/,''),key:(document.getElementById('syncKey')?.value||'').trim(),id:(document.getElementById('syncId')?.value||'').trim().slice(0,180),passphrase:document.getElementById('syncPassphrase')?.value||'',auto:!!document.getElementById('syncAuto')?.checked};save();renderWeeklyGoals();renderSyncStatus();}
async function hashText(v){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(v)));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function pinBytesToB64(bytes){let out='';for(const b of bytes)out+=String.fromCharCode(b);return btoa(out);}
async function derivePinHash(pin,saltB64,iterations=250000){
  const salt=Uint8Array.from(atob(String(saltB64||'')),c=>c.charCodeAt(0));
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,256);
  return pinBytesToB64(new Uint8Array(bits));
}
async function createPinRecord(pin){const salt=crypto.getRandomValues(new Uint8Array(16)),iterations=250000;return{pinHash:await derivePinHash(pin,pinBytesToB64(salt),iterations),pinSalt:pinBytesToB64(salt),pinKdf:'pbkdf2-sha256',pinIterations:iterations};}
async function verifyStoredPin(pin,{migrate=true}={}){
  const sec=settings.security||{};if(!sec.pinHash)return false;
  if(sec.pinKdf==='pbkdf2-sha256'&&sec.pinSalt)return await derivePinHash(pin,sec.pinSalt,Number(sec.pinIterations)||250000)===sec.pinHash;
  const ok=/^[0-9a-f]{64}$/i.test(sec.pinHash)&&await hashText(pin)===sec.pinHash;
  if(ok&&migrate){const rec=await createPinRecord(pin);settings.security={...sec,...rec};save();}
  return ok;
}
async function setupPinLock(){if(!crypto?.subtle)return v8Toast('التشفير غير مدعوم في هذا المتصفح','error');const a=prompt('أدخل PIN من 4 إلى 8 أرقام:');if(a==null)return;if(!/^\d{4,8}$/.test(a))return v8Toast('PIN يجب أن يكون من 4 إلى 8 أرقام','error');const b=prompt('أعد إدخال PIN للتأكيد:');if(a!==b)return v8Toast('PIN غير متطابق','error');const rec=await createPinRecord(a);settings.security={...(settings.security||{}),lockEnabled:true,...rec};save();renderSecurityStatus();v8Toast('تم تفعيل قفل التطبيق','success');}
async function disablePinLock(){if(!settings.security?.lockEnabled)return;const p=prompt('أدخل PIN الحالي لإلغاء القفل:');if(p==null)return;if(settings.security.pinHash&&!await verifyStoredPin(p,{migrate:false}))return v8Toast('PIN غير صحيح','error');settings.security={lockEnabled:false,pinHash:'',pinSalt:'',pinKdf:'',pinIterations:0,credentialId:''};save();hideAppLock();renderSecurityStatus();v8Toast('تم إلغاء قفل التطبيق','success');}
function b64u(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromB64u(s){s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function setupDeviceBiometric(){
  if(!window.PublicKeyCredential||!navigator.credentials||!isSecureContext)return v8Toast('البصمة / Windows Hello تحتاج HTTPS ومتصفحًا داعمًا','error');try{const challenge=crypto.getRandomValues(new Uint8Array(32)),userId=crypto.getRandomValues(new Uint8Array(16)),cred=await navigator.credentials.create({publicKey:{challenge,rp:{name:'أكاديمية الإمام'},user:{id:userId,name:'imam-academy-local',displayName:'أكاديمية الإمام'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{userVerification:'preferred',residentKey:'preferred'},timeout:60000,attestation:'none'}});if(!cred)throw new Error('no credential');settings.security={...(settings.security||{}),lockEnabled:true,credentialId:b64u(cred.rawId)};save();renderSecurityStatus();v8Toast('تم ربط قفل الجهاز بنجاح','success');}catch(e){v8Toast(e?.name==='NotAllowedError'?'أُلغي إعداد قفل الجهاز':'تعذر إعداد البصمة / Windows Hello','error');}
}
function initSecurityLayer(){renderSecurityStatus();if(settings.security?.lockEnabled)lockApp();}
function lockApp(){const o=document.getElementById('appLockOverlay');if(!o)return;o.style.display='flex';V8.lockOpen=true;const pin=document.getElementById('lockPinInput');if(pin){pin.value='';setTimeout(()=>pin.focus(),50);}const bio=document.getElementById('biometricUnlockBtn');if(bio)bio.style.display=settings.security?.credentialId?'inline-flex':'none';}
function hideAppLock(){const o=document.getElementById('appLockOverlay');if(o)o.style.display='none';V8.lockOpen=false;const e=document.getElementById('lockError');if(e)e.textContent='';}
async function unlockWithPin(){const p=document.getElementById('lockPinInput')?.value||'',e=document.getElementById('lockError');if(!settings.security?.pinHash){if(settings.security?.credentialId)return unlockWithBiometric();if(e)e.textContent='لا يوجد PIN مضبوط';return;}const now=Date.now();if((V8.pinLockedUntil||0)>now){if(e)e.textContent=`حاول مرة أخرى بعد ${Math.ceil((V8.pinLockedUntil-now)/1000)} ثانية`;return;}if(await verifyStoredPin(p)){V8.pinFailCount=0;V8.pinLockedUntil=0;hideAppLock();}else{V8.pinFailCount=(V8.pinFailCount||0)+1;if(V8.pinFailCount>=5){V8.pinLockedUntil=Date.now()+30000;V8.pinFailCount=0;if(e)e.textContent='محاولات كثيرة. أعد المحاولة بعد 30 ثانية.';}else if(e)e.textContent=`PIN غير صحيح — تبقى ${5-V8.pinFailCount} محاولات`;document.getElementById('lockPinInput')?.select();}}
async function unlockWithBiometric(){if(!settings.security?.credentialId)return;try{const challenge=crypto.getRandomValues(new Uint8Array(32));const c=await navigator.credentials.get({publicKey:{challenge,allowCredentials:[{type:'public-key',id:fromB64u(settings.security.credentialId)}],userVerification:'preferred',timeout:60000}});if(c)hideAppLock();}catch(e){const er=document.getElementById('lockError');if(er)er.textContent='تعذر التحقق من قفل الجهاز';}}
function renderSecurityStatus(){const el=document.getElementById('securityStatus');if(!el)return;const s=settings.security||{};el.innerHTML=`<span class="security-chip ${s.lockEnabled?'':'off'}">${s.lockEnabled?'القفل مفعّل':'القفل غير مفعّل'}</span><span class="security-chip ${s.pinHash?'':'off'}">PIN ${s.pinHash?'مضبوط':'غير مضبوط'}</span><span class="security-chip ${s.credentialId?'':'off'}">جهاز ${s.credentialId?'مرتبط':'غير مرتبط'}</span>`;}

// ──────────────────────────────────────
// Automatic local backups (last 5)
// ──────────────────────────────────────
function v8BackupPayload(){return{app:'imam-academy',version:APP_VERSION,schemaVersion:SCHEMA_VERSION,createdAt:v8Now(),students:typeof structuredClone==='function'?structuredClone(students):JSON.parse(JSON.stringify(students)),sessions:typeof structuredClone==='function'?structuredClone(sessions):JSON.parse(JSON.stringify(sessions)),tasks:typeof structuredClone==='function'?structuredClone(tasks):JSON.parse(JSON.stringify(tasks)),settings:JSON.parse(JSON.stringify(settings))};}
async function listAutoBackups(){if(!db?.objectStoreNames?.contains('kv'))return[];const rows=await idbGetAll(db).catch(()=>[]);return rows.filter(r=>String(r.key||'').startsWith('autobackup:')).map(r=>({key:r.key,...(()=>{try{return JSON.parse(r.val)}catch(_){return{}}})()})).sort((a,b)=>String(b.createdAt||b.key).localeCompare(String(a.createdAt||a.key)));}
async function createAutoBackup(force=true){
  if(!db?.objectStoreNames?.contains('kv'))return;const list=await listAutoBackups();if(!force&&list[0]?.createdAt&&Date.now()-new Date(list[0].createdAt).getTime()<6*3600000){renderAutoBackupStatus(list);return;}const payload=v8BackupPayload(),key=`autobackup:${payload.createdAt}`;await idbKvPut(key,JSON.stringify(payload));const all=await listAutoBackups();for(const old of all.slice(5))await new Promise(resolve=>{try{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete(old.key);tx.oncomplete=resolve;tx.onerror=resolve;}catch(_){resolve();}});renderAutoBackupStatus(await listAutoBackups());}
function scheduleAutoBackup(){clearTimeout(V8.backupTimer);V8.backupTimer=setTimeout(()=>createAutoBackup(false).catch(()=>{}),2000);}
async function renderAutoBackupStatus(list=null){const el=document.getElementById('autoBackupStatus');if(!el)return;list=list||await listAutoBackups();el.textContent=list.length?`النسخ التلقائي: ${list.length} نسخة · آخر نسخة ${new Date(list[0].createdAt).toLocaleString('ar-EG')}`:'النسخ التلقائي: لا توجد نسخة بعد';}
async function restoreAutoBackup(){const list=await listAutoBackups();if(!list.length)return v8Toast('لا توجد نسخ تلقائية','error');const lines=list.map((x,i)=>`${i+1}) ${new Date(x.createdAt).toLocaleString('ar-EG')}`).join('\n'),pick=prompt(`اختر رقم النسخة التي تريد استعادتها:\n${lines}`);if(pick==null)return;const x=list[Number(pick)-1];if(!x)return v8Toast('اختيار غير صحيح','error');if(!confirm('سيتم استبدال البيانات الحالية بهذه النسخة. هل تستمر؟'))return;const localSync=settings.sync,localSecurity=settings.security;students=x.students||[];sessions=x.sessions||[];tasks=x.tasks||[];settings={...settings,...(x.settings||{}),sync:localSync,security:localSecurity};migrateV8Data();__IMAM_BASE__.save();renderHome();renderV8Settings();v8Toast('تمت استعادة النسخة التلقائية','success');}

// Override normal save: keep base persistence, then v8 maintenance.
function save(){__IMAM_BASE__.save();scheduleAutoBackup();if(settings.sync?.auto&&!V8.syncing)scheduleCloudPush();}

// ──────────────────────────────────────
// Optional encrypted Supabase sync
// ──────────────────────────────────────
function syncConfigValid(){const s=settings.sync||{};return /^https:\/\/[A-Za-z0-9.-]+\.supabase\.co$/i.test(s.url||'')&&!!s.key&&!!s.id&&String(s.passphrase||'').length>=8;}
function renderSyncStatus(msg='',isErr=false){const el=document.getElementById('syncStatus');if(!el)return;const s=settings.sync||{};el.className=isErr?'sync-err':'txt-mut';el.textContent=msg||(s.lastPull||s.lastPush?`آخر مزامنة — رفع: ${s.lastPush?new Date(s.lastPush).toLocaleString('ar-EG'):'—'} · تنزيل: ${s.lastPull?new Date(s.lastPull).toLocaleString('ar-EG'):'—'}`:'لم تتم مزامنة بعد. يلزم URL وanon key وSync ID وكلمة تشفير 8 أحرف على الأقل.');}
function bytesToB64(arr){let s='';const u=arr instanceof Uint8Array?arr:new Uint8Array(arr);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);}
function b64ToBytes(s){const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0));}
async function deriveSyncKey(pass,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encryptSyncPayload(obj,pass){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await deriveSyncKey(pass,salt),plain=new TextEncoder().encode(JSON.stringify(obj)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);return JSON.stringify({v:1,s:bytesToB64(salt),i:bytesToB64(iv),d:bytesToB64(new Uint8Array(cipher))});}
async function decryptSyncPayload(blob,pass){const p=JSON.parse(blob),salt=b64ToBytes(p.s),iv=b64ToBytes(p.i),data=b64ToBytes(p.d),key=await deriveSyncKey(pass,salt),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);return JSON.parse(new TextDecoder().decode(plain));}
function cloudPayload(){const cfg=JSON.parse(JSON.stringify(settings));if(cfg.sync){cfg.sync.key='';cfg.sync.passphrase='';}if(cfg.security){cfg.security.pinHash='';cfg.security.pinSalt='';cfg.security.pinKdf='';cfg.security.pinIterations=0;cfg.security.credentialId='';cfg.security.lockEnabled=false;}return{version:APP_VERSION,schemaVersion:SCHEMA_VERSION,updatedAt:v8Now(),students:JSON.parse(JSON.stringify(students)),sessions:JSON.parse(JSON.stringify(sessions)),tasks:JSON.parse(JSON.stringify(tasks)),settings:cfg};}
function supaHeaders(){return{'Content-Type':'application/json',apikey:settings.sync.key,Authorization:`Bearer ${settings.sync.key}`,Prefer:'resolution=merge-duplicates,return=minimal'};}
async function pushCloudSync(opts={}){if(!syncConfigValid()){if(!opts.silent)v8Toast('أكمل إعدادات المزامنة وكلمة التشفير أولاً','error');return false;}if(!crypto?.subtle){v8Toast('التشفير غير مدعوم','error');return false;}V8.syncing=true;renderSyncStatus('جارٍ تشفير ورفع البيانات…');try{const payload=await encryptSyncPayload(cloudPayload(),settings.sync.passphrase),url=`${settings.sync.url}/rest/v1/imam_sync?on_conflict=sync_id`,res=await fetch(url,{method:'POST',headers:supaHeaders(),body:JSON.stringify({sync_id:settings.sync.id,payload,updated_at:v8Now()})});if(!res.ok)throw new Error(`HTTP ${res.status}: ${await res.text()}`);settings.sync.lastPush=v8Now();__IMAM_BASE__.save();renderSyncStatus();if(!opts.silent)v8Toast('تم رفع النسخة المشفرة','success');return true;}catch(e){renderSyncStatus('فشل الرفع: '+(e.message||e),true);if(!opts.silent)v8Toast('تعذر رفع المزامنة','error');return false;}finally{V8.syncing=false;}}
function itemTimestamp(x){return new Date(x?.updatedAt||x?.createdAt||x?.date||0).getTime()||0;}
function mergeById(local,remote){const m=new Map();[...(remote||[]),...(local||[])].forEach(x=>{if(!x?.id)return;const old=m.get(x.id);if(!old||itemTimestamp(x)>=itemTimestamp(old))m.set(x.id,x);});return [...m.values()];}
async function pullCloudSync(opts={}){if(!syncConfigValid()){if(!opts.silent)v8Toast('أكمل إعدادات المزامنة أولاً','error');return false;}V8.syncing=true;renderSyncStatus('جارٍ تنزيل وفك تشفير البيانات…');try{const url=`${settings.sync.url}/rest/v1/imam_sync?select=payload,updated_at&sync_id=eq.${encodeURIComponent(settings.sync.id)}&limit=1`,res=await fetch(url,{headers:{apikey:settings.sync.key,Authorization:`Bearer ${settings.sync.key}`}});if(!res.ok)throw new Error(`HTTP ${res.status}`);const rows=await res.json();if(!rows.length){renderSyncStatus('لا توجد نسخة سحابية لهذا Sync ID.');if(!opts.silent)v8Toast('لا توجد نسخة سحابية بعد','info');return false;}const remote=await decryptSyncPayload(rows[0].payload,settings.sync.passphrase),localSync=settings.sync,localSecurity=settings.security;students=mergeById(students,remote.students);sessions=mergeById(sessions,remote.sessions);tasks=mergeById(tasks,remote.tasks);settings={...settings,...(remote.settings||{}),sync:localSync,security:localSecurity};migrateV8Data();settings.sync.lastPull=v8Now();__IMAM_BASE__.save();renderHome();if(curPage==='students')renderSt();renderV8Settings();if(!opts.silent)v8Toast('تم دمج النسخة السحابية بنجاح','success');return true;}catch(e){renderSyncStatus(e?.name==='OperationError'?'تعذر فك التشفير — تحقق من كلمة المزامنة':'فشل التنزيل: '+(e.message||e),true);if(!opts.silent)v8Toast('تعذر تنزيل المزامنة','error');return false;}finally{V8.syncing=false;}}
function scheduleCloudPush(){clearTimeout(V8.syncTimer);V8.syncTimer=setTimeout(()=>pushCloudSync({silent:true}),5000);}
async function autoCloudSync(){if(!settings.sync?.auto||!syncConfigValid())return;await pullCloudSync({silent:true});await pushCloudSync({silent:true});}

// ──────────────────────────────────────
// Import extension preserving v8 fields
// ──────────────────────────────────────
function sanitizeBackupData(d){
  const safe=__IMAM_BASE__.sanitizeBackupData(d);safe.students.forEach((st,i)=>{const raw=d.students?.[i]||{};st.plan=V8_PLANS[raw.plan]?raw.plan:'balanced';st.nextMode=['same','next'].includes(raw.nextMode)?raw.nextMode:'same';});
  safe.sessions.forEach((se,i)=>{const raw=(d.sessions||[])[i]||{};se.recitationErrors=(raw.recitationErrors||[]).filter(x=>x&&V8_ERROR_TYPES.includes(x.type)).slice(0,1000).map(x=>({type:x.type,at:v8SafeText(x.at,40)}));if(/^[A-Za-z0-9._:-]{1,160}$/.test(String(raw.voiceNoteId||'')))se.voiceNoteId=raw.voiceNoteId;});return safe;
}
function importData(e){
  const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(!d||!Array.isArray(d.students)||!Array.isArray(d.sessions||[]))throw new Error('بنية الملف غير صحيحة');const safe=sanitizeBackupData(d);if(!confirm(`سيتم استبدال البيانات الحالية واستيراد ${safe.students.length} طالب و${safe.sessions.length} حصة.\nيفضل أخذ نسخة احتياطية أولاً.\n\nهل تريد الاستمرار؟`))return;const localSync=settings.sync,localSecurity=settings.security;students=safe.students;sessions=safe.sessions;tasks=safe.tasks||[];const cfg=d.settings&&typeof d.settings==='object'?d.settings:{};settings={...settings,...cfg,sync:localSync,security:localSecurity};migrateV8Data();__IMAM_BASE__.save();renderHome();renderV8Settings();v8Toast('تم استيراد البيانات وترقيتها إلى v8','success');goPage('home');}catch(err){v8Toast(`ملف غير صالح: ${err.message||'تعذر القراءة'}`,'error');}finally{e.target.value='';}};reader.readAsText(file);
}


// v8 initialization is invoked by app.js only after initDB() has completed.

// Bridge for the v9 UX layer. This snapshot is created while v8.js is executing,
// before v9.js declares its overrides, so v9 can safely call the immediate
// predecessor implementations without global function-hoisting recursion.
globalThis.__IMAM_V8_BASE__={
  renderHome,goPage,renderSt,filterSt,openAddSt,editSt,saveSt,initSession,onSesSt,applySessionToEditor,
  openQuranTextModal,closeQuranTextModal,playQuranRange,playNextQuranAudio,stopQuranAudio,initSettings,
  renderCheckin,openProf,save,renderReport,migrateV8Data
};
