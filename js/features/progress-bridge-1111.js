'use strict';
/* Scoped academic summary bridge. Depends on optional reviewed server SQL.
 * Never falls back to client-side permission gating for supervisor reads. */
(function(g){
  const root=g.ImamApp||(g.ImamApp={});
  const $=id=>g.document?.getElementById?.(id);
  const esc=v=>root.Utils?.escapeHtml?.(v)??String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client=()=>g.WeLiveQuranAuth?.getClient?.();
  const access=()=>g.WeLiveQuranAuth?.getAccess?.()||{};
  const role=()=>String(access().role||'');
  const actor=()=>String(access().user_id||'');
  const students=()=>root.State?.students||[];
  const sessions=()=>root.State?.sessions||[];
  const hex=buffer=>Array.from(new Uint8Array(buffer)).map(x=>x.toString(16).padStart(2,'0')).join('');
  async function sha(value){if(!g.crypto?.subtle)throw Error('CRYPTO_UNAVAILABLE');return hex(await g.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
  const day=s=>String(s?.sessionDate||s?.date||'').slice(0,10);
  const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function validDay(value){
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
    const d=new Date(value+'T12:00:00Z');
    return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
  }
  function sourceUpdated(s){
    // Legacy session rows can lack updatedAt; do not fail a whole batch on
    // one malformed timestamp. Never publish a made-up timestamp as evidence.
    for(const input of [s?.updatedAt,s?.createdAt,s?.date,s?.sessionDate]){
      if(!input)continue;
      const parsed=Date.parse(String(input));
      if(Number.isFinite(parsed))return new Date(parsed).toISOString();
    }
    return null;
  }
  function canonicalGrade(s){
    const values=[...Object.values(s?.prevGrades||{}),...(Array.isArray(s?.teacher119?.extra)?s.teacher119.extra.map(x=>x?.grade):[])];
    for(const grade of values){
      if(grade==='جيد جدًا'||grade==='جيد جدا')return 'جيد جداً';
      if(['ممتاز','جيد جداً','جيد','ضعيف','إعادة'].includes(grade))return grade;
    }
    return '';
  }
  function safelyPublishable(records, roster){
    const allowed=new Set((Array.isArray(roster)?roster:[]).map(x=>String(x.id)));
    return (Array.isArray(records)?records:[]).filter(s=>s?.id&&allowed.has(String(s.studentId))&&
      validDay(day(s))&&day(s)<=localToday()&&
      ['حضر','غاب','إجازة'].includes(s.status)&&sourceUpdated(s)!==null);
  }
  async function makeBatch(records,roster,account){
    const refFn=root.GuardianPortal?.studentRef;
    if(typeof refFn!=='function')throw Error('STUDENT_REF_UNAVAILABLE');
    const list=safelyPublishable(records,roster).slice().sort((a,b)=>day(b).localeCompare(day(a))).slice(0,250);
    // Hash only the students referenced by selected sessions, not the entire
    // academy roster (which can otherwise cause hundreds of needless digests).
    const refs=new Map();for(const s of list){const sid=String(s.studentId);if(!refs.has(sid))refs.set(sid,await refFn(sid));}
    const output=[];
    for(const s of list){const grade=canonicalGrade(s);
      const attendance=s.status==='حضر'?'present':s.status==='إجازة'||s.absenceExcused?'excused':'absent';
      output.push({student_ref:refs.get(String(s.studentId)),session_ref:await sha(`${account}|${s.id}`),day:day(s),attendance,grade,
        error_count:Math.min(5000,Array.isArray(s.recitationErrors)?s.recitationErrors.length:0),updated_at:sourceUpdated(s)});}
    return output;
  }
  async function publish(){const result=$('ac1111BridgeResult');
    if(!client()||!actor()||!['owner','teacher'].includes(role())||g.navigator?.onLine===false){if(result)result.textContent='يلزم حساب محفظ نشط واتصال بالإنترنت.';return false;}
    const owner=actor();if(result)result.textContent='جارٍ إعداد ملخص الحصص دون أرقام هاتف أو ملاحظات خاصة…';
    try{
      const payload=await makeBatch(sessions(),students(),owner);
      if(owner!==actor())throw Error('ACCOUNT_CHANGED');
      if(!payload.length){if(result)result.textContent='لا توجد حصص مكتملة البيانات للنشر.';return false;}
      const {data,error}=await client().rpc('app_teacher_progress_publish',{p_records:payload});
      if(error)throw error;
      // Server may ignore an older duplicate while keeping the newer record;
      // its affected-row count can legitimately be smaller than payload size.
      const affected=Number(data?.count);
      if(data?.ok!==true||!Number.isInteger(affected)||affected<0||affected>payload.length)throw Error('UNCONFIRMED');
      if(result)result.textContent=`تم تأكيد معالجة ${payload.length} ملخص حصة (مستجد/محدّث: ${affected}). قد تكون سجلات أخرى أحدث محفوظة على الخادم.`;return true;
    }catch(err){if(result)result.textContent='لم تُؤكد المزامنة. قد تحتاج خدمة الملخصات إلى تفعيل من الإدارة. البيانات المحلية لم تتغير.';return false;}
  }
  async function detail(teacherId,row){
    if(!client()||!g.WeLiveQuranAuth?.isActive?.()||g.navigator?.onLine===false)return;
    let host=row?.querySelector?.('.academic-progress-remote');if(!host){host=g.document.createElement('div');host.className='academic-progress-remote';row.append(host);}host.textContent='جارٍ قراءة النتائج المصرح بها…';
    const requester=actor();
    try{const {data,error}=await client().rpc('app_supervision_progress_recent',{p_teacher_id:teacherId});if(error)throw error;
      // The user's account may change while the network request is in flight.
      if(requester!==actor()||!g.WeLiveQuranAuth?.isActive?.()){host.textContent='تغيّر الحساب؛ افتح لوحة الإشراف مجددًا.';return;}
      const records=Array.isArray(data?.records)?data.records:[];
      host.innerHTML='<b>نتائج التسميع المنشورة من حساب المحفظ</b><p>بيانات منشورة فقط، وقد تتأخر عن آخر حصة محلية.</p>'+
        (records.length?records.map(x=>`<div class="academic-progress-row"><strong>${esc(x.name||'طالب')}</strong><span>${esc(x.day)} — ${esc(x.attendance==='present'?'حضر':x.attendance==='absent'?'غاب':'بعذر')}</span><small>${esc(x.grade||'دون تقدير')} · أخطاء: ${Math.max(0,Number(x.errors)||0)}</small></div>`).join(''):'<p>لا توجد نتائج منشورة أو ليس لديك تصريح.</p>');
    }catch(_){host.textContent='تعذر تحميل النتائج. تحقق من صلاحية عرض التقدم ومن تفعيل ملف قاعدة البيانات الخاص بهذا الإصدار.';}
  }
  function initialize(){const page=$('pg-academic-exams');if(!page||$('ac1111Bridge'))return;
    const box=g.document.createElement('section');box.id='ac1111Bridge';box.className='card academic-progress-bridge';box.innerHTML='<h3>مزامنة ملخصات الحصص للإدارة</h3><p>اختيارية، وتحتاج تفعيل الخدمة خادميًا. تُرسل تواريخ الحصص والحضور والتقدير وعدد الأخطاء فقط، دون أرقام هواتف أو ملاحظات.</p><button class="btn btn-out" id="ac1111Publish">نشر ملخصاتي للمشرف والمالك</button><p id="ac1111BridgeResult" role="status"></p>';
    page.append(box);$('ac1111Publish').addEventListener('click',publish);
  }
  root.ProgressBridge={makeBatch,safelyPublishable,publish,detail,initialize};
  if(typeof module!=='undefined'&&module.exports)module.exports={safelyPublishable};
  if(g.document){if(g.document.readyState==='loading')g.document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();}
})(typeof globalThis!=='undefined'?globalThis:this);
