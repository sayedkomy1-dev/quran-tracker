'use strict';
/* We Live Quran v10.10.0 — guardian/student portal renderer, Stage 2.
   Supports both Stage 1 #data= snapshots and Stage 2 #p= stable live links. */
(function guardianPortalView(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const $=id=>document.getElementById(id);
  let liveToken='';
  let liveMode=false;

  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function hashParams(){return new URLSearchParams((location.hash||'').replace(/^#/,''));}
  function decodePayload(){
    const raw=hashParams().get('data');if(!raw)return null;
    let b64=raw.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
    const binary=atob(b64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(!validSnapshot(data))return null;
    return data;
  }
  function tokenFromHash(){
    const token=String(hashParams().get('p')||'').trim().toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token)?token:'';
  }
  function validSnapshot(data){return !!(data&&data.v===1&&data.student&&data.metrics&&data.academy);}
  function pct(v){return Number.isFinite(Number(v))?`${Math.round(Number(v))}%`:'—';}
  function statusClass(s){return s==='حضر'?'present':s==='غاب'?'absent':'vacation';}
  function safeDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
  function formatDateTime(value){const d=safeDate(value);return d?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';}
  function setLiveState(kind,text){
    const el=$('portalLiveState');if(!el)return;
    el.hidden=!text;el.className=`portal-live-state ${kind||''}`;el.textContent=text||'';
  }
  function setNote(mode){
    const title=$('portalNoteTitle'),text=$('portalNoteText'),refresh=$('portalRefreshBtn');
    if(mode==='live'){
      if(title)title.textContent='رابط قراءة فقط قابل للتحديث';
      if(text)text.textContent='يعرض هذا الرابط آخر نسخة نشرها المحفظ. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، ويمكن للمحفظ إيقاف الرابط في أي وقت.';
      if(refresh)refresh.hidden=false;
    }else{
      if(title)title.textContent='نسخة قراءة فقط';
      if(text)text.textContent='هذه لقطة ثابتة من بيانات الطالب وقت إنشاء الرابط. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، وأي شخص يملك الرابط يستطيع الاطلاع على اللقطة.';
      if(refresh)refresh.hidden=true;
    }
  }
  function render(data,meta={}){
    $('portalAcademy').textContent=data.academy?.name||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    $('portalFooterAcademy').textContent=data.academy?.name||'';$('portalTeacher').textContent=data.academy?.teacher||'';
    $('portalPeriod').textContent=data.period||'آخر 30 يومًا';$('portalStudent').textContent=data.student?.name||'طالب';
    const studentMeta=[data.student?.guardian?`ولي الأمر: ${data.student.guardian}`:'',data.student?.group?`الحلقة: ${data.student.group}`:'',data.student?.level?`المستوى: ${data.student.level}`:''].filter(Boolean).join(' · ');
    $('portalMeta').textContent=studentMeta||'متابعة الطالب';
    $('portalUpdated').textContent=formatDateTime(meta.updatedAt||data.generatedAt);
    $('portalUpdatedLabel').textContent=meta.live?'آخر نشر من المحفظ':'وقت إنشاء اللقطة';
    $('portalMastery').textContent=pct(data.metrics.mastery);$('portalAttendance').textContent=pct(data.metrics.attendance);$('portalNewAyat').textContent=String(Math.max(0,Number(data.metrics.newAyat)||0));$('portalRepeats').textContent=String(Math.max(0,Number(data.metrics.repeats)||0));$('portalTrend').textContent=data.metrics.trend||'—';
    const qp=Number(data.metrics.quranProgress);if(Number.isFinite(qp)){$('portalQuranCard').hidden=false;$('portalQuranProgress').textContent=pct(qp);$('portalQuranBar').style.width=`${Math.max(0,Math.min(100,qp))}%`;}else $('portalQuranCard').hidden=true;
    $('portalAssignmentDate').textContent=data.assignment?.date&&data.assignment.date!=='—'?`من حصة ${data.assignment.date}`:'لا توجد حصة حضور بعد';
    const items=Array.isArray(data.assignment?.items)?data.assignment.items:[];$('portalAssignment').innerHTML=items.length?items.map(x=>`<article class="portal-assignment-item"><b>${esc(x.icon||'')} ${esc(x.label||'')}</b><p>${esc(x.text||'')}</p></article>`).join(''):'<div class="portal-empty">لا يوجد تكليف مسجل حاليًا.</div>';
    const attention=Array.isArray(data.attention)?data.attention:[];$('portalAttention').innerHTML=attention.length?attention.map(x=>`<div class="portal-attention-item"><b>${esc(x.label)}</b><span>${x.score!==null&&x.score!==undefined?`${esc(x.score)}%`:esc(x.grade||'يحتاج متابعة')}</span></div>`).join(''):'<div class="portal-good">✅ لا توجد إشارات حديثة تستدعي التثبيت.</div>';
    const recent=Array.isArray(data.recent)?data.recent:[];$('portalRecent').innerHTML=recent.length?recent.map(x=>`<article class="portal-session ${statusClass(x.status)}"><div class="portal-session-head"><b>${esc(x.status||'—')} · ${esc(x.date||'—')}</b><span class="portal-session-score">${x.score===null||x.score===undefined?'':`${esc(x.score)}%`}</span></div>${Array.isArray(x.recitation)&&x.recitation.length?`<ul>${x.recitation.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</article>`).join(''):'<div class="portal-empty">لا توجد حصص مسجلة بعد.</div>';
    setNote(meta.live?'live':'snapshot');
    $('portalContent').hidden=false;$('portalError').hidden=true;
  }
  async function fetchLive(token){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/guardian_portal_read`,{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify({p_token:token})
    });
    if(!res.ok)throw new Error(`PORTAL_HTTP_${res.status}`);
    const payload=await res.json();
    if(!payload||!validSnapshot(payload.snapshot))return null;
    return payload;
  }
  async function loadLive(token,{manual=false}={}){
    liveMode=true;liveToken=token;setNote('live');setLiveState('loading',manual?'جارٍ تحديث البيانات…':'جارٍ تحميل آخر بيانات منشورة…');
    try{
      const payload=await fetchLive(token);
      if(!payload){showError('تم إيقاف هذا الرابط أو لم يعد متاحًا','اطلب من المحفظ إرسال رابط جديد.');return false;}
      render(payload.snapshot,{live:true,updatedAt:payload.updated_at});setLiveState('online','✅ تم تحميل أحدث نسخة منشورة');return true;
    }catch(err){
      console.warn('[guardian live portal]',err);
      showError('تعذر تحميل الرابط الحي الآن','هذا النوع من الروابط يحتاج اتصالًا بالإنترنت. اطلب من المحفظ رابط لقطة ثابتة إذا احتجت نسخة تعمل Offline.');return false;
    }
  }
  function showError(title='الرابط غير صالح أو غير مكتمل',message='اطلب من المحفظ إنشاء رابط جديد من ملف الطالب داخل التطبيق.'){
    const e=$('portalError');if(e){e.hidden=false;$('portalErrorTitle').textContent=title;$('portalErrorText').textContent=message;}
    const c=$('portalContent');if(c)c.hidden=true;setLiveState('','');
  }
  function toast(msg){const t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);}
  async function share(){
    const title=`بوابة متابعة ${$('portalStudent')?.textContent||'الطالب'}`;
    if(navigator.share){try{await navigator.share({title,text:'متابعة الطالب من أكاديمية الإمام',url:location.href});return;}catch(err){if(err?.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(location.href);toast('تم نسخ رابط البوابة');}catch(_){toast('انسخ الرابط من شريط العنوان');}
  }
  async function refresh(){if(liveMode&&liveToken)await loadLive(liveToken,{manual:true});else location.reload();}
  function printPage(){window.print();}
  g.portalShare=share;g.portalPrint=printPage;g.portalRefresh=refresh;

  (async()=>{
    try{
      const token=tokenFromHash();
      if(token){await loadLive(token);return;}
      const data=decodePayload();if(data){liveMode=false;render(data,{live:false});return;}
      showError();
    }catch(err){console.error('[portal init]',err);showError();}
  })();
})(globalThis);
