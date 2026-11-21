'use strict';
// RC5 runtime safety: teacher transitions, existing tap contract, recording mute,
// offline pinning and original save/send actions. No live account is needed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const html=read('index.html'),css=read('css/platform/rc5-teacher-actions.css'),sw=read('sw.js'),js=read('js/features/beta19-experience.js');
assert(html.includes('css/platform/rc5-teacher-actions.css?v=beta28-rc5'));
assert(html.includes('beta19-experience.js?v=beta28-rc5'));
assert(/منصة العمل · rc\.[5678]/.test(html));
for(const p of ['css/platform/rc5-teacher-actions.css?v=beta28-rc5','js/features/beta19-experience.js?v=beta28-rc5'])assert(sw.includes(`'./${p}'`),`offline cache missing ${p}`);
for(const id of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`must preserve ${id}`);
for(const s of ['#saveSessionBtn','#saveSendSessionBtn','#teacherAssignmentAudioBtn','.v9-step-btn','.quick-action',':focus-visible','[aria-pressed="false"]'])assert(css.includes(s),`missing semantic style ${s}`);
assert(!/\binnerHTML\s*=.*\b(?:student|guardian|phone)\b/i.test(js),'audio module must not read student data');
const values=new Map(),handlers={};let audioStarts=0,clock=1000,recording=false,board=false,playing=false;
class AudioMock{
 constructor(){this.state='running';this.currentTime=0;this.destination={};}
 resume(){return Promise.resolve();}
 createOscillator(){return {type:'sine',frequency:{setValueAtTime(){}},connect(){},start(){audioStarts++;},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
}
const page={classList:{contains:k=>k==='on'}};
const document={
 readyState:'complete',
 getElementById(id){return id==='pg-session'?page:id==='imam-board-root'&&board?{}:null;},
 querySelector(){return recording?{}:null;},
 querySelectorAll(){return playing?[{paused:false}]:[];},
 addEventListener(name,fn){handlers[name]=fn;}
};
const fake={document,AudioContext:AudioMock,Date:{now:()=>clock},localStorage:{getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)},matchMedia:()=>({matches:false})};
vm.runInNewContext(js,fake,{filename:'beta19-experience.js'});
assert.equal(typeof fake.ImamUIAudio.playTransition,'function');
const node=(selector)=>({disabled:false,dataset:{},getAttribute:()=>null,matches:q=>selector==='nav'?q.includes('.v9-step-btn'):selector==='tap'?q.includes('button,[role="button"]'):false,closest:q=>{if(q.includes('button,[role="button"],a[href]'))return node(selector);return null;}});
const fire=selector=>handlers.click({target:{closest:q=>q.includes('button,[role="button"],a[href]')?node(selector):null}});
fire('nav');assert.equal(audioStarts,0,'lesson navigation is silent by default under rc6');
clock+=200;values.set('imam:ui-transition-in-session:v1','on');fire('nav');assert.equal(audioStarts,2,'explicit opt-in unlocks transition sound');
clock+=200;fire('tap');assert.equal(audioStarts,2,'legacy tap remains opt-in');
clock+=200;values.set('imam:ui-transition:v1','off');fire('nav');assert.equal(audioStarts,2,'transition mute must silence');
clock+=200;values.set('imam:ui-transition:v1','on');recording=true;fire('nav');assert.equal(audioStarts,2,'recording must never be disturbed');recording=false;
clock+=200;playing=true;fire('nav');assert.equal(audioStarts,2,'Quran audio must never be disturbed');playing=false;
clock+=200;board=true;fire('nav');assert.equal(audioStarts,2,'board must stay silent');board=false;
clock+=200;values.set('imam:ui-tap:v1','on');fire('tap');assert.equal(audioStarts,2,'ordinary taps remain silent in lesson by default');
clock+=200;values.set('imam:ui-tap-in-session:v1','on');fire('tap');assert.equal(audioStarts,3,'explicit opt-in unlocks tap feedback during lesson');
console.log('PASS RC5: colored teacher actions, original save buttons, offline shell, transition chime, mute, recitation/board/recording safety, legacy tap opt-in');
