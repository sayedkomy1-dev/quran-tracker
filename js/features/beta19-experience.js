'use strict';
/* RC5 — One shared, lightweight UI-audio engine. A gesture is required.
 * Transition audio is distinct from ordinary taps, and never overlaps Quran,
 * recording or Imam Smart Board audio. No remote sound files and no timers.
 * Respect earlier manual sound preferences; legacy button engine is not duplicated. */
(function(g){
 const d=g.document;if(!d)return;
 const TAP='imam:ui-tap:v1',KEY=TAP,NAV='imam:ui-transition:v1',LEVEL='imam:ui-tap-level:v1',LESSON='imam:ui-tap-in-session:v1',LESSON_NAV='imam:ui-transition-in-session:v1';
 let context=null,lastAt=0;
 function read(k,fallback){try{const v=g.localStorage.getItem(k);return v===null?fallback:v;}catch(_){return fallback;}}
 const pref=read;
 function store(k,v){try{g.localStorage.setItem(k,v);}catch(_){} }
 function enabled(k,fallback){return read(k,fallback)==='on';}
 function protectedAudio(){
  if(d.getElementById('imam-board-root'))return true;
  if(d.querySelector('#voiceNoteBtn.recording,[data-recording="true"],.voice-btn.listening,.is-recording,[aria-label*="إيقاف التسجيل"]'))return true;
  if(g.speechSynthesis?.speaking)return true;
  try{if([...d.querySelectorAll('audio')].some(a=>!a.paused))return true;}catch(_){}
  return false;
 }
 function play(kind){
  const transition=kind==='transition';
  if(transition?pref(NAV,'on')!=='on':pref(KEY,'off')!=='on')return false;
  // The lesson remains quiet by default even if global navigation sounds are on.
  if(transition&&d.getElementById('pg-session')?.classList.contains('on')&&pref(LESSON_NAV,'off')!=='on')return false;
  if(g.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||protectedAudio())return false;
  if(!transition && d.getElementById('pg-session')?.classList.contains('on') && pref(LESSON,'off')!=='on')return false;
  const t=Date.now();if(t-lastAt<130)return false;
  const Audio=g.AudioContext||g.webkitAudioContext;if(!Audio)return false;
  try{
   if(!context)context=new Audio();
   if(context.state==='suspended')context.resume().catch(()=>{});
   lastAt=t;
   const start=context.currentTime+.003,volume=Math.min(4,Math.max(1,Number(read(LEVEL,'2'))||2));
   const notes=transition?[{f:540,at:0,d:.058},{f:700,at:.063,d:.085}]:[{f:590,at:0,d:.062}];
   for(const n of notes){
    const o=context.createOscillator(),amp=context.createGain(),begin=start+n.at;
    o.type='sine';o.frequency.setValueAtTime(n.f,begin);
    const peak=(transition?.0037:.0027)*volume;
    amp.gain.setValueAtTime(.0001,begin);
    amp.gain.linearRampToValueAtTime(peak,begin+.008);
    amp.gain.exponentialRampToValueAtTime(.0001,begin+n.d);
    o.connect(amp);amp.connect(context.destination);o.start(begin);o.stop(begin+n.d+.005);
   }
   return true;
  }catch(_){return false;}
 }
 function sync(){
  const tick=d.getElementById('beta28TransitionSound');if(tick)tick.checked=enabled(NAV,'on');
  const lessonTick=d.getElementById('ia28LessonNavigationSound');if(lessonTick)lessonTick.checked=enabled(LESSON_NAV,'off');
  const quick=d.getElementById('ia28SessionSoundToggle');if(quick){
   const on=enabled(NAV,'on')&&enabled(LESSON_NAV,'off');quick.setAttribute('aria-pressed',String(on));
   quick.textContent=on?'🔊 صوت الحصة: يعمل':'🔇 الحصة صامتة';
   quick.title='مؤثر صوت الحصة مستقل عن صوت التنقل العام';
  }
 }
 function quickToggle(){
  const steps=d.getElementById('v9SessionSteps');if(!steps)return false;
  if(d.getElementById('ia28SessionSoundToggle'))return true;
  const host=steps.querySelector('.v9-session-mode');if(!host)return false;
  const button=d.createElement('button');button.type='button';button.id='ia28SessionSoundToggle';
  button.className='ia28-session-sound';button.dataset.imamNoUiSound='true';
  button.setAttribute('aria-label','تشغيل أو إيقاف صوت الانتقال بين خطوات الحصة');
  button.addEventListener('click',()=>{const on=!(enabled(NAV,'on')&&enabled(LESSON_NAV,'off'));store(LESSON_NAV,on?'on':'off');if(on)store(NAV,'on');sync();if(on)play('transition');});
  host.append(button);sync();return true;
 }
 function settings(){
  const page=d.getElementById('pg-settings');if(!page||d.getElementById('beta19SoundSettings'))return;
  const s=d.createElement('section');s.id='beta19SoundSettings';s.className='beta19-sound-pref ia28-feedback-settings';s.dir='rtl';
  s.innerHTML='<b>🔊 أصوات التنقل</b>'+
   '<label class="ia28-transition-option" for="beta28TransitionSound"><input type="checkbox" id="beta28TransitionSound"> صوت تنقل خارج الحصة</label>'+
   '<label class="ia28-transition-option" for="ia28LessonNavigationSound"><input type="checkbox" id="ia28LessonNavigationSound"> تشغيل صوت التنقل داخل الحصة (مغلق افتراضيًا)</label>'+
   '<label for="beta19TapVolume">مستوى الصوت</label><input type="range" id="beta19TapVolume" min="1" max="4" step="1" value="2" aria-label="مستوى مؤثرات التنقل">'+
   '<button type="button" id="beta28TryTransitionSound" class="ia28-try-sound" data-imam-no-ui-sound="true">▶ تجربة الصوت</button>'+
   '<small>الحصة صامتة افتراضيًا حتى لا ينقطع تركيز المعلم والطالب. لا يصدر أي مؤثر أثناء التلاوة أو التسجيل أو السبورة.</small>'+
   '<label class="ia28-transition-option" for="ia20TapInLesson"><input type="checkbox" id="ia20TapInLesson"> صوت ضغط الأزرار أثناء الحصة (اختياري، لا يشمل صوت الانتقال)</label>';
  const actions=d.getElementById('v9ButtonSound')?.closest('.card')?.querySelector('.settings-actions');
  if(actions)actions.insertAdjacentElement('beforebegin',s);else page.prepend(s);
  const vol=d.getElementById('beta19TapVolume');vol.value=read(LEVEL,'2');
  vol.addEventListener('change',()=>store(LEVEL,vol.value));
  const lesson=d.getElementById('ia20TapInLesson');lesson.checked=enabled(LESSON,'off');
  lesson.addEventListener('change',()=>store(LESSON,lesson.checked?'on':'off'));
  d.getElementById('beta28TransitionSound').addEventListener('change',e=>{store(NAV,e.target.checked?'on':'off');sync();if(e.target.checked&& !d.getElementById('pg-session')?.classList.contains('on'))play('transition');});
  d.getElementById('ia28LessonNavigationSound').addEventListener('change',e=>{store(LESSON_NAV,e.target.checked?'on':'off');sync();if(e.target.checked)play('transition');});
  d.getElementById('beta28TryTransitionSound').addEventListener('click',()=>{
   if(enabled(NAV,'on'))play('transition');
   else{store(NAV,'on');sync();play('transition');}
  });
  const legacy=d.getElementById('v9ButtonSound');if(legacy){legacy.checked=enabled(TAP,'off');legacy.addEventListener('change',()=>store(TAP,legacy.checked?'on':'off'));}
  sync();
 }
 function isNavigation(button){
  if(button.matches?.('.v9-nav-btn,.nav-t,.v9-step-btn,.v9-mode-toggle button,.role-home-action,.role-hero-next,.role-workspace-toggle,.quick-action,.v9-more-item,[role="tab"],button[data-page],button[data-step],button[data-rc3-tab]'))return true;
  const action=button.getAttribute?.('onclick')||'';
  return /\bgoPage\s*\(|\bsetSessionStep\s*\(/.test(action);
 }
 function init(){
  settings();quickToggle();
  // Only watch direct child insertions until the pre-existing session step control
  // has been built. No subtree observer and no recurring scans on each keystroke.
  const session=d.getElementById('pg-session');
  if(session&&!d.getElementById('ia28SessionSoundToggle')&&typeof g.MutationObserver==='function'){
   const observer=new g.MutationObserver(()=>{if(quickToggle())observer.disconnect();});
   observer.observe(session,{childList:true});
  }
  d.addEventListener('change',e=>{
   if(e.target?.id==='v9ButtonSound')store(TAP,e.target.checked?'on':'off');
  });
  d.addEventListener('click',e=>{
   const button=e.target?.closest?.('button,[role="button"],a[href]');
   if(!button||button.disabled||button.getAttribute?.('aria-disabled')==='true'||button.dataset?.imamNoUiSound==='true')return;
   if(button.closest?.('.surah-dropdown,.mo,[role="dialog"]'))return;
   if(isNavigation(button))play('transition');
   else if(button.matches?.('button,[role="button"]'))play('tap');
  },{passive:true});
  g.ImamUIAudio={playTransition:()=>play('transition'),isTransitionOn:()=>enabled(NAV,'on')};
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
