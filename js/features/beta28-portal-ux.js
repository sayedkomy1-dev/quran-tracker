/* Presentation only: no role, token, account or permission changes. */
(function(g){'use strict';
 function init(){const content=document.getElementById('portalContent');
  const buttons=[...document.querySelectorAll('[data-ia28-view]')];
  function setView(mode){if(!content)return;const student=mode==='student';content.classList.toggle('ia28-student-view',student);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ia28View===mode)));}
  buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.ia28View)));
  document.querySelectorAll('[data-ia28-practice]').forEach(b=>b.addEventListener('click',()=>{g.openGuardianTahfeez?.();g.ImamGuardianTahfeez?.setPracticeMode?.(b.dataset.ia28Practice,true);}));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
