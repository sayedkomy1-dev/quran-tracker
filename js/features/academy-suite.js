/* Academy Suite Review 7 — premium navigation & real-service adapters. No student records. */
(function (g) {
  'use strict';
  const key='imam.academy-suite.presentation.v1';
  const doc=g.document;
  const create=(tag,cl,txt)=>{const e=doc.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e;};
  const links=[
    {group:'إدارة التعليم',icon:'📖',title:'الحصص والتسميع',desc:'الحفظ الجديد والمراجعة والتكليف والتقرير',action:'session',tone:'emerald'},
    {group:'إدارة التعليم',icon:'🖍️',title:'سبورة الإمام',desc:'المصحف والتفاعل مع الطالب ومشاركة الشاشة',action:'board',tone:'gold'},
    {group:'إدارة التعليم',icon:'🏫',title:'الحلقات والحضور',desc:'الحضور والجداول والتسميع الجماعي',action:'circles',tone:'blue'},
    {group:'شؤون الطلاب',icon:'👥',title:'ملفات الطلاب',desc:'السجلات والبحث والخطط والأرشفة',action:'students',tone:'emerald'},
    {group:'شؤون الطلاب',icon:'🎯',title:'المتابعة والتدخل',desc:'أخطاء التسميع والتعثر والخطط العلاجية',action:'followup',tone:'rose'},
    {group:'شؤون الطلاب',icon:'🎓',title:'الاختبارات والإجازات',desc:'التقييم وسجلات الاختبارات المعتمدة',action:'exams',tone:'gold'},
    {group:'الأدوات التعليمية',icon:'🔤',title:'منهج الإمام للتأسيس',desc:'ثمانية مستويات وأنشطة واختبارات تدريبية',href:'academy-learning.html#foundation',tone:'violet'},
    {group:'الأدوات التعليمية',icon:'🗣️',title:'المخارج والتجويد',desc:'أطلس الحروف وأحكام التجويد وتدريباتها',href:'academy-learning.html#tajweed',tone:'blue'},
    {group:'الأدوات التعليمية',icon:'📘',title:'مصحف الإمام العام',desc:'صفحات المدينة والتلاوة والتدريب الحر',href:'academy-mushaf.html',tone:'emerald'},
    {group:'التواصل والإدارة',icon:'👨‍👩‍👧',title:'بوابة ولي الأمر',desc:'ملفات الأبناء بتسجيل الدخول المعتمد',href:'guardian-login.html',tone:'blue'},
    {group:'التواصل والإدارة',icon:'📊',title:'التقارير',desc:'متابعة الدرجات والحضور والتقدم الفعلي',action:'reports',tone:'violet'},
    {group:'التواصل والإدارة',icon:'💬',title:'مركز التواصل',desc:'مراسلة أولياء الأمور عبر القنوات المعتمدة',action:'broadcast',tone:'gold'},
  ];
  // Preserve role visibility: internal targets are resolved via visible, existing navigation.
  function nativeVisible(name){
    const sel={'session':"goPage('session')",'students':"goPage('students')",'reports':"goPage('reports')",'followup':"goPage('followup')"}[name];
    if(name==='board')return !!doc.getElementById('imamSmartBoardTab')&&!!g.ImamApp?.SmartBoard?.open;
    if(name==='circles')return !!g.ImamApp?.CircleManager?.open;
    if(name==='exams')return !!g.ImamApp?.AcademicExams?.open;
    if(name==='broadcast')return typeof g.openBroadcastComposer==='function';
    const node=[...doc.querySelectorAll('#mainNav .nav-t')].find(e=>e.getAttribute('onclick')===sel);
    if(!node)return false;
    return g.getComputedStyle(node).display!=='none' && !node.hidden && !node.classList.contains('role-hidden');
  }
  function launch(action){
    if(!nativeVisible(action)){notify('هذه الوظيفة غير متاحة في صلاحياتك الحالية أو لم تكتمل تهيئتها.');return;}
    try {
      if(action==='board') g.ImamApp.SmartBoard.open();
      else if(action==='circles')g.ImamApp.CircleManager.open();
      else if(action==='exams')g.ImamApp.AcademicExams.open();
      else if(action==='broadcast')g.openBroadcastComposer();
      else if(typeof g.goPage==='function')g.goPage(action);
      else notify('تعذر فتح القسم، أعد تحميل التطبيق.');
    } catch(e){notify('تعذر فتح الخدمة. استخدم القائمة الأصلية ثم أعد المحاولة.');}
  }
  function notify(text){if(typeof g.toast==='function')g.toast(text,'info');else g.alert(text);}
  let prefs={};try{const x=JSON.parse(g.localStorage.getItem(key)||'{}');if(x&&typeof x==='object')prefs=x;}catch(_){}
  function card(item){
    const el=create(item.href?'a':'button','ias-card ias-'+item.tone);
    if(item.href)el.setAttribute('href',item.href);else {el.type='button';el.addEventListener('click',()=>launch(item.action));}
    const ico=create('span','ias-icon',item.icon);ico.setAttribute('aria-hidden','true');
    const body=create('span','ias-card-copy');body.append(create('strong','',item.title),create('small','',item.desc));
    el.append(ico,body,create('span','ias-card-chevron','‹'));
    return el;
  }
  function drawHome(){
    const home=doc.getElementById('pg-home');if(!home||doc.getElementById('imamAcademySuite'))return;
    const shell=create('section','ias-home');shell.id='imamAcademySuite';
    const hero=create('div','ias-hero');
    const copy=create('div','ias-hero-body');copy.append(create('span','ias-kicker','أكاديمية الإمام · مساحة العمل المتكاملة'));
    const title=create('h1','', 'لأن كل آية تستحق عناية');title.id='iasHeroTitle';title.textContent=String(prefs.title||'لأن كل آية تستحق عناية').slice(0,70);copy.append(title);
    copy.append(create('p','','إدارة الحلقات والحصص، وسبورة القرآن، ومتابعة الطلاب، والأدوات التعليمية… بخطوات أقل ومكان واضح لكل خدمة.'));
    const actions=create('div','ias-actions');
    [{label:'بدء حصة',act:'session'}, {label:'سبورة الإمام',act:'board'}, {label:'جميع البوابات',href:'academy-portals.html'}].forEach((x,i)=>{
      const el=create(x.href?'a':'button',i===0?'ias-btn primary':'ias-btn',x.label);
      if(x.href)el.href=x.href;else{el.type='button';el.onclick=()=>launch(x.act);}
      actions.append(el);
    });copy.append(actions);hero.append(copy);
    const ornament=create('div','ias-hero-visual');ornament.setAttribute('aria-hidden','true');
    ornament.append(create('span','ias-visual-star','✦'),create('span','ias-visual-book','۞'),create('span','ias-visual-caption','بِالْقُرْآنِ نَحْيَا'));
    hero.append(ornament);shell.append(hero);
    const heading=create('div','ias-heading');heading.append(create('div','', 'مساحات الأكاديمية'));
    const more=create('a','','استعراض البوابات والخدمات');more.href='academy-portals.html';heading.append(more);shell.append(heading);
    const group=create('div','ias-card-grid');links.slice(0,9).forEach(x=>group.append(card(x)));shell.append(group);
    const line=create('div','ias-section-end');line.append(create('strong','','مؤشرات الأكاديمية المباشرة'),create('span','','الأرقام التالية من سجلاتك الحالية وليست بيانات تجريبية.'));shell.append(line);
    home.insertBefore(shell,home.firstChild);
    // Existing live scorecards remain the sole data nodes (never duplicated).
  }
  function addLearningShortcut(){
    const panel=doc.querySelector('#imamWorkspacePanel')||doc.querySelector('.imam-workspace-panel');
    if(!panel||panel.querySelector('.ias-workspace-tools'))return;
    const group=create('section','ias-workspace-tools');group.append(create('h3','','أدوات تعليمية إضافية'));
    [['🔤 منهج الإمام للتأسيس','academy-learning.html#foundation'],['🗣️ أطلس التجويد والمخارج','academy-learning.html#tajweed'],['👨‍👩‍👧 بوابات الأكاديمية','academy-portals.html']].forEach(([label,href])=>{const a=create('a','ias-workspace-action',label);a.href=href;group.append(a)});panel.append(group);
  }
  function setupPersonalize(){
    const panel=doc.getElementById('imamAcademySuite');if(!panel)return;
    const b=create('button','ias-personalize','تخصيص العنوان');b.type='button';
    b.onclick=()=>{
      const current=String(prefs.title||'لأن كل آية تستحق عناية');const next=g.prompt('عنوان الواجهة على هذا الجهاز فقط (لا يغيّر بيانات الأكاديمية)',current);
      if(next===null)return;
      const title=String(next).trim().slice(0,70);if(!title){notify('العنوان لا يمكن أن يكون فارغًا.');return;}
      prefs.title=title;
      try{g.localStorage.setItem(key,JSON.stringify({title}));}catch(_){notify('تعذر حفظ تفضيل العرض على الجهاز.');}
      doc.getElementById('iasHeroTitle').textContent=title;
    };
    panel.querySelector('.ias-heading')?.append(b);
  }
  function init(){drawHome();setupPersonalize();addLearningShortcut();}
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
  g.ImamApp=g.ImamApp||{};g.ImamApp.AcademySuite=Object.freeze({launch,links:links.map(x=>({title:x.title,group:x.group})),init});
})(window);
