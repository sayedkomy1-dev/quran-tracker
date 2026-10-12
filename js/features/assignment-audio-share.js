'use strict';
/* Imam Academy v11.2.0 Stage 4 — teacher-side assignment audio share. */
(function teacherAssignmentAudio(g){
  const $=id=>document.getElementById(id);
  function say(msg,type='info'){try{if(typeof g.toast==='function')g.toast(msg,type);else alert(msg);}catch(_){} }
  async function share(){
    const section=typeof g.readSection==='function'?g.readSection('new'):null;if(!section?.surahId){say('حدد الحفظ الجديد أولًا','error');return;}if(navigator.onLine===false){say('يلزم الإنترنت لتجهيز ملف الصوت أول مرة','error');return;}
    const reciter=$('teacherAssignmentAudioReciter')?.value||'mishary',btn=$('teacherAssignmentAudioBtn');if(btn)btn.disabled=true;
    try{say('جارٍ تجهيز صوت التكليف…');const file=await g.ImamQuranAudioExport.buildFile({chapter:section.surahId,surah:section.surah,from:section.from,to:section.to,reciter});const out=await g.ImamQuranAudioExport.shareFile(file,{title:`صوت التكليف — ${section.surah}`,text:`سورة ${section.surah} — الآيات ${section.from}–${section.to}`});say(out.downloaded?'تم تنزيل ملف الصوت؛ يمكنك إرساله عبر WhatsApp من الملفات':'تم فتح المشاركة — اختر WhatsApp','success');}
    catch(err){if(err?.name!=='AbortError'){console.warn('[teacher assignment audio]',err);say(/TOO_LARGE/.test(String(err))?'التكليف طويل جدًا لملف صوت واحد':'تعذر تجهيز ملف الصوت الآن','error');}}
    finally{if(btn)btn.disabled=false;}
  }
  g.ImamTeacherAssignmentAudio={share};g.shareCurrentAssignmentAudio=share;
})(globalThis);
