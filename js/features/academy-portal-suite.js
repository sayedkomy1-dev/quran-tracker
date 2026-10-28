(function(g){'use strict';const d=g.document,where=d.getElementById('apsContent');if(!where)return;
 const data=[
 {group:'بوابات الدخول والتواصل',icon:'🏛️',title:'بوابة الأكاديمية',text:'إدارة الحصص والطلاب والحلقات وفق حساب المحفظ أو الإدارة.',href:'index.html'},
 {group:'بوابات الدخول والتواصل',icon:'👨‍👩‍👧',title:'بوابة ولي الأمر والطالب',text:'حساب الأسرة وربط الأبناء المصرح لهم ومتابعة التكليفات.',href:'guardian-login.html'},
 {group:'بوابات الدخول والتواصل',icon:'💬',title:'مركز التواصل',text:'فتح واجهة الأكاديمية الأصلية وإرسال التقارير من مساراتها المعتمدة.',href:'index.html'},
 {group:'مراكز التعليم والتلاوة',icon:'🔤',title:'المنهج التأسيسي',text:'٨ مستويات تفاعلية للتهجي والتمييز وأسئلة تدريبية.',href:'academy-learning.html#foundation'},
 {group:'مراكز التعليم والتلاوة',icon:'🗣️',title:'أطلس المخارج والتجويد',text:'الحروف ومخارجها وتطبيقات قواعد التجويد.',href:'academy-learning.html#makharij'},
 {group:'مراكز التعليم والتلاوة',icon:'🧩',title:'اختبار التجويد التدريبي',text:'تدريبات ذات تصحيح وشرح، لا تُضاف لدرجات الطالب.',href:'academy-learning.html#quiz'},
 {group:'مراكز التعليم والتلاوة',icon:'🎯',title:'إرشادات علاج النطق',text:'خطط تمارين تعليمية قابلة للتعديل والنسخ.',href:'academy-learning.html#coach'},
 {group:'مراكز التعليم والتلاوة',icon:'🧠',title:'إرشاد المحفظ التربوي',text:'استراتيجيات التأسيس وتنويع التعليم وأسئلة ملاحظة غير تشخيصية.',href:'academy-learning.html#strategy'},
 {group:'مراكز التعليم والتلاوة',icon:'🔍',title:'دليل المتشابهات',text:'مقارنة مواضع في المصحف الأصلي بإشراف المحفظ.',href:'academy-learning.html#mutashabihat'},
 {group:'مراكز التعليم والتلاوة',icon:'📖',title:'المصحف العام',text:'قراءة صفحات مصحف المدينة وحفظ موضع القراءة على الجهاز دون حساب طالب.',href:'academy-mushaf.html'},
 {group:'مراكز التعليم والتلاوة',icon:'🎧',title:'التلاوة والتدريب الحر',text:'التلاوة والتلقين والعلامات باستخدام الخدمة القائمة.',href:'guest-practice.html'},
 {group:'مراكز التعليم والتلاوة',icon:'🖍️',title:'سبورة الإمام التفاعلية',text:'فتح السبورة بعد تسجيل دخول المحفظ، من داخل التطبيق.',href:'index.html'},
 {group:'إدارة التعليم',icon:'👥',title:'ملفات الطلاب والحلقات',text:'إدارة الطلاب الحقيقيين وحضورهم وجداولهم وتقاريرهم.',href:'index.html'},
 {group:'إدارة التعليم',icon:'📊',title:'تطور الحفظ والمراجعة',text:'الملف القرآني التراكمي ومؤشرات التعثر داخل التطبيق.',href:'index.html'},
 {group:'إدارة التعليم',icon:'🎓',title:'الاختبارات والإجازات',text:'سجل الاختبارات الداخلي واعتماد النتائج بالصلاحيات القائمة.',href:'index.html'},
 {group:'إدارة التعليم',icon:'💼',title:'الإدارة المالية',text:'المستحقات والمدفوعات من المصدر المعتمد داخل التطبيق.',href:'index.html'}
 ];const key='imam.portal.favorites.v1';let favorites=[];try{const x=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(x))favorites=x.filter(t=>typeof t==='string').slice(0,50)}catch(e){}
 function make(tag,cl,txt){const el=d.createElement(tag);if(cl)el.className=cl;if(txt!==undefined)el.textContent=txt;return el}
 function card(x){const box=make('article','aps-card');const star=make('button','aps-star',favorites.includes(x.title)?'★':'☆');star.type='button';star.setAttribute('aria-label','تثبيت في المفضلة: '+x.title);star.title='المفضلة على هذا الجهاز فقط';star.onclick=()=>{if(favorites.includes(x.title))favorites=favorites.filter(v=>v!==x.title);else favorites.unshift(x.title);try{localStorage.setItem(key,JSON.stringify(favorites))}catch(e){}draw()};const icon=make('div','aps-icon',x.icon);const a=make('a','aps-title',x.title);a.href=x.href;box.append(star,icon,a,make('p','',x.text));const b=make('a','aps-open','فتح الخدمة');b.href=x.href;box.append(b);return box;}
 function draw(){const q=d.getElementById('apsSearch').value.trim().toLowerCase();const all=data.filter(x=>!q||(x.title+x.text+x.group).toLowerCase().includes(q));where.replaceChildren();if(!all.length){where.append(make('p','','لم نجد خدمة مطابقة للبحث.'));return;}
   const fav=all.filter(x=>favorites.includes(x.title));const blocks=[...(fav.length?[['المفضلة',fav]]:[]),...['بوابات الدخول والتواصل','مراكز التعليم والتلاوة','إدارة التعليم'].map(g=>[g,all.filter(x=>x.group===g)])];
   blocks.forEach(([name,items])=>{if(!items.length)return;const section=make('section','aps-group');section.append(make('h3','',name));const grid=make('div','aps-grid');items.forEach(x=>grid.append(card(x)));section.append(grid);where.append(section)});
 }
 d.getElementById('apsSearch').addEventListener('input',draw);draw();
})(window);
