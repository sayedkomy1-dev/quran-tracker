/* Imam Life Experience Review 8: gentle welcome, intentional actions; UI-only. */
(function(g){'use strict';const d=g.document;
 const add=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const tips=[
  'ابدأ بتثبيت موضع واحد، ثم انتقل لما بعده عندما يطمئن الطالب إلى إتقانه.',
  'امدح المحاولة الجادة أولًا، ثم صحّح الخطأ بهدوء ودقة.',
  'في المراجعة، الاستمرار المنتظم أنفع من التكليف الكبير المتقطع.',
  'اربط التوجيه بمثال واضح، ثم امنح الطالب وقتًا ليعيده بنفسه.'
 ];let tip=0;
 function moment(){const suite=d.getElementById('imamAcademySuite');if(!suite||d.getElementById('imamLifeMoment'))return;
  const wrap=add('section','ial-moment');wrap.id='imamLifeMoment';wrap.setAttribute('aria-label','مساحة التحفيز والتعلّم');
  const first=add('article','ial-moment-card');first.append(add('span','ial-moment-kicker','رحلتك اليوم'));
  const greet=new Date().getHours()<12?'صباحٌ طيب مع القرآن':'مساءٌ طيب مع القرآن';first.append(add('strong','',greet));
  first.append(add('p','','اختر مساحة تعليمية تبدأ منها، أو افتح المصحف من آخر صفحة قرأتها. كل خطوة صغيرة تستحق الاستمرار.'));
  const fa=add('div','ial-moment-actions');[['📖 افتح المصحف','academy-mushaf.html'],['🔤 منهج التأسيس','academy-learning.html#foundation'],['🗣️ المخارج والتجويد','academy-learning.html#makharij']].forEach(([label,href])=>{const a=add('a','',label);a.href=href;fa.append(a)});first.append(fa);
  const second=add('article','ial-moment-card ial-moment-quiet');second.append(add('span','ial-moment-kicker','لفتة للمحفظ'));
  second.append(add('strong','', 'التشجيع يفتح باب الإتقان'));const p=add('p','',tips[0]);second.append(p);
  const sa=add('div','ial-moment-actions');const b=add('button','', 'فكرة تربوية أخرى');b.type='button';b.addEventListener('click',()=>{tip=(tip+1)%tips.length;p.textContent=tips[tip]});sa.append(b);second.append(sa);
  wrap.append(first,second);const heading=suite.querySelector('.ias-heading');if(heading)suite.insertBefore(wrap,heading);else suite.append(wrap);
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',moment,{once:true});else moment();
})(window);
