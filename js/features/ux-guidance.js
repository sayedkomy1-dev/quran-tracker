'use strict';
/* Non-blocking, per-role first visit guide. A button explains its action, never grants permission. */
(function(g){
 const d=g.document; if(!d)return;
 const $=id=>d.getElementById(id);
 const guides={
  owner:[['لوحة الإدارة','من هنا تتابع المحفظين والطلاب والتقييمات والصلاحيات في أكاديميتك.'],['الأكاديميات','يمكنك التحقق من مساحة عمل الأكاديمية والعضويات من الإعدادات.'],['التقارير والتواصل','افتح الإحصاءات أو رسائل أولياء الأمور من الاختصارات الرئيسية.'],['مساحة التحفيظ','لو كنت مالكًا ومحفظًا معًا، يمكنك فتح أدوات الحصص دون تغيير صلاحيات حسابك.']],
  supervisor:[['لوحة الإشراف','تعرض لك فقط المحفظين والطلاب الذين سمح المالك بمتابعتهم.'],['التقييمات والمؤشرات','تظهر الأقسام التي منحك المالك حق الاطلاع عليها فقط.'],['مساحة التحفيظ','إذا كنت محفظًا أيضًا، انتقل إلى مساحة التحفيظ لتنفيذ الحصص.']],
  teacher:[['ابدأ حصة','اختر الطالب وسجّل التسميع والمراجعة. زر سبورة الإمام داخل الحصة يفتح نفس الطالب.'],['طلابي والحضور','افتح ملف الطالب أو سجّل الحضور مباشرة.'],['مراجعة اليوم','تجد هنا المواضع التي تحتاج تثبيتًا بناء على أخطاء الطالب.'],['مواضع التصحيح','في شاشة الحصة، اختر مرحلة القراءة وسجّل الخطأ على الكلمة أو الحرف، ثم شارك بطاقة التصحيح منفصلة عن التقرير النصي.'],['الأدوات الأخرى','مشاركة صوت التكليف داخل الملاحظات، وبقية الأدوات في المزيد.']]
 };
 let active='',step=0,shown=false;
 const savedKey=role=>'imam:ui-guide:v11.7.4.2:'+role;
 function ensure(){let host=$('imamUxTour');if(host)return host;
  host=d.createElement('div');host.id='imamUxTour';host.className='ux-tour';host.hidden=true;host.dir='rtl';host.innerHTML='<div class="ux-tour-backdrop"></div><section role="dialog" aria-modal="true" aria-labelledby="uxTourTitle" class="ux-tour-card"><div class="ux-tour-top"><span id="uxTourStep"></span><button type="button" id="uxTourClose">تخطي الإرشاد</button></div><div class="ux-tour-symbol" aria-hidden="true">✦</div><h2 id="uxTourTitle"></h2><p id="uxTourText"></p><div class="ux-tour-progress" id="uxTourProgress"></div><div class="ux-tour-controls"><button id="uxTourBack" type="button">السابق</button><button id="uxTourNext" type="button" class="ux-tour-primary">التالي</button></div></section>';
  d.body.append(host);$('uxTourClose').addEventListener('click',close);host.querySelector('.ux-tour-backdrop').addEventListener('click',close);$('uxTourBack').addEventListener('click',()=>{step=Math.max(0,step-1);render();});$('uxTourNext').addEventListener('click',()=>{if(step>=guides[active].length-1)close();else{step++;render();}});return host;
 }
 function render(){const entries=guides[active]||guides.teacher;if(!entries)return;
  const [name,desc]=entries[step];$('uxTourTitle').textContent=name;$('uxTourText').textContent=desc;$('uxTourStep').textContent=`دليل الاستخدام · ${step+1} من ${entries.length}`;$('uxTourBack').disabled=step===0;$('uxTourNext').textContent=step===entries.length-1?'ابدأ الاستخدام':'التالي';$('uxTourProgress').innerHTML=entries.map((_,i)=>`<i class="${i===step?'on':''}"></i>`).join('');}
 function open(role='teacher'){active=guides[role]?role:'teacher';step=0;ensure().hidden=false;render();shown=true;}
 function close(){const modal=$('imamUxTour');if(modal)modal.hidden=true;try{g.localStorage?.setItem(savedKey(active),'1');}catch(_){}shown=false;}
 function maybeOpen(role){if(!guides[role]||shown)return;try{if(g.localStorage?.getItem(savedKey(role))==='1')return;}catch(_){}g.setTimeout(()=>{if(!shown&&g.localStorage?.getItem(savedKey(role))!=='1'&&g.ImamApp?.RoleHome?.getCurrentRole?.()===role)open(role);},1000);}
 function helpFor(button){if(button.dataset.helpText)return button.dataset.helpText;
  const label=(button.innerText||button.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,70);
  const dict=[['حفظ وإرسال','يحفظ الحصة ويجهّز رسالة ولي الأمر في واتساب'],['حفظ','يحفظ التغييرات الحالية'],['مشاركة الصورة','يرسل صورة التصحيح منفصلة عن رسالة واتساب'],['التقييمات','يعرض التقييمات وفق صلاحيتك'],['بدء','يبدأ الوظيفة التي اخترتها'],['بحث','يفتح البحث في القسم الحالي'],['إغلاق','يغلق النافذة دون تغيير البيانات'],['تحديث','يعيد تحميل البيانات المتاحة'],['الطالب','يفتح بيانات الطالب أو اختياره'],['حضور','ينقلك إلى متابعة الحضور']];
  return dict.find(([key])=>label.includes(key))?.[1]||label;
 }
 // Accessible native hints for all dynamically inserted controls; guides show once per role.
 function annotate(root){if(!root?.querySelectorAll)return;root.querySelectorAll('button:not([title]), [role="button"]:not([title])').forEach(b=>{if(b.id?.startsWith('uxTour'))return;const explain=helpFor(b);if(explain)b.title=explain;});}
 function init(){annotate(d);const obs=new MutationObserver(records=>{for(const r of records){for(const el of r.addedNodes){if(el.nodeType===1){if(el.matches?.('button'))annotate(el.parentElement||el);else annotate(el);}}}});obs.observe(d.body,{childList:true,subtree:true});}
 g.ImamUXGuide={open,maybeOpen,close};if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
