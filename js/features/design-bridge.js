/* Imam design bridge — UI only; never creates students, teachers, circles, or sessions.
   All navigation to internal modules goes through the existing functions. */
(function(){
  'use strict';
  const KEY='imam_design_bridge_enabled_v1';
  const optOut = (()=>{try{return localStorage.getItem(KEY)==='off'}catch(_){return false}})();
  if(optOut) document.body.classList.remove('imam-design-bridge');
  const $=(s)=>document.querySelector(s);
  const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
  function refreshToggle(){
    const b=$('#imamDesignToggle');if(!b)return;
    const enabled=document.body.classList.contains('imam-design-bridge');
    b.textContent=enabled?'◫':'◧';
    b.setAttribute('title',enabled?'التبديل إلى المظهر السابق':'تفعيل التصميم الجديد');
    b.setAttribute('aria-label',b.getAttribute('title'));
    b.setAttribute('aria-pressed',String(enabled));
  }
  function toggleDesign(){
    const enabled=document.body.classList.toggle('imam-design-bridge');
    try{localStorage.setItem(KEY,enabled?'on':'off')}catch(_){/* No impact on application data */}
    refreshToggle();
  }
  function addHeaderToggle(){
    if($('#imamDesignToggle'))return;
    const parent=$('.hdr-actions');if(!parent)return;
    const b=element('button','hdr-btn imam-ui-toggle');b.id='imamDesignToggle';
    b.type='button';b.addEventListener('click',toggleDesign);
    parent.insertBefore(b,parent.firstChild);refreshToggle();
  }
  function addHomeBridge(){
    const home=$('#pg-home');if(!home||$('#imamBridgeHero'))return;
    const hero=element('section','imam-bridge-hero');hero.id='imamBridgeHero';
    hero.setAttribute('aria-label','مساحة العمل الرئيسية');
    const copy=element('div','imam-bridge-copy');
    copy.appendChild(element('span','imam-bridge-eyebrow','✦ مساحة عمل المحفظ'));
    copy.appendChild(element('h2','', 'بالقرآن نحيا… وبالإتقان نرتقي'));
    copy.appendChild(element('p','', 'الحصص، وملفات الطلاب، والمراجعات، وأولياء الأمور في مساحة منظمة واحدة؛ باستخدام سجلات الأكاديمية المعتمدة.'));
    const actions=element('div','imam-bridge-hero-actions');
    const session=element('button','','📖 ابدأ الحصة');session.type='button';session.addEventListener('click',()=>{if(typeof goPage==='function')goPage('session')});
    const board=element('button','','🖍️ سبورة الإمام');board.type='button';board.addEventListener('click',()=>{
      const n=$('#imamSmartBoardTab');if(n&&getComputedStyle(n).display!=='none')n.click();
      else if(window.ImamApp?.SmartBoard?.open)window.ImamApp.SmartBoard.open();
    });
    const portal=element('a','','👨‍👩‍👧 بوابات الأكاديمية');portal.href='academy-portals.html';
    actions.append(session,board,portal);hero.append(copy,actions);
    home.insertBefore(hero,home.firstChild);
    const section=element('section','imam-bridge-section');section.id='imamBridgePortals';
    const head=element('div','imam-bridge-titleline');head.appendChild(element('h2','','بوابات وخدمات الأكاديمية'));
    const all=element('a','','عرض جميع البوابات');all.href='academy-portals.html';head.appendChild(all);
    const grid=element('div','imam-bridge-portal-grid');
    const items=[
      ['👨‍👩‍👧','بوابة ولي الأمر والطالب','دخول مصرح به إلى السجلات','guardian-login.html'],
      ['📖','القرآن والتدريب الحر','مصادر النص والتلاوة الموجودة','guest-practice.html'],
      ['🏛️','بوابات الأكاديمية','الوصول المنظم إلى الخدمات','academy-portals.html'],
    ];
    items.forEach(([ico,label,description,href])=>{
      const link=element('a','imam-bridge-portal-link');link.href=href;
      link.appendChild(element('span','imam-bridge-portal-icon',ico));
      const txt=element('span');txt.append(element('b','',label),element('small','',description));link.appendChild(txt);
      grid.appendChild(link);
    });
    section.append(head,grid);hero.insertAdjacentElement('afterend',section);
  }
  /* Organized workspace directory: proxies already-existing authorized navigation,
     and does not register parallel implementations or bypass data permissions. */
  const navGroups=[
    {title:'التعليم والحلقات',entries:[
      {label:'الرئيسية',emoji:'🏠',kind:'native',id:'home'},
      {label:'محرك الحصة',emoji:'📖',kind:'native',id:'session'},
      {label:'سبورة الإمام',emoji:'🖍️',kind:'existing',id:'imamSmartBoardTab'},
      {label:'إدارة الحلقات',emoji:'🏫',kind:'existing',id:'cmNavTab'},
      {label:'الحضور',emoji:'✅',kind:'more',id:'الحضور'},
    ]},
    {title:'شؤون الطلاب والتقييم',entries:[
      {label:'الطلاب وملفاتهم',emoji:'👥',kind:'more',id:'الطلاب'},
      {label:'تحديد المستوى',emoji:'📋',kind:'existing',id:'pcNavTab'},
      {label:'الاختبارات والإجازات',emoji:'🎓',kind:'existing',id:'ac1111Nav'},
      {label:'التقارير',emoji:'📊',kind:'more',id:'التقارير'},
    ]},
    {title:'الإدارة والخدمات',entries:[
      {label:'المهام',emoji:'☑️',kind:'more',id:'المهام'},
      {label:'إدارة أولياء الأمور',emoji:'👨‍👩‍👧',kind:'more',id:'إدارة ولي الأمر'},
      {label:'الإعدادات',emoji:'⚙️',kind:'more',id:'الإعدادات'},
      {label:'بوابات الأكاديمية',emoji:'🏛️',kind:'href',id:'academy-portals.html'},
    ]},
  ];
  function existingControl(item){
    if(item.kind==='native')return $(`#v9Nav .v9-nav-btn[data-page="${item.id}"]`);
    if(item.kind==='existing')return document.getElementById(item.id);
    if(item.kind==='more')return Array.from(document.querySelectorAll('#v9MoreGrid .v9-more-item'))
      .find(b=>b.querySelector('b')?.textContent?.trim()===item.id);
    return null;
  }
  function permitted(item){
    if(item.kind==='href')return true;
    const source=existingControl(item);if(!source)return false;
    // Account-specific navigation may remove or hide actions.
    if(source.hidden||source.getAttribute('aria-hidden')==='true'||source.style.display==='none')return false;
    return true;
  }
  function renderDirectory(){
    const body=$('#imamWorkspaceGroups');if(!body)return;
    body.replaceChildren();
    navGroups.forEach(group=>{
      const entries=group.entries.filter(permitted);if(!entries.length)return;
      const section=element('section','imam-workspace-group');
      section.appendChild(element('h3','',group.title));
      const links=element('div','imam-workspace-links');
      entries.forEach(item=>{
        const btn=element('button','imam-workspace-link',`${item.emoji}  ${item.label}`);
        btn.type='button';btn.addEventListener('click',()=>{
          if(item.kind==='href')window.location.assign(item.id);
          else {const source=existingControl(item);if(source&&permitted(item))source.click();}
          closeDirectory();
        });links.appendChild(btn);
      });
      section.appendChild(links);body.appendChild(section);
    });
  }
  let lastFocus=null;
  function closeDirectory(){
    const dialog=$('#imamWorkspaceDirectory');if(!dialog||dialog.hidden)return;
    dialog.hidden=true;document.body.classList.remove('imam-directory-open');
    if(lastFocus?.isConnected)lastFocus.focus();
  }
  function openDirectory(){
    const dialog=$('#imamWorkspaceDirectory');if(!dialog)return;
    lastFocus=document.activeElement;renderDirectory();dialog.hidden=false;
    document.body.classList.add('imam-directory-open');
    dialog.querySelector('.imam-workspace-close')?.focus();
  }
  function addDirectory(){
    if($('#imamWorkspaceDirectory'))return;
    const parent=$('.hdr-actions');if(!parent)return;
    const opener=element('button','hdr-btn imam-workspace-open','☷');
    opener.type='button';opener.id='imamWorkspaceOpen';
    opener.title='دليل مساحات الأكاديمية';opener.setAttribute('aria-label',opener.title);
    opener.addEventListener('click',openDirectory);
    parent.insertBefore(opener,parent.firstChild);
    const backdrop=element('div','imam-workspace-backdrop');backdrop.id='imamWorkspaceDirectory';
    backdrop.hidden=true;backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeDirectory()});
    const panel=element('div','imam-workspace-panel');panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','imamWorkspaceTitle');
    const titleRow=element('div','imam-workspace-title-row');
    const title=element('h2','', 'مساحات الأكاديمية');title.id='imamWorkspaceTitle';
    const close=element('button','imam-workspace-close','إغلاق ✕');close.type='button';close.addEventListener('click',closeDirectory);
    titleRow.append(title,close);
    const note=element('p','imam-workspace-note','اختر أداة من الأدوات الموجودة في حسابك. لا تنشئ هذه القائمة سجلات أو صلاحيات جديدة.');
    const groups=element('div','imam-workspace-groups');groups.id='imamWorkspaceGroups';
    panel.append(titleRow,note,groups);backdrop.appendChild(panel);document.body.appendChild(backdrop);
    document.addEventListener('keydown',e=>{
      if(backdrop.hidden)return;
      if(e.key==='Escape'){e.preventDefault();closeDirectory()}
      if(e.key==='Tab'){
        const controls=Array.from(panel.querySelectorAll('button:not([disabled])'));
        if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    });
  }
  function init(){addHeaderToggle();addHomeBridge();addDirectory()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.ImamDesignBridge=Object.freeze({toggle:toggleDesign});
})();
