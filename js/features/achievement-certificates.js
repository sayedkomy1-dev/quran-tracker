'use strict';
/* v11.8 Stage 1: evidence-gated student achievements and internal printable certificates.
 * Additive per-student records, no migrations and no network QR verification claim.
 */
(function certificates118(g){
  const app=()=>g.ImamApp?.State||{};
  const gp=()=>g.ImamApp?.GoalPlanner;
  const el=id=>document.getElementById(id);
  const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const iso=()=>new Date().toISOString();
  const htmlDate=v=>{const d=new Date(v||Date.now());return Number.isFinite(+d)?d.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}):'—';};
  const getStudent=id=>(app().students||[]).find(s=>String(s.id)===String(id));
  const sessionsFor=id=>(app().sessions||[]).filter(s=>String(s.studentId)===String(id));
  const surahs=()=>{try{return Array.isArray(S)?S:[]}catch(_){return[]}};
  const kinds=[['surah','إتمام حفظ سورة'],['juz','إتمام حفظ جزء'],['five','إتمام خمسة أجزاء'],['ten','إتمام عشرة أجزاء'],['half','إتمام نصف القرآن'],['full','ختم حفظ القرآن'],['attendance','شهادة الانتظام'],['tajweed','إتقان التجويد — باعتماد المحفظ']];
  let showing=null;
  let activeId='';
  function verified(id){return gp()?.completedKeys?.(id)||new Set();}
  function allInGoal(keys,type,id){
    const plan={enabled:true,targetType:type,startDate:'2026-01-01',...(type==='surah'?{surahId:id,from:1,to:surahs()[id-1]?.a||1}:type==='juz'?{juz:id}:{})};
    const verses=gp()?.targetVerses?.(plan)||[];
    return verses.length>0&&verses.every(v=>keys.has(`${v.surahId}:${v.ayah}`));
  }
  function counts(studentId){
    const keys=verified(studentId);const completeJuz=[];for(let i=1;i<=30;i++)if(allInGoal(keys,'juz',i))completeJuz.push(i);
    const attendance=new Set(sessionsFor(studentId).filter(s=>s.status==='حضر').map(s=>String(s.sessionDate||s.date||'').slice(0,10)).filter(Boolean)).size;
    return{keys,juz:completeJuz,attendance};
  }
  function eligibility(id,kind,subject,manual=false){
    const data=counts(id);
    if(kind==='surah'){
      const i=Number(subject);if(!i||!surahs()[i-1])return{ok:false,label:'اختر السورة'};
      return{ok:allInGoal(data.keys,'surah',i),label:`سورة ${surahs()[i-1].n} كاملة`,evidence:`سورة ${surahs()[i-1].n}، ${surahs()[i-1].a} آية مُجتازة`};
    }
    if(kind==='juz'){
      const i=Number(subject);if(i<1||i>30)return{ok:false,label:'اختر الجزء'};
      return{ok:allInGoal(data.keys,'juz',i),label:`الجزء ${i}`,evidence:`الجزء ${i} مكتمل بالتسميع الناجح`};
    }
    const required={five:5,ten:10,half:15,full:30};
    if(required[kind])return{ok:data.juz.length>=required[kind],label:kinds.find(x=>x[0]===kind)?.[1]||'',evidence:`الأجزاء المكتملة: ${data.juz.length} من ${required[kind]} المطلوبة`};
    if(kind==='attendance')return{ok:data.attendance>=10,label:'انتظام في عشر حصص على الأقل',evidence:`عدد أيام الحضور المسجلة: ${data.attendance}`};
    if(kind==='tajweed')return{ok:!!manual,label:'إتقان التجويد',evidence:manual?'اعتماد مباشر من المحفظ بعد تقييمه الشخصي':'يتطلب اعتماد المحفظ الصريح'};
    return{ok:false,label:'اختر نوع الإنجاز'};
  }
  function records(st){return Array.isArray(st?.achievementCertificates)?st.achievementCertificates.filter(x=>x&&typeof x==='object'):[];}
  function currentStudent(){const id=app().curStId;return getStudent(id||activeId);}
  const currentFields=()=>({kind:el('cert118Type')?.value||'surah',subject:el('cert118Subject')?.value||'',manual:!!el('cert118Manual')?.checked,note:el('cert118Note')?.value.trim().slice(0,240)||''});
  function idFor(st){const token=(g.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g,'').slice(0,12).toUpperCase();return `IMAM-${new Date().getFullYear()}-${token}`;}
  function renderPaper(c,st,preview=false){
    const academy=escape(c.academy||app().settings?.circle||'أكاديمية الإمام لتحفيظ القرآن الكريم');
    const subtitle=preview?'معاينة غير معتمدة':'شهادة إنجاز معتمدة من المحفظ';
    return `<div class="cert-box cert-v118-paper" dir="rtl" lang="ar"><div class="cert-v118-top">✦ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ✦</div><div class="cert-v118-academy">${academy}</div><div class="cert-v118-kicker">بالقرآن نحيا</div><div class="cert-v118-seal">✧ 📜 ✧</div><div class="cert-title">شهادة ${escape(c.title||'إنجاز')}</div><div class="cert-v118-kind">${escape(subtitle)}</div><p class="cert-v118-lead">تُمنح هذه الشهادة إلى الطالب/الطالبة</p><div class="cert-name">${escape(st?.name||c.studentName||'—')}</div><div class="cert-body">تقديرًا لتحقيق إنجاز<br><strong>${escape(c.label||'—')}</strong></div><p class="cert-v118-evidence">${escape(c.evidence||'')}</p>${c.note?`<p class="cert-v118-note">${escape(c.note)}</p>`:''}<div class="cert-v118-bottom"><span>التاريخ: <b>${htmlDate(c.issuedAt)}</b></span><span>المحفظ: <b>${escape(c.teacher||'—')}</b></span></div><div class="cert-v118-id">رقم الشهادة الداخلي: <b dir="ltr">${escape(c.id||'معاينة')}</b></div><div class="cert-v118-warning">التحقق الإلكتروني برمز الاستجابة السريعة غير مفعّل في هذه المرحلة. الرقم مرجع داخلي وليس إثباتًا عامًا.</div></div>`;
  }
  function selectedPreview(){const st=currentStudent();if(!st)return null;const f=currentFields();const e=eligibility(st.id,f.kind,f.subject,f.manual);return{student:st,evidence:e,certificate:{id:'',studentName:st.name,kind:f.kind,subject:f.subject,title:kinds.find(x=>x[0]===f.kind)?.[1]||'إنجاز',label:e.label,evidence:e.evidence,note:f.note,issuedAt:iso(),teacher:String(app().settings?.name||'المحفظ'),academy:String(app().settings?.circle||'أكاديمية الإمام لتحفيظ القرآن الكريم')}};}
  function renderEditor(){
    const st=currentStudent();if(!st)return;activeId=String(st.id);
    const history=records(st).slice().reverse();
    el('certContent').innerHTML=`<section class="cert118-editor"><div class="cert118-intro"><b>🏅 شهادات الإنجاز</b><small>لا تُصدر شهادات الحفظ إلا بعد اجتياز الآيات الموثقة، والتجويد يحتاج اعتماد المحفظ</small></div><div class="cert118-fields"><label>نوع الشهادة<select id="cert118Type">${kinds.map(([k,t])=>`<option value="${k}">${escape(t)}</option>`).join('')}</select></label><label id="cert118SubjectWrap">السورة<select id="cert118Subject">${surahs().map((s,i)=>`<option value="${i+1}">سورة ${escape(s.n)}</option>`).join('')}</select></label><label class="cert118-manual" id="cert118ManualWrap" hidden><input type="checkbox" id="cert118Manual"> أؤكد بصفتي المحفظ أن الطالب اجتاز اختبار التجويد</label><label class="cert118-note">ملاحظة على الشهادة (اختياري)<input id="cert118Note" maxlength="240" placeholder="توصية أو عبارة تهنئة قصيرة"></label></div><p id="cert118Status" class="cert118-status" role="status"></p><div class="cert118-actions"><button type="button" id="cert118Preview">معاينة</button><button type="button" id="cert118Issue" class="cert118-primary">إصدار الشهادة بعد التحقق</button><button type="button" id="cert118Html">حفظ ملف الشهادة</button><button type="button" id="cert118Share">مشاركة ملف الشهادة</button></div><div class="cert118-history"><b>سجل الشهادات (${history.length})</b>${history.length?history.map(c=>`<button type="button" data-cert-id="${escape(c.id||'')}"><span>${escape(c.title||c.label)} · ${htmlDate(c.issuedAt)}</span><small>${escape(c.id||'')}</small></button>`).join(''):'<small>لم تُصدر شهادات لهذا الطالب بعد.</small>'}</div></section><div id="cert118PaperHost"></div>`;
    el('cert118Type').addEventListener('change',()=>{const f=el('cert118Type').value;el('cert118SubjectWrap').hidden=!['surah','juz'].includes(f);el('cert118ManualWrap').hidden=f!=='tajweed';if(f==='juz')el('cert118SubjectWrap').querySelector('select').innerHTML=Array.from({length:30},(_,i)=>`<option value="${i+1}">الجزء ${i+1}</option>`).join('');else if(f==='surah')el('cert118SubjectWrap').querySelector('select').innerHTML=surahs().map((s,i)=>`<option value="${i+1}">سورة ${escape(s.n)}</option>`).join('');updateStatus();});
    ['cert118Subject','cert118Manual'].forEach(id=>el(id).addEventListener('change',updateStatus));
    el('cert118Preview').addEventListener('click',()=>preview(false));
    el('cert118Issue').addEventListener('click',issue);
    el('cert118Html').addEventListener('click',download);el('cert118Share').addEventListener('click',shareFile);
    el('cert118History')?.addEventListener('click',()=>{});
    el('certContent').querySelectorAll('[data-cert-id]').forEach(btn=>btn.addEventListener('click',()=>{const c=records(currentStudent()).find(x=>x.id===btn.dataset.certId);if(c){showing=c;showPaper(c,currentStudent(),false);}}));
    updateStatus();
    if(history.length){showing=history[0];showPaper(showing,st,false);}else{showing=null;el('cert118PaperHost').innerHTML='';}
  }
  function updateStatus(){const p=selectedPreview();if(!p)return;const {evidence:e}=p;const status=el('cert118Status');status.textContent=e.ok?`✅ مؤهل للإصدار — ${e.evidence}`:`⏳ غير مؤهل للإصدار الآن — ${e.evidence||e.label}`;status.classList.toggle('cert118-ok',e.ok);el('cert118Issue').disabled=!e.ok;}
  function showPaper(c,st,previewFlag){el('cert118PaperHost').innerHTML=renderPaper(c,st,previewFlag);el('cert118PaperHost').scrollIntoView?.({block:'nearest',behavior:'smooth'});}
  function preview(){const p=selectedPreview();if(!p)return;showing=null;showPaper(p.certificate,p.student,true);}
  function issue(){const st=currentStudent(),p=selectedPreview();if(!st||!p?.evidence.ok){updateStatus();return;}
    const f=currentFields(),history=records(st);if(history.some(c=>c.kind===f.kind&&String(c.subject||'')===String(f.subject||'')&&!c.voided)){try{toast('هذه الشهادة موجودة بالفعل في سجل الطالب','info');}catch(_){}return;}
    const c={...p.certificate,id:idFor(st),issuedAt:iso(),version:1,approvedByTeacher:true,proofMode:f.kind==='tajweed'?'teacher-attestation':'verified-recitation',proofCount:f.kind==='attendance'?counts(st.id).attendance:verified(st.id).size};
    if(!Array.isArray(st.achievementCertificates))st.achievementCertificates=[];st.achievementCertificates.push(c);
    try{g.save?.();}catch(err){st.achievementCertificates.pop();try{toast('تعذر حفظ الشهادة؛ لم يتم اعتماد الإصدار','error');}catch(_){}return;}
    showing=c;renderEditor();try{toast('تم إصدار الشهادة وحفظها في ملف الطالب','success');}catch(_){}
  }
  function certificateHTML(c,st){const paper=renderPaper(c,st,false);return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>شهادة ${escape(st?.name||'طالب')}</title><style>${standaloneCSS}</style></head><body>${paper}<div class="hint">للحفظ بصيغة PDF: افتح أمر الطباعة واختر الحفظ كملف PDF.</div></body></html>`;}
  const standaloneCSS=`@page{size:A4 landscape;margin:12mm}body{font-family:Tahoma,Arial,sans-serif;color:#16412b;background:#fff;padding:0;margin:0} .cert-v118-paper{box-sizing:border-box;min-height:174mm;border:4px double #c9a34c;padding:16mm;text-align:center;background:#fffdfa;color:#173b2a;display:flex;flex-direction:column;justify-content:center;gap:5px}.cert-v118-top,.cert-v118-kicker{color:#99752a;font-size:14px}.cert-v118-academy{font-size:22px;font-weight:900}.cert-v118-seal{font-size:32px}.cert-title{font-size:32px;color:#17472c;font-weight:bold}.cert-v118-kind,.cert-v118-lead{font-size:15px;color:#5e7061}.cert-name{font-size:34px;font-weight:900;border-bottom:2px solid #c9a34c;margin:7px auto;padding:8px 24px;color:#123e29}.cert-body{font-size:19px;line-height:1.7}.cert-body strong{font-size:22px}.cert-v118-evidence{font-size:12px;color:#65786a}.cert-v118-note{font-size:13px}.cert-v118-bottom{display:flex;justify-content:space-around;margin-top:13px;font-size:14px}.cert-v118-id{font-size:12px}.cert-v118-warning{font-size:10px;color:#748278}.hint{padding:8px;text-align:center;font-size:11px}@media print{.hint{display:none}}`;
  function download(){const st=currentStudent(),c=showing;if(!st||!c?.id){try{toast('اختر شهادة مصدرة من السجل أولًا','info');}catch(_){}return;}const b=new Blob([certificateHTML(c,st)],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=`certificate-${c.id}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function shareFile(){const st=currentStudent(),c=showing;if(!st||!c?.id){try{toast('أصدر الشهادة أو اختر شهادة من السجل أولًا','info');}catch(_){}return;}const name=`certificate-${c.id}.html`;const file=new File([certificateHTML(c,st)],name,{type:'text/html;charset=utf-8'});if(!navigator.share||!navigator.canShare?.({files:[file]})){download();try{toast('تم تجهيز الملف للتنزيل؛ يمكن مشاركته من مدير الملفات','info');}catch(_){}return;}try{await navigator.share({files:[file],title:`شهادة ${st.name}`});}catch(e){if(e?.name!=='AbortError')try{toast('تعذرت مشاركة الملف، يمكنك تنزيله بدلًا من ذلك','error');}catch(_){}}}
  function print(){const st=currentStudent();if(!showing?.id||!st){try{toast('أصدر الشهادة أو اختر واحدة من السجل أولًا','error');}catch(_){}return;}document.body.classList.add('cert-print');const cleanup=()=>document.body.classList.remove('cert-print');g.addEventListener('afterprint',cleanup,{once:true});setTimeout(()=>g.print(),80);}
  function open(){const st=currentStudent();if(!st)return;el('certModal')?.classList.add('open');renderEditor();}
  g.openCert=open;g.printCertificate=print;
  g.ImamApp=g.ImamApp||{};g.ImamApp.AchievementCertificates={eligibility,counts,records,renderPaper,certificateHTML,open};
})(globalThis);
