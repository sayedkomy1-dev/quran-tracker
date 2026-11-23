'use strict';
/* Imam Academy v11.2.0 Stage 4 — teacher-side assignment audio share. */
(function teacherAssignmentAudio(g){
  const $=id=>document.getElementById(id);
  function say(msg,type='info'){try{if(typeof g.toast==='function')g.toast(msg,type);else alert(msg);}catch(_){} }
  function resolveGuardian(studentId){
    const student=(g.ImamApp?.State?.students||[]).find(s=>String(s.id)===String(studentId));
    const phone=typeof g.normalizeWhatsAppPhone==='function'?g.normalizeWhatsAppPhone(student?.phone||''):String(student?.phone||'').replace(/\D/g,'');
    return {student,phone,valid:/^20(10|11|12|15)\d{8}$/.test(phone)};
  }
  function sectionSignature(section){return section?[section.surahId,section.surah,section.from,section.to,section.full?'1':'0'].join('|'):'';}
  function currentSignature(){try{return sectionSignature(typeof g.readSection==='function'?g.readSection('new'):null);}catch(_){return '';}}
  async function share(){
    const section=typeof g.readSection==='function'?g.readSection('new'):null;if(!section?.surahId){say('حدد الحفظ الجديد أولًا','error');return;}
    const limit=g.ImamOfflineAudio?.SURAHS?.[section.surahId-1]?.[1];if(!$('new-full')?.checked&&$('new-f')&&$('new-t')){const from=Number($('new-f').value),to=Number($('new-t').value);if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<1||from>limit||to>limit||from>to){say('راجع نطاق آيات تكليف الحفظ الجديد قبل المشاركة','error');return;}}
    const selectedStudent=$('sesSt')?.value,selectedDate=$('sesDate')?.value;
    if(!selectedStudent){say('اختر الطالب لتحديد رقم ولي أمره قبل مشاركة الصوت','error');return;}
    const guardian=resolveGuardian(selectedStudent);
    if(!guardian.student){say('لم يتم العثور على ملف الطالب الحالي','error');return;}
    if(!guardian.valid){say('رقم واتساب ولي الأمر مفقود أو غير صحيح. صحّحه من ملف الطالب أولًا','error');return;}
    const reciter=$('teacherAssignmentAudioReciter')?.value||'mishary',sectionAtStart=sectionSignature(section),btn=$('teacherAssignmentAudioBtn');const original=btn?.textContent;if(btn)btn.disabled=true;
    try{say('جارٍ تجهيز صوت التكليف…');const file=await g.ImamQuranAudioExport.buildFile({chapter:section.surahId,surah:section.surah,from:section.from,to:section.to,reciter},p=>{if(btn)btn.textContent=`تجهيز ${p.done}/${p.total}`;});if($('sesSt')?.value!==selectedStudent||$('sesDate')?.value!==selectedDate||currentSignature()!==sectionAtStart||($('teacherAssignmentAudioReciter')?.value||'mishary')!==reciter){say('تغير الطالب أو التاريخ أو نطاق الآيات أو القارئ أثناء تجهيز الصوت؛ أعد المشاركة من الحصة الحالية','info');return;}const latest=resolveGuardian(selectedStudent);
      if(!latest.valid||latest.phone!==guardian.phone){say('تغير رقم ولي الأمر أثناء تجهيز الصوت؛ راجعه وأعد المشاركة','info');return;}
      const out=await g.ImamQuranAudioExport.shareFile(file,{
        title:`صوت تكليف ${guardian.student.name||'الطالب'} — ${section.surah}`,
        text:`تكليف ${guardian.student.name||'الطالب'}: سورة ${section.surah}، الآيات ${section.from}–${section.to}`,
      });
      say(out.shared?'تم فتح مشاركة الملف؛ تأكد من اختيار محادثة ولي الأمر وإتمام الإرسال':out.cancelled?'أُلغيت المشاركة':out.unsupported?'المشاركة الصوتية غير مدعومة هنا، ويمكن فتح محادثة ولي الأمر برسالة نصية':'انتهت نافذة مشاركة التكليف؛ تحقق من إتمام الإرسال',out.shared?'success':'info');}
    catch(err){if(err?.name!=='AbortError'){console.warn('[teacher assignment audio]',err);say(g.ImamOfflineAudio?.message(err)||'تعذر تجهيز ملف الصوت الآن','error');}}
    finally{if(btn){btn.disabled=false;btn.textContent=original;}}
  }
  g.ImamTeacherAssignmentAudio={share};g.shareCurrentAssignmentAudio=share;
})(globalThis);
