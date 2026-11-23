/* RC13: clearer student/guardian presentation. This is presentation state only;
   it does not grant, revoke, or replace any server-side permission. */
(function(g){'use strict';
 const KEY='imam:guardian-portal:view:v1';
 function init(){
  const content=document.getElementById('portalContent');if(!content)return;
  const buttons=[...document.querySelectorAll('[data-ia28-view]')];
  const practice=[...document.querySelectorAll('[data-ia28-practice]')];
  const readMode=()=>{try{return localStorage.getItem(KEY)==='student'?'student':'parent';}catch(_){return 'parent';}};
  function setView(mode,persist=true){
   const student=mode==='student';content.classList.toggle('ia28-student-view',student);content.dataset.portalMode=student?'student':'parent';
   buttons.forEach(b=>{const active=b.dataset.ia28View===(student?'student':'parent');b.setAttribute('aria-pressed',String(active));});
   if(persist)try{localStorage.setItem(KEY,student?'student':'parent');}catch(_){}
   const copy=content.querySelector('.ia28-start-copy small');if(copy)copy.textContent=student?'مساحة الطالب: التكليف والتدريب والتقدم الشخصي.':'متابعة ولي الأمر: التكليف والحصص والتواصل والحسابات.';
   document.dispatchEvent(new CustomEvent('imam:portal-view-change',{detail:{mode:student?'student':'parent'}}));
  }
  buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.ia28View)));
  practice.forEach(b=>b.addEventListener('click',()=>{g.openGuardianTahfeez?.();g.ImamGuardianTahfeez?.setPracticeMode?.(b.dataset.ia28Practice,true);}));
  setView(readMode(),false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
