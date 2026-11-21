/* Guest-only visual preference; independent from guardian login and student records. */
(function(){'use strict';
 const root=document.documentElement;if(!root.hasAttribute('data-guest-practice'))return;
 const key='imam_guest_palette_v1';let mode='dark';
 try{if(localStorage.getItem(key)==='light')mode='light';}catch(_){}
 function apply(){root.dataset.portalTheme=mode;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=mode==='dark'?'#202329':'#167347';const b=document.getElementById('guestThemeToggle');if(b){b.textContent=mode==='dark'?'☀ نهاري':'☾ ليلي';b.setAttribute('aria-pressed',String(mode==='dark'));}}
 apply();
 function init(){apply();const b=document.getElementById('guestThemeToggle');if(b)b.addEventListener('click',()=>{mode=mode==='dark'?'light':'dark';try{localStorage.setItem(key,mode);}catch(_){}apply();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
