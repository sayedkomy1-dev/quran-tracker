/* IMAM RC8: teacher workflow clarity, no new data writes or duplicated save buttons.
 * Observes actual save results and original session step events.
 */
(function(g){'use strict';
 const d=g.document;if(!d)return;
 const $=id=>d.getElementById(id);
 const page=$('pg-session');
 const stepNames={assessment:'التسميع',new:'الحفظ',review:'المراجعة',notes:'الملاحظات والإرسال'};
 const steps=['assessment','new','review','notes'];
 function labelFields(scope){
   // Accessibility: bind existing field labels to their native fields without
   // changing handlers, focus order or app data.
   (scope||d).querySelectorAll('.fld').forEach(box=>{
     const label=box.querySelector('label:not([for])');
     const field=box.querySelector('input[id],select[id],textarea[id]');
     if(label&&field&&!label.contains(field))label.setAttribute('for',field.id);
   });
 }
 function init(){
   labelFields(d);
   if(!page||$('ia8SessionStatus'))return;
   const outer=d.createElement('section');outer.id='ia8SessionStatus';outer.className='ia8-teacher-status';
   outer.setAttribute('aria-label','حالة الحصة والحفظ على الجهاز');
   const info=d.createElement('div');
   const title=d.createElement('span');title.className='ia8-status-label';title.textContent='حالة الحفظ';
   const saved=d.createElement('span');saved.dataset.ia8Save='';saved.textContent='تسجيل محلي جاهز';
   info.append(title,saved);
   const network=d.createElement('div');
   const net=d.createElement('span');net.dataset.ia8Online='';
   net.title='العمل دون إنترنت لا يعني أن البيانات تزامنت مع السحابة';
   network.append(net);outer.append(info,network);
   page.insertBefore(outer,page.firstChild);
   const flow=d.createElement('div');flow.className='ia8-session-toolbar';flow.id='ia8SessionToolbar';
   const flowText=d.createElement('div'),label=d.createElement('strong'),hint=d.createElement('small');
   label.textContent='حصة مركّزة';hint.textContent='اختر الطالب واتبع خطوات الحصة من دون نوافذ زائدة';flowText.append(label,hint);
   const counter=d.createElement('span');counter.className='ia8-step-count';flow.append(flowText,counter);
   const wizard=$('v9SessionSteps');if(wizard)wizard.insertAdjacentElement('afterend',flow);else outer.insertAdjacentElement('afterend',flow);
   function update(){
     const health=g.ImamApp?.SaveHealth;
     if(health){saved.dataset.level=health.ok?'good':'error';saved.textContent=health.ok?'✓ محفوظ محليًا على الجهاز':'تعذر الحفظ المحلي — لا تغلق الحصة';}
     const online=g.navigator?.onLine!==false;net.dataset.level=online?'online':'offline';
     net.textContent=online?'● الجهاز متصل — المزامنة منفصلة':'○ دون إنترنت — البيانات محلية';
     const key=page.getAttribute('data-ia-session-step')||'assessment';
     const idx=steps.indexOf(key);counter.textContent=`${Math.max(1,idx+1)} من 4 · ${stepNames[key]||'التسميع'}`;
     const student=$('sesSt')?.selectedOptions?.[0]?.textContent?.trim();
     hint.textContent=student&&$('sesSt')?.value?`الطالب: ${student} · لا تنس حفظ الحصة قبل المغادرة`:'اختر الطالب أولًا ثم انتقل إلى التسميع';
   }
   d.addEventListener('imam:local-save',update);
   d.addEventListener('imam:local-save-failed',update);
   g.addEventListener?.('online',update);g.addEventListener?.('offline',update);
   $('sesSt')?.addEventListener('change',update);
   if(g.MutationObserver){
     const obs=new g.MutationObserver(update);
     obs.observe(page,{attributes:true,attributeFilter:['data-ia-session-step']});
     g.addEventListener?.('pagehide',()=>obs.disconnect(),{once:true});
   }
   update();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
