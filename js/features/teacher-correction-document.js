/* v11.7.4.5 — Full vector HTML/PDF correction report (no bitmap rasterization). */
'use strict';
(function correctionDocument(g){
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text=value=>String(value??'').trim();
  const phase=mode=>mode==='new_read'||mode==='talaqqin'?'new':mode==='review'?'review':'recitation';
  const phases=[['new','الحفظ الجديد والتلقين'],['recitation','التسميع'],['review','المراجعة']];
  const labels={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة',juz:'مراجعة الأجزاء',surahReview:'مراجعة السور والأرباع'};
  const errorFields=entry=>({
    phase:phase(entry?.mode),surah:text(entry?.surah)||'—',surahId:Number(entry?.surahId)||0,
    ayah:Number(entry?.ayah)||0,word:text(entry?.word)||'—',char:entry?.targetLevel==='char'?text(entry?.charText):'',
    kind:text(entry?.type)||'خطأ غير مصنف',resolved:entry?.resolved===true,mode:entry?.mode||'',
    note:text(entry?.customText||entry?.note||'')
  });
  // Preserve every error, including duplicate types on different characters of one verse.
  const allErrors=ses=>(Array.isArray(ses?.recitationErrors)?ses.recitationErrors:[])
    .filter(row=>row?.source==='quran-word').map(errorFields);
  function sectionLabel(section){if(!section)return '—';if(typeof section==='string')return section;
    const surah=text(section.surah)||'—';return section.full?`سورة ${surah} كاملة`:
      `سورة ${surah} — الآيات ${esc(section.from||1)}–${esc(section.to||section.from||1)}`;
  }
  function gradeDisplay(grade,score){const g=text(grade)||'غير مقيّم';const s=Number(score);
    return `${esc(g)}${Number.isFinite(s)&&score!==undefined&&score!==null?` · <strong>${Math.round(s)} من 100</strong>`:''}`;
  }
  function card(title,body){return `<section class="report-section"><h2>${esc(title)}</h2>${body}</section>`;}
  function sessionSections(ses){
    const scores=ses?.assessmentScores||{},grade=ses?.prevGrades||{};
    const reviewed=Object.entries(labels).filter(([key])=>grade[key]||scores[key]!==undefined).map(([key,label])=>{
      const actual=ses?.actualRecitation?.[key]||ses?.[key];
      return `<div class="report-assessment"><div><b>${esc(label)}</b><span>${esc(sectionLabel(actual))}</span></div><div>${gradeDisplay(grade[key],scores[key])}</div></div>`;
    });
    const recitation=card('نتيجة التسميع والتقييم',reviewed.length?reviewed.join(''):'<p>لا توجد تقييمات محفوظة لهذه الحصة.</p>');
    const assigned=[];
    for(const [key,label] of Object.entries(labels)){
      const sec=ses?.[key];if(!sec)continue;
      const detail=Array.isArray(sec.chips)?sec.chips.join('، '):sectionLabel(sec);
      if(detail)assigned.push(`<li><b>${esc(label)}:</b> ${esc(detail)}</li>`);
    }
    if(Array.isArray(ses?.reviewAssignments))for(const assignment of ses.reviewAssignments){
      const values=(assignment?.items||[]).map(it=>text(it?.surahName||it?.surah||it?.label)).filter(Boolean);
      if(values.length)assigned.push(`<li><b>مراجعة ذكية:</b> ${esc(values.join('، '))}</li>`);
    }
    const reviewedGroups=[];
    for(const group of Array.isArray(ses?.reviewResults)?ses.reviewResults:[]){
      const items=Array.isArray(group?.items)?group.items:[];
      for(const item of items){
        const label=text(item.label||item.surahName||item.surah||item.name)||'موضع مراجعة';
        const score=item.score===null||item.score===undefined||item.score===''?null:Number(item.score);
        const rating=text(item.grade||item.evaluation)||(item.status==='repeat'?'إعادة':'لم يقيّم');
        reviewedGroups.push(`<li><b>${esc(label)}</b> — ${esc(rating)}${score!==null&&Number.isFinite(score)?` · ${Math.max(0,Math.min(100,Math.round(score)))} من 100`:''}</li>`);
      }
    }
    const detailedReview=reviewedGroups.length?card('تفصيل مراجعة السور والأرباع',`<ol>${reviewedGroups.join('')}</ol>`):'';
    const carry=Array.isArray(ses?.carryForward?.items)?ses.carryForward.items:[];
    if(carry.length)assigned.push(`<li><b>الإعادة التلقائية المقترحة:</b> ${esc(carry.map(i=>text(i.label||i.surahName)).filter(Boolean).join('، '))}</li>`);
    const next=card('التكليف والمراجعة المنزلية',assigned.length?`<ul>${assigned.join('')}</ul>`:'<p>لا يوجد تكليف مسجل.</p>');
    const notes=text(ses?.notes)?card('ملاحظات المحفظ',`<p>${esc(ses.notes)}</p>`):'';
    return recitation+detailedReview+next+notes;
  }
  function errorSections(errors){if(!errors.length)return card('سجل التصحيح على النص','<p>لا توجد مواضع تصحيح مسجلة على النص في هذه الحصة.</p>');
    let sections='';
    for(const [key,title] of phases){
      const list=errors.filter(e=>e.phase===key);if(!list.length)continue;
      // Order by Quran position, never collapse separate marks on one ayah.
      const rows=list.map((entry,index)=>({entry,index})).sort((a,b)=>a.entry.surahId-b.entry.surahId||a.entry.ayah-b.entry.ayah||a.index-b.index);
      const groups=new Map();
      for(const {entry} of rows){const groupKey=`${entry.surahId}:${entry.ayah}`;
        if(!groups.has(groupKey))groups.set(groupKey,{surah:entry.surah,ayah:entry.ayah,items:[]});groups.get(groupKey).items.push(entry);
      }
      sections+=card(`${title} — ${list.length} موضعًا`,[...groups.values()].map(group=>
        `<article class="report-verse"><h3>سورة ${esc(group.surah)} — الآية ${esc(group.ayah)}</h3><ol>${group.items.map(e=>
          `<li class="${e.resolved?'resolved':'unresolved'}"><span class="word" lang="ar">﴿${esc(e.word)}﴾</span>${e.char?` <small>الحرف: ﴿${esc(e.char)}﴾</small>`:''}<span class="error-kind">${esc(e.kind)}</span>${e.note?`<p>${esc(e.note)}</p>`:''}<b class="error-state">${e.resolved?'✓ تم التصحيح':'تحتاج مراجعة'}</b></li>`).join('')}</ol></article>`).join(''));
    }
    return sections;
  }
  function reportHtml(st,ses){
    const errors=allErrors(ses),extra=(Array.isArray(ses?.recitationErrors)?ses.recitationErrors:[]).filter(e=>e&&e.source!=='quran-word'),corrected=errors.filter(e=>e.resolved).length;
    const dt=new Date(`${String(ses?.date||'').slice(0,10)}T12:00:00`);
    const date=Number.isFinite(dt.getTime())?dt.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):text(ses?.date);
    const circle=text(g.ImamApp?.State?.settings?.circle)||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    const teacher=text(g.ImamApp?.State?.settings?.name);
    const name=text(st?.name)||'الطالب';
    const style=`*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;direction:rtl;margin:0;background:#eef2ec;color:#142c23;line-height:1.85}main{max-width:850px;margin:18px auto;background:#fff;padding:26px 30px;box-shadow:0 8px 28px #132d2214;border-radius:14px}header{background:#075038;color:#fff;margin:-26px -30px 20px;padding:24px 30px;border-bottom:5px solid #d7b45e}header small{color:#d7ebdc}h1{margin:0;font-size:24px}header p{margin:3px 0}h2{font-size:17px;color:#075038;border-bottom:1px solid #dbe8de;padding-bottom:7px}h3{font-size:14px;background:#eef6f0;border-radius:7px;margin:0 0 8px;padding:5px 10px;color:#164d34}.metadata,.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metadata>div,.summary>div{border:1px solid #dbe5db;padding:8px 12px;border-radius:8px;min-width:0}.summary{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:15px}.summary strong{display:block;font-size:23px;color:#075038}.report-section{margin:18px 0;page-break-inside:auto}.report-assessment{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e0e9e2;padding:9px 2px}.report-assessment span{display:block;color:#64756b}.report-verse{margin:13px 0;page-break-inside:avoid;break-inside:avoid}.report-verse ol{padding-inline-start:24px}.report-verse li{padding:7px 9px;border-bottom:1px solid #e5e9e5;overflow-wrap:anywhere}.word{font-size:19px;font-family:'Traditional Arabic','Amiri',Tahoma,serif;font-weight:700}.error-kind{display:inline-block;background:#fff1df;color:#844c14;border-radius:6px;margin:0 8px;padding:0 8px}.error-state{font-size:11px;white-space:nowrap;margin-inline-start:7px}.resolved .error-state{color:#237246}.unresolved .error-state{color:#a64b24}footer{border-top:2px solid #d9be77;padding-top:12px;color:#52665a;text-align:center;margin-top:24px}p,li{white-space:pre-wrap}ul{padding-inline-start:25px}@page{size:A4;margin:14mm}@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}main{max-width:none;margin:0;padding:15px;box-shadow:none;border-radius:0}header{margin:-15px -15px 15px;padding:18px 20px}.report-verse{page-break-inside:avoid}}@media(max-width:550px){main{margin:0;padding:16px}header{margin:-16px -16px 16px;padding:20px}.metadata{grid-template-columns:1fr}.summary{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.summary>div{padding:6px}.report-assessment{display:block}}`;
    // The content is data-only: no scripts, network requests, external images or fonts.
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>تقرير تصحيح ${esc(name)}</title><style>${style}</style></head><body><main><header><small>${esc(circle)}</small><h1>تقرير الحصة وسجل التصحيح الكامل</h1><p>نسخة نصية واضحة وقابلة للطباعة — جميع الأخطاء المسجلة دون اختصار</p></header><div class="metadata"><div><b>الطالب:</b> ${esc(name)}</div><div><b>التاريخ:</b> ${esc(date)}</div><div><b>حالة الحصة:</b> ${esc(ses?.status||'—')}</div><div><b>المحفظ:</b> ${esc(teacher||'—')}</div></div><div class="summary"><div><strong>${errors.length+extra.length}</strong>أخطاء مسجلة</div><div><strong>${errors.length-corrected+extra.length}</strong>تحتاج مراجعة</div><div><strong>${corrected}</strong>تم تصحيحها</div></div>${sessionSections(ses)}${errorSections(errors)}${extra.length?card('أخطاء إضافية سجلها المحفظ',`<ol>${extra.map(e=>`<li>${esc(e?.type||String(e)||'خطأ غير مصنف')}</li>`).join('')}</ol>`):''}<footer>${esc(circle)} — بالقرآن نحيا<br>تُعرض العلامات كما سجلها المحفظ، ولا تمثل حكمًا آليًا على التلاوة.</footer></main></body></html>`;
  }
  function currentPack(){
    const sid=$('sesSt')?.value;if(!sid)return null;
    const state=g.ImamApp?.State||{},st=(state.students||[]).find(x=>String(x.id)===String(sid));if(!st)return null;
    const fields=typeof g.buildSesData==='function'?g.buildSesData():{};
    const day=$('sesDate')?.value||new Date().toISOString().slice(0,10);
    const draft={studentId:sid,date:day,status:'حضر',...fields};
    const saved=(state.sessions||[]).filter(x=>String(x.studentId)===String(sid)&&x.date===day).at(-1);
    // Prefer explicitly edited draft errors; otherwise preserve the saved session's
    // entire error ledger instead of accidentally printing an empty snapshot.
    const recitationErrors=(Array.isArray(draft.recitationErrors)&&draft.recitationErrors.length)?draft.recitationErrors:
      (Array.isArray(saved?.recitationErrors)?saved.recitationErrors:[]);
    return {st,ses:{...saved,...draft,recitationErrors}};
  }
  let previewUrl='',previewHtml='';
  function ensureModal(){if($('correctionHtmlDialog'))return;
    const el=document.createElement('section');el.id='correctionHtmlDialog';el.hidden=true;el.dir='rtl';
    el.innerHTML='<div class="correction-html-screen"><div class="correction-html-top"><strong>📄 تقرير الأخطاء الكامل — معاينة قبل المشاركة</strong><button type="button" data-report-action="close">✕ إغلاق</button></div><iframe id="correctionHtmlFrame" title="معاينة تقرير الأخطاء الكامل"></iframe><div class="correction-html-actions"><button type="button" data-report-action="print">🖨️ طباعة / حفظ PDF</button><button type="button" data-report-action="share">↗ مشاركة ملف HTML</button><button type="button" data-report-action="download">↓ تنزيل HTML</button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click',e=>{const a=e.target.closest('[data-report-action]')?.dataset.reportAction;if(!a)return;
      if(a==='close')return close();if(a==='print')return print();if(a==='share')return void share();if(a==='download')download();});
  }
  function cleanupUrl(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}}
  function open(){const pack=currentPack();if(!pack){g.toast?.('اختر الطالب أولًا','error');return;}
    ensureModal();previewHtml=reportHtml(pack.st,pack.ses);cleanupUrl();
    previewUrl=URL.createObjectURL(new Blob([previewHtml],{type:'text/html;charset=utf-8'}));
    $('correctionHtmlFrame').src=previewUrl;$('correctionHtmlDialog').hidden=false;
  }
  function close(){if($('correctionHtmlDialog'))$('correctionHtmlDialog').hidden=true;}
  function file(){const st=currentPack()?.st;const filename=String(st?.name||'student').replace(/[^\p{L}\p{N}-]+/gu,'-').slice(0,40);
    return new File([previewHtml||''],`correction-report-${filename}.html`,{type:'text/html'});
  }
  function download(){if(!previewHtml)return;const f=file(),u=URL.createObjectURL(f);const a=document.createElement('a');a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();g.setTimeout(()=>URL.revokeObjectURL(u),4000);}
  async function share(){if(!previewHtml)return;const f=file();try{
      if(navigator.share&&navigator.canShare?.({files:[f]})){await navigator.share({title:'تقرير الأخطاء الكامل',files:[f]});return;}
    }catch(err){if(err?.name==='AbortError')return;console.warn('[correction html share]',err);}
    download();g.toast?.('تم تنزيل ملف التقرير؛ يمكنك إرفاقه عبر واتساب.','info');
  }
  function print(){const frame=$('correctionHtmlFrame');try{frame?.contentWindow?.focus();frame?.contentWindow?.print();}
    catch(err){console.warn('[correction html print]',err);g.toast?.('تعذر فتح الطباعة هنا؛ نزّل التقرير وافتحه في المتصفح للحفظ بصيغة PDF.','info');}}
  function init(){if($('correctionReportOpenButton')||!$('saveSendSessionBtn'))return;
    const button=document.createElement('button');button.type='button';button.id='correctionReportOpenButton';button.className='btn btn-out correction-report-trigger';button.textContent='📄 تقرير الحصة والأخطاء كاملًا — PDF / HTML';
    $('saveSendSessionBtn').insertAdjacentElement('afterend',button);button.addEventListener('click',open);
  }
  g.ImamCorrectionDocument={reportHtml,allErrors,open,print};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
