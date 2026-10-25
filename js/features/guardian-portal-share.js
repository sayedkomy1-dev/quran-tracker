'use strict';
/* We Live Quran v11.2.0 — Guardian & Student Portal + structured Tahfeez assignment.
   Stage 1 snapshot links and Stage 2 stable live links remain available.
   Stage 3 adds guardian login by the student's registered phone + secure 6-digit PIN.
   Stage 3.3 adds teacher-visible forgot-PIN requests and clearer credential actions.
   Stage 3.5 automatically links active siblings that share the same registered guardian phone.
   Local data Schema remains 12; credentials/sessions live only in dedicated backend tables. */
(function guardianPortalShareFeature(g){
  const VERSION=1;
  const LIVE_RPC={publish:'guardian_portal_publish',status:'guardian_portal_status',revoke:'guardian_portal_revoke'};
  const ACCESS_RPC={status:'guardian_portal_access_status',enable:'guardian_portal_access_enable',reset:'guardian_portal_access_reset_pin',unlink:'guardian_portal_access_unlink',refresh:'guardian_portal_access_refresh',resetList:'guardian_portal_reset_requests_list',resetResolve:'guardian_portal_reset_request_resolve',resetDismiss:'guardian_portal_reset_request_dismiss',engagement:'guardian_portal_activity_summary'};
  let lastGuardianSecret=null;
  let pendingResetRequests=[];
  let guardianOpenedFromMore=false;
  let guardianReturnFocus=null;
  let guardianLastScroll=0;

  function appState(){return g.ImamApp?.State||{};}
  function stateStudents(){const v=appState().students??g.students;return Array.isArray(v)?v:[];}
  function stateSessions(){const v=appState().sessions??g.sessions;return Array.isArray(v)?v:[];}
  function stateSettings(){const v=appState().settings??g.settings;return v&&typeof v==='object'?v:{};}
  function currentStudentId(){return String(appState().curStId??g.curStId??'').trim();}

  function esc(v){
    if(g.ImamApp?.Utils?.escapeHtml)return g.ImamApp.Utils.escapeHtml(v??'');
    return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function dateValue(row){
    const n=Date.parse(row?.date||row?.sessionDate||row?.createdAt||'');
    return Number.isFinite(n)?n:0;
  }
  function dateLabel(row){
    const n=dateValue(row);if(!n)return '—';
    return new Date(n).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'});
  }
  function score(v){
    if(v===null||v===undefined||v==='')return null;
    const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
  }
  function sessionAverage(ses){
    const vals=[];
    const scores=ses?.assessmentScores||{};
    for(const k of ['new','rec','far','juz','surahReview']){const n=score(scores[k]);if(n!==null)vals.push(n);}
    for(const group of Array.isArray(ses?.reviewResults)?ses.reviewResults:[]){
      for(const item of Array.isArray(group?.items)?group.items:[]){const n=score(item?.score);if(n!==null)vals.push(n);}
    }
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  function sectionText(sec){
    if(!sec)return '';
    const surah=String(sec.surah||sec.surahName||'').trim();if(!surah)return '';
    if(sec.full)return `سورة ${surah} كاملة`;
    const from=Math.max(1,Number(sec.from)||1),to=Math.max(from,Number(sec.to)||from);
    return `سورة ${surah} — الآيات ${from}–${to}`;
  }
  function actualText(ses){
    const rows=[],actual=ses?.actualRecitation||{};
    for(const [key,label] of [['new','الحفظ'],['rec','المراجعة القريبة'],['far','المراجعة البعيدة']]){
      const t=sectionText(actual[key]);if(t)rows.push(`${label}: ${t}`);
    }
    return rows.slice(0,3);
  }
  function assignmentItems(ses){
    if(!ses)return [];
    const out=[];
    for(const [key,icon,label] of [['new','📖','الحفظ الجديد'],['rec','📚','المراجعة القريبة'],['far','📘','المراجعة البعيدة']]){
      const text=sectionText(ses[key]);if(text)out.push({icon,label,text});
    }
    const juz=[...(ses?.juz?.chips||[])].map(String).filter(Boolean);
    const surah=[...(ses?.surahReview?.chips||[])].map(String).filter(Boolean);
    if(juz.length)out.push({icon:'📜',label:'مراجعة الأجزاء',text:juz.join('، ')});
    if(surah.length)out.push({icon:'🕌',label:'مراجعة السور',text:surah.join('، ')});
    const carry=(ses?.carryForward?.items||[]).map(x=>String(x?.label||x?.surahName||'').trim()).filter(Boolean);
    if(carry.length)out.push({icon:'🔄',label:'إعادة وتثبيت',text:carry.join('، ')});
    return out.slice(0,8);
  }
  function portalCorrections(ses,limit=12){
    const rows=Array.isArray(ses?.recitationErrors)?ses.recitationErrors:[];
    return rows.filter(x=>x?.source==='quran-word'&&x?.word).slice(0,limit).map(x=>({
      surah:String(x.surah||'').slice(0,80),
      ayah:Math.max(1,Number(x.ayah)||1),
      word:String(x.word||'').slice(0,80),
      char:x.targetLevel==='char'?String(x.charText||'').slice(0,20):'',
      charIndex:x.targetLevel==='char'?Math.max(0,Number(x.charIndex)||0):-1,
      wordIndex:Math.max(0,Number(x.wordIndex)||0),
      ayahText:String(x.ayahText||'').slice(0,1200),
      group:['pronunciation','memory','tajweed','custom'].includes(x.group)?x.group:'',
      type:String(x.type||'').slice(0,60),
      resolved:!!x.resolved,
      mode:['new_read','talaqqin','recitation','review'].includes(x.mode)?x.mode:'recitation'
    }));
  }
  function recentSessions(studentId,limit=8){
    return stateSessions().filter(x=>x.studentId===studentId).slice().sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,limit).map(ses=>({
      date:dateLabel(ses),
      status:String(ses.status||'—'),
      score:ses.status==='حضر'?sessionAverage(ses):null,
      recitation:ses.status==='حضر'?actualText(ses):[],
      corrections:ses.status==='حضر'?portalCorrections(ses):[]
    }));
  }
  function fallbackProgress(studentId){
    const cutoff=Date.now()-29*86400000;
    const rows=stateSessions().filter(x=>x.studentId===studentId&&dateValue(x)>=cutoff);
    const present=rows.filter(x=>x.status==='حضر'),absent=rows.filter(x=>x.status==='غاب');
    const vals=present.map(sessionAverage).filter(Number.isFinite);
    const mastery=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    const eligible=present.length+absent.length;
    return {mastery,attendance:eligible?Math.round(present.length/eligible*100):null,repeats:0,newAyat:0,attention:[],trend:{label:'—'}};
  }
  function buildSnapshot(studentId){
    const st=stateStudents().find(x=>x.id===studentId);if(!st)throw new Error('STUDENT_NOT_FOUND');
    // Never generate or refresh an access snapshot for a paused/archived student.
    if(st.studentStatus&&st.studentStatus!=='active')throw new Error('STUDENT_NOT_ACTIVE');
    const rows=stateSessions().filter(x=>x.studentId===studentId&&x.status==='حضر').slice().sort((a,b)=>dateValue(b)-dateValue(a));
    const latest=rows.find(s=>assignmentItems(s).length)||rows[0]||null;
    let progress=null;
    try{progress=g.ImamApp?.StudentProgress?.calculate?.(studentId,30)||null;}catch(_){progress=null;}
    progress=progress||fallbackProgress(studentId);
    let quranProgress=null;
    try{if(typeof g.getQuranProgressPercent==='function')quranProgress=score(g.getQuranProgressPercent(studentId));}catch(_){quranProgress=null;}
    const attention=(progress.attention||[]).slice(0,4).map(x=>({label:String(x?.label||''),score:score(x?.score),grade:String(x?.grade||'')})).filter(x=>x.label);
    return {
      v:VERSION,
      generatedAt:new Date().toISOString(),
      academy:{name:String(stateSettings().circle||'أكاديمية الإمام لتحفيظ القرآن الكريم'),teacher:String(stateSettings().name||'')},
      student:{name:String(st.name||'طالب'),guardian:String(st.parent||''),group:String(st.group||''),level:String(st.level||'')},
      period:'آخر 30 يومًا',
      metrics:{mastery:score(progress.mastery),attendance:score(progress.attendance),repeats:Math.max(0,Number(progress.repeats)||0),newAyat:Math.max(0,Number(progress.newAyat)||0),quranProgress,trend:String(progress.trend?.label||'—')},
      assignment:{date:latest?dateLabel(latest):'—',items:assignmentItems(latest)},
      learning:{
        newAssignment:latest?.new?.surah?{surah:String(latest.new.surah),from:Math.max(1,Number(latest.new.from)||1),to:Math.max(1,Number(latest.new.to)||Number(latest.new.from)||1),full:!!latest.new.full}:null,
        assignmentDate:latest?dateLabel(latest):'—'
      },
      smartRevision:(()=>{try{return g.ImamApp?.SmartRevision?.buildGuardian?.(studentId)||null;}catch(_){return null;}})(),
      memorizationPlan:(()=>{try{return g.ImamApp?.GoalPlanner?.buildGuardian?.(studentId)||null;}catch(_){return null;}})(),
      attention,
      recent:recentSessions(studentId,8)
    };
  }
  function encodeSnapshot(data){
    const json=JSON.stringify(data),bytes=new TextEncoder().encode(json);
    let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function portalUrl(studentId){
    const url=new URL('guardian-portal.html',g.location?.href||'http://localhost/index.html');
    url.hash='data='+encodeSnapshot(buildSnapshot(studentId));
    return url.toString();
  }
  function liveUrl(token){
    const url=new URL('guardian-portal.html',g.location?.href||'http://localhost/index.html');
    url.hash='p='+String(token||'').trim();
    return url.toString();
  }
  function guardianLoginUrl(){
    return new URL('guardian-login.html',g.location?.href||'http://localhost/index.html').toString();
  }
  function asciiDigits(value){return String(value||'').replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-0x0660)).replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-0x06F0));}
  function studentById(studentId){return stateStudents().find(x=>x.id===studentId)||null;}
  function normalizeEgyptPhone(value){
    let p=asciiDigits(value).replace(/[^0-9]/g,'');
    if(p.startsWith('0020'))p=p.slice(2);
    if(/^01(0|1|2|5)\d{8}$/.test(p))p='20'+p.slice(1);
    return p;
  }
  function studentPhone(studentId){return normalizeEgyptPhone(studentById(studentId)?.phone||'');}
  function phoneDisplay(value){
    const p=normalizeEgyptPhone(value);
    if(/^20(10|11|12|15)\d{8}$/.test(p))return '0'+p.slice(2);
    return p;
  }
  function validEgyptPhone(value){return /^20(10|11|12|15)[0-9]{8}$/.test(normalizeEgyptPhone(value));}
  function familyStudentsForPhone(value){
    const key=normalizeEgyptPhone(value);
    if(!validEgyptPhone(key))return [];
    return activeStudents().filter(st=>normalizeEgyptPhone(st?.phone||'')===key);
  }
  function generatePin(){
    if(!g.crypto?.getRandomValues)throw new Error('CRYPTO_UNAVAILABLE');
    const max=Math.floor(0x100000000/1000000)*1000000,buf=new Uint32Array(1);let n;
    do{g.crypto.getRandomValues(buf);n=buf[0];}while(n>=max);
    return String(n%1000000).padStart(6,'0');
  }
  function toastSafe(msg,type='info'){try{if(typeof g.toast==='function')g.toast(msg,type);}catch(_){} }
  function activeStudents(){return stateStudents().filter(st=>!st.studentStatus||st.studentStatus==='active');}
  function liveClient(){return g.WeLiveQuranAuth?.getClient?.()||null;}
  function currentOwnerId(){return String(g.WeLiveQuranAuth?.getAccess?.()?.user_id||'').trim();}
  function liveAvailable(){return !!(g.navigator?.onLine!==false&&g.WeLiveQuranAuth?.isActive?.()&&liveClient()&&currentOwnerId());}
  function isBackendMissing(err){return /guardian_portal_|schema cache|PGRST|42883|42P01|404/i.test(String(err?.message||err||''));}
  async function sha256Hex(text){
    if(!g.crypto?.subtle)throw new Error('CRYPTO_UNAVAILABLE');
    const bytes=new TextEncoder().encode(String(text));
    const digest=await g.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function studentRef(studentId){
    const owner=currentOwnerId();if(!owner)throw new Error('AUTH_REQUIRED');
    return sha256Hex(`guardian-portal-v1|${owner}|${String(studentId)}`);
  }
  async function rpc(name,args){
    const sb=liveClient();if(!sb)throw new Error('SUPABASE_UNAVAILABLE');
    const {data,error}=await sb.rpc(name,args||{});if(error)throw error;return data;
  }
  function parsePublishResult(data){
    const x=Array.isArray(data)?data[0]:data;
    if(!x||x.ok===false||!x.token)throw new Error('PORTAL_PUBLISH_FAILED');
    return x;
  }
  async function publishLive(studentId){
    if(!studentId)throw new Error('STUDENT_REQUIRED');
    if(!liveAvailable())throw new Error('LIVE_OFFLINE');
    const ref=await studentRef(studentId),snapshot=buildSnapshot(studentId);
    const result=parsePublishResult(await rpc(LIVE_RPC.publish,{p_student_ref:ref,p_snapshot:snapshot}));
    return {url:liveUrl(result.token),token:String(result.token),updatedAt:result.updated_at||snapshot.generatedAt,created:!!result.created,rotated:!!result.rotated};
  }
  async function liveStatus(studentId){
    if(!studentId||!liveAvailable())return {available:false,exists:false};
    try{
      const ref=await studentRef(studentId);const data=await rpc(LIVE_RPC.status,{p_student_ref:ref});const x=Array.isArray(data)?data[0]:data;
      if(!x||x.exists===false)return {available:true,exists:false};
      return {available:true,exists:true,active:x.active!==false,token:x.token||'',updatedAt:x.updated_at||'',url:x.token?liveUrl(x.token):''};
    }catch(err){return {available:false,exists:false,error:err};}
  }
  async function revokeLive(studentId){
    if(!studentId)throw new Error('STUDENT_REQUIRED');
    if(!liveAvailable())throw new Error('LIVE_OFFLINE');
    const ref=await studentRef(studentId);const data=await rpc(LIVE_RPC.revoke,{p_student_ref:ref});
    const x=Array.isArray(data)?data[0]:data;return !!(x===true||x?.ok||x?.revoked);
  }

  // Deleting, pausing or archiving a student must not leave authenticated access or
  // a revocable direct link alive. No student/session data is changed here.
  // Fail closed: a missing backend, session, or network is not a safe revocation.
  async function revokeForStudentDeletion(studentId){
    if(!studentId)throw new Error('STUDENT_REQUIRED');
    if(!liveAvailable())throw new Error('GUARDIAN_REVOCATION_OFFLINE');
    const [beforeLink,beforePhone]=await Promise.all([liveStatus(studentId),accessStatus(studentId)]);
    if(!beforeLink.available||!beforePhone.available)throw new Error('GUARDIAN_REVOCATION_STATUS_UNAVAILABLE');
    if(beforeLink.exists&&beforeLink.active){
      await revokeLive(studentId);
    }
    if(beforePhone.linked){
      const ref=await studentRef(studentId);
      const data=await rpc(ACCESS_RPC.unlink,{p_student_ref:ref});
      const result=Array.isArray(data)?data[0]:data;
      if(!result?.ok||!result?.unlinked)throw new Error('GUARDIAN_UNLINK_FAILED');
    }
    // Verify both paths are now inaccessible before the caller removes data.
    const [afterLink,afterPhone]=await Promise.all([liveStatus(studentId),accessStatus(studentId)]);
    if(!afterLink.available||!afterPhone.available||
       (afterLink.exists&&afterLink.active)||afterPhone.linked){
      throw new Error('GUARDIAN_REVOCATION_NOT_CONFIRMED');
    }
    return {ok:true,hadLiveLink:!!(beforeLink.exists&&beforeLink.active),hadPhoneAccess:!!beforePhone.linked};
  }
  async function accessStatus(studentId){
    if(!studentId||!liveAvailable())return {available:false,linked:false};
    try{
      const ref=await studentRef(studentId),data=await rpc(ACCESS_RPC.status,{p_student_ref:ref}),x=Array.isArray(data)?data[0]:data;
      if(!x||x.linked===false)return {available:true,linked:false};
      return {available:true,linked:true,active:x.active!==false,phoneLast4:String(x.phone_last4||''),studentCount:Math.max(0,Number(x.student_count)||0),updatedAt:x.updated_at||''};
    }catch(err){return {available:false,linked:false,error:err};}
  }
  function rememberGuardianSecret(studentId,phone,pin,studentIds=[studentId]){lastGuardianSecret={studentId:String(studentId),studentIds:[...new Set((studentIds||[]).map(String).filter(Boolean))],phone:phoneDisplay(phone),pin:String(pin),loginUrl:guardianLoginUrl()};renderGuardianSecret();}
  function clearGuardianSecret(){lastGuardianSecret=null;renderGuardianSecret();}
  function guardianCredentialsMessage(secret=lastGuardianSecret){
    const st=secret?studentById(secret.studentId):null;if(!secret||!st)return '';
    const academy=stateSettings().circle||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    const names=(secret.studentIds||[secret.studentId]).map(studentById).filter(Boolean).map(x=>x.name).filter(Boolean);
    const subject=names.length>1?`الطلاب: ${names.join('، ')}`:`الطالب: ${st.name||''}`;
    return `السلام عليكم ورحمة الله وبركاته 🌿\n\nبيانات دخول بوابة متابعة ${subject}\n🏫 ${academy}\n🌐 رابط الدخول: ${secret.loginUrl}\n📱 رقم الهاتف: ${secret.phone}\n🔐 رمز الدخول PIN: ${secret.pin}\n\nالرجاء الاحتفاظ بالرمز وعدم مشاركته إلا مع ولي الأمر المخوّل بمتابعة الطالب.`;
  }
  async function enablePhoneAccess(studentId,{resetPin=false}={}){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    if(!liveAvailable()){toastSafe('تفعيل دخول ولي الأمر يحتاج اتصالًا بالإنترنت وحسابًا نشطًا','error');return false;}
    const phone=studentPhone(studentId);
    if(!validEgyptPhone(phone)){toastSafe('رقم واتساب الطالب غير صالح. عدّله في ملف الطالب أولًا.','error');return false;}
    const pin=generatePin();
    const family=familyStudentsForPhone(phone);
    const ordered=[studentById(studentId),...family.filter(st=>st.id!==studentId)].filter(Boolean);
    try{
      setPickerBusy(true,resetPin?'جارٍ إعادة تعيين رمز الدخول…':ordered.length>1?`جارٍ ربط ${ordered.length} طلاب بنفس رقم ولي الأمر…`:'جارٍ تفعيل دخول ولي الأمر…');
      let selectedResult=null,anyPinChanged=false,accountCreated=false,linkedCount=0;
      for(let i=0;i<ordered.length;i++){
        const st=ordered[i],ref=await studentRef(st.id),snapshot=buildSnapshot(st.id);
        const data=await rpc(ACCESS_RPC.enable,{p_student_ref:ref,p_phone:phone,p_pin:pin,p_snapshot:snapshot,p_reset_pin:!!resetPin&&i===0});
        const x=Array.isArray(data)?data[0]:data;if(!x?.ok)throw new Error(`ACCESS_ENABLE_FAILED:${st.id}`);
        if(st.id===studentId)selectedResult=x;
        anyPinChanged=anyPinChanged||!!x.pin_changed;accountCreated=accountCreated||!!x.account_created;linkedCount++;
      }
      if(anyPinChanged)rememberGuardianSecret(studentId,phone,pin,ordered.map(st=>st.id));else clearGuardianSecret();
      if(ordered.length>1){
        toastSafe(anyPinChanged?`تم ربط ${linkedCount} طلاب بنفس رقم ولي الأمر وإنشاء PIN موحّد`:`تم ربط ${linkedCount} طلاب بنفس حساب ولي الأمر — يستخدمون نفس PIN الحالي`,'success');
      }else{
        toastSafe(anyPinChanged?(accountCreated?'تم إنشاء رمز دخول جديد — انسخه أو أرسله الآن':'تم تحديث الربط وإنشاء PIN جديد'):'تم ربط الطالب بحساب ولي الأمر الحالي — يستخدم نفس PIN الموجود لديه','success');
      }
      await Promise.all([refreshPhoneAccessStatus(studentId),refreshPickerStatus(studentId)]);
      return {...(selectedResult||{}),familyLinked:linkedCount};
    }catch(err){console.error('[guardian access enable]',err);toastSafe(isBackendMissing(err)?'شغّل sql/guardian-portal-login.sql في Supabase أولًا':'تعذر تفعيل دخول ولي الأمر لكل الطلاب المرتبطين بهذا الرقم — أعد المحاولة','error');return false;}
    finally{setPickerBusy(false);}
  }
  async function resetPhonePin(studentId){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    if(!liveAvailable()){toastSafe('إعادة تعيين PIN تحتاج اتصالًا بالإنترنت','error');return false;}
    const pin=generatePin(),phone=studentPhone(studentId);
    try{
      setPickerBusy(true,'جارٍ إنشاء PIN جديد…');const ref=await studentRef(studentId);
      const data=await rpc(ACCESS_RPC.reset,{p_student_ref:ref,p_pin:pin}),x=Array.isArray(data)?data[0]:data;if(!x?.ok)throw new Error('PIN_RESET_FAILED');
      rememberGuardianSecret(studentId,phone,pin);toastSafe('تم إنشاء PIN جديد وإلغاء جلسات الدخول القديمة','success');await Promise.all([refreshPhoneAccessStatus(studentId),refreshResetRequests()]);return x;
    }catch(err){console.error('[guardian pin reset]',err);toastSafe(isBackendMissing(err)?'شغّل sql/guardian-portal-login.sql في Supabase أولًا':'تعذر إعادة تعيين PIN — فعّل الدخول للطالب أولًا','error');return false;}
    finally{setPickerBusy(false);}
  }
  async function unlinkPhoneAccess(studentId){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    const st=studentById(studentId);if(typeof g.confirm==='function'&&!g.confirm(`سيتم إيقاف الدخول برقم الهاتف لهذا الطالب (${st?.name||'الطالب'}).\nلن تُحذف أي بيانات أو حصص. هل تريد المتابعة؟`))return false;
    try{
      setPickerBusy(true,'جارٍ إيقاف دخول الهاتف…');const ref=await studentRef(studentId),data=await rpc(ACCESS_RPC.unlink,{p_student_ref:ref}),x=Array.isArray(data)?data[0]:data;
      clearGuardianSecret();toastSafe(x?.unlinked?'تم إيقاف دخول الهاتف لهذا الطالب':'دخول الهاتف غير مفعّل لهذا الطالب',x?.unlinked?'success':'info');await Promise.all([refreshPhoneAccessStatus(studentId),refreshResetRequests()]);return !!x?.unlinked;
    }catch(err){console.error('[guardian access unlink]',err);toastSafe(isBackendMissing(err)?'شغّل sql/guardian-portal-login.sql في Supabase أولًا':'تعذر إيقاف دخول الهاتف','error');return false;}
    finally{setPickerBusy(false);}
  }
  async function refreshPhoneSnapshot(studentId){
    if(!studentId||!liveAvailable())return false;
    try{
      const ref=await studentRef(studentId),snapshot=buildSnapshot(studentId),data=await rpc(ACCESS_RPC.refresh,{p_student_ref:ref,p_snapshot:snapshot});
      const x=Array.isArray(data)?data[0]:data;return !!x?.refreshed;
    }catch(err){
      if(!isBackendMissing(err))console.warn('[guardian access auto refresh]',err);
      return false;
    }
  }
  async function copyText(text){
    if(g.navigator?.clipboard?.writeText){await g.navigator.clipboard.writeText(text);return;}
    const ta=g.document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';g.document.body.appendChild(ta);ta.select();g.document.execCommand?.('copy');ta.remove();
  }
  function openPlaceholder(){
    try{const w=g.open?.('about:blank','_blank');if(w)try{w.opener=null;}catch(_){}return w||null;}catch(_){return null;}
  }
  function navigatePopup(win,url){
    if(win){try{win.location.replace(url);return true;}catch(_){try{win.location.href=url;return true;}catch(__){}}}
    try{g.open?.(url,'_blank','noopener');return true;}catch(_){return false;}
  }
  async function preferredUrl(studentId,{silentFallback=false}={}){
    try{
      const live=await publishLive(studentId);return {...live,mode:'live'};
    }catch(err){
      if(!silentFallback){
        if(isBackendMissing(err))toastSafe('البوابة الحية تحتاج تشغيل ملف SQL الخاص بـ Stage 2 — تم استخدام لقطة ثابتة بدلًا منها','info');
        else if(String(err?.message||'')==='LIVE_OFFLINE')toastSafe('لا يوجد اتصال لتحديث الرابط الحي — تم استخدام لقطة ثابتة','info');
        else console.warn('[guardian live portal] fallback to snapshot',err);
      }
      return {url:portalUrl(studentId),mode:'snapshot',error:err};
    }
  }
  async function openPortal(studentId=currentStudentId()){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return null;}
    const popup=openPlaceholder();
    try{
      setPickerBusy(true,'جارٍ تجهيز رابط البوابة…');
      const result=await preferredUrl(studentId);
      navigatePopup(popup,result.url);
      toastSafe(result.mode==='live'?'تم تحديث الرابط الحي وفتح البوابة':'تم فتح لقطة البوابة','success');
      refreshPickerStatus(studentId);return result.url;
    }catch(err){console.error('[guardian portal]',err);try{popup?.close?.();}catch(_){}toastSafe('تعذر إنشاء بوابة الطالب','error');return null;}
    finally{setPickerBusy(false);}
  }
  async function copyPortalLink(studentId=currentStudentId()){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    try{
      setPickerBusy(true,'جارٍ تحديث رابط البوابة…');
      const result=await preferredUrl(studentId);await copyText(result.url);
      toastSafe(result.mode==='live'?'تم تحديث ونسخ الرابط الحي':'تم نسخ رابط لقطة ثابتة','success');refreshPickerStatus(studentId);return true;
    }catch(err){console.error('[guardian portal copy]',err);toastSafe('تعذر نسخ الرابط','error');return false;}
    finally{setPickerBusy(false);}
  }
  async function copySnapshotLink(studentId=currentStudentId()){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    try{await copyText(portalUrl(studentId));toastSafe('تم نسخ رابط لقطة ثابتة لا يحتاج قاعدة البيانات','success');return true;}catch(err){console.error(err);toastSafe('تعذر نسخ اللقطة','error');return false;}
  }
  async function refreshLivePortal(studentId=currentStudentId()){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    try{
      setPickerBusy(true,'جارٍ نشر أحدث بيانات الطالب…');const out=await publishLive(studentId);
      toastSafe(out.rotated?'تم إنشاء رابط حي جديد بعد إيقاف الرابط السابق':'تم تحديث بيانات الرابط الحي','success');await refreshPickerStatus(studentId);return out;
    }catch(err){
      console.error('[guardian portal refresh]',err);
      toastSafe(isBackendMissing(err)?'شغّل sql/guardian-portal-live.sql في Supabase أولًا':'تعذر تحديث الرابط الحي','error');return false;
    }finally{setPickerBusy(false);}
  }
  async function revokePortal(studentId=currentStudentId()){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    const st=stateStudents().find(x=>x.id===studentId);
    if(typeof g.confirm==='function'&&!g.confirm(`سيتم إيقاف رابط بوابة ${st?.name||'الطالب'} الحالي.\nلن يعمل الرابط القديم بعد ذلك. هل تريد المتابعة؟`))return false;
    try{
      setPickerBusy(true,'جارٍ إيقاف الرابط…');const ok=await revokeLive(studentId);
      toastSafe(ok?'تم إيقاف الرابط الحي. أي نشر جديد سينشئ رابطًا مختلفًا.':'لا يوجد رابط حي نشط لهذا الطالب',ok?'success':'info');await refreshPickerStatus(studentId);return ok;
    }catch(err){console.error('[guardian portal revoke]',err);toastSafe(isBackendMissing(err)?'شغّل ملف SQL الخاص بالبوابة الحية أولًا':'تعذر إيقاف الرابط','error');return false;}
    finally{setPickerBusy(false);}
  }

  function ensurePicker(){
    if(!g.document?.body||g.document.getElementById('v1010PortalModal'))return;
    const box=g.document.createElement('div');box.className='mo ia26-guardian-screen';box.id='v1010PortalModal';
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','ia26GuardianHeading');
    box.setAttribute('aria-hidden','true');
    box.innerHTML=`<div class="mo-box v1010-portal-modal" dir="rtl">
      <header class="ia26-guardian-header">
        <button type="button" id="ia26GuardianBack" class="ia26-guardian-back" onclick="v1010ClosePortalPicker()" aria-label="الرجوع إلى الصفحة السابقة">↩ رجوع</button>
        <div class="ia26-guardian-heading"><b id="ia26GuardianHeading">إدارة ولي الأمر</b><small>بوابة الطالب والتواصل والمتابعة</small></div>
        <button type="button" class="ia26-guardian-close" onclick="v1010ClosePortalPicker()" aria-label="إغلاق إدارة ولي الأمر">✕</button>
      </header>
      <div class="ia26-guardian-content" id="ia26GuardianContent" tabindex="-1">
      <p class="ia26-guardian-lead">اختر الطالب ثم راجع حالة الدخول، وأرسل الرابط في خطوات واضحة.</p>
      <nav class="ia26-guardian-shortcuts" aria-label="الانتقال داخل إدارة ولي الأمر">
        <button type="button" onclick="v1010GuardianJump('v1010AccessSection')">🔐 الدخول</button>
        <button type="button" onclick="v1010GuardianJump('v1010ResetSection',true)">🔔 استعادة الرمز</button>
        <button type="button" onclick="v1010GuardianJump('v1010EngagementSection',true)">📊 النشاط</button>
      </nav>
      <div class="fld ia26-guardian-student"><label for="v1010PortalStudent">الطالب / الطالبة</label><select id="v1010PortalStudent" onchange="v1010PortalStudentChanged()"></select></div>

      <section class="v1010-portal-section v1010-access-section" id="v1010AccessSection" aria-label="حالة دخول ولي الأمر">
        <div class="v1010-portal-info"><b>١ — حالة الدخول</b><p>يستخدم ولي الأمر رقم الهاتف المسجل ورمز دخول من ٦ أرقام. إذا نسي الرمز، يمكن إنشاء رمز جديد بأمان.</p></div>
        <div id="v1010PhoneStatus" class="v1010-portal-status">اختر طالبًا لعرض حالة دخول الهاتف.</div>
        <div id="v1010GuardianSecret" class="v1010-guardian-secret" hidden></div>
        <div class="v1010-portal-info"><b>٢ — الدخول والتواصل</b><p>إن لم يكن الدخول مفعّلًا، أنشئ رمزًا وشاركه. وإن كان مفعّلًا، أرسل رابط الدخول مباشرة.</p></div><div class="v1010-portal-actions v1010-access-actions">
          <button id="v1010EnablePhoneBtn" class="btn btn-g" onclick="v1010EnablePhoneAccess()">🔐 إنشاء رمز دخول لولي الأمر</button>
          <button id="v1010ResetPhoneBtn" class="btn btn-out" onclick="v1010ResetPhonePin()" hidden>🔐 إنشاء PIN جديد</button>
          <button class="btn btn-wa" onclick="v1010SendGuardianLoginLink()">📲 إرسال رابط الدخول</button>
          <button class="btn btn-out" onclick="v1010OpenGuardianLogin()">🌐 فتح صفحة الدخول</button>
        </div>
        <details class="v1010-guardian-more"><summary>⚙️ أدوات إضافية: نسخ الرابط وإدارة الأمان</summary>
          <div class="v1010-portal-actions">
            <button class="btn btn-out" onclick="v1010CopyGuardianLogin()">🔗 نسخ رابط الدخول</button>
            <button id="v1010UnlinkPhoneBtn" class="btn btn-out v1010-danger" onclick="v1010UnlinkPhoneAccess()" hidden>⛔ إيقاف دخول الهاتف</button>
          </div>
        </details>
        <details class="v1010-reset-requests ia26-guardian-disclosure" id="v1010ResetSection">
          <summary>🔔 طلبات استعادة الرمز</summary>
          <div class="ia26-disclosure-content">
            <div class="v1010-reset-head"><div><b>طلبات ولي الأمر</b><small>الطلبات الواردة من «نسيت رمز الدخول؟».</small></div><button class="btn btn-out btn-sm" type="button" onclick="v1010RefreshResetRequests()">تحديث الطلبات</button></div>
            <div id="v1010ResetRequestsList" class="v1010-reset-list"><div class="v1010-reset-empty">جارٍ فحص الطلبات…</div></div>
          </div>
        </details>
      </section>

      <details class="v1010-engagement-details ia26-guardian-disclosure" id="v1010EngagementSection">
        <summary>📊 متابعة استخدام ولي الأمر</summary>
        <div class="v1010-engagement-head"><div><b>هل تمّت المذاكرة في المنزل؟</b><small>تظهر الزيارات وتشغيل التحفيظ والتكرار من بوابة الهاتف + PIN.</small></div><select id="v1010EngagementDays" onchange="v1010EngagementDaysChanged()"><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يومًا</option></select></div>
        <div id="v1010EngagementSelected" class="v1010-engagement-selected"><div class="v1010-reset-empty">جارٍ تحميل نشاط ولي الأمر…</div></div>
        <div class="v1010-engagement-actions"><button class="btn btn-out btn-sm" onclick="v1010RefreshEngagement()">🔄 تحديث النشاط</button></div>
        <div id="v1010EngagementList" class="v1010-engagement-list"></div>
      </details>

      <details class="v1010-link-details">
        <summary>🔗 الرابط المباشر القديم (خيار إضافي)</summary>
        <div class="v1010-portal-info"><b>رابط حي مباشر</b><p>يبقى متاحًا كطريقة مشاركة سريعة. أي شخص يملك الرابط يستطيع القراءة، لذلك الدخول برقم الهاتف + PIN هو الخيار الأساسي الآن.</p></div>
        <div id="v1010PortalStatus" class="v1010-portal-status">اختر طالبًا لعرض حالة الرابط.</div>
        <div class="v1010-portal-actions"><button class="btn btn-g" onclick="v1010OpenPickedPortal()">🌐 تحديث وفتح</button><button class="btn btn-out" onclick="v1010CopyPickedPortal()">🔗 تحديث ونسخ الرابط</button><button class="btn btn-out" onclick="v1010RefreshPickedPortal()">🔄 تحديث فقط</button><button class="btn btn-out v1010-danger" onclick="v1010RevokePickedPortal()">⛔ إيقاف الرابط</button></div>
        <div class="v1010-portal-snapshot"><button class="btn btn-out btn-sm" onclick="v1010CopyPickedSnapshot()">📸 نسخ لقطة ثابتة بدون Cloud</button><small>نسخة ثابتة للقراءة، تعمل دون اتصال مباشر بالخادم.</small></div>
      </details>
      <div id="v1010PortalBusy" class="v1010-portal-busy" role="status" hidden>جارٍ التنفيذ…</div>
      </div>
    </div>`
    g.document.body.appendChild(box);
  }
  function fillPicker(selected=''){
    ensurePicker();const sel=g.document.getElementById('v1010PortalStudent');if(!sel)return '';
    const list=activeStudents();const id=selected||currentStudentId()||list[0]?.id||'';
    sel.innerHTML=list.length?list.map(st=>`<option value="${esc(st.id)}" ${st.id===id?'selected':''}>${esc(st.name)}${st.group?` — ${esc(st.group)}`:''}</option>`).join(''):'<option value="">لا يوجد طلاب نشطون</option>';
    return id;
  }
  function setPickerBusy(busy,text='جارٍ التنفيذ…'){
    const el=g.document?.getElementById?.('v1010PortalBusy');if(el){el.hidden=!busy;el.textContent=text;}
    const modal=g.document?.getElementById?.('v1010PortalModal');if(modal)modal.classList.toggle('v1010-busy',!!busy);
  }
  function statusTime(value){
    if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'});
  }
  function renderGuardianSecret(){
    const el=g.document?.getElementById?.('v1010GuardianSecret');if(!el)return;
    const id=pickedId();const x=lastGuardianSecret;
    if(!x||x.studentId!==id){el.hidden=true;el.innerHTML='';return;}
    el.hidden=false;el.innerHTML=`<div><small>رمز جديد — يظهر الآن فقط</small><strong dir="ltr">${esc(x.pin)}</strong><span>الهاتف: <b dir="ltr">${esc(x.phone)}</b></span></div><div class="v1010-secret-actions"><button class="btn btn-g btn-sm" onclick="v1010CopyGuardianCredentials()">📋 نسخ بيانات الدخول</button><button class="btn btn-wa btn-sm" onclick="v1010SendGuardianCredentials()">📲 إرسال عبر WhatsApp</button></div>`;
  }
  function setAccessButtons(mode='new'){
    const enable=g.document?.getElementById?.('v1010EnablePhoneBtn');
    const reset=g.document?.getElementById?.('v1010ResetPhoneBtn');
    const unlink=g.document?.getElementById?.('v1010UnlinkPhoneBtn');
    if(enable){enable.hidden=false;enable.textContent=mode==='linked'?'📱 تحديث ربط رقم ولي الأمر':mode==='changed'?'📱 نقل الدخول للرقم الحالي':'🔐 إنشاء رمز دخول لولي الأمر';}
    if(reset)reset.hidden=mode==='new';
    if(unlink)unlink.hidden=mode==='new';
  }
  async function refreshPhoneAccessStatus(studentId=pickedId()){
    const el=g.document?.getElementById?.('v1010PhoneStatus');if(!el)return;
    if(!studentId){setAccessButtons('new');el.className='v1010-portal-status';el.textContent='لا يوجد طالب محدد.';return;}
    const phone=studentPhone(studentId),display=phoneDisplay(phone);
    if(!validEgyptPhone(phone)){setAccessButtons('new');el.className='v1010-portal-status warn';el.innerHTML='<b>⚠️ رقم ولي الأمر يحتاج مراجعة</b><span>عدّل رقم واتساب الطالب أولًا إلى رقم مصري صحيح مثل 01xxxxxxxxx.</span>';return;}
    if(g.navigator?.onLine===false){el.className='v1010-portal-status offline';el.innerHTML=`<b>Offline</b><span>رقم الطالب المسجل: ${esc(display)} — فحص الدخول يحتاج اتصالًا بالإنترنت.</span>`;return;}
    el.className='v1010-portal-status loading';el.textContent='جارٍ فحص دخول ولي الأمر…';
    const s=await accessStatus(studentId);
    if(!s.available){el.className='v1010-portal-status warn';el.innerHTML=isBackendMissing(s.error)?'<b>Stage 3 غير مفعّل في Supabase</b><span>شغّل sql/guardian-portal-login.sql مرة واحدة. الرابط الحي من Stage 2 يظل يعمل.</span>':'<b>تعذر فحص دخول الهاتف</b><span>تحقق من الاتصال ثم أعد المحاولة.</span>';return;}
    if(!s.linked){setAccessButtons('new');el.className='v1010-portal-status new';el.innerHTML=`<b>غير مفعّل لهذا الطالب</b><span>الهاتف المسجل: ${esc(display)} — اضغط «إنشاء رمز دخول لولي الأمر». إذا كان الرقم مرتبطًا بأخ/أخت فسيستخدم نفس PIN الحالي.</span>`;return;}
    if(s.phoneLast4&&s.phoneLast4!==phone.slice(-4)){setAccessButtons('changed');el.className='v1010-portal-status warn';el.innerHTML=`<b>⚠️ رقم الهاتف تغير بعد التفعيل</b><span>الحساب الحالي ينتهي بـ ${esc(s.phoneLast4)} بينما ملف الطالب ينتهي بـ ${esc(phone.slice(-4))}. اضغط «نقل الدخول للرقم الحالي» لربط الطالب بالرقم الجديد.</span>`;return;}
    setAccessButtons('linked');el.className='v1010-portal-status active';el.innerHTML=`<b>✅ دخول الهاتف مفعّل</b><span>الهاتف المنتهي بـ ${esc(s.phoneLast4||phone.slice(-4))}${s.studentCount>1?` · مرتبط بـ ${s.studentCount} طلاب`:''}. ${s.updatedAt?`آخر تحديث: ${esc(statusTime(s.updatedAt))}`:''}</span>`;
  }
  async function copyGuardianLogin(){try{await copyText(guardianLoginUrl());toastSafe('تم نسخ رابط صفحة دخول ولي الأمر','success');return true;}catch(_){toastSafe('تعذر نسخ رابط الدخول','error');return false;}}
  function openGuardianLogin(){return navigatePopup(openPlaceholder(),guardianLoginUrl());}
  async function copyGuardianCredentials(){
    const id=pickedId();if(!lastGuardianSecret||lastGuardianSecret.studentId!==id){toastSafe('لا يوجد PIN ظاهر الآن. أنشئ PIN جديدًا أولًا.','info');return false;}
    try{await copyText(guardianCredentialsMessage());toastSafe('تم نسخ بيانات الدخول','success');return true;}catch(_){toastSafe('تعذر نسخ بيانات الدخول','error');return false;}
  }
  function sendGuardianCredentials(){
    const id=pickedId();if(!lastGuardianSecret||lastGuardianSecret.studentId!==id){toastSafe('أنشئ PIN جديدًا أولًا ثم أرسل البيانات','info');return false;}
    const st=studentById(id),msg=guardianCredentialsMessage();if(typeof g.openWhatsApp==='function')return g.openWhatsApp(st,msg);
    if(!st?.phone)return false;const u=(g.navigator?.onLine===false?'whatsapp://send?phone=':'https://wa.me/')+st.phone+'?text='+encodeURIComponent(msg);if(g.navigator?.onLine===false){g.location.href=u;}else{g.open?.(u,'_blank','noopener');}return true;
  }
  function guardianLoginOnlyMessage(studentId=pickedId()){
    const st=studentById(studentId);if(!st)return '';
    const academy=stateSettings().circle||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    return `السلام عليكم ورحمة الله وبركاته 🌿\n\nرابط بوابة متابعة الطالب: ${st.name||''}\n🏫 ${academy}\n🌐 ${guardianLoginUrl()}\n📱 استخدم رقم الهاتف المسجل لدى المحفظ.\n\nإذا نسيت رمز الدخول اضغط «نسيت رمز الدخول؟» في صفحة البوابة.`;
  }
  function sendGuardianLoginLink(){
    const id=pickedId(),st=studentById(id);if(!st){toastSafe('اختر الطالب أولًا','error');return false;}
    const msg=guardianLoginOnlyMessage(id);if(typeof g.openWhatsApp==='function')return g.openWhatsApp(st,msg);
    if(!st.phone)return false;const u=(g.navigator?.onLine===false?'whatsapp://send?phone=':'https://wa.me/')+st.phone+'?text='+encodeURIComponent(msg);if(g.navigator?.onLine===false){g.location.href=u;}else{g.open?.(u,'_blank','noopener');}return true;
  }
  function updateResetBadge(count){
    const btn=g.document?.querySelector?.('[data-v1010-portal-more]');if(!btn)return;
    const small=btn.querySelector('small');if(small)small.textContent=count?`${count} طلب استعادة PIN · دخول برقم الهاتف + PIN`:'دخول برقم الهاتف + PIN وتقارير قراءة فقط';
    btn.classList.toggle('v1010-has-reset',count>0);
  }
  async function matchStudentByRef(ref){
    for(const st of activeStudents()){
      try{if(await studentRef(st.id)===ref)return st;}catch(_){}
    }
    return null;
  }
  function renderResetRequests(){
    const el=g.document?.getElementById?.('v1010ResetRequestsList');if(!el)return;
    const rows=Array.isArray(pendingResetRequests)?pendingResetRequests:[];updateResetBadge(rows.length);
    const title=g.document?.querySelector?.('#v1010ResetSection > summary');
    if(title)title.textContent=rows.length?`🔔 طلبات استعادة الرمز (${rows.length})`:'🔔 طلبات استعادة الرمز';
    if(!rows.length){el.innerHTML='<div class="v1010-reset-empty">لا توجد طلبات استعادة رمز معلّقة.</div>';return;}
    el.innerHTML=rows.map(r=>{
      const names=(Array.isArray(r.students)?r.students:[]).map(x=>x?.name).filter(Boolean).join('، ')||'ولي أمر';
      const when=statusTime(r.requested_at)||'الآن';
      return `<div class="v1010-reset-card"><div><b>🔔 ${esc(names)}</b><span>هاتف ينتهي بـ ${esc(r.phone_last4||'—')} · ${esc(when)}${Number(r.request_count)>1?` · ${Number(r.request_count)} طلبات`:''}</span></div><div><button class="btn btn-g btn-sm" onclick="v1010ResolveResetRequest('${esc(r.id)}')">🔐 إنشاء PIN جديد</button><button class="btn btn-out btn-sm" onclick="v1010DismissResetRequest('${esc(r.id)}')">✓ تم التعامل</button></div></div>`;
    }).join('');
  }
  async function refreshResetRequests({silent=false}={}){
    if(!liveAvailable()){if(!silent){pendingResetRequests=[];renderResetRequests();}return []}
    try{
      const data=await rpc(ACCESS_RPC.resetList,{}),x=Array.isArray(data)?data[0]:data;
      pendingResetRequests=Array.isArray(x?.requests)?x.requests:[];renderResetRequests();return pendingResetRequests;
    }catch(err){
      if(!silent&&!isBackendMissing(err))console.warn('[guardian reset requests]',err);
      return [];
    }
  }
  async function resolveResetRequest(requestId){
    const req=pendingResetRequests.find(x=>String(x.id)===String(requestId));if(!req){toastSafe('الطلب لم يعد متاحًا','info');await refreshResetRequests();return false;}
    const pin=generatePin();
    try{
      setPickerBusy(true,'جارٍ إنشاء PIN جديد…');
      const data=await rpc(ACCESS_RPC.resetResolve,{p_request:String(requestId),p_pin:pin}),x=Array.isArray(data)?data[0]:data;if(!x?.ok)throw new Error('RESET_RESOLVE_FAILED');
      const refs=(Array.isArray(req.students)?req.students:[]).map(s=>String(s?.student_ref||'')).filter(Boolean);
      let st=null;for(const ref of refs){st=await matchStudentByRef(ref);if(st)break;}
      if(st){const sel=g.document?.getElementById?.('v1010PortalStudent');if(sel)sel.value=st.id;rememberGuardianSecret(st.id,studentPhone(st.id),pin);await refreshPhoneAccessStatus(st.id);}
      else{toastSafe(`تم إنشاء PIN جديد: ${pin} — انسخه الآن لإرساله لولي الأمر`,'success');}
      await refreshResetRequests();toastSafe('تم إنشاء PIN جديد وإلغاء الجلسات القديمة','success');return true;
    }catch(err){console.error('[guardian reset request resolve]',err);toastSafe(isBackendMissing(err)?'شغّل sql/guardian-portal-reset-requests.sql في Supabase أولًا':'تعذر إنشاء PIN جديد','error');return false;}
    finally{setPickerBusy(false);}
  }
  async function dismissResetRequest(requestId){
    try{
      const data=await rpc(ACCESS_RPC.resetDismiss,{p_request:String(requestId)}),x=Array.isArray(data)?data[0]:data;
      await refreshResetRequests();toastSafe(x?.dismissed?'تم إغلاق الطلب':'الطلب غير موجود','info');return !!x?.dismissed;
    }catch(err){console.error('[guardian reset request dismiss]',err);toastSafe('تعذر إغلاق الطلب','error');return false;}
  }
  async function refreshPickerStatus(studentId=pickedId()){
    const el=g.document?.getElementById?.('v1010PortalStatus');if(!el)return;
    if(!studentId){el.className='v1010-portal-status';el.textContent='لا يوجد طالب محدد.';return;}
    if(g.navigator?.onLine===false){el.className='v1010-portal-status offline';el.innerHTML='<b>Offline</b><span>يمكنك إنشاء لقطة ثابتة، لكن تحديث الرابط الحي يحتاج اتصالًا بالإنترنت.</span>';return;}
    el.className='v1010-portal-status loading';el.textContent='جارٍ فحص حالة الرابط الحي…';
    const s=await liveStatus(studentId);
    if(!s.available){
      const missing=isBackendMissing(s.error);
      el.className='v1010-portal-status warn';
      el.innerHTML=missing?'<b>البوابة الحية غير مفعلة بعد</b><span>شغّل sql/guardian-portal-live.sql في Supabase. اللقطة الثابتة ما زالت تعمل.</span>':'<b>تعذر الوصول للبوابة الحية</b><span>تحقق من الاتصال ثم أعد المحاولة.</span>';
      return;
    }
    if(!s.exists){el.className='v1010-portal-status new';el.innerHTML='<b>لا يوجد رابط حي لهذا الطالب بعد</b><span>اضغط «تحديث ونسخ الرابط» لإنشائه لأول مرة.</span>';return;}
    if(!s.active){el.className='v1010-portal-status stopped';el.innerHTML='<b>الرابط المباشر غير نشط</b><span>يمكن تفعيله لاحقًا من أزرار الرابط المباشر بدون التأثير على دخول الهاتف.</span>';return;}
    el.className='v1010-portal-status active';el.innerHTML=`<b>✅ الرابط الحي نشط</b><span>آخر نشر: ${esc(statusTime(s.updatedAt)||'—')}</span>`;
  }
  function engagementTime(value){
    if(!value)return 'لا يوجد نشاط بعد';const d=new Date(value);if(Number.isNaN(d.getTime()))return 'لا يوجد نشاط بعد';
    const diff=Math.max(0,Date.now()-d.getTime()),m=Math.floor(diff/60000);if(m<1)return 'الآن';if(m<60)return `منذ ${m} دقيقة`;const h=Math.floor(m/60);if(h<24)return `منذ ${h} ساعة`;const days=Math.floor(h/24);if(days<14)return `منذ ${days} يوم`;return d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'});
  }
  async function engagementSummary(days=7){
    if(!liveAvailable())return {available:false,rows:[],days};
    try{const data=await rpc(ACCESS_RPC.engagement,{p_days:Math.max(1,Math.min(90,Number(days)||7))}),x=Array.isArray(data)?data[0]:data;return {available:true,rows:Array.isArray(x?.rows)?x.rows:[],days:Number(x?.days)||days,generatedAt:x?.generated_at||''};}
    catch(err){return {available:false,rows:[],days,error:err};}
  }
  async function refreshEngagement({silent=false}={}){
    const selected=g.document?.getElementById?.('v1010EngagementSelected'),list=g.document?.getElementById?.('v1010EngagementList'),period=g.document?.getElementById?.('v1010EngagementDays');if(!selected||!list)return false;
    const days=Math.max(1,Math.min(90,Number(period?.value)||7));
    if(g.navigator?.onLine===false){selected.innerHTML='<div class="v1010-engagement-state offline"><b>Offline</b><span>تحديث نشاط ولي الأمر يحتاج اتصالًا بالإنترنت.</span></div>';list.innerHTML='';return false;}
    if(!silent)selected.innerHTML='<div class="v1010-reset-empty">جارٍ تحميل نشاط ولي الأمر…</div>';
    const out=await engagementSummary(days);
    if(!out.available){selected.innerHTML=isBackendMissing(out.error)?'<div class="v1010-engagement-state warn"><b>Stage 4.1 يحتاج تفعيل SQL</b><span>شغّل sql/guardian-portal-engagement.sql في Supabase مرة واحدة.</span></div>':'<div class="v1010-engagement-state warn"><b>تعذر تحميل النشاط</b><span>تحقق من الاتصال ثم أعد المحاولة.</span></div>';list.innerHTML='';return false;}
    const students=activeStudents(),refs=await Promise.all(students.map(async st=>({st,ref:await studentRef(st.id)}))),map=new Map((out.rows||[]).map(r=>[String(r.student_ref||''),r]));
    const items=refs.map(x=>({st:x.st,ref:x.ref,row:map.get(x.ref)||null})),current=items.find(x=>x.st.id===pickedId())||items[0]||null,row=current?.row;
    if(!current){selected.innerHTML='<div class="v1010-reset-empty">لا يوجد طلاب نشطون.</div>';list.innerHTML='';return true;}
    if(!row){selected.innerHTML=`<div class="v1010-engagement-state warn"><b>${esc(current.st.name)} — البوابة غير مفعلة</b><span>فعّل دخول الهاتف + PIN أولًا حتى يبدأ تسجيل نشاط المذاكرة.</span></div>`;}
    else{
      const active24=(Number(row.portal_visits_24h)||0)>0,last=engagementTime(row.last_activity_at),didStudy=(Number(row.tahfeez_starts)||0)>0;
      selected.innerHTML=`<div class="v1010-engagement-status ${active24?'active':''}"><b>${active24?'✅ دخل خلال آخر 24 ساعة':didStudy?'📖 استخدم التحفيظ خلال الفترة':'⏳ لم يبدأ التحفيظ خلال الفترة'}</b><span>${esc(current.st.name)} · آخر نشاط: ${esc(last)}</span></div><div class="v1010-engagement-kpis"><span><b>${Number(row.portal_visits)||0}</b><small>زيارة</small></span><span><b>${Number(row.tahfeez_starts)||0}</b><small>بدء تحفيظ</small></span><span><b>${Number(row.ayah_listens)||0}</b><small>تشغيل آية</small></span><span><b>${Number(row.repeat_completions)||0}</b><small>تكرار مكتمل</small></span><span><b>${Number(row.tahfeez_completions)||0}</b><small>جلسة مكتملة</small></span><span><b>${Number(row.correction_audio_plays)||0}</b><small>نطق خطأ</small></span></div>`;
    }
    list.innerHTML=`<div class="v1010-engagement-list-head"><b>كل الطلاب</b><small>الفترة: ${days} أيام</small></div>${items.map(x=>{const r=x.row;if(!r)return `<button type="button" class="v1010-engagement-row unlinked" onclick="document.getElementById('v1010PortalStudent').value='${esc(x.st.id)}';v1010PortalStudentChanged()"><span><b>${esc(x.st.name)}</b><small>البوابة غير مفعلة</small></span><em>—</em></button>`;const started=Number(r.tahfeez_starts)||0,repeats=Number(r.repeat_completions)||0,active24=(Number(r.portal_visits_24h)||0)>0,status=active24?'دخل خلال 24س':started?'ذاكر خلال الفترة':'لم يبدأ التحفيظ';return `<button type="button" class="v1010-engagement-row ${active24?'active':''}" onclick="document.getElementById('v1010PortalStudent').value='${esc(x.st.id)}';v1010PortalStudentChanged()"><span><b>${esc(x.st.name)}</b><small>${status} · آخر نشاط ${esc(engagementTime(r.last_activity_at))}</small></span><em>${repeats} تكرار</em></button>`;}).join('')}`;
    return true;
  }
  function engagementDaysChanged(){return refreshEngagement();}

  // The guardian area is a dedicated fullscreen surface, not a short bottom sheet.
  // No backend, PIN, link, or account isolation behavior is changed here.
  function guardianJump(id,expand=false){
    const node=g.document.getElementById(id);if(!node)return false;
    if(expand&&node.tagName==='DETAILS')node.open=true;
    node.scrollIntoView?.({block:'start',behavior:'smooth'});return true;
  }
  function openPicker(selected='',fromMore=false){
    const modal=g.document.getElementById('v1010PortalModal');
    guardianOpenedFromMore=!!fromMore;
    guardianReturnFocus=g.document.activeElement;
    guardianLastScroll=g.scrollY||0;
    const id=fillPicker(selected);clearGuardianSecret();
    modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');
    g.document.body?.classList.add('ia26-guardian-open');
    const area=g.document.getElementById('ia26GuardianContent');if(area)area.scrollTop=0;
    g.document.getElementById('ia26GuardianBack')?.focus?.({preventScroll:true});
    // Load the whole-family activity list only when the teacher opens its section.
    Promise.all([refreshPhoneAccessStatus(id),refreshPickerStatus(id),refreshResetRequests()]);
  }
  function closePicker(){
    const modal=g.document.getElementById('v1010PortalModal');
    if(!modal?.classList.contains('open'))return;
    clearGuardianSecret();modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
    g.document.body?.classList.remove('ia26-guardian-open');
    const returnMore=guardianOpenedFromMore;guardianOpenedFromMore=false;
    if(returnMore&&typeof g.openV9More==='function')g.openV9More();
    else guardianReturnFocus?.focus?.({preventScroll:true});
    guardianReturnFocus=null;
  }
  function pickedId(){return g.document.getElementById('v1010PortalStudent')?.value||'';}
  function studentChanged(){
    clearGuardianSecret();const id=pickedId();
    const calls=[refreshPhoneAccessStatus(id),refreshPickerStatus(id)];
    if(g.document.getElementById('v1010EngagementSection')?.open)calls.push(refreshEngagement({silent:true}));
    Promise.all(calls);
  }
  function openPicked(){const id=pickedId();if(id)return openPortal(id);toastSafe('لا يوجد طالب محدد','error');return null;}
  function copyPicked(){const id=pickedId();if(id)return copyPortalLink(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function refreshPicked(){const id=pickedId();if(id)return refreshLivePortal(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function revokePicked(){const id=pickedId();if(id)return revokePortal(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function copyPickedSnapshot(){const id=pickedId();if(id)return copySnapshotLink(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function enablePickedPhone(){const id=pickedId();if(id)return enablePhoneAccess(id,{resetPin:false});toastSafe('لا يوجد طالب محدد','error');return false;}
  function resetPickedPhone(){const id=pickedId();if(id)return resetPhonePin(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function unlinkPickedPhone(){const id=pickedId();if(id)return unlinkPhoneAccess(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function openSelectedGuardian(){const id=g.document.getElementById('guardianPreviewStudent')?.value||'';if(id)openPicker(id);else openPicker();}
  // Named wrappers keep permanent HTML entry points statically verifiable while
  // the public API below still exposes the same implementation functions.
  function v1010OpenPortalPicker(selected=''){return openPicker(selected);}
  function v1010OpenSelectedGuardianPortal(){return openSelectedGuardian();}

  function ensureProfileButton(){
    const host=g.document?.getElementById?.('profileActions');if(!host||host.querySelector('[data-v1010-portal-profile]'))return;
    const btn=g.document.createElement('button');btn.className='btn btn-wa btn-sm';btn.dataset.v1010PortalProfile='1';btn.setAttribute('onclick','v1010OpenPortalPicker(curStId)');btn.textContent='👨‍👩‍👧 بوابة ولي الأمر';host.prepend(btn);
  }
  function ensureGuardianButton(){
    const host=g.document?.querySelector?.('.guardian-send-actions');if(!host||host.querySelector('[data-v1010-portal-guardian]'))return;
    const btn=g.document.createElement('button');btn.className='btn btn-out';btn.dataset.v1010PortalGuardian='1';btn.setAttribute('onclick','v1010OpenSelectedGuardianPortal()');btn.textContent='🌐 بوابة الطالب';host.appendChild(btn);
  }
  function ensureMoreItem(){
    const grid=g.document?.getElementById?.('v9MoreGrid');if(!grid||grid.querySelector('[data-v1010-portal-more]'))return;
    const btn=g.document.createElement('button');btn.className='v9-more-item';btn.dataset.v1010PortalMore='1';btn.setAttribute('onclick',"closeV9More();v1010OpenPortalPicker('',true)");
    const icon=typeof g.v9Icon==='function'?g.v9Icon('users'):'👨‍👩‍👧';btn.innerHTML=`${icon}<b>إدارة ولي الأمر</b><small>الدخول والرمز والتواصل ومتابعة المذاكرة</small>`;grid.appendChild(btn);
  }
  function patchHooks(){
    const currentInject=g.injectV9Navigation;
    if(typeof currentInject==='function'&&!currentInject.__v1010PortalPatched){
      const wrapped=function(){const r=currentInject.apply(this,arguments);setTimeout(()=>{ensureMoreItem();ensureGuardianButton();},0);return r;};
      wrapped.__v1010PortalPatched=true;g.injectV9Navigation=wrapped;
    }
    const currentOpenProf=g.openProf;
    if(typeof currentOpenProf==='function'&&!currentOpenProf.__v1010PortalPatched){
      const wrapped=function(id){const r=currentOpenProf.apply(this,arguments);setTimeout(ensureProfileButton,0);return r;};
      wrapped.__v1010PortalPatched=true;g.openProf=wrapped;
    }
    const currentSaveSession=g.saveSession;
    if(typeof currentSaveSession==='function'&&!currentSaveSession.__v1010GuardianRefreshPatched){
      const wrapped=function(){const r=currentSaveSession.apply(this,arguments);if(r?.studentId)setTimeout(()=>refreshPhoneSnapshot(r.studentId),0);return r;};
      wrapped.__v1010GuardianRefreshPatched=true;g.saveSession=wrapped;
    }
  }
  function init(){
    ensurePicker();patchHooks();ensureMoreItem();ensureProfileButton();ensureGuardianButton();
    g.document.addEventListener('keydown',event=>{if(event.key==='Escape'&&g.document.getElementById('v1010PortalModal')?.classList.contains('open')){event.preventDefault();closePicker();}});
    setTimeout(()=>refreshResetRequests({silent:true}),1200);
  }

  Object.assign(g,{
    v1010BuildPortalSnapshot:buildSnapshot,v1010PortalUrl:portalUrl,v1010LivePortalUrl:liveUrl,
    v1010PublishLivePortal:publishLive,v1010PortalStatus:liveStatus,v1010RevokePortal:revokePortal,
    v1010OpenPortal:openPortal,v1010CopyPortalLink:copyPortalLink,v1010CopySnapshotLink:copySnapshotLink,
    v1010OpenPortalPicker:openPicker,v1010ClosePortalPicker:closePicker,v1010GuardianJump:guardianJump,v1010OpenPickedPortal:openPicked,
    v1010CopyPickedPortal:copyPicked,v1010RefreshPickedPortal:refreshPicked,v1010RevokePickedPortal:revokePicked,
    v1010CopyPickedSnapshot:copyPickedSnapshot,v1010PortalStudentChanged:studentChanged,v1010OpenSelectedGuardianPortal:openSelectedGuardian,
    v1010EnablePhoneAccess:enablePickedPhone,v1010ResetPhonePin:resetPickedPhone,v1010UnlinkPhoneAccess:unlinkPickedPhone,
    v1010OpenGuardianLogin:openGuardianLogin,v1010CopyGuardianLogin:copyGuardianLogin,v1010CopyGuardianCredentials:copyGuardianCredentials,v1010SendGuardianCredentials:sendGuardianCredentials,v1010SendGuardianLoginLink:sendGuardianLoginLink,v1010RefreshResetRequests:refreshResetRequests,v1010ResolveResetRequest:resolveResetRequest,v1010DismissResetRequest:dismissResetRequest,v1010RefreshEngagement:refreshEngagement,v1010EngagementDaysChanged:engagementDaysChanged
  });
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.GuardianPortal=Object.freeze({buildSnapshot,portalUrl,liveUrl,studentRef,loginUrl:guardianLoginUrl,publish:publishLive,status:liveStatus,revoke:revokePortal,open:openPortal,copyLink:copyPortalLink,copySnapshot:copySnapshotLink,accessStatus,enablePhoneAccess,resetPhonePin,unlinkPhoneAccess,revokeForStudentDeletion,revokeForStudentDeactivation:revokeForStudentDeletion,refreshPhoneSnapshot,refreshResetRequests,resolveResetRequest,dismissResetRequest,engagementSummary,refreshEngagement});
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})(globalThis);
