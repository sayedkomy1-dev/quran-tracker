'use strict';
/* Imam Academy v11.2.0 Stage 4 — teacher-side assignment audio share. */
(function teacherAssignmentAudio(g){
  const $=id=>document.getElementById(id);
  function say(msg,type='info'){try{if(typeof g.toast==='function')g.toast(msg,type);else alert(msg);}catch(_){} }
  async function share(){
    const section=typeof g.readSection==='function'?g.readSection('new'):null;if(!section?.surahId){say('حدد الحفظ الجديد أولًا','error');return;}
    const limit=g.ImamOfflineAudio?.SURAHS?.[section.surahId-1]?.[1];if(!$('new-full')?.checked&&$('new-f')&&$('new-t')){const from=Number($('new-f').value),to=Number($('new-t').value);if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<1||from>limit||to>limit||from>to){say('راجع نطاق آيات تكليف الحفظ الجديد قبل المشاركة','error');return;}}
    const selectedStudent=$('sesSt')?.value,selectedDate=$('sesDate')?.value;const reciter=$('teacherAssignmentAudioReciter')?.value||'mishary',btn=$('teacherAssignmentAudioBtn');const original=btn?.textContent;if(btn)btn.disabled=true;
    try{say('جارٍ تجهيز صوت التكليف…');const file=await g.ImamQuranAudioExport.buildFile({chapter:section.surahId,surah:section.surah,from:section.from,to:section.to,reciter},p=>{if(btn)btn.textContent=`تجهيز ${p.done}/${p.total}`;});if($('sesSt')?.value!==selectedStudent||$('sesDate')?.value!==selectedDate){say('تغيرت الحصة أثناء تجهيز الصوت؛ أعد المشاركة من الحصة الحالية','info');return;}const out=await g.ImamQuranAudioExport.shareFile(file,{title:`صوت التكليف — ${section.surah}`,text:`سورة ${section.surah} — الآيات ${section.from}–${section.to}`});say(out.shared?'تمت المشاركة مع التطبيق المختار؛ تحقق من الإرسال في واتساب':out.cancelled?'أُلغيت المشاركة':'المشاركة المباشرة غير مدعومة على هذا الجهاز؛ لم يُنزّل أي ملف',out.shared?'success':'info');}
    catch(err){if(err?.name!=='AbortError'){console.warn('[teacher assignment audio]',err);say(g.ImamOfflineAudio?.message(err)||'تعذر تجهيز ملف الصوت الآن','error');}}
    finally{if(btn){btn.disabled=false;btn.textContent=original;}}
  }
  g.ImamTeacherAssignmentAudio={share};g.shareCurrentAssignmentAudio=share;
})(globalThis);
