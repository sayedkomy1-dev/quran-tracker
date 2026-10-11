'use strict';
/* أكاديمية الإمام v11.0 — Premium UI Stage 2.
   Presentation/context only; does not mutate student/session data. */
(function initV11UI(g){
  const VERSION='11.0.0';
  const STAGE='premium-2';
  const UI={version:VERSION,stage:STAGE};
  const state=()=>g.ImamApp?.State||{};

  const icons={
    students:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    checkin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"></path><path d="M21 12a9 9 0 1 1-5.3-8.2"></path></svg>',
    session:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path><path d="M8 7h8M8 11h6"></path></svg>',
    reports:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"></path></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.66.96.3.27.69.42 1.1.44H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"></path></svg>',
    profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>'
  };

  function escapeText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function ensureHeaderStatus(){
    const actions=document.querySelector('.hdr-actions');
    if(!actions||document.getElementById('v11Connectivity'))return;
    const pill=document.createElement('div');
    pill.id='v11Connectivity';pill.className='v11-connectivity';pill.setAttribute('role','status');pill.setAttribute('aria-live','polite');
    pill.innerHTML='<i aria-hidden="true"></i><span id="v11ConnectivityText">متصل</span>';
    actions.insertBefore(pill,actions.firstChild);
  }

  function updateConnectivity(){
    ensureHeaderStatus();
    const pill=document.getElementById('v11Connectivity'),text=document.getElementById('v11ConnectivityText');
    if(!pill||!text)return;
    const online=navigator.onLine!==false;
    pill.dataset.state=online?'online':'offline';
    text.textContent=online?'متصل':'محلي';
    pill.title=online?'الاتصال متاح — المزامنة السحابية تعمل عند تفعيلها':'بدون إنترنت — العمل محفوظ على هذا الجهاز';
  }

  const pageMeta={
    students:{kicker:'إدارة الحلقة',title:'الطلاب',desc:'ابحث بسرعة، راجع حالة كل طالب وافتح ملفه من مكان واحد.',icon:'students'},
    checkin:{kicker:'متابعة اليوم',title:'الحضور',desc:'تسجيل سريع وواضح لحضور الطلاب قبل بدء الحصص.',icon:'checkin'},
    session:{kicker:'مساحة المحفظ',title:'الحصة',desc:'اختر الطالب ثم قيّم التسميع وحدد التكليف القادم بدون تشتيت.',icon:'session'},
    reports:{kicker:'رؤية الأداء',title:'التقارير',desc:'راجع الحضور والتقدم والمؤشرات مع أدوات المشاركة والطباعة.',icon:'reports'},
    settings:{kicker:'إدارة المنصة',title:'الإعدادات',desc:'التخصيص والنسخ والمزامنة والحماية في مساحة منظمة.',icon:'settings'},
    profile:{kicker:'متابعة فردية',title:'ملف الطالب',desc:'كل ما يخص تقدم الطالب وتاريخه وإجراءاته في صفحة واحدة.',icon:'profile'}
  };

  function ensurePageHero(page){
    const meta=pageMeta[page],pg=document.getElementById('pg-'+page);
    if(!meta||!pg||pg.querySelector(':scope > .v11-page-hero'))return;
    const hero=document.createElement('section');
    hero.className='v11-page-hero';hero.dataset.page=page;
    hero.innerHTML=`<div class="v11-page-hero-icon">${icons[meta.icon]||''}</div><div class="v11-page-hero-copy"><span>${escapeText(meta.kicker)}</span><h1>${escapeText(meta.title)}</h1><p>${escapeText(meta.desc)}</p></div><div class="v11-page-hero-extra" id="v11HeroExtra-${page}"></div>`;
    pg.prepend(hero);
  }

  function enhanceHome(){const home=document.getElementById('pg-home');if(home)home.dataset.v11='premium';}

  function updateStudentMeta(){
    const box=document.getElementById('v11HeroExtra-students');if(!box)return;
    const all=Array.isArray(state().students)?state().students:[];
    const visible=document.querySelectorAll('#stList .stc').length;
    const archived=all.filter(x=>x?.studentStatus==='archived').length;
    box.innerHTML=`<strong>${visible}</strong><small>ظاهر الآن${archived?` · ${archived} مؤرشف`:''}</small>`;
  }

  function ensureSessionNavigator(){
    const pg=document.getElementById('pg-session');if(!pg||document.getElementById('v11SessionNavigator'))return;
    const hero=pg.querySelector(':scope > .v11-page-hero');
    const nav=document.createElement('nav');nav.id='v11SessionNavigator';nav.className='v11-session-nav';nav.setAttribute('aria-label','أقسام الحصة');
    nav.innerHTML=`<button data-target="student" class="on"><span>1</span>الطالب</button><button data-target="assessment"><span>2</span>التسميع</button><button data-target="assignment"><span>3</span>التكليف</button><button data-target="notes"><span>4</span>الملاحظات</button>`;
    nav.addEventListener('click',e=>{const b=e.target.closest('button[data-target]');if(!b)return;sessionJump(b.dataset.target);});
    hero?.insertAdjacentElement('afterend',nav);
    const firstCard=[...pg.children].find(x=>x.classList?.contains('card')&&!x.classList.contains('session-journey-card'));
    if(firstCard&&!document.getElementById('v11SessionContext')){
      const ctx=document.createElement('section');ctx.id='v11SessionContext';ctx.className='v11-session-context empty';ctx.innerHTML='<div class="v11-context-avatar">—</div><div><b>اختر طالبًا لبدء الحصة</b><span>سيظهر هنا ملخص سريع قبل التقييم</span></div>';
      firstCard.insertAdjacentElement('afterend',ctx);
    }
  }

  function sessionJump(target){
    const pg=document.getElementById('pg-session');if(!pg)return;
    const divs=pg.querySelectorAll('#sesContent > .sec-div');
    const targets={student:[...pg.children].find(x=>x.classList?.contains('card')&&!x.classList.contains('session-journey-card')),assessment:divs[0],assignment:divs[1],notes:document.getElementById('sesNotes')?.closest('.card')};
    const el=targets[target];if(!el)return;
    document.querySelectorAll('#v11SessionNavigator button').forEach(b=>b.classList.toggle('on',b.dataset.target===target));
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function updateSessionContext(){
    const box=document.getElementById('v11SessionContext'),select=document.getElementById('sesSt');if(!box||!select)return;
    const id=select.value,all=Array.isArray(state().students)?state().students:[],ses=Array.isArray(state().sessions)?state().sessions:[];
    const st=all.find(x=>String(x.id)===String(id));
    if(!st){box.className='v11-session-context empty';box.innerHTML='<div class="v11-context-avatar">—</div><div><b>اختر طالبًا لبدء الحصة</b><span>سيظهر هنا ملخص سريع قبل التقييم</span></div>';return;}
    const init=String(st.name||'طالب').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('');
    const history=ses.filter(x=>String(x.studentId)===String(st.id)).slice().sort((a,b)=>String(b.sessionDate||b.date||'').localeCompare(String(a.sessionDate||a.date||'')));
    const last=history[0];
    const lastDate=last?.sessionDate||String(last?.date||'').slice(0,10)||'';
    box.className='v11-session-context';
    box.innerHTML=`<div class="v11-context-avatar">${escapeText(init||'ط')}</div><div class="v11-context-main"><b>${escapeText(st.name||'طالب')}</b><span>${escapeText(st.level||'بدون مستوى')}${st.group?' · '+escapeText(st.group):''}</span></div><div class="v11-context-metrics"><span><small>آخر حصة</small><b>${escapeText(lastDate||'—')}</b></span><span><small>ولي الأمر</small><b>${escapeText(st.parent||'—')}</b></span></div>`;
  }

  function decorateSessionCards(){
    const pg=document.getElementById('pg-session');if(!pg)return;
    const divs=pg.querySelectorAll('#sesContent > .sec-div');divs[0]?.classList.add('v11-section-divider','assessment');divs[1]?.classList.add('v11-section-divider','assignment');
    document.getElementById('sessionErrorsCard')?.classList.add('v11-error-workbench');
    document.getElementById('prevCard')?.classList.add('v11-prev-workbench');
    document.getElementById('saveSessionBtn')?.classList.add('v11-save-primary');
    document.getElementById('saveSendSessionBtn')?.classList.add('v11-save-whatsapp');
  }

  function decorateProfile(){
    const hdr=document.getElementById('profHdr');if(hdr)hdr.classList.add('v11-profile-head');
    const actions=document.getElementById('profileActions');if(actions)actions.classList.add('v11-profile-actions');
    ['profProgress','profStop','profMap','profErrors','profTrack','profChart','profWeak','profHist'].forEach(id=>document.getElementById(id)?.classList.add('v11-profile-section'));
  }

  function decorateSettings(){
    const pg=document.getElementById('pg-settings');if(!pg)return;
    pg.querySelectorAll(':scope > .card').forEach(card=>{
      card.classList.add('v11-settings-card');
      const t=(card.querySelector('.ch')?.textContent||'').trim();
      card.dataset.tone=/خطر|حذف/.test(t)?'danger':/نسخ|مزامنة|سحابة/.test(t)?'sync':/حماية|PIN|بصمة/.test(t)?'security':'default';
    });
  }

  function decorateCorePages(){
    Object.keys(pageMeta).forEach(ensurePageHero);
    ensureSessionNavigator();decorateSessionCards();decorateProfile();decorateSettings();updateStudentMeta();updateSessionContext();
  }

  function wrapFunction(name,after){
    const base=g[name];if(typeof base!=='function'||base.__v11Stage2Wrapped)return;
    function wrapped(){const result=base.apply(this,arguments);try{after?.apply(this,arguments);}catch(e){console.warn('[v11-ui]',name,e);}return result;}
    wrapped.__v11Stage2Wrapped=true;wrapped.__v11Base=base;g[name]=wrapped;
  }

  function wrapRuntime(){
    wrapFunction('renderV9Home',enhanceHome);
    wrapFunction('renderSt',()=>requestAnimationFrame(updateStudentMeta));
    wrapFunction('filterSt',()=>requestAnimationFrame(updateStudentMeta));
    wrapFunction('onSesSt',()=>requestAnimationFrame(updateSessionContext));
    wrapFunction('openProf',()=>requestAnimationFrame(decorateProfile));
    wrapFunction('goPage',()=>requestAnimationFrame(()=>{decorateCorePages();updateStudentMeta();updateSessionContext();}));
  }

  function apply(){
    document.body.classList.add('v11-ready','v11-stage2');
    document.documentElement.dataset.uiVersion=VERSION;document.documentElement.dataset.uiStage=STAGE;
    ensureHeaderStatus();updateConnectivity();enhanceHome();decorateCorePages();wrapRuntime();
  }

  g.addEventListener('online',updateConnectivity);g.addEventListener('offline',updateConnectivity);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  g.ImamApp=g.ImamApp||{};g.ImamApp.V11UI=Object.freeze({...UI,updateConnectivity,apply,updateSessionContext,updateStudentMeta});
})(globalThis);
