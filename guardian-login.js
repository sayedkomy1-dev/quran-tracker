'use strict';
/* We Live Quran v10.10.0 — Guardian Phone + PIN Login (Stage 3).
   Public page: no teacher auth bootstrap and no direct table access. */
(function guardianPhoneLogin(){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const form=document.getElementById('guardianLoginForm');
  const phone=document.getElementById('guardianPhone');
  const pin=document.getElementById('guardianPin');
  const submit=document.getElementById('guardianLoginSubmit');
  const state=document.getElementById('guardianLoginState');

  function setState(kind,text){state.className=`guardian-login-state ${kind||''}`;state.textContent=text||'';}
  function normalizeForDisplay(value){
    let v=String(value||'').replace(/[^0-9]/g,'');
    if(v.startsWith('0020'))v=v.slice(2);
    if(/^20(10|11|12|15)\d{8}$/.test(v))return '0'+v.slice(2);
    return v;
  }
  function validPhone(value){return /^01(0|1|2|5)\d{8}$/.test(normalizeForDisplay(value));}
  function validPin(value){return /^\d{6}$/.test(String(value||''));}
  async function rpc(name,args){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(args||{})
    });
    if(!res.ok){let msg='';try{msg=(await res.json())?.message||'';}catch(_){}throw new Error(msg||`HTTP_${res.status}`);}
    return res.json();
  }
  async function login(e){
    e.preventDefault();
    const phoneValue=normalizeForDisplay(phone.value),pinValue=String(pin.value||'').replace(/\D/g,'').slice(0,6);
    phone.value=phoneValue;pin.value=pinValue;
    if(!validPhone(phoneValue)){setState('error','اكتب رقم هاتف مصري صحيح مثل 01xxxxxxxxx.');phone.focus();return;}
    if(!validPin(pinValue)){setState('error','رمز الدخول يجب أن يتكوّن من 6 أرقام.');pin.focus();return;}
    submit.disabled=true;setState('loading','جارٍ التحقق من بيانات الدخول…');
    try{
      const out=await rpc('guardian_portal_login',{p_phone:phoneValue,p_pin:pinValue});
      if(!out?.ok){
        if(out?.error==='TOO_MANY_ATTEMPTS')setState('error','تم إيقاف المحاولات مؤقتًا لكثرة المحاولات غير الصحيحة. حاول بعد 15 دقيقة.');
        else setState('error','رقم الهاتف أو رمز الدخول غير صحيح.');
        return;
      }
      const token=String(out.session_token||'');
      if(!/^[0-9a-f-]{36}$/i.test(token))throw new Error('INVALID_SESSION');
      setState('success','تم التحقق بنجاح — جارٍ فتح صفحة الطالب…');
      const target=new URL('guardian-portal.html',location.href);target.hash='s='+token;
      location.replace(target.toString());
    }catch(err){
      console.warn('[guardian login]',err);
      setState('error',navigator.onLine===false?'لا يوجد اتصال بالإنترنت. تسجيل الدخول يحتاج اتصالًا بالإنترنت.':'تعذر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل.');
    }finally{submit.disabled=false;}
  }
  phone.addEventListener('blur',()=>{phone.value=normalizeForDisplay(phone.value);});
  pin.addEventListener('input',()=>{pin.value=pin.value.replace(/\D/g,'').slice(0,6);});
  form.addEventListener('submit',login);
})();
