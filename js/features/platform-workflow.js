/* Imam Academy workspace accessibility + focus workflow.
   UI-only: moves EXISTING save buttons; never writes lessons, finance, auth or storage. */
(function (g) {
 'use strict';
 const d=g.document; if(!d)return;
 const pages={
  students:['ملفات الطلاب','ابحث عن الطالب، وراجع ملفه وتكليفاته قبل الانتقال للحصة.'],
  checkin:['حضور الحلقة','سجّل الحضور من قائمة الطلاب المصرح لك بها.'],
  session:['استوديو الحصة','اختر الطالب، سجّل التسميع، واحتفظ بزر الحفظ أمامك.'],
  reports:['تقارير الحصص','راجع النتائج والتفاصيل قبل مشاركة التقرير.'],
  settings:['إعدادات الأكاديمية','الخصوصية والنسخ الاحتياطي والمزامنة وخيارات العرض.'],
  tasks:['مهام اليوم','المهام المستحقة والمتابعة التعليمية.'],
  followup:['مركز المتابعة','مواضع التثبيت والتكليفات التي تحتاج متابعة.'],
  compare:['مقارنة التقدم','قارن البيانات الحقيقية ضمن حدود حسابك.'],
  mushaf:['المصحف الشريف','قراءة القرآن الكريم بالخط والمصدر الأصلي.'],
  profile:['ملف الطالب','السجل التعليمي والتكليفات والمراجعات.'],
  'circle-manager':['إدارة الحلقات','المجموعة والحضور والجداول والتسميع الجماعي.'],
  'academic-exams':['الاختبارات والإجازات','إدارة الاختبارات والإجازات من خلال صلاحياتك الحالية.'],
  analytics:['التحليلات','المؤشرات والتغيرات التي تساعد على تحسين المتابعة.']
 };
 const find=id=>d.getElementById(id);
 function heading(page,key){
  if(key==='students'||key==='session'||page.querySelector(':scope > .ui-workspace-heading, :scope > .v11-page-hero'))return;
  // Specialist screens already render a semantic heading; do not duplicate it.
  if(page.querySelector(':scope > .cm-header, :scope > .ae-header, :scope > .analytics-header'))return;
  const [title,description]=pages[key]||[page.querySelector('.ch,h2')?.textContent?.trim()||'مساحة العمل','أدوات القسم وبياناته حسب صلاحيات حسابك.'];
  const head=d.createElement('header');head.className='ui-workspace-heading';head.dir='rtl';
  const group=d.createElement('div');group.className='ui-workspace-heading-copy';
  const meta=d.createElement('span');meta.className='ui-workspace-kicker';meta.textContent='أكاديمية الإمام / مساحة العمل';
  const h=d.createElement('h1');h.textContent=title;
  const intro=d.createElement('p');intro.textContent=description;
  group.append(meta,h,intro);head.append(group);
  if(key==='session'){
   const helper=d.createElement('span');helper.className='ui-workspace-assist';helper.textContent='تُحفظ النتائج الرسمية بأداة الحصة الأصلية فقط';head.append(helper);
  }
  page.insertBefore(head,page.firstChild);
 }
 function sessionDock(){
  const page=find('pg-session'),save=find('saveSessionBtn'),send=find('saveSendSessionBtn'),draft=find('draftState');
  if(!page||!save||!send||!draft||find('uiSessionActionDock'))return;
  // Preserve BOTH official save actions in #v9SessionFooter. The previous floating
  // dock separated the assignment-audio control from save/send and covered fields.
  // Beta21: No fixed save shortcut. Save/send stay in #v9SessionFooter;
  // the notes tab provides the single explicit destination for official saving.
  const setKeyboard=()=>{
    const v=g.visualViewport;
    const isInput=d.activeElement?.matches?.('input,select,textarea,[contenteditable="true"]');
    d.body.classList.toggle('ui-session-keyboard',!!(v&&isInput&&g.innerWidth<=799&&g.innerHeight-v.height>145));
  };
  g.visualViewport?.addEventListener('resize',setKeyboard,{passive:true});
  d.addEventListener('focusin',setKeyboard);d.addEventListener('focusout',()=>g.requestAnimationFrame?.(setKeyboard));
  page.querySelectorAll('.tog[id],.direction-btn,.voice-btn').forEach(el=>{
    if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.title||el.closest('.card')?.querySelector('.badge,.ch')?.textContent?.trim()||'تغيير الخيار');
    if(el.matches('.tog[id]')){el.setAttribute('role','button');el.tabIndex=0;el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();el.click();}});}
  });
 }
 function pageState(){
  const active=d.querySelector('.pg.on');const key=active?.id?.replace(/^pg-/,'');
  d.body.classList.toggle('ui-session-active',key==='session');
  d.querySelectorAll('#v9Nav [data-page]').forEach(btn=>{
    const on=key&&btn.dataset.page===key;
    if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
 }
 function onlineIndicator(){
  const el=find('uiConnectivityNote');if(!el)return;
  const online=g.navigator?.onLine!==false;
  el.hidden=online;el.textContent=online?'':'غير متصل — عرض البيانات المحلية لا يضمن المزامنة';
 }
 function init(){
  Object.entries(pages).forEach(([key])=>{const page=find('pg-'+key);if(page)heading(page,key);});
  // Prioritize the existing backup section instead of duplicating any restore action.
  const settings=find('pg-settings');
  const backup=[...(settings?.querySelectorAll(':scope > .card')||[])].find(card=>card.querySelector('.ch')?.textContent?.includes('النسخ الاحتياطي'));
  if(backup){backup.classList.add('ui-important-settings');settings.querySelector('.ui-workspace-heading')?.insertAdjacentElement('afterend',backup);}
  sessionDock();
  const note=d.createElement('p');note.id='uiConnectivityNote';note.className='ui-network-note';note.setAttribute('role','status');note.hidden=true;
  find('uxPageStrip')?.insertAdjacentElement('afterend',note);
  onlineIndicator();g.addEventListener('online',onlineIndicator);g.addEventListener('offline',onlineIndicator);
  pageState();
  if(typeof MutationObserver==='function'){
   const observer=new MutationObserver(pageState);
   d.querySelectorAll('.pg[id]').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
   g.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
  g.ImamApp=g.ImamApp||{};g.ImamApp.PlatformWorkflow=Object.freeze({version:'11.12.1-beta.21',refresh:pageState});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
