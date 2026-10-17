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
  const day=s=>String(s.sessionDate||s.date||'').slice(0,10);
  function safelyPublishable(records, roster){
    const allowed=new Set(roster.map(x=>String(x.id)));
    return records.filter(s=>s?.id&&allowed.has(String(s.studentId))&&/^20\d\d-\d\d-\d\d$/.test(day(s))&&day(s)<=new Date().toISOString().slice(0,10)&&['حضر','غاب','إجازة'].includes(s.status));
  }
  async function makeBatch(records,roster,account){
    const refFn=root.GuardianPortal?.studentRef;
    if(typeof refFn!=='function')throw Error('STUDENT_REF_UNAVAILABLE');
    const list=safelyPublishable(records,roster).slice().sort((a,b)=>day(b).localeCompare(day(a))).slice(0,250);
    const refs=new Map();for(const st of roster){refs.set(String(st.id),await refFn(st.id));}
    const output=[];
    for(const s of list){const grade=Object.values(s.prevGrades||{}).find(x=>['ممتاز','جيد جداً','جيد','ضعيف','إعادة'].includes(x))||'';
      const attendance=s.status==='حضر'?'present':s.status==='إجازة'||s.absenceExcused?'excused':'absent';
      output.push({student_ref:refs.get(String(s.studentId)),session_ref:await sha(`${account}|${s.id}`),day:day(s),attendance,grade,error_count:Math.min(5000,s.recitationErrors?.length||0),updated_at:new Date(s.updatedAt||s.date).toISOString()});}
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
      if(error)throw error;if(data?.ok!==true||Number(data.count)!==payload.length)throw Error('UNCONFIRMED');
      if(result)result.textContent=`نجحت مزامنة ${payload.length} ملخص حصة. يعرضها الخادم فقط للمالك أو المشرف المصرح له بالتقدم.`;return true;
    }catch(err){if(result)result.textContent='لم تُؤكد المزامنة. قد تحتاج خدمة الملخصات إلى تفعيل من الإدارة. البيانات المحلية لم تتغير.';return false;}
  }
  async function detail(teacherId,row){
    if(!client()||!g.WeLiveQuranAuth?.isActive?.()||g.navigator?.onLine===false)return;
    let host=row?.querySelector?.('.academic-progress-remote');if(!host){host=g.document.createElement('div');host.className='academic-progress-remote';row.append(host);}host.textContent='جارٍ قراءة النتائج المصرح بها…';
    try{const {data,error}=await client().rpc('app_supervision_progress_recent',{p_teacher_id:teacherId});if(error)throw error;
      host.innerHTML='<b>نتائج التسميع المنشورة من حساب المحفظ</b><p>بيانات منشورة فقط، وقد تتأخر عن آخر حصة محلية.</p>'+(Array.isArray(data?.records)?data.records:[]).map(x=>`<div class="academic-progress-row"><strong>${esc(x.name||'طالب')}</strong><span>${esc(x.day)} — ${esc(x.attendance==='present'?'حضر':x.attendance==='absent'?'غاب':'بعذر')}</span><small>${esc(x.grade||'دون تقدير')} · أخطاء: ${Math.max(0,Number(x.errors)||0)}</small></div>`).join('')||'<p>لا توجد نتائج منشورة أو ليس لديك تصريح.</p>';
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
