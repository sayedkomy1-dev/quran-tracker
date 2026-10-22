'use strict';
/* Beta17 — One reversible surah chooser for the three official lesson assignments.
   Keep existing input values and fillAyah()/scheduleDraftSave() as the save contract. */
(function(g){
  const KEYS=['new','rec','far'];
  const $=id=>document.getElementById(id);
  const normalize=s=>String(s||'').normalize('NFKD')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'')
    .replace(/[آأإٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/^\s*سور[هة]\s+/,'').replace(/\s+/g,' ').trim();
  const isMobile=()=>matchMedia('(max-width:799px)').matches;
  const picker=key=>$(`${key}-surah-dropdown`);
  function place(key){
    const el=picker(key);if(!el?.classList.contains('open'))return;
    const v=window.visualViewport, h=Math.max(180,Math.round(v?.height||innerHeight));
    const top=Math.max(0,Math.round(v?.offsetTop||0));
    // Fit the complete picker above Android's virtual keyboard.
    Object.assign(el.style,{position:'fixed',top:top+'px',left:'0px',right:'0px',bottom:'auto',width:'100%',height:h+'px',maxHeight:'none'});
    el.style.setProperty('--surah-usable',Math.max(135,h-30)+'px');
  }
  function close(key){
    const el=picker(key);if(!el)return;
    el.classList.remove('open','open-up');$(key+'-s')?.setAttribute('aria-expanded','false');
    if(el.contains(document.activeElement))document.activeElement.blur();
  }
  function pick(key,index){
    if(!S[index])return;
    const input=$(key+'-s');if(!input)return;
    input.value=S[index].n;input.dataset.userTouched='1';
    fillAyah(key);scheduleDraftSave();close(key);
  }
  function filter(key){
    const el=picker(key), list=el?.querySelector('.ia-surah-items');if(!list)return;
    const q=normalize(el.querySelector('.ia-surah-search').value);
    const selected=normalize($(key+'-s')?.value);
    const escHtml=g.ImamApp?.Utils?.escapeHtml||g.esc;
    const items=S.map((s,i)=>({s,i,name:normalize(s.n)}))
      .filter(x=>!q||x.name.includes(q)||String(x.i+1).startsWith(q));
    list.innerHTML=items.map(({s,i,name})=>`<button type="button" role="option" data-surah-index="${i}" aria-selected="${name===selected}"><span class="ia-surah-no">${i+1}</span><span class="ia-surah-name">${escHtml(s.n)}</span><small>${s.a} آية</small></button>`).join('')||'<p class="ia-surah-empty">لا توجد سورة بهذا الاسم؛ جرّب جزءًا من الكلمة.</p>';
  }
  function ensure(key){
    const el=picker(key);if(!el||el.dataset.surah17==='ready')return;
    el.dataset.surah17='ready';el.classList.add('ia-surah-picker');
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','اختيار السورة');
    el.innerHTML=`<div class="ia-surah-sheet" dir="rtl">
      <header class="ia-surah-head"><div><b>اختر السورة</b><small>١١٤ سورة مرتبة حسب المصحف</small></div><button type="button" class="ia-surah-close" aria-label="إغلاق القائمة">✕</button></header>
      <label for="ia-surah-query-${key}">اكتب اسم السورة أو رقمها</label>
      <input type="search" class="ia-surah-search" id="ia-surah-query-${key}" inputmode="search" autocomplete="off" spellcheck="false" placeholder="ابحث عن سورة…">
      <div class="ia-surah-items" role="listbox" aria-label="أسماء السور"></div>
      <footer>اختر السورة لكتابة اسمها في تكليف الحصة</footer>
    </div>`;
    el.addEventListener('click',e=>{
      // The legacy v8 document-level click listener would otherwise close the menu immediately.
      e.stopPropagation();
      if(e.target===el||e.target.closest('.ia-surah-close')){close(key);return;}
      const option=e.target.closest('[data-surah-index]');
      if(option)pick(key,Number(option.dataset.surahIndex));
    });
    el.querySelector('.ia-surah-search').addEventListener('input',()=>filter(key));
    el.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close(key);}
      if(e.key==='Enter'&&e.target.classList.contains('ia-surah-search')){
        const first=el.querySelector('[data-surah-index]');
        if(first){e.preventDefault();pick(key,Number(first.dataset.surahIndex));}
      }
    });
  }
  function open(key){
    KEYS.filter(k=>k!==key).forEach(close);
    const el=picker(key),field=$(key+'-s');if(!el||!field)return;
    ensure(key);el.classList.add('open');field.setAttribute('aria-expanded','true');
    el.querySelector('.ia-surah-search').value='';filter(key);place(key);
    // Do NOT focus any search field: opening the list must never summon Gboard.
  }
  function toggle(key){picker(key)?.classList.contains('open')?close(key):open(key);}
  function init(){
    for(const key of KEYS){
      const field=$(key+'-s'),el=picker(key),btn=field?.closest('.surah-combo')?.querySelector('.surah-drop-btn');
      if(!field||!el||!btn)continue;
      if(el.parentNode!==document.body)document.body.appendChild(el);
      if(isMobile()){field.readOnly=true;field.setAttribute('aria-label','اختيار السورة والبحث عنها');}
      field.setAttribute('role','combobox');field.setAttribute('aria-haspopup','dialog');
      field.setAttribute('aria-controls',el.id);field.setAttribute('aria-expanded','false');
      btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls',el.id);
      // The inline onclick uses our overridden toggle; clicking the name opens the same chooser.
      field.addEventListener('click',()=>open(key));
      ensure(key);
    }
    const update=()=>KEYS.forEach(place);
    window.addEventListener('resize',update,{passive:true});
    window.visualViewport?.addEventListener('resize',update,{passive:true});
    window.visualViewport?.addEventListener('scroll',update,{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')KEYS.forEach(close);});
  }
  const legacy=g.ImamApp?.Legacy;
  for(const [name,fn] of Object.entries({openSurahDropdown:open,closeSurahDropdown:close,
    toggleSurahDropdown:toggle,filterSurahDropdown:filter,selectSurahOption:pick})){
    if(legacy)legacy.override(name,fn,'surah-picker-beta17');else g[name]=fn;
  }
  // v10's init runs at DOMContentLoaded +50ms; we initialize after that.
  document.addEventListener('DOMContentLoaded',()=>setTimeout(init,85));
  g.ImamSurahPicker17={normalize,open,close,filter,pick,place};
})(globalThis);
