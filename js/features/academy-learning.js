/* Academy educational centre — works without teacher data; no official progress writes. */
(function(g){'use strict';
 const d=g.document;const by=id=>d.getElementById(id);let data=null;
 const mk=(tag,cl,text)=>{const e=d.createElement(tag);if(cl)e.className=cl;if(text!==undefined)e.textContent=String(text);return e};
 const clear=e=>e.replaceChildren();const str=x=>String(x??'');
 const addText=(host,tag,cl,text)=>{const e=mk(tag,cl,text);host.append(e);return e};
 function descItem(title,description,cl='al-info-card'){const e=mk('article',cl);addText(e,'strong','',title);addText(e,'p','',description);return e;}
 const section=id=>by('al'+id.charAt(0).toUpperCase()+id.slice(1));
 function selectTab(tab){
   if(!['foundation','makharij','tajweed','quiz','coach','strategy','mutashabihat'].includes(tab))tab='foundation';
   d.querySelectorAll('.al-page').forEach(x=>x.hidden=true);const current=section(tab);if(current)current.hidden=false;
   d.querySelectorAll('[data-page]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.page===tab)));
   g.history.replaceState(null,'','#'+tab);
 }
 function renderLevels(){
   const sel=by('alLevel');clear(sel);data.foundation.forEach((x,i)=>{const e=mk('option','',x.shortTitle);e.value=i;sel.append(e)});
   sel.addEventListener('change',()=>drawLevel(Number(sel.value)));drawLevel(0);
 }
 function drawLevel(idx){const lvl=data.foundation[idx];if(!lvl)return;
   const host=by('alFoundationBody');clear(host);const top=mk('article','al-level-summary');addText(top,'span','al-level-number','المستوى '+lvl.level);addText(top,'h3','',lvl.title);addText(top,'p','',lvl.subtitle);addText(top,'strong','',lvl.objective);host.append(top);
   const ruleGroup=mk('div','al-grid');(lvl.keyRules||[]).forEach((v,i)=>ruleGroup.append(descItem('الهدف '+(i+1),v)));host.append(addText(mk('div'),'h3','','المهارات المستهدفة'),ruleGroup);
   if(lvl.visualPairs?.length){addText(host,'h3','','التمييز بين المتشابهات');const group=mk('div','al-grid');lvl.visualPairs.forEach(x=>{const e=descItem(x.groupTitle,x.distinctionTip);const chips=mk('div','al-chips');(x.items||[]).forEach(v=>chips.append(mk('span','',v)));e.append(chips);group.append(e)});host.append(group)}
   addText(host,'h3','','بطاقات التدريب والتهجي');const cards=mk('div','al-grid');(lvl.words||[]).forEach(x=>{const e=mk('article','al-word');addText(e,'div','al-word-value',x.word);addText(e,'p','',x.meaning);if(x.tahajjiSteps?.length){const steps=mk('details');addText(steps,'summary','','خطوات التهجي');const list=mk('ol');x.tahajjiSteps.forEach(v=>addText(list,'li','',v));steps.append(list);e.append(steps)}addText(e,'small','',x.phoneticTip||'');cards.append(e)});host.append(cards);
   renderQuestions(by('alFoundationQuiz'),lvl.examQuestions||[],true);
 }
 function renderMakhraj(){const host=by('alMakhrajBody');clear(host);const group=mk('div','al-grid');data.makharij.forEach(x=>{const e=descItem(x.title,x.description);addText(e,'p','al-pill-text',x.letters.join(' · '));addText(e,'small','', 'أشيع الأخطاء: '+x.commonMistake);const detail=mk('details');addText(detail,'summary','','تدريب التصحيح');addText(detail,'p','',x.correctionTip);e.append(detail);group.append(e)});host.append(group);by('alLetterSearch').addEventListener('input',drawLetters);drawLetters();}
 function drawLetters(){const host=by('alLetterBody');clear(host);addText(host,'h3','','دليل الحروف الهجائية');const query=by('alLetterSearch').value.trim();const group=mk('div','al-letter-grid');data.letters.filter(x=>!query||(x.letter+x.name+x.mainMakhrajTitle).includes(query)).forEach(x=>{const details=mk('details','al-letter');addText(details,'summary','',x.letter+' — '+x.name);addText(details,'strong','',x.mainMakhrajTitle||'');addText(details,'p','',x.exactSubMakhraj||'');addText(details,'small','',x.howToPronounce||'');group.append(details)});if(!group.children.length)addText(host,'p','','لا توجد نتائج؛ جرّب البحث بحرف واحد.');host.append(group)}
 function renderRules(){const host=by('alRules');clear(host);data.ruleCategories.forEach(cat=>{const sect=mk('section','al-rule-section');addText(sect,'h3','',cat.title);if(cat.subtitle)addText(sect,'p','',cat.subtitle);const group=mk('div','al-grid');(cat.rules||[]).forEach(rule=>{const r=mk('article','al-info-card');addText(r,'strong','',rule.name||rule.title||rule.rule||'قاعدة');addText(r,'p','',rule.definition||rule.description||rule.explanation||'');if(rule.letters)addText(r,'small','',Array.isArray(rule.letters)?rule.letters.join(' · '):str(rule.letters));if(rule.practicalTip)addText(r,'small','',rule.practicalTip);group.append(r)});sect.append(group);host.append(sect)});
   d.querySelectorAll('[data-beats]').forEach(btn=>btn.addEventListener('click',()=>{const count=Number(btn.dataset.beats);const out=by('alMeter');clear(out);for(let i=0;i<count;i++){const dot=mk('span','al-beat','●');dot.style.animationDelay=(i*.2)+'s';out.append(dot)}out.setAttribute('aria-label',`${count} حركات بصرية`)}));
 }
 function renderQuestions(host,questions,compact=false){clear(host);if(!questions.length)return;
   addText(host,'h3','',compact?'جرّب اختبار هذا المستوى':'أسئلة تدريبية في التجويد');const form=mk('div','al-quiz-grid');const answers=new Map();let submitted=false;
   questions.forEach((q,idx)=>{const card=mk('fieldset','al-question');addText(card,'legend','','س'+(idx+1)+' · '+(q.question||q.prompt||''));(q.options||[]).forEach((option,i)=>{const lab=mk('label','al-option');const radio=mk('input');radio.type='radio';radio.name=(compact?'foundation':'tajweed')+'-q-'+idx;radio.value=i;radio.addEventListener('change',()=>{answers.set(idx,i);submitted=false});lab.append(radio,d.createTextNode(' '+option));card.append(lab)});form.append(card)});
   const results=mk('div','al-quiz-feedback');const check=mk('button','al-check','عرض التصحيح');check.type='button';check.onclick=()=>{if(submitted)return;submitted=true;clear(results);let score=0;questions.forEach((q,i)=>{const given=answers.get(i);const ok=given!==undefined&&given===Number(q.correctIndex);if(ok)score++;const row=mk('p',ok?'al-good':'al-bad');row.textContent=`س${i+1}: ${given===undefined?'لم تُجب':ok?'صحيح':'يحتاج مراجعة'} — ${q.explanation||''}`;results.append(row)});const summary=mk('strong','',`النتيجة التدريبية: ${score} من ${questions.length} — لا تُحفظ ضمن درجات الطلاب`);results.prepend(summary)};
   host.append(form,check,results);
 }
 function renderCoach(){const host=by('alCoachBody');clear(host);const group=mk('div','al-grid');data.speech.forEach(x=>{const e=descItem(x.title||x.defectTitle,x.commonError||x.commonMistake);addText(e,'p','',x.practicalRemedy||x.practicalExercise);if(x.drillWords?.length)addText(e,'small','',x.drillWords.join(' · '));group.append(e)});host.append(group);
   by('alCopyDraft').addEventListener('click',async()=>{const text=by('alDraft').value.trim();if(!text){by('alDraft').focus();return}try{await navigator.clipboard.writeText(text);by('alCopyDraft').textContent='تم النسخ'}catch(e){by('alCopyDraft').textContent='تعذر النسخ؛ حدّد النص وانسخه يدويًا';by('alDraft').select()}});
 }

 function renderStrategy(){
  const host=by('alStrategyBody');clear(host);
  addText(host,'h3','','مراحل تأسيس القراءة');const a=mk('div','al-grid');data.strategies.forEach(x=>{const card=descItem(x.title,x.goal);const ul=mk('ul');(x.steps||[]).forEach(t=>addText(ul,'li','',t));card.append(ul);if(x.remedy)addText(card,'small','',x.remedy);a.append(card)});host.append(a);
  addText(host,'h3','','أسئلة ملاحظة تربوية (ليست اختبارًا تشخيصيًا)');const b=mk('div','al-grid');data.observations.forEach(x=>{const card=descItem(x.dimension,x.question);addText(card,'small','',x.hint);b.append(card)});host.append(b);
  addText(host,'h3','','أفكار لتنويع الحصة عند وجود صعوبات تعلم');const c=mk('div','al-grid');data.challenges.forEach(x=>{const card=descItem(x.title,x.summary);const list=mk('ol');(x.plan||[]).forEach(t=>addText(list,'li','',t));card.append(list);c.append(card)});host.append(c);
 }
 function renderMutashabihat(){
  const host=by('alMutashabihatBody');clear(host);const grid=mk('div','al-grid');
  data.mutashabihat.forEach((x,i)=>{const card=mk('article','al-info-card');addText(card,'strong','','مقارنة الموضع '+(i+1));addText(card,'p','',`${x.surahName||'السورة '+x.surahId} — الآية ${x.ayahNumber}`);addText(card,'p','',`${x.similarSurahName||'السورة '+x.similarSurahId} — الآية ${x.similarAyahNumber}`);addText(card,'small','','إحالة تعليمية للمقارنة، وليست نصًا مرجعيًا معتمدًا');grid.append(card)});host.append(grid);
 }

 async function init(){try{const resp=await fetch('data/academy-learning-materials.json',{cache:'no-cache'});if(!resp.ok)throw Error('HTTP '+resp.status);const json=await resp.json();if(!Array.isArray(json.foundation)||json.foundation.length<1||!Array.isArray(json.makharij))throw Error('invalid dataset');data=json;renderLevels();renderMakhraj();renderRules();renderQuestions(by('alQuizBody'),data.quiz);renderCoach();renderStrategy();renderMutashabihat();by('alStatus').hidden=true;selectTab(location.hash.replace('#',''));d.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.page)));g.addEventListener('hashchange',()=>selectTab(location.hash.slice(1)));}catch(e){by('alStatus').textContent='تعذر تحميل المحتوى التعليمي. لا توجد نتائج محفوظة؛ اتصل بالإنترنت لتحديث مواد المركز ثم أعد المحاولة.';console.warn('Academy learning centre:',e)}}
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
