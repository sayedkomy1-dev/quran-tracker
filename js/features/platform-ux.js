/* Imam Academy — presentation-only contextual navigation and accessible static tabs.
   Intentionally reads no account, session, student, grades or storage data. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const pageNames = Object.freeze({
    home:'الرئيسية', students:'الطلاب', checkin:'الحضور', session:'الحصة القرآنية',
    reports:'التقارير', settings:'الإعدادات',tasks:'المهام والمتابعة',
    followup:'متابعة الطلاب','circle-manager':'إدارة الحلقات',
    'academic-exams':'الاختبارات والإجازات','imam-smart-board':'السبورة التفاعلية',
    'placement-center':'تحديد المستوى',analytics:'التحليلات'
  });
  function start(){
    const pages=[...document.querySelectorAll('.pg[id^="pg-"]')];
    const nav=document.getElementById('mainNav');
    if(nav){nav.setAttribute('role','navigation');nav.setAttribute('aria-label','التبويبات الرئيسية');
      nav.querySelectorAll('.nav-t[onclick]').forEach(function(item){
        if(!item.hasAttribute('role'))item.setAttribute('role','button');
        if(!item.hasAttribute('tabindex'))item.setAttribute('tabindex','0');
        if(!item.hasAttribute('data-ux-keyboard')){
          item.setAttribute('data-ux-keyboard','1');
          if(!item.hasAttribute('onkeydown'))item.addEventListener('keydown',function(ev){
            if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();item.click();}
          });
        }
      });
    }
    const strip=document.getElementById('uxPageStrip');
    const text=document.getElementById('uxCurrentPage');
    if(!strip||!text)return;
    let current='';
    function sync(){
      const active=pages.find(el=>el.classList.contains('on'));
      if(!active)return;
      const id=active.id.substring(3);
      if(id===current)return;
      current=id;
      text.textContent=pageNames[id] || (active.querySelector('h1,h2,.page-title,.ch')?.textContent||'مساحة العمل').trim().slice(0,65);
      // Home already owns a role-aware title and live context. Do not duplicate it.
      strip.hidden=(id==='home');
    }
    sync();
    if(typeof MutationObserver==='function'){
      const observer=new MutationObserver(sync);
      pages.forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
      window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
