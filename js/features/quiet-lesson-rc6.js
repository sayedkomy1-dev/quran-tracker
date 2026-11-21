/* IMAM beta.28-rc.6 — Quiet Lesson / Premium Educational Design System.
 * UI-only: never writes students, attendance, sessions or finance.
 * Reuses original session controls. Does not duplicate or replace their event handlers. */
(function(g){
 'use strict';
 const d=g.document;if(!d)return;
 const KEY='imam:quiet-session-focus:v1';
 const byId=id=>d.getElementById(id);
 const read=()=>{try{return g.localStorage?.getItem(KEY)!=='off';}catch(_){return true;}};
 const store=on=>{try{g.localStorage?.setItem(KEY,on?'on':'off');}catch(_){}};
 let focus=read(),inited=false,lastAction=0;
 const steps={assessment:'التسميع',new:'الحفظ',review:'المراجعة',notes:'الملاحظات والإرسال'};
 function lessonActive(){return byId('pg-session')?.classList.contains('on')===true;}
 function update(){
  const pg=byId('pg-session'),button=byId('ia28QuietFocusToggle'),caption=byId('ia28QuietFocusStatus');
  if(!pg)return;
  pg.classList.toggle('ia28-quiet-focus',focus);
  if(button){button.setAttribute('aria-pressed',String(focus));button.textContent=focus?'◉ تركيز الحصة: يعمل':'◎ تركيز الحصة: متوقف';}
  if(caption){
   const selected=byId('sesSt'),student=selected?.selectedOptions?.[0]?.textContent?.trim()||'اختر الطالب';
   const key=pg.getAttribute('data-ia-session-step')||'assessment';
   const draft=byId('draftState')?.textContent?.trim()||'—';
   caption.textContent=`${student} · ${steps[key]||steps.assessment} · ${draft}`;
  }
 }
 function init(){
  if(inited)return true;
  const pg=byId('pg-session'),wizard=byId('v9SessionSteps'),host=wizard?.querySelector('.v9-session-mode');
  if(!pg||!host)return false;
  if(byId('ia28QuietFocusToggle')){inited=true;return true;}
  const group=d.createElement('div');group.id='ia28QuietLesson';group.className='ia28-quiet-lesson';
  const button=d.createElement('button');button.type='button';button.id='ia28QuietFocusToggle';button.className='ia28-quiet-toggle';
  button.setAttribute('aria-label','تخفيف المشتتات البصرية أثناء الحصة');
  button.addEventListener('click',()=>{focus=!focus;store(focus);update();});
  const caption=d.createElement('small');caption.id='ia28QuietFocusStatus';caption.className='ia28-focus-status';caption.setAttribute('role','status');caption.setAttribute('aria-live','off');
  group.append(button,caption);host.appendChild(group);
  update();inited=true;
  byId('sesSt')?.addEventListener('change',update);
  byId('sesDate')?.addEventListener('change',update);
  if(typeof g.MutationObserver==='function'){
   const stepObserver=new g.MutationObserver(update);stepObserver.observe(pg,{attributes:true,attributeFilter:['data-ia-session-step']});
   const draft=byId('draftState');const draftObserver=draft?new g.MutationObserver(update):null;
   draftObserver?.observe(draft,{childList:true,characterData:true,subtree:true});
   g.addEventListener?.('pagehide',()=>{stepObserver.disconnect();draftObserver?.disconnect();},{once:true});
  }
  return true;
 }
 function boot(){if(init())return;const page=byId('pg-session');if(!page||typeof g.MutationObserver!=='function')return;
  const observer=new g.MutationObserver(()=>{init();if(inited)observer.disconnect();});
  observer.observe(page,{childList:true});g.addEventListener?.('pagehide',()=>observer.disconnect(),{once:true});
 }
 // Guard duplicate rapid clicks only for official save/send actions. No new save behavior.
 function preventDuplicate(ev){
  if(!lessonActive())return;
  const b=ev.target?.closest?.('#saveSessionBtn,#saveSendSessionBtn');if(!b)return;
  const now=Date.now();
  if(now-lastAction<750){ev.preventDefault?.();ev.stopImmediatePropagation?.();return;}
  lastAction=now;
 }
 // Keyboard shortcuts outside inputs and modals; original step implementation only.
 function keyboard(ev){
  if(!lessonActive()||!ev.altKey||ev.ctrlKey||ev.metaKey||ev.shiftKey)return;
  if(d.activeElement?.matches?.('input,textarea,select,[contenteditable]'))return;
  if(d.querySelector?.('[role="dialog"]:not([hidden]),.mo:not([hidden])'))return;
  const step=['assessment','new','review','notes'][Number(ev.key)-1];
  if(step&&typeof g.setSessionStep==='function'){ev.preventDefault();g.setSessionStep(step);update();}
 }
 d.addEventListener('click',preventDuplicate,true);
 d.addEventListener('keydown',keyboard);
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 g.ImamQuietLesson={refresh:update,isOn:()=>focus};
})(globalThis);
