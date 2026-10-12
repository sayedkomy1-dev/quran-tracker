'use strict';
/* Imam Academy v11.2.0 Stage 4 — guardian portal install + themes + quick navigation. */
(function guardianPortalExperience(g){
  const THEME_KEY='wlq_guardian_theme_v1';let installPrompt=null;
  function getTheme(){try{return localStorage.getItem(THEME_KEY)||'light';}catch(_){return'light';}}
  function applyTheme(theme,save=true){theme=['light','dark','kids'].includes(theme)?theme:'light';document.documentElement.dataset.portalTheme=theme;if(save){try{localStorage.setItem(THEME_KEY,theme);}catch(_){}}
    document.querySelectorAll('[data-portal-theme-btn]').forEach(b=>b.classList.toggle('active',b.dataset.portalThemeBtn===theme));
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#0e2f22':theme==='kids'?'#247a58':'#145A3A';
  }
  function toast(msg){if(typeof g.portalToast==='function')return g.portalToast(msg);let t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}
  async function install(){
    if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('البوابة مثبتة بالفعل على الهاتف');return;}
    if(installPrompt){installPrompt.prompt();try{await installPrompt.userChoice;}catch(_){}installPrompt=null;syncInstall();return;}
    toast('من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»');
  }
  function syncInstall(){document.querySelectorAll('[data-guardian-install]').forEach(b=>{b.hidden=!!(matchMedia('(display-mode: standalone)').matches||navigator.standalone);});}
  function scrollToId(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
  g.guardianSetTheme=applyTheme;g.guardianInstallPortal=install;g.guardianGoTo=scrollToId;
  applyTheme(getTheme(),false);
  g.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;syncInstall();});g.addEventListener('appinstalled',()=>{installPrompt=null;syncInstall();toast('تم تثبيت بوابة ولي الأمر ✓');});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applyTheme(getTheme(),false);syncInstall();},{once:true});else{applyTheme(getTheme(),false);syncInstall();}
})(globalThis);
