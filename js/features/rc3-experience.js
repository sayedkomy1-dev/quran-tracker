/* RC3: presentation navigation only; server-provided visibility and original handlers remain authoritative. */
(function(g){'use strict';
 const $=id=>document.getElementById(id);
 function init(){
  const tools=document.querySelector('.rc3-portal-tools');if(tools&&g.matchMedia?.('(min-width:900px)').matches)tools.open=true;
  const content=$('portalContent'),tabs=document.querySelector('.rc3-portal-tabs');
  if(content&&tabs){
   const buttons=[...tabs.querySelectorAll('[data-rc3-tab]')], family=buttons.find(b=>b.dataset.rc3Tab==='family');
   const empty=content.querySelector('.rc3-portal-empty');let current='overview';
   function visible(e){return !e.hidden&&getComputedStyle(e).display!=='none';}
   function syncEmpty(){if(!empty)return;empty.hidden=['all','overview'].includes(current)||[...content.querySelectorAll(`[data-rc3-section="${current}"]`)].some(visible);}
   function activate(tab){if(!buttons.some(b=>b.dataset.rc3Tab===tab))return;if(tab==='family'&&content.classList.contains('ia28-student-view'))tab='learning';current=tab;content.dataset.rc3Tab=tab;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rc3Tab===tab)));syncEmpty();}
   buttons.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.rc3Tab)));
   // Keep existing engagement logging and scroll behavior; reveal the matching panel first.
   const previous=g.guardianGoTo;
   if(typeof previous==='function')g.guardianGoTo=function(id){const e=$(id),section=e?.closest('[data-rc3-section]');if(section&&current!=='all')activate(section.dataset.rc3Section);return previous.apply(this,arguments);};
   function mode(){const student=content.classList.contains('ia28-student-view');if(family)family.hidden=student;activate(student?'learning':'overview');}
   content.querySelectorAll('[data-ia28-view]').forEach(b=>b.addEventListener('click',()=>queueMicrotask(mode)));
   // Observe server-provided visibility changes, never modify them.
   const observer=new MutationObserver(syncEmpty);content.querySelectorAll('[data-rc3-section]').forEach(e=>observer.observe(e,{attributes:true,attributeFilter:['hidden','style']}));
   tabs.hidden=false;mode();
  }
  const settings=$('tahfeezSettings'),reader=document.querySelector('.tahfeez-reader');
  if(settings&&reader){const button=reader.querySelector('.rc3-player-settings');const sync=()=>{const closed=settings.classList.contains('collapsed');button?.setAttribute('aria-expanded',String(!closed));};new MutationObserver(sync).observe(settings,{attributes:true,attributeFilter:['class']});sync();}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
