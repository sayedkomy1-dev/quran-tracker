'use strict';
/* أكاديمية الإمام v11.0 — Premium UI Foundation.
   Presentation/connectivity only; does not mutate student/session data. */
(function initV11UI(g){
  const VERSION='11.0.0';
  const UI={version:VERSION};

  function ensureHeaderStatus(){
    const actions=document.querySelector('.hdr-actions');
    if(!actions||document.getElementById('v11Connectivity'))return;
    const pill=document.createElement('div');
    pill.id='v11Connectivity';
    pill.className='v11-connectivity';
    pill.setAttribute('role','status');
    pill.setAttribute('aria-live','polite');
    pill.innerHTML='<i aria-hidden="true"></i><span id="v11ConnectivityText">متصل</span>';
    actions.insertBefore(pill,actions.firstChild);
  }

  function updateConnectivity(){
    ensureHeaderStatus();
    const pill=document.getElementById('v11Connectivity');
    const text=document.getElementById('v11ConnectivityText');
    if(!pill||!text)return;
    const online=navigator.onLine!==false;
    pill.dataset.state=online?'online':'offline';
    text.textContent=online?'متصل':'محلي';
    pill.title=online?'الاتصال متاح — المزامنة السحابية تعمل عند تفعيلها':'بدون إنترنت — العمل محفوظ على هذا الجهاز';
  }

  function enhanceHome(){
    const home=document.getElementById('pg-home');
    if(home)home.dataset.v11='premium';
  }

  function apply(){
    document.body.classList.add('v11-ready');
    document.documentElement.dataset.uiVersion=VERSION;
    ensureHeaderStatus();
    updateConnectivity();
    enhanceHome();
  }

  function wrapHomeRenderer(){
    const base=g.renderV9Home;
    if(typeof base!=='function'||base.__v11Wrapped)return;
    function wrapped(){const result=base.apply(this,arguments);enhanceHome();return result;}
    wrapped.__v11Wrapped=true;
    g.renderV9Home=wrapped;
  }

  g.addEventListener('online',updateConnectivity);
  g.addEventListener('offline',updateConnectivity);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();wrapHomeRenderer();},{once:true});
  else {apply();wrapHomeRenderer();}
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.V11UI=Object.freeze({...UI,updateConnectivity,apply});
})(globalThis);
