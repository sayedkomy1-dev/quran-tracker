/* We Live Quran — Authentication & Access Control v10.2.0
 * Google OAuth via Supabase, server-enforced app access, trusted-device offline fallback.
 */
'use strict';

(()=>{
  const CONFIG=Object.freeze({
    supabaseUrl:'https://svtcntalwfmexthcnvqe.supabase.co',
    publishableKey:'sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j',
    siteUrl:'https://welivequran.online/',
    ownerEmail:'info.welivequran@gmail.com'
  });
  const TRUST_KEY='wlq.auth.trusted.v1';
  const PROJECT_REF='svtcntalwfmexthcnvqe';
  let client=null;
  let access=null;
  let onlineVerified=false;
  let gateEl=null;
  let adminCard=null;

  function cleanEmail(v){return String(v||'').trim().toLowerCase();}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function trustedRead(){
    try{
      const x=JSON.parse(localStorage.getItem(TRUST_KEY)||'null');
      if(!x||x.status!=='active'||!x.userId||!x.email)return null;
      return x;
    }catch(_){return null;}
  }
  function trustedWrite(profile){
    const value={userId:profile.user_id,email:cleanEmail(profile.email),displayName:profile.display_name||'',role:profile.role||'teacher',status:'active',verifiedAt:new Date().toISOString()};
    localStorage.setItem(TRUST_KEY,JSON.stringify(value));
    return value;
  }
  function trustedClear(){localStorage.removeItem(TRUST_KEY);}
  function getSupabaseGlobal(){return globalThis.supabase&&typeof globalThis.supabase.createClient==='function'?globalThis.supabase:null;}
  function getClient(){
    if(client)return client;
    const lib=getSupabaseGlobal();
    if(!lib)return null;
    client=lib.createClient(CONFIG.supabaseUrl,CONFIG.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}
    });
    return client;
  }
  function sessionToken(){
    try{return client?.auth?.getSession?null:null;}catch(_){return null;}
  }
  function clearOAuthUrl(){
    try{
      if(location.hash&&/(access_token|refresh_token|error_description)=/.test(location.hash)) history.replaceState({},document.title,location.pathname+location.search);
    }catch(_){ }
  }
  function ensureGate(){
    if(gateEl&&document.body.contains(gateEl))return gateEl;
    gateEl=document.createElement('div');
    gateEl.id='wlqAuthGate';
    gateEl.className='wlq-auth-gate';
    gateEl.setAttribute('role','dialog');
    gateEl.setAttribute('aria-modal','true');
    gateEl.innerHTML=`
      <main class="wlq-auth-card">
        <img src="icon-192.png" class="wlq-auth-logo" alt="شعار We Live Quran">
        <h1>We Live Quran</h1>
        <p class="wlq-auth-ar">أكاديمية الإمام لتحفيظ القرآن الكريم</p>
        <p class="wlq-auth-tag">بالقرآن نحيا</p>
        <div id="wlqAuthState" class="wlq-auth-state">جارٍ التحقق من الحساب…</div>
        <button type="button" class="wlq-google-btn" id="wlqGoogleLogin" hidden>متابعة باستخدام Google</button>
        <button type="button" class="wlq-auth-secondary" id="wlqAuthRetry" hidden>إعادة المحاولة</button>
        <button type="button" class="wlq-auth-secondary" id="wlqAuthSignOut" hidden>تسجيل الخروج</button>
        <div class="wlq-auth-note" id="wlqAuthNote"></div>
      </main>`;
    document.body.appendChild(gateEl);
    gateEl.querySelector('#wlqGoogleLogin')?.addEventListener('click',signInGoogle);
    gateEl.querySelector('#wlqAuthRetry')?.addEventListener('click',()=>location.reload());
    gateEl.querySelector('#wlqAuthSignOut')?.addEventListener('click',signOut);
    return gateEl;
  }
  function setGate({state='',note='',login=false,retry=false,signout=false,kind=''}){
    const gate=ensureGate();
    gate.dataset.kind=kind||'';
    const stateEl=gate.querySelector('#wlqAuthState'),noteEl=gate.querySelector('#wlqAuthNote');
    if(stateEl)stateEl.textContent=state;
    if(noteEl)noteEl.textContent=note;
    const bLogin=gate.querySelector('#wlqGoogleLogin'),bRetry=gate.querySelector('#wlqAuthRetry'),bOut=gate.querySelector('#wlqAuthSignOut');
    if(bLogin)bLogin.hidden=!login;if(bRetry)bRetry.hidden=!retry;if(bOut)bOut.hidden=!signout;
    gate.classList.remove('wlq-auth-hidden');
    document.documentElement.classList.add('wlq-auth-locked');
    document.getElementById('splash')?.classList.add('hide');
  }
  function unlockGate(){
    ensureGate().classList.add('wlq-auth-hidden');
    document.documentElement.classList.remove('wlq-auth-locked');
    clearOAuthUrl();
  }
  async function signInGoogle(){
    const sb=getClient();
    if(!sb){setGate({state:'تعذر تحميل خدمة تسجيل الدخول.',note:'تحقق من اتصال الإنترنت ثم أعد المحاولة.',retry:true,kind:'error'});return;}
    setGate({state:'جارٍ فتح تسجيل الدخول باستخدام Google…',kind:'loading'});
    const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:CONFIG.siteUrl,queryParams:{prompt:'select_account'}}});
    if(error)setGate({state:'تعذر بدء تسجيل الدخول.',note:error.message||'حدث خطأ غير متوقع.',login:true,retry:true,kind:'error'});
  }
  function clearSupabaseLocalSession(){
    try{
      const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k===`sb-${PROJECT_REF}-auth-token`||k.startsWith(`sb-${PROJECT_REF}-auth-token`)))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));
    }catch(_){ }
  }
  async function signOut(){
    trustedClear();access=null;onlineVerified=false;
    const sb=getClient();
    try{if(sb)await sb.auth.signOut({scope:'local'});}catch(_){ }
    clearSupabaseLocalSession();
    location.replace(CONFIG.siteUrl);
  }
  async function fetchProfile(user){
    const sb=getClient();
    if(!sb)throw new Error('AUTH_LIBRARY_UNAVAILABLE');
    const {data,error}=await sb.from('app_users').select('user_id,email,display_name,role,status,created_at,approved_at').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('ACCESS_PROFILE_MISSING');
    return data;
  }
  function profileFromTrusted(t){return {user_id:t.userId,email:t.email,display_name:t.displayName||'',role:t.role||'teacher',status:'active',offline:true};}
  async function useTrustedFallback(reason=''){
    const t=trustedRead();
    if(!t)return false;
    access=profileFromTrusted(t);onlineVerified=false;unlockGate();
    document.documentElement.dataset.wlqAuth='offline-trusted';
    if(reason)console.warn('[auth] using trusted-device offline fallback:',reason);
    return true;
  }
  async function beforeAppInit(){
    ensureGate();
    setGate({state:'جارٍ التحقق من الحساب…',kind:'loading'});
    const sb=getClient();
    if(!sb){
      if(await useTrustedFallback('Supabase client unavailable'))return true;
      setGate({state:'يلزم الاتصال بالإنترنت لتسجيل الدخول أول مرة.',note:'بعد اعتماد هذا الجهاز يمكن فتح التطبيق بدون إنترنت.',retry:true,kind:'offline'});
      return false;
    }
    try{
      const {data,error}=await sb.auth.getSession();
      if(error)throw error;
      const session=data?.session;
      if(!session?.user){
        trustedClear();
        setGate({state:'سجّل الدخول للوصول إلى التطبيق',note:'الدخول متاح فقط للحسابات المعتمدة من إدارة We Live Quran.',login:true,kind:'login'});
        return false;
      }
      let profile;
      try{profile=await fetchProfile(session.user);}catch(err){
        if(!navigator.onLine&&await useTrustedFallback(err.message))return true;
        const transient=/fetch|network|Failed to fetch/i.test(String(err?.message||err));
        if(transient&&await useTrustedFallback(err.message))return true;
        throw err;
      }
      access=profile;
      if(profile.status!=='active'){
        trustedClear();
        if(profile.status==='blocked') setGate({state:'تم إيقاف هذا الحساب',note:'تواصل مع إدارة We Live Quran إذا كنت تعتقد أن هذا الإجراء غير صحيح.',signout:true,kind:'blocked'});
        else setGate({state:'الحساب في انتظار التفعيل',note:`تم تسجيل ${profile.email||session.user.email||'الحساب'} بنجاح. سيصبح التطبيق متاحًا بعد موافقة الإدارة.`,signout:true,retry:true,kind:'pending'});
        return false;
      }
      trustedWrite(profile);onlineVerified=true;unlockGate();document.documentElement.dataset.wlqAuth='verified';return true;
    }catch(err){
      console.error('[auth] startup check failed',err);
      if(await useTrustedFallback(err?.message||String(err)))return true;
      const missing=/relation .*app_users|ACCESS_PROFILE_MISSING|schema cache|42P01/i.test(String(err?.message||err));
      setGate({state:missing?'إعداد قاعدة بيانات الدخول غير مكتمل':'تعذر التحقق من الحساب',note:missing?'يلزم تشغيل ملف إعداد Supabase الخاص بالإصدار 10.1.4 أولًا.':'تحقق من الإنترنت ثم أعد المحاولة.',retry:true,signout:true,kind:'error'});
      return false;
    }
  }
  function userLabel(){if(!access)return '';return access.display_name||access.email||'';}
  function injectHeaderUser(){
    const host=document.querySelector('.hdr-actions');if(!host||document.getElementById('wlqUserMenu'))return;
    const wrap=document.createElement('div');wrap.id='wlqUserMenu';wrap.className='wlq-user-menu';
    wrap.innerHTML=`<button class="hdr-btn wlq-user-btn" type="button" title="الحساب" aria-label="الحساب">👤</button><div class="wlq-user-pop" hidden><strong>${esc(userLabel())}</strong><span>${access?.role==='owner'?'المالك':'محفظ'}</span>${onlineVerified?'':'<em>وضع Offline موثوق</em>'}<button type="button" data-auth-signout>تسجيل الخروج</button></div>`;
    host.prepend(wrap);const btn=wrap.querySelector('.wlq-user-btn'),pop=wrap.querySelector('.wlq-user-pop');btn.addEventListener('click',e=>{e.stopPropagation();pop.hidden=!pop.hidden;});wrap.querySelector('[data-auth-signout]').addEventListener('click',signOut);document.addEventListener('click',e=>{if(!wrap.contains(e.target))pop.hidden=true;});
  }
  async function loadAdminUsers(){
    if(access?.role!=='owner'||!adminCard)return;
    const list=adminCard.querySelector('[data-auth-users]');if(!list)return;
    if(!navigator.onLine){list.innerHTML='<div class="wlq-access-empty">إدارة المستخدمين تحتاج اتصالًا بالإنترنت.</div>';return;}
    const sb=getClient();if(!sb){list.innerHTML='<div class="wlq-access-empty">تعذر تحميل خدمة الدخول.</div>';return;}
    list.innerHTML='<div class="wlq-access-empty">جارٍ تحميل المستخدمين…</div>';
    const {data,error}=await sb.from('app_users').select('user_id,email,display_name,role,status,created_at,approved_at').order('created_at',{ascending:true});
    if(error){list.innerHTML=`<div class="wlq-access-empty">تعذر التحميل: ${esc(error.message)}</div>`;return;}
    list.innerHTML=(data||[]).map(u=>{
      const self=u.user_id===access.user_id;
      return `<div class="wlq-access-row"><div><b>${esc(u.display_name||u.email||'مستخدم')}</b><small>${esc(u.email||'')}</small><span class="wlq-status wlq-${esc(u.status)}">${u.status==='active'?'نشط':u.status==='blocked'?'موقوف':'في الانتظار'}</span>${u.role==='owner'?'<span class="wlq-role">Owner</span>':''}</div><div class="wlq-access-actions">${self?'<small>حسابك</small>':`<button type="button" data-user="${esc(u.user_id)}" data-status="active">تفعيل</button><button type="button" data-user="${esc(u.user_id)}" data-status="blocked">إيقاف</button>`}</div></div>`;
    }).join('')||'<div class="wlq-access-empty">لا يوجد مستخدمون.</div>';
    list.querySelectorAll('button[data-user]').forEach(btn=>btn.addEventListener('click',()=>setUserStatus(btn.dataset.user,btn.dataset.status)));
  }
  async function setUserStatus(userId,status){
    if(access?.role!=='owner'||!['active','blocked','pending'].includes(status))return;
    const sb=getClient();if(!sb)return;
    const patch={status,approved_at:status==='active'?new Date().toISOString():null};
    const {error}=await sb.from('app_users').update(patch).eq('user_id',userId);
    if(error){alert('تعذر تحديث المستخدم: '+error.message);return;}await loadAdminUsers();
  }
  function injectAdminCard(){
    if(access?.role!=='owner'||adminCard)return;
    const pg=document.getElementById('pg-settings');if(!pg)return;
    adminCard=document.createElement('div');adminCard.className='card wlq-access-card';adminCard.id='wlqAccessAdmin';
    adminCard.innerHTML=`<div class="ch">👥 صلاحيات الدخول</div><p class="txt-mut mb8" style="font-size:12px">أي حساب Google جديد يبدأ بحالة «في الانتظار». فعّل فقط المحفظين المصرح لهم باستخدام التطبيق.</p><div class="settings-actions mb8"><button type="button" class="btn btn-out btn-sm" data-auth-refresh>تحديث المستخدمين</button></div><div data-auth-users></div>`;
    pg.prepend(adminCard);adminCard.querySelector('[data-auth-refresh]').addEventListener('click',loadAdminUsers);loadAdminUsers();
  }
  async function afterAppInit(){injectHeaderUser();injectAdminCard();}
  async function getAccessToken(){
    const sb=getClient();if(!sb)return '';
    try{return (await sb.auth.getSession())?.data?.session?.access_token||'';}catch(_){return '';}
  }
  function isActive(){return access?.status==='active';}
  function isOwner(){return isActive()&&access?.role==='owner';}

  globalThis.WeLiveQuranAuth={config:CONFIG,beforeAppInit,afterAppInit,signInGoogle,signOut,getAccessToken,getClient,getAccess:()=>access,isActive,isOwner,loadAdminUsers};
})();
