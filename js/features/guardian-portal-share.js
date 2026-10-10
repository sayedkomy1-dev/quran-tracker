'use strict';
/* We Live Quran v10.10.0 — Guardian & Student Portal, Stage 2.
   Stage 1 snapshot links remain available.
   Stage 2 adds a stable, revocable cloud-published read-only link.
   The local data schema remains 12; only the dedicated portal-share backend is new. */
(function guardianPortalShareFeature(g){
  const VERSION=1;
  const LIVE_RPC={publish:'guardian_portal_publish',status:'guardian_portal_status',revoke:'guardian_portal_revoke'};

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
  function recentSessions(studentId,limit=8){
    return stateSessions().filter(x=>x.studentId===studentId).slice().sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,limit).map(ses=>({
      date:dateLabel(ses),
      status:String(ses.status||'—'),
      score:ses.status==='حضر'?sessionAverage(ses):null,
      recitation:ses.status==='حضر'?actualText(ses):[]
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
    const box=g.document.createElement('div');box.className='mo';box.id='v1010PortalModal';
    box.innerHTML=`<div class="mo-box v1010-portal-modal"><div class="mo-title"><div><span>👨‍👩‍👧 بوابة ولي الأمر / الطالب</span><small>قراءة فقط — رابط حي قابل للتحديث والإيقاف</small></div><button class="mo-x" onclick="v1010ClosePortalPicker()">✕</button></div><div class="v1010-portal-info"><b>Stage 2 — رابط ثابت وآمن</b><p>الرابط الحي يحتفظ بنفس العنوان عند التحديث، ولا يضع رقم الهاتف أو معرّفات الطلاب/الحصص في الرابط. أي شخص يملك الرابط يستطيع القراءة فقط. يمكنك إيقافه في أي وقت.</p></div><div class="fld"><label for="v1010PortalStudent">الطالب</label><select id="v1010PortalStudent" onchange="v1010PortalStudentChanged()"></select></div><div id="v1010PortalStatus" class="v1010-portal-status">اختر طالبًا لعرض حالة الرابط.</div><div id="v1010PortalBusy" class="v1010-portal-busy" hidden>جارٍ التنفيذ…</div><div class="v1010-portal-actions"><button class="btn btn-g" onclick="v1010OpenPickedPortal()">🌐 تحديث وفتح</button><button class="btn btn-out" onclick="v1010CopyPickedPortal()">🔗 تحديث ونسخ الرابط</button><button class="btn btn-out" onclick="v1010RefreshPickedPortal()">🔄 تحديث فقط</button><button class="btn btn-out v1010-danger" onclick="v1010RevokePickedPortal()">⛔ إيقاف الرابط</button></div><div class="v1010-portal-snapshot"><button class="btn btn-out btn-sm" onclick="v1010CopyPickedSnapshot()">📸 نسخ لقطة ثابتة بدون Cloud</button><small>الخيار الاحتياطي من Stage 1 يظل متاحًا حتى بدون إعداد SQL.</small></div></div>`;
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
    if(!s.active){el.className='v1010-portal-status stopped';el.innerHTML='<b>الرابط السابق متوقف</b><span>أي نشر جديد سينشئ رابطًا مختلفًا ولن يعيد تشغيل الرابط القديم.</span>';return;}
    el.className='v1010-portal-status active';el.innerHTML=`<b>✅ الرابط الحي نشط</b><span>آخر نشر: ${esc(statusTime(s.updatedAt)||'—')}</span>`;
  }
  function openPicker(selected='') {const id=fillPicker(selected);g.document.getElementById('v1010PortalModal')?.classList.add('open');refreshPickerStatus(id);}
  function closePicker(){g.document.getElementById('v1010PortalModal')?.classList.remove('open');}
  function pickedId(){return g.document.getElementById('v1010PortalStudent')?.value||'';}
  function studentChanged(){refreshPickerStatus(pickedId());}
  function openPicked(){const id=pickedId();if(id)return openPortal(id);toastSafe('لا يوجد طالب محدد','error');return null;}
  function copyPicked(){const id=pickedId();if(id)return copyPortalLink(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function refreshPicked(){const id=pickedId();if(id)return refreshLivePortal(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function revokePicked(){const id=pickedId();if(id)return revokePortal(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function copyPickedSnapshot(){const id=pickedId();if(id)return copySnapshotLink(id);toastSafe('لا يوجد طالب محدد','error');return false;}
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
    const btn=g.document.createElement('button');btn.className='v9-more-item';btn.dataset.v1010PortalMore='1';btn.setAttribute('onclick','closeV9More();v1010OpenPortalPicker()');
    const icon=typeof g.v9Icon==='function'?g.v9Icon('users'):'👨‍👩‍👧';btn.innerHTML=`${icon}<b>بوابة ولي الأمر</b><small>رابط قراءة فقط قابل للتحديث والإيقاف</small>`;grid.appendChild(btn);
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
  }
  function init(){ensurePicker();patchHooks();ensureMoreItem();ensureProfileButton();ensureGuardianButton();}

  Object.assign(g,{
    v1010BuildPortalSnapshot:buildSnapshot,v1010PortalUrl:portalUrl,v1010LivePortalUrl:liveUrl,
    v1010PublishLivePortal:publishLive,v1010PortalStatus:liveStatus,v1010RevokePortal:revokePortal,
    v1010OpenPortal:openPortal,v1010CopyPortalLink:copyPortalLink,v1010CopySnapshotLink:copySnapshotLink,
    v1010OpenPortalPicker:openPicker,v1010ClosePortalPicker:closePicker,v1010OpenPickedPortal:openPicked,
    v1010CopyPickedPortal:copyPicked,v1010RefreshPickedPortal:refreshPicked,v1010RevokePickedPortal:revokePicked,
    v1010CopyPickedSnapshot:copyPickedSnapshot,v1010PortalStudentChanged:studentChanged,v1010OpenSelectedGuardianPortal:openSelectedGuardian
  });
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.GuardianPortal=Object.freeze({buildSnapshot,portalUrl,liveUrl,publish:publishLive,status:liveStatus,revoke:revokePortal,open:openPortal,copyLink:copyPortalLink,copySnapshot:copySnapshotLink});
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})(globalThis);
