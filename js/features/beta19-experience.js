'use strict';
/* Beta19: optional, accessible UI feedback. Never play during lessons/board/audio recording. */
(function(g){
 const d=g.document;if(!d)return;
 const KEY='imam:ui-tap:v1', VOLUME='imam:ui-tap-level:v1';
 let ctx=null;
 function pref(key,fallback){try{return g.localStorage.getItem(key)||fallback;}catch(_){return fallback;}}
 function init(){
  const page=d.getElementById('pg-settings');
  if(page&&!d.getElementById('beta19SoundSettings')){
   const section=d.createElement('section');section.id='beta19SoundSettings';section.className='beta19-sound-pref';section.dir='rtl';
   section.innerHTML='<b>🔈 صوت التفاعل مع الأزرار</b><label><input type="checkbox" id="beta19TapEnable"> تفعيل صوت ضغط هادئ (اختياري)</label><label for="beta19TapVolume">مستوى الصوت</label><input type="range" id="beta19TapVolume" min="1" max="4" step="1" value="2" aria-label="مستوى صوت الأزرار"><small>متوقف افتراضيًا، وصامت أثناء الحصة والسبورة والتسجيل والتلاوة.</small>';
   page.prepend(section);
   const enabled=d.getElementById('beta19TapEnable'),volume=d.getElementById('beta19TapVolume');
   enabled.checked=pref(KEY,'off')==='on';volume.value=pref(VOLUME,'2');
   enabled.addEventListener('change',()=>{try{g.localStorage.setItem(KEY,enabled.checked?'on':'off');}catch(_){}});
   volume.addEventListener('change',()=>{try{g.localStorage.setItem(VOLUME,volume.value);}catch(_){}});
  }
  d.addEventListener('click',e=>{
   if(pref(KEY,'off')!=='on'||g.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
   if(d.getElementById('pg-session')?.classList.contains('on')||d.getElementById('imam-board-root'))return;
   if([...d.querySelectorAll('audio')].some(a=>a.paused===false))return;
   const b=e.target.closest('button,[role="button"]');if(!b||b.disabled||b.closest('.surah-dropdown,.mo,[role="dialog"]'))return;
   const Context=g.AudioContext||g.webkitAudioContext;if(!Context)return;
   try{ctx=ctx||new Context();if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(680,now);osc.frequency.exponentialRampToValueAtTime(510,now+.045);
    const amplitude=.006*Math.min(4,Math.max(1,Number(pref(VOLUME,'2'))||2));
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(amplitude,now+.007);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);
    osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.07);
   }catch(_){/* Audio is optional, never interrupt navigation. */}
  },{passive:true});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
