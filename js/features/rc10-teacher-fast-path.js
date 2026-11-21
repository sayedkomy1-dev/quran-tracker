'use strict';
/* IMAM beta.28-rc.10 — Teacher fast path.
 * Reuses the current step engine; never creates/clones/moves save or guardian send controls.
 * Exactly one contextual NEXT control travels to the end of the current step.
 */
(function(g){
 const d=g.document;if(!d)return;
 const $=id=>d.getElementById(id);
 const ORDER=['assessment','new','review','notes'];
 const LABELS={new:'الحفظ الجديد',review:'المراجعة',notes:'الملاحظات وإنهاء الحصة'};
 let ready=false,observer=null;
 function active(){return $('pg-session')?.classList.contains('on')===true;}
 function current(){
  const key=$('pg-session')?.getAttribute('data-ia-session-step');
  return ORDER.includes(key)?key:'assessment';
 }
 function sync(){
  const pg=$('pg-session'),content=$('sesContent'),nav=$('ia30StepNext'),btn=$('ia30NextButton');
  if(!pg||!content||!nav||!btn)return;
  const key=current(),idx=ORDER.indexOf(key),next=ORDER[idx+1];
  const guided=pg.classList.contains('v9-guided');
  const student=$('sesSt')?.value;
  // The last step already contains the ORIGINAL save/send footer. Never repeat it.
  nav.hidden=!guided||!next||!active();
  if(nav.hidden)return;
  btn.disabled=!student;
  btn.textContent=student?`التالي: ${LABELS[next]}`:'اختر الطالب أولًا';
  btn.dataset.next=next;
  nav.querySelector('small').textContent='انتقال دون مسح الحقول أو إرسال التقرير';
  const cards=Array.from(content.children).filter(el=>
   el.classList?.contains('card')&&el.dataset.v9Step===key);
  const target=cards[cards.length-1];
  // Keep one navigation action at the BOTTOM of the visible stage, not at the end
  // of a hidden step or among parent-report buttons.
  if(target&&target.nextElementSibling!==nav)target.insertAdjacentElement('afterend',nav);
  else if(!target&&content.lastElementChild!==nav)content.append(nav);
 }
 function init(){
  const pg=$('pg-session'),content=$('sesContent'),steps=$('v9SessionSteps');
  if(ready||!pg||!content||!steps)return false;
  if($('ia30StepNext')){ready=true;return true;}
  const nav=d.createElement('div');nav.id='ia30StepNext';nav.className='ia30-step-next';nav.hidden=true;
  nav.setAttribute('aria-label','الانتقال للمرحلة التالية من الحصة');
  const hint=d.createElement('small');hint.className='ia30-step-hint';
  const btn=d.createElement('button');btn.type='button';btn.id='ia30NextButton';btn.className='ia30-next-btn';
  btn.addEventListener('click',()=>{
   if(btn.disabled||!active()||!pg.classList.contains('v9-guided'))return;
   const next=ORDER[ORDER.indexOf(current())+1];
   if(next&&typeof g.setSessionStep==='function')g.setSessionStep(next);
  });
  nav.append(hint,btn);content.append(nav);
  pg.addEventListener('change',ev=>{if(ev.target?.id==='sesSt')sync();});
  steps.addEventListener('click',ev=>{if(ev.target.closest('[data-step],[data-mode]'))queueMicrotask(sync);});
  if(typeof g.MutationObserver==='function'){
   observer=new g.MutationObserver(sync);
   observer.observe(pg,{attributes:true,attributeFilter:['data-ia-session-step','class']});
   g.addEventListener?.('pagehide',()=>observer.disconnect(),{once:true});
  }
  ready=true;sync();return true;
 }
 function boot(){
  if(init())return;
  const pg=$('pg-session');if(!pg||!g.MutationObserver)return;
  const wait=new g.MutationObserver(()=>{if(init())wait.disconnect();});
  wait.observe(pg,{childList:true,subtree:true});
  g.addEventListener?.('pagehide',()=>wait.disconnect(),{once:true});
 }
 g.ImamTeacherFastPathRC10={sync};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(globalThis);
