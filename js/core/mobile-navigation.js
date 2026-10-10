'use strict';
/* We Live Quran v10.10.0 — Stage 4 Mobile Navigation & Back.
   Browser/PWA history routing for Android/iOS hardware Back gestures.
   No data/schema changes. */
(function(g){
  const NAV_KEY='__wlqMobileNav';
  const KIND_PAGE='page';
  const KIND_GUARD='guard';
  let installed=false;
  let restoring=false;
  let baseGoPage=null;
  let baseGoBack=null;
  let seq=0;
  let exitPromptAt=0;

  function appPage(){
    const el=g.document?.querySelector?.('.pg.on');
    const id=String(el?.id||'');
    return id.startsWith('pg-')?id.slice(3):'home';
  }
  function state(kind,page){return {[NAV_KEY]:1,kind,page:page||'',seq:seq++};}
  function isOurState(x){return !!(x&&x[NAV_KEY]===1);}
  function notify(message){
    try{if(typeof g.toast==='function')return g.toast(message,'info');}catch(_){ }
    try{if(g.navigator?.vibrate)g.navigator.vibrate(25);}catch(_){ }
  }
  function pushPage(page,{force=false}={}){
    page=String(page||appPage()||'home');
    const cur=g.history?.state;
    if(!force&&isOurState(cur)&&cur.kind===KIND_PAGE&&cur.page===page)return cur;
    const next=state(KIND_PAGE,page);
    g.history.pushState(next,'',g.location.href);
    return next;
  }
  function restorePage(page){
    page=String(page||'home');
    if(appPage()===page)return;
    restoring=true;
    try{baseGoPage?.call(g,page);}finally{restoring=false;}
  }
  function callCloser(name){
    try{if(typeof g[name]==='function'){g[name]();return true;}}catch(err){console.warn('[mobile-nav] closer failed',name,err);}
    return false;
  }
  function visible(el){
    if(!el)return false;
    if(el.hidden)return false;
    try{const s=g.getComputedStyle?.(el);if(s&&(s.display==='none'||s.visibility==='hidden'))return false;}catch(_){ }
    return true;
  }
  function topClosable(){
    const d=g.document;if(!d)return null;
    const accountPop=[...d.querySelectorAll('.wlq-user-pop:not([hidden])')].filter(visible).pop();
    if(accountPop)return {kind:'account-pop',el:accountPop};
    const dropdown=[...d.querySelectorAll('.surah-dropdown.open')].filter(visible).pop();
    if(dropdown)return {kind:'dropdown',el:dropdown};

    const reader=d.getElementById('v1053TeacherMushaf');
    if(reader?.classList.contains('open')){
      const drawer=[
        d.getElementById('v1054SurahDrawer'),
        d.getElementById('v1055JuzDrawer'),
        d.getElementById('v1055QuickMenu')
      ].filter(x=>x?.classList.contains('open')&&visible(x)).pop();
      if(drawer)return {kind:'mushaf-drawer',el:drawer};
    }

    const modals=[...d.querySelectorAll('.mo.open')].filter(visible);
    if(modals.length)return {kind:'modal',el:modals[modals.length-1]};
    if(reader?.classList.contains('open')&&visible(reader))return {kind:'mushaf-reader',el:reader};
    return null;
  }
  function closeClosable(item){
    if(!item?.el)return false;
    const el=item.el,id=String(el.id||'');
    if(item.kind==='account-pop'){el.hidden=true;return true;}
    if(item.kind==='dropdown'){
      el.classList.remove('open','open-up');
      el.style.maxHeight='';
      return true;
    }
    if(item.kind==='mushaf-drawer'){
      const map={v1054SurahDrawer:'closeTeacherSurahMenu',v1055JuzDrawer:'closeTeacherJuzMenu',v1055QuickMenu:'closeTeacherQuickMenu'};
      if(callCloser(map[id]))return true;
      el.classList.remove('open');el.setAttribute('aria-hidden','true');return true;
    }
    if(item.kind==='mushaf-reader'){
      if(callCloser('closeTeacherMushafReader'))return true;
      el.classList.remove('open');el.setAttribute('aria-hidden','true');g.document.body?.classList.remove('v1053-reader-open');return true;
    }
    const closers={
      stModal:'closeMo',taskModal:'closeTaskModal',quickSearchModal:'closeQuickSearch',quranTextModal:'closeQuranTextModal',
      v9MoreSheet:'closeV9More',v9UtilityModal:'closeUtilityModal',broadcastModal:'closeBroadcastComposer',
      v1010PortalModal:'v1010ClosePortalPicker'
    };
    if(closers[id]&&callCloser(closers[id]))return true;
    el.classList.remove('open');el.setAttribute('aria-hidden','true');return true;
  }
  function resetHistoryRoot(){
    const initial=appPage();
    const prior=(g.history.state&&typeof g.history.state==='object')?g.history.state:{};
    g.history.replaceState({...prior,...state(KIND_GUARD,'home')},'',g.location.href);
    g.history.pushState(state(KIND_PAGE,'home'),'',g.location.href);
    if(initial&&initial!=='home')g.history.pushState(state(KIND_PAGE,initial),'',g.location.href);
  }
  function handlePop(event){
    const overlay=topClosable();
    if(overlay){
      closeClosable(overlay);
      // The browser already moved one entry backward. Re-add the current visual
      // page so this Back press is consumed by dismissing the overlay only.
      pushPage(appPage(),{force:true});
      return;
    }

    const s=event.state;
    if(isOurState(s)&&s.kind===KIND_PAGE){
      restorePage(s.page||'home');
      return;
    }
    if(isOurState(s)&&s.kind===KIND_GUARD){
      if(appPage()!=='home'){
        restorePage('home');
        pushPage('home',{force:true});
        return;
      }
      exitPromptAt=Date.now();
      notify('اضغط رجوع مرة أخرى للخروج');
      // Stay on the guard entry for a short window: a second physical Back now
      // leaves naturally. If the user does not press Back again, re-arm Home.
      setTimeout(()=>{
        const s2=g.history.state;
        if(isOurState(s2)&&s2.kind===KIND_GUARD&&appPage()==='home'&&Date.now()-exitPromptAt>=1750){
          exitPromptAt=0;
          pushPage('home',{force:true});
        }
      },1900);
      return;
    }
    // Unknown/external history entry: keep the user at Home once before leaving.
    if(appPage()!=='home'){
      restorePage('home');
      pushPage('home',{force:true});
    }
  }
  function install(){
    if(installed)return true;
    if(typeof g.goPage!=='function'||!g.history?.pushState||!g.document)return false;
    installed=true;
    baseGoPage=g.goPage;
    baseGoBack=typeof g.goBack==='function'?g.goBack:null;

    g.goPage=function(page){
      const before=appPage();
      const result=baseGoPage.apply(this,arguments);
      const after=appPage()||String(page||before);
      if(!restoring&&after!==before)pushPage(after);
      return result;
    };
    g.goBack=function(){
      const overlay=topClosable();
      if(overlay){closeClosable(overlay);return;}
      const s=g.history.state;
      if(isOurState(s)){g.history.back();return;}
      if(baseGoBack)return baseGoBack.apply(this,arguments);
      restorePage('home');
    };

    resetHistoryRoot();
    g.addEventListener('popstate',handlePop);
    g.ImamApp=g.ImamApp||{};
    g.ImamApp.MobileNavigation=Object.freeze({activePage:appPage,topClosable,closeTop:()=>{const x=topClosable();return x?closeClosable(x):false;},installed:()=>installed});
    return true;
  }
  function boot(){
    if(g.document?.documentElement?.classList?.contains('wlq-auth-locked')){setTimeout(boot,500);return;}
    if(!install())setTimeout(boot,180);
  }
  if(g.document?.readyState==='complete')setTimeout(boot,180);
  else g.addEventListener('load',()=>setTimeout(boot,180),{once:true});
})(globalThis);
