'use strict';
(function(){
 const $=id=>document.getElementById(id);
 const deps={projectApprovedRecitation,buildLearningMemory,projectSkillGraph,SKILLS};
 let data=null,audioURL='',generation=0;
 const stateLabels={'unknown':'لم تُختبر / لا دليل كافٍ','demonstrated':'أظهر المهارة في الاختبار','needs-practice':'يحتاج تدريبًا حسب الاختبار','inconclusive':'نتيجة غير حاسمة'};
 function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;}
 function clearAudio(){const a=$('audio');a.pause();a.removeAttribute('src');a.load();a.hidden=true;if(audioURL)URL.revokeObjectURL(audioURL);audioURL='';}
 function clear(){generation++;data=null;clearAudio();$('results').hidden=true;$('reviewList').replaceChildren();$('summary').replaceChildren();$('skills').replaceChildren();$('unmapped').textContent='';$('scopeInfo').textContent='';$('importForm').reset();$('status').textContent='تم مسح المعاينة.';}
 function scope(i,version,surahId,fromAyah,toAyah,durationMs=4000){return {ownerId:'lab-only',studentId:'lab-student',recordingId:'lab-recording-'+i,sessionId:'lab-session-'+i,jobId:'lab-job-'+i,teacherId:'lab-reviewer',engineVersion:'research-unpinned',corpusVersion:version,surahId,fromAyah,toAyah,durationMs};}
 function batch(context,draft,resolver){return {context,...mapDraftForReview(draft,context,resolver),decisions:[]};}
 function session(b,date){return {id:b.context.sessionId,ownerId:b.context.ownerId,studentId:b.context.studentId,recordingId:b.context.recordingId,status:'حضر',date,recitationErrors:[]};}
 function demoDraft(ayah,text){return {format:'imam-muaalem-draft-v1',approved:false,automaticImportAllowed:false,start:{sura_idx:1,aya_idx:ayah,uthmani_word_idx:0,uthmani_char_idx:0},end:{sura_idx:1,aya_idx:ayah,uthmani_word_idx:1,uthmani_char_idx:2},uthmaniText:text,errors:[{uthmani_pos:[0,1],error_type:'normal',speech_error_type:'replace'}]};}
 function demo(){
   clear();
   const corpus={version:'synthetic-lab-1',verses:[{surahId:1,ayah:1,text:'حَ كُ'},{surahId:1,ayah:2,text:'حُ بَ'}]};
   const resolver=createCorpusResolver(corpus,[{n:'نص اصطناعي — ليس قرآنًا',a:2}]);
   const batches=corpus.verses.map((v,i)=>batch(scope(i,corpus.version,1,v.ayah,v.ayah),demoDraft(v.ayah,v.text),resolver));
   data={mode:'demo',resolver,batches,sessions:batches.map((b,i)=>session(b,'2026-11-0'+(i+1))),asOf:'2026-11-03',assessments:[]};
   $('status').textContent='مثال اصطناعي: اعتمد الملاحظتين في يومين مختلفين لمشاهدة النمط التاريخي.';
   render();
 }
 async function json(file,limit){if(!file||file.size<1||file.size>limit)throw Error('ملف ناقص أو أكبر من الحجم المسموح.');return JSON.parse(await file.text());}
 async function importDraft(event){
   event.preventDefault();const current=++generation;
   const files=[$('draftFile').files[0],$('corpusFile').files[0],$('metaFile').files[0]],audio=$('audioFile').files[0],surah=Number($('surah').value),from=Number($('from').value),to=Number($('to').value);
   data=null;clearAudio();$('results').hidden=true;
   $('status').textContent='فحص الملفات محليًا…';
   try{
     if(!$('ack').checked)throw Error('يلزم تأكيد مصدر الملف.');
     const [draft,corpus,meta]=await Promise.all([json(files[0],1024*1024),json(files[1],24*1024*1024),json(files[2],4*1024*1024)]);
     if(current!==generation)return;
     const chapters=meta?.surahs;
     if(!Array.isArray(chapters)||chapters.length!==114||!chapters.every((m,i)=>m.id===i+1&&typeof m.name==='string'&&Number.isInteger(m.ayahCount)&&m.ayahCount>0)||chapters.reduce((a,m)=>a+m.ayahCount,0)!==6236)throw Error('بيانات السور غير مكتملة أو غير مطابقة للبنية المتوقعة.');
     if(!Number.isInteger(surah)||!chapters[surah-1]||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>chapters[surah-1].ayahCount)throw Error('نطاق التسميع غير صالح.');
     const resolver=createCorpusResolver(corpus,chapters.map(m=>({n:m.name,a:m.ayahCount})));
     const duration=draft?.durationMs;
     if(!Number.isInteger(duration)||duration<500||duration>15000)throw Error('المسودة لا تحتوي مدة تسجيل صالحة من العميل المحلي.');
     const b=batch(scope(0,resolver.version,surah,from,to,duration),draft,resolver);
     const now=new Date().toISOString().slice(0,10);
     data={mode:'import',resolver,batches:[b],sessions:[session(b,now)],asOf:now,assessments:[]};
     if(audio){if(audio.size>10*1024*1024)throw Error('التسجيل أكبر من الحد المسموح.');audioURL=URL.createObjectURL(audio);$('audio').src=audioURL;$('audio').hidden=false;}
     $('status').textContent='المسودة محلية. قراراتك هنا للمعاينة فقط، ولا تُسجل في الأكاديمية.';
     render();
   }catch(e){if(current!==generation)return;data=null;clearAudio();$('status').textContent='تعذر الفحص: '+String(e?.message||'ملف غير صالح').slice(0,200);}
 }
 function decision(b,c,choice){
   b.decisions=b.decisions.filter(d=>d.candidateId!==c.candidateId);
   const x=b.context;
   b.decisions.push({ownerId:x.ownerId,studentId:x.studentId,recordingId:x.recordingId,sessionId:x.sessionId,jobId:x.jobId,corpusVersion:x.corpusVersion,engineVersion:x.engineVersion,candidateId:c.candidateId,teacherId:x.teacherId,decisionId:'lab-'+c.candidateId,decision:choice,reviewedAt:data.asOf+'T12:00:00Z',approvedSnapshot:candidateSnapshot(c)});
   render();
 }
 function metric(title,value){const d=el('div',undefined,'skill');d.append(el('span',title,'muted'),el('div',value,'metric'));return d;}
 function evidence(outcome){if(data?.mode!=='demo')return;data.assessments=[{id:'lab-observation',ownerId:'lab-only',studentId:'lab-student',skillId:'articulation',teacherId:'lab-reviewer',assessmentId:'lab-assessment',criterionVersion:'synthetic-v1',source:'teacher-observation',reviewStatus:'approved',observedDay:data.asOf,reviewedDay:data.asOf,outcome}];render();}
 function render(){
   if(!data)return;
   const {batches,resolver,sessions,asOf}=data,host=$('reviewList');host.replaceChildren();$('results').hidden=false;$('explicitPanel').hidden=data.mode!=='demo';
   $('scopeInfo').textContent=data.mode==='demo'?'النصوص اصطناعية وليست آيات قرآنية.':'مطابقة النص المحلي فقط، تحتاج تحققًا علميًا وسماع التسجيل.';
   let unresolved=0,total=0,manual=0;
   for(const b of batches){
     if(b.status!=='review-required')manual++;
     unresolved+=b.unmapped.length;total+=b.candidates.length;
     for(const c of b.candidates){
       const loc=resolver.resolveLocation(c),d=b.decisions.find(x=>x.candidateId===c.candidateId),card=el('article',undefined,'candidate');
       card.append(el('h3',c.type),el('p',data.mode==='demo'?'مثال رقم '+c.ayah:loc.surah+' — آية '+c.ayah,'muted'),el('p',loc.ayahText,'sample'),el('p','الموضع: '+(loc.charText||loc.word||'الآية')+' | لا توقيت صوتي محدد','muted'));
       const ctl=el('div',undefined,'controls');for(const [key,label] of [['approved','اعتماد تجريبي'],['rejected','رفض']]){const btn=el('button',label);btn.type='button';btn.setAttribute('aria-pressed',String(d?.decision===key));btn.addEventListener('click',()=>decision(b,c,key));ctl.append(btn);}
       card.append(ctl,el('p',d?.decision==='approved'?'معتمد في المعاينة':d?.decision==='rejected'?'مرفوض':'بانتظار المراجعة','muted'));host.append(card);
     }
   }
   if(!total)host.append(el('p','لا توجد ملاحظات قابلة للعرض الآلي؛ هذا لا يعني صحة التلاوة.'));
   $('unmapped').textContent='مواضع تتطلب مراجعة يدوية: '+unresolved+'؛ مسودات لم تطابق مرجعًا كاملًا: '+manual+'.';
   const p=buildReviewedLearningProfile({ownerId:'lab-only',studentId:'lab-student',asOf,sessions,batches,resolveLocation:resolver.resolveLocation},deps);
   const ev=buildSkillEvidence({ownerId:'lab-only',studentId:'lab-student',asOf,assessments:data.assessments},SKILLS);
   $('summary').replaceChildren(metric('ملاحظات مقترحة',total),metric('معتمدة في المعاينة',p.projected),metric('أنماط تاريخية',p.memory?.patterns.length||0));
   const sh=$('skills');sh.replaceChildren();
   for(const s of p.graph?.nodes||[]){const a=ev.skills.find(x=>x.skillId===s.id);const box=el('article',undefined,'skill');box.append(el('strong',s.title),el('p',s.status==='historical-pattern'?'نمط تاريخي مسجل':'لا نمط تاريخي كافٍ','muted'),el('p',stateLabels[a?.state||'unknown']));for(const c of s.candidateChecks)box.append(el('p','فحص مقترح غير معتمد: '+c.label,'muted'));sh.append(box);}
 }
 $('demo').addEventListener('click',demo);$('clear').addEventListener('click',clear);$('importForm').addEventListener('submit',importDraft);
 for(const id of ['demonstrated','needsPractice','inconclusive'])$(id).addEventListener('click',()=>evidence(id==='needsPractice'?'needs-practice':id));
})();