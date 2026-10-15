'use strict';
/* v11.7.4 — multi-academy foundation status; no tenant switching or legacy data migration. */
(function academyWorkspaces(g){
  const $=id=>g.document?.getElementById?.(id);
  let inFlight=false;
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function status(message){const node=$('academyWorkspaceStatus');if(node)node.textContent=message;}
  function remove(){const node=$('academyWorkspaceFoundation');if(node)node.remove();}
  async function refresh(){
    if(inFlight||!g.WeLiveQuranAuth?.isOwner?.())return;
    const host=$('academyWorkspaceFoundation');if(!host)return;
    if(g.navigator?.onLine===false){status('بيانات الأكاديمية الإدارية تحتاج اتصال إنترنت. التطبيق التعليمي يظل متاحًا أوفلاين.');return;}
    const sb=g.WeLiveQuranAuth?.getClient?.();
    if(!sb){status('جارٍ تهيئة جلسة الدخول. أعد المحاولة بعد اتصال الإنترنت.');return;}
    inFlight=true;status('جارٍ التحقق من عضوية الأكاديمية…');
    try{
      const {data,error}=await sb.rpc('quran_academy_my_workspaces');if(error)throw error;
      if(!g.WeLiveQuranAuth?.isOwner?.()){remove();return;}
      const workspaces=Array.isArray(data?.workspaces)?data.workspaces:[];
      const ownerWorkspaces=workspaces.filter(w=>w.role==='owner');
      if(!ownerWorkspaces.length){status('لم يظهر ربط الأكاديمية بحساب المالك بعد. استكمل خطوة SQL للإصدار 11.7.4 ثم اضغط تحديث.');return;}
      const list=$('academyWorkspaceList');if(list)list.innerHTML=ownerWorkspaces.map(w=>`<div class="academy-workspace-item">
        <strong>${escapeHtml(w.name)}</strong><span>الدور: مالك · الحالة: ${w.status==='pilot'?'مرحلة تأسيس':w.status==='active'?'نشطة':'غير متاحة'}</span>
        <small>اللغة: ${escapeHtml(w.locale)} · التوقيت: ${escapeHtml(w.timezone)}</small>
        <small>${w.legacy_linked?'حساب الأكاديمية القديمة مرتبط مبدئيًا':'لم يتم ربط البيانات القديمة'}</small>
      </div>`).join('');
      // This screen is deliberately read-only: no false claim that legacy student
      // sessions or offline data are already isolated by academy.
      status('تم التحقق من عضوية المالك. فصل بيانات الطلاب والحصص سيتم في مرحلة المزامنة الآمنة القادمة.');
    }catch(_){status('تعذر قراءة مساحات العمل. تأكد من تنفيذ SQL الجديد والجلسة والاتصال بالإنترنت.');}
    finally{inFlight=false;}
  }
  function initialize(){
    if(!g.WeLiveQuranAuth?.isOwner?.()){remove();return;}
    if($('academyWorkspaceFoundation'))return;
    const settings=$('pg-settings');if(!settings)return;
    const element=g.document.createElement('section');element.id='academyWorkspaceFoundation';element.className='academy-workspace-foundation card';element.dir='rtl';
    element.innerHTML='<div class="academy-workspace-head"><div><h3>🌍 مساحة الأكاديمية العالمية</h3><p>التأسيس الأول لنظام الأكاديميات المستقلة — للإدارة فقط</p></div><button type="button" id="academyWorkspaceRefresh">تحديث</button></div><p id="academyWorkspaceStatus" role="status">جارٍ تحميل الحالة…</p><div id="academyWorkspaceList"></div><p class="academy-workspace-note">هذه واجهة تحقق تأسيسية فقط. الطلاب والحصص والبوابة الحالية لم تنتقل بعد إلى بنية الأكاديميات المتعددة، ولا يمكن التبديل بين الأكاديميات الآن.</p>';
    settings.prepend(element);$('academyWorkspaceRefresh')?.addEventListener('click',refresh);void refresh();
  }
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.AcademyTenancy={initialize,refresh};
})(globalThis);
