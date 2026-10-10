'use strict';
/* We Live Quran v10.10.0 — guardian/student portal renderer, Stage 3.
   Supports: Stage 1 #data= snapshot, Stage 2 #p= live link,
   and Stage 3 #s= phone/PIN authenticated short-lived session. */
(function guardianPortalView(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const SESSION_KEY='wlq_guardian_portal_session_v1';
  const $=id=>document.getElementById(id);
  let liveToken='';
  let sessionToken='';
  let portalMode='snapshot';
  let sessionRows=[];

  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function hashParams(){return new URLSearchParams((location.hash||'').replace(/^#/,''));}
  function uuid(value){const token=String(value||'').trim().toLowerCase();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token)?token:'';}
  function decodePayload(){
    const raw=hashParams().get('data');if(!raw)return null;
    let b64=raw.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
    const binary=atob(b64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const data=JSON.parse(new TextDecoder().decode(bytes));
    return validSnapshot(data)?data:null;
  }
  function tokenFromHash(key){return uuid(hashParams().get(key));}
  function validSnapshot(data){return !!(data&&data.v===1&&data.student&&data.metrics&&data.academy);}
  function pct(v){return Number.isFinite(Number(v))?`${Math.round(Number(v))}%`:'—';}
  function statusClass(s){return s==='حضر'?'present':s==='غاب'?'absent':'vacation';}
  function safeDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
  function formatDateTime(value){const d=safeDate(value);return d?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';}
  function setLiveState(kind,text){const el=$('portalLiveState');if(!el)return;el.hidden=!text;el.className=`portal-live-state ${kind||''}`;el.textContent=text||'';}
  function setModeActions(mode){
    portalMode=mode;
    const refresh=$('portalRefreshBtn'),share=$('portalShareBtn'),logout=$('portalLogoutBtn');
    if(refresh)refresh.hidden=!(mode==='live'||mode==='session');
    if(share)share.hidden=mode==='session';
    if(logout)logout.hidden=mode!=='session';
  }
  function setNote(mode){
    const title=$('portalNoteTitle'),text=$('portalNoteText');setModeActions(mode);
    if(mode==='session'){
      if(title)title.textContent='دخول آمن برقم الهاتف + PIN';
      if(text)text.textContent='هذه جلسة قراءة فقط بعد التحقق من رقم الهاتف ورمز الدخول. لا يمكن تعديل بيانات الطالب، وتنتهي الجلسة تلقائيًا خلال 12 ساعة.';
    }else if(mode==='live'){
      if(title)title.textContent='رابط قراءة فقط قابل للتحديث';
      if(text)text.textContent='يعرض هذا الرابط آخر نسخة نشرها المحفظ. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، ويمكن للمحفظ إيقاف الرابط في أي وقت.';
    }else{
      if(title)title.textContent='نسخة قراءة فقط';
      if(text)text.textContent='هذه لقطة ثابتة من بيانات الطالب وقت إنشاء الرابط. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، وأي شخص يملك الرابط يستطيع الاطلاع على اللقطة.';
    }
  }
  function render(data,meta={}){
    $('portalAcademy').textContent=data.academy?.name||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    $('portalFooterAcademy').textContent=data.academy?.name||'';$('portalTeacher').textContent=data.academy?.teacher||'';
    $('portalPeriod').textContent=data.period||'آخر 30 يومًا';$('portalStudent').textContent=data.student?.name||'طالب';
    const studentMeta=[data.student?.guardian?`ولي الأمر: ${data.student.guardian}`:'',data.student?.group?`الحلقة: ${data.student.group}`:'',data.student?.level?`المستوى: ${data.student.level}`:''].filter(Boolean).join(' · ');
    $('portalMeta').textContent=studentMeta||'متابعة الطالب';
    $('portalUpdated').textContent=formatDateTime(meta.updatedAt||data.generatedAt);
    $('portalUpdatedLabel').textContent=meta.session?'آخر نشر من المحفظ':meta.live?'آخر نشر من المحفظ':'وقت إنشاء اللقطة';
    $('portalMastery').textContent=pct(data.metrics.mastery);$('portalAttendance').textContent=pct(data.metrics.attendance);$('portalNewAyat').textContent=String(Math.max(0,Number(data.metrics.newAyat)||0));$('portalRepeats').textContent=String(Math.max(0,Number(data.metrics.repeats)||0));$('portalTrend').textContent=data.metrics.trend||'—';
    const qp=Number(data.metrics.quranProgress);if(Number.isFinite(qp)){$('portalQuranCard').hidden=false;$('portalQuranProgress').textContent=pct(qp);$('portalQuranBar').style.width=`${Math.max(0,Math.min(100,qp))}%`;}else $('portalQuranCard').hidden=true;
    $('portalAssignmentDate').textContent=data.assignment?.date&&data.assignment.date!=='—'?`من حصة ${data.assignment.date}`:'لا توجد حصة حضور بعد';
    const items=Array.isArray(data.assignment?.items)?data.assignment.items:[];$('portalAssignment').innerHTML=items.length?items.map(x=>`<article class="portal-assignment-item"><b>${esc(x.icon||'')} ${esc(x.label||'')}</b><p>${esc(x.text||'')}</p></article>`).join(''):'<div class="portal-empty">لا يوجد تكليف مسجل حاليًا.</div>';
    const attention=Array.isArray(data.attention)?data.attention:[];$('portalAttention').innerHTML=attention.length?attention.map(x=>`<div class="portal-attention-item"><b>${esc(x.label)}</b><span>${x.score!==null&&x.score!==undefined?`${esc(x.score)}%`:esc(x.grade||'يحتاج متابعة')}</span></div>`).join(''):'<div class="portal-good">✅ لا توجد إشارات حديثة تستدعي التثبيت.</div>';
    const recent=Array.isArray(data.recent)?data.recent:[];$('portalRecent').innerHTML=recent.length?recent.map(x=>`<article class="portal-session ${statusClass(x.status)}"><div class="portal-session-head"><b>${esc(x.status||'—')} · ${esc(x.date||'—')}</b><span class="portal-session-score">${x.score===null||x.score===undefined?'':`${esc(x.score)}%`}</span></div>${Array.isArray(x.recitation)&&x.recitation.length?`<ul>${x.recitation.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</article>`).join(''):'<div class="portal-empty">لا توجد حصص مسجلة بعد.</div>';
    setNote(meta.session?'session':meta.live?'live':'snapshot');
    $('portalContent').hidden=false;$('portalError').hidden=true;
  }
  async function publicRpc(name,args){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(args||{})});
    if(!res.ok)throw new Error(`PORTAL_HTTP_${res.status}`);
    return res.json();
  }
  async function fetchLive(token){const payload=await publicRpc('guardian_portal_read',{p_token:token});return payload&&validSnapshot(payload.snapshot)?payload:null;}
  async function loadLive(token,{manual=false}={}){
    liveToken=token;sessionToken='';sessionRows=[];setNote('live');setStudentSwitcher([]);setLiveState('loading',manual?'جارٍ تحديث البيانات…':'جارٍ تحميل آخر بيانات منشورة…');
    try{
      const payload=await fetchLive(token);
      if(!payload){showError('تم إيقاف هذا الرابط أو لم يعد متاحًا','اطلب من المحفظ إرسال رابط جديد.');return false;}
      render(payload.snapshot,{live:true,updatedAt:payload.updated_at});setLiveState('online','✅ تم تحميل أحدث نسخة منشورة');return true;
    }catch(err){console.warn('[guardian live portal]',err);showError('تعذر تحميل الرابط الحي الآن','هذا النوع من الروابط يحتاج اتصالًا بالإنترنت. اطلب من المحفظ رابط لقطة ثابتة إذا احتجت نسخة تعمل Offline.');return false;}
  }
  function setStudentSwitcher(rows,selected=0){
    const wrap=$('portalStudentSwitcher'),sel=$('portalStudentSelect');if(!wrap||!sel)return;
    const valid=Array.isArray(rows)?rows.filter(x=>validSnapshot(x?.snapshot)):[];
    if(valid.length<=1){wrap.hidden=true;sel.innerHTML='';return;}
    wrap.hidden=false;sel.innerHTML=valid.map((row,i)=>`<option value="${i}" ${i===selected?'selected':''}>${esc(row.snapshot.student?.name||`طالب ${i+1}`)}${row.snapshot.academy?.name?` — ${esc(row.snapshot.academy.name)}`:''}</option>`).join('');
  }
  function selectSessionStudent(value){
    const i=Math.max(0,Math.min(sessionRows.length-1,Number(value)||0)),row=sessionRows[i];if(!row||!validSnapshot(row.snapshot))return;
    render(row.snapshot,{session:true,updatedAt:row.updated_at});setStudentSwitcher(sessionRows,i);setLiveState('online','🔒 جلسة ولي الأمر موثّقة — قراءة فقط');
  }
  async function fetchSession(token){const payload=await publicRpc('guardian_portal_session_read',{p_session:token});return payload&&Array.isArray(payload.students)?payload:null;}
  function rememberSession(token){
    try{sessionStorage.setItem(SESSION_KEY,token);history.replaceState(null,'',`${location.pathname}${location.search}#guardian`);}catch(_){/* fragment remains if storage is unavailable */}
  }
  function storedSession(){try{return uuid(sessionStorage.getItem(SESSION_KEY));}catch(_){return '';}}
  function forgetSession(){try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}sessionToken='';sessionRows=[];}
  async function loadSession(token,{manual=false}={}){
    sessionToken=token;liveToken='';setNote('session');setLiveState('loading',manual?'جارٍ تحديث بيانات الطلاب…':'جارٍ تحميل صفحة الطالب…');
    try{
      const payload=await fetchSession(token);
      const rows=(payload?.students||[]).filter(x=>validSnapshot(x?.snapshot));
      if(!payload||!rows.length){forgetSession();showError('انتهت الجلسة أو لم تعد هناك بيانات متاحة','سجّل الدخول مرة أخرى برقم الهاتف ورمز PIN.',true);return false;}
      sessionRows=rows;rememberSession(token);selectSessionStudent(0);return true;
    }catch(err){console.warn('[guardian session]',err);showError('تعذر تحميل صفحة الطالب الآن','تسجيل الدخول برقم الهاتف يحتاج اتصالًا بالإنترنت. حاول مرة أخرى عند توفر الاتصال.',true);return false;}
  }
  function showError(title='الرابط غير صالح أو غير مكتمل',message='اطلب من المحفظ إنشاء رابط جديد من ملف الطالب داخل التطبيق.',loginAgain=false){
    const e=$('portalError');if(e){e.hidden=false;$('portalErrorTitle').textContent=title;$('portalErrorText').textContent=message;const back=$('portalLoginAgain');if(back)back.hidden=!loginAgain;}
    const c=$('portalContent');if(c)c.hidden=true;setLiveState('','');setStudentSwitcher([]);
  }
  function toast(msg){const t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);}
  async function share(){
    if(portalMode==='session'){toast('جلسة الدخول خاصة ولا يمكن مشاركتها');return;}
    const title=`بوابة متابعة ${$('portalStudent')?.textContent||'الطالب'}`;
    if(navigator.share){try{await navigator.share({title,text:'متابعة الطالب من أكاديمية الإمام',url:location.href});return;}catch(err){if(err?.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(location.href);toast('تم نسخ رابط البوابة');}catch(_){toast('انسخ الرابط من شريط العنوان');}
  }
  async function refresh(){if(portalMode==='session'&&sessionToken)await loadSession(sessionToken,{manual:true});else if(portalMode==='live'&&liveToken)await loadLive(liveToken,{manual:true});else location.reload();}
  async function logout(){
    if(!sessionToken){location.replace('guardian-login.html');return;}
    const token=sessionToken;forgetSession();
    try{await publicRpc('guardian_portal_session_logout',{p_session:token});}catch(err){console.warn('[guardian logout]',err);}
    location.replace('guardian-login.html');
  }
  function printPage(){window.print();}
  g.portalShare=share;g.portalPrint=printPage;g.portalRefresh=refresh;g.portalLogout=logout;g.portalSelectStudent=selectSessionStudent;

  (async()=>{
    try{
      const sToken=tokenFromHash('s');
      if(sToken){rememberSession(sToken);await loadSession(sToken);return;}
      const pToken=tokenFromHash('p');if(pToken){await loadLive(pToken);return;}
      const data=decodePayload();if(data){render(data,{live:false,session:false});setStudentSwitcher([]);return;}
      const remembered=storedSession();if(remembered){await loadSession(remembered);return;}
      showError();
    }catch(err){console.error('[portal init]',err);showError();}
  })();
})(globalThis);
