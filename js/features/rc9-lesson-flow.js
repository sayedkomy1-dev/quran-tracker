'use strict';
/* IMAM rc.9 — One-screen teacher workflow.
 * Presentation only: no replacement of save/session handlers or student data.
 * Reparent ORIGINAL nodes (never clone interactive controls); preserve role visibility.
 */
(function(g){
 const d=g.document;if(!d)return;
 const $=id=>d.getElementById(id);
 let lessonBuilt=false, readerBuilt=false;
 const featureKey='imam:lesson:guided-default:rc9';
 function isActive(){return !!$('pg-session')?.classList.contains('on');}
 function makeDetails(id,label,cls){
  const el=d.createElement('details');el.id=id;el.className=cls||'ia29-disclosure';
  const s=d.createElement('summary');s.textContent=label;el.append(s);return el;
 }
 function lesson(){
  const pg=$('pg-session'),wizard=$('v9SessionSteps'),student=$('ia21SessionStudent'),completeness=$('im119Completion');
  if(!pg||!wizard||!student||!completeness||lessonBuilt)return false;
  // Put the existing tab bar immediately after student and attendance; nothing precedes recitation except status.
  student.insertAdjacentElement('afterend',wizard);
  const advanced=makeDetails('ia29LessonExtras','تفاصيل الحصة والإعدادات عند الحاجة','ia29-lesson-extras');
  wizard.insertAdjacentElement('afterend',advanced);
  const mode=wizard.querySelector('.v9-session-mode');
  if(mode){const options=makeDetails('ia29ViewOptions','طريقة العرض والصوت','ia29-view-options');options.append(mode);wizard.append(options);}
  for(const id of ['im119Completion','integratedTeacherBrief','sessionJourneyCard']){
    const item=$(id);if(item)advanced.append(item);
  }
  const absent=$('imamAbsenceMakeup');if(absent)advanced.append(absent);
  // Move audio downloader into lesson — direct access at the point of giving new work.
  const card=$('new-s')?.closest('.card');
  if(card&&!$('ia29DownloadAudio')){
   const b=d.createElement('button');b.type='button';b.id='ia29DownloadAudio';b.className='ia29-download-btn';
   b.textContent='⬇ تنزيل تلاوات الحفظ آية بآية';b.addEventListener('click',openLibrary);
   const header=card.querySelector('.fb');if(header)header.insertAdjacentElement('afterend',b);else card.prepend(b);
  }
  const share=$('teacherAssignmentAudioBtn');
  if(share&&!$('ia29DownloadAudioNotes')){
   const b=d.createElement('button');b.type='button';b.id='ia29DownloadAudioNotes';b.className='ia29-download-btn ia29-download-notes';
   b.textContent='⬇ تحميل مكتبة الصوت آية بآية';b.addEventListener('click',openLibrary);
   share.closest('.assignment-audio-details')?.insertAdjacentElement('beforebegin',b);
  }
  // Migration to guided flow once; explicit later choice of expert mode is respected.
  try{
   if(!g.localStorage?.getItem(featureKey)){
    g.setSessionMode?.('guided',false);
    g.localStorage?.setItem(featureKey,'guided');
   }else if(g.localStorage?.getItem(featureKey)==='guided'&&pg.classList.contains('v9-expert'))g.setSessionMode?.('guided',false);
  }catch(_){g.setSessionMode?.('guided',false);}
  wizard.addEventListener('click',ev=>{
   const btn=ev.target.closest('[data-mode]');if(!btn)return;
   try{g.localStorage?.setItem(featureKey,btn.dataset.mode==='expert'?'expert':'guided');}catch(_){}
  },true);
  pg.addEventListener('change',ev=>{if(ev.target?.id==='sesSt')advanced.open=false;});
  // When a teacher chooses absence, keep the original makeup controls reachable.
  pg.querySelectorAll('#sb-a,#sb-v').forEach(b=>b.addEventListener('click',()=>{if(absent&&!absent.hidden)advanced.open=true;}));
  lessonBuilt=true;return true;
 }
 function home(){
  const pg=$('pg-home');if(!pg)return;
  // v9Home MUST stay a direct child of pg-home. Legacy CSS intentionally hides
  // all other children in v9-home-ready mode, so moving it would blank the screen.
  const v9=$('v9Home');
  if(v9&&v9.parentElement===pg){
   const start=v9.querySelector(':scope > .v92-primary-card');
   if(start){
    const lead=v9.querySelector(':scope > .v92-home-head');
    if(lead&&lead.nextElementSibling!==start)lead.insertAdjacentElement('afterend',start);
    const stats=v9.querySelector(':scope > .v92-stats');
    if(stats&&start.nextElementSibling!==stats)start.insertAdjacentElement('afterend',stats);
   }
   let tools=v9.querySelector(':scope > #ia29V9More');
   if(!tools){tools=makeDetails('ia29V9More','المصحف والطلاب والأدوات الأخرى','ia29-home-more');v9.append(tools);}
   for(const cls of ['v92-actions','v1052-mushaf-launcher','v92-today-card']){
    const el=v9.querySelector(':scope > .'+cls);if(el&&el.parentElement!==tools)tools.append(el);
   }
  }
  const hub=$('roleHomeHub');
  if(hub){
   let fold=hub.querySelector('#ia29RoleTools');
   const actions=hub.querySelector(':scope > .role-home-actions');
   if(actions&&!fold){
    fold=makeDetails('ia29RoleTools','كل أدوات الإدارة والمتابعة','ia29-role-tools');
    const headline=hub.querySelector(':scope > .role-actions-heading');
    if(headline)headline.insertAdjacentElement('beforebegin',fold);else hub.append(fold);
    for(const cls of ['role-actions-heading','rc3-role-filter','role-home-actions','role-home-footnote']){
     const el=hub.querySelector(':scope > .'+cls);if(el)fold.append(el);
    }
   }
  }
  let extra=$('ia29HomeMore');
  if(!extra){extra=makeDetails('ia29HomeMore','الإحصاءات والتقارير الإضافية','ia29-home-more');pg.append(extra);}
  for(const id of ['homeAnalysis','weeklyGoalsCard','streakCard']){
   const el=$(id);if(el&&el.parentElement!==extra)extra.append(el);
  }
  for(const child of Array.from(pg.children)){
   if(child===extra||child===hub||child===v9||child.id==='rc3HomeIntro'||child.id==='supervisorShortcut'||child.matches?.('.sg,.home-actions'))continue;
   if(child.matches?.('.card')&&child.parentElement!==extra)extra.append(child);
  }
 }
 function reader(){
  const panel=$('quranCorrectionPanel'),source=$('quranSourceNote');
  if(!panel||!source||readerBuilt)return false;
  const options=makeDetails('ia29ReaderTools','✎ أدوات التصحيح والمشاركة — افتح عند الحاجة','ia29-reader-tools');
  panel.insertAdjacentElement('beforebegin',options);options.append(panel);
  // Keep all word/correction interactions active. Only the panel is folded.
  readerBuilt=true;return true;
 }
 function openLibrary(){
  if(!$('ia29AudioDialog')){
   const modal=d.createElement('dialog');modal.id='ia29AudioDialog';modal.className='ia29-audio-dialog';modal.dir='rtl';
   modal.innerHTML='<header><strong>⬇ مكتبة القرآن الصوتية آية بآية</strong><button type="button" data-close aria-label="إغلاق مكتبة الصوت">✕</button></header><p>نزّل السورة المطلوبة أو المصحف كاملًا مرة واحدة للقارئ المختار، ثم استخدمها في تكليف الحفظ الجديد دون اتصال. يتم الاحتفاظ بالآيات، وليس بنسخ التكليفات المدمجة.</p><div data-ia29-audio-host data-imam-audio-library></div>';
   modal.querySelector('[data-close]').addEventListener('click',()=>modal.close());
   modal.addEventListener('click',ev=>{if(ev.target===modal)modal.close();});
   d.body.append(modal);
   g.ImamOfflineAudio?.mount?.(modal.querySelector('[data-ia29-audio-host]'));
  }
  const dialog=$('ia29AudioDialog'),rec=dialog.querySelector('[data-rec]'),surah=dialog.querySelector('[data-surah]');
  const reciter=$('teacherAssignmentAudioReciter')?.value;
  if(rec&&reciter)rec.value=reciter;
  const name=$('new-s')?.value?.trim();
  const chapter=(g.ImamOfflineAudio?.SURAHS||[]).findIndex(x=>x[0]===name)+1;
  if(surah&&chapter>0)surah.value=String(chapter);
  const inner=dialog.querySelector('details');if(inner)inner.open=true;
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 }
 function boot(){
  home();reader();lesson();
  const pg=$('pg-session');
  if(pg&&!lessonBuilt&&g.MutationObserver){const obs=new g.MutationObserver(()=>{if(lesson())obs.disconnect();});obs.observe(pg,{childList:true});g.addEventListener('pagehide',()=>obs.disconnect(),{once:true});}
  const source=$('quranTextModal');
  if(source&&!readerBuilt&&g.MutationObserver){const obs=new g.MutationObserver(()=>{if(reader())obs.disconnect();});obs.observe(source,{childList:true,subtree:true});g.addEventListener('pagehide',()=>obs.disconnect(),{once:true});}
  const roleHome=$('pg-home');
  if(roleHome&&g.MutationObserver){let scheduled=false,watchedV9=null;const obs=new g.MutationObserver(()=>{
   if(scheduled)return;scheduled=true;queueMicrotask(()=>{
    scheduled=false;home();
    const v9=$('v9Home');if(v9&&v9!==watchedV9){obs.observe(v9,{childList:true});watchedV9=v9;}
   });
  });obs.observe(roleHome,{childList:true});const first=$('v9Home');if(first){obs.observe(first,{childList:true});watchedV9=first;}
  g.addEventListener('pagehide',()=>obs.disconnect(),{once:true});}
 }
 g.ImamLessonFlowRC9={openLibrary,lesson,reader,home};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(globalThis);
