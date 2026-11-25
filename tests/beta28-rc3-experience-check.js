'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const player=read('js/features/guardian-tahfeez.js'),library=read('js/features/offline-audio-library.js'),guest=read('js/features/guest-practice.js'),sw=read('sw.js'),teacher=read('js/features/role-home.js');
for(const source of [player,library,guest,teacher,read('js/features/rc3-experience.js'),sw])new vm.Script(source);
for(const page of ['index.html','guest-practice.html','guardian-portal.html','guardian-login.html','academy-portals.html','academy-learning.html','academy-mushaf.html'])assert(read(page).includes('css/platform/rc3-experience.css?v=beta29-rc17'),page+' missing RC3 CSS');
assert(sw.includes(`'./css/platform/rc3-experience.css?v=beta29-rc17'`));assert(sw.includes(`'./js/features/rc3-experience.js?v=beta28-rc13'`));
assert(sw.includes('RC3 HTML is not available'));
assert(read('index.html').includes('id="rc3HomeIntro"'));
assert(read('guardian-portal.html').includes('data-rc3-tab="family"'));
assert(read('guardian-portal.html').includes('id="portalFinanceCard" hidden'));
assert(teacher.includes('app_supervision_access')&&teacher.includes('filterActions'));
assert(guest.includes('signature===bookmarkSignature'));
// Verify the actual lightweight scan never invokes the MP3 integrity reader / blob loader.
const scan=player.slice(player.indexOf('async function scanOffline'),player.indexOf('function setNet'));
assert(scan.includes('chapterKeys'));assert(scan.includes('cache.keys()'));assert(!/\.blob\(|\.get\(|arrayBuffer\(/.test(scan));
assert(player.includes("!panel?.open"));
assert(library.includes('openKeyCursor(IDBKeyRange.bound(prefix'));
// Exercise the actual player state with isolated DOM and audio mocks (not network audio).
const elements=new Map(),storage=new Map();let playCalls=0,timeoutCalls=0;
function node(id){if(!elements.has(id)){const classes=new Set();elements.set(id,{id,value:'',checked:false,hidden:false,textContent:'',style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,v)=>{if(v)classes.add(x);else classes.delete(x);return !!v;}},setAttribute(){},getAttribute(){return ''},querySelector(){return null},closest(){return {open:false}},paused:true,readyState:2,addEventListener(){},removeEventListener(){},pause(){this.paused=true},play(){this.paused=false;playCalls++;return Promise.resolve()},removeAttribute(){},load(){},dataset:{}});}return elements.get(id);}
for(const [id,value] of Object.entries({tahfeezSurah:'1',tahfeezFrom:'1',tahfeezTo:'7',tahfeezRepeat:'1',tahfeezReciter:'Husary_128kbps',tahfeezSpeed:'1',tahfeezVolume:'1',tahfeezTutorRepeat:'3',tahfeezTutorPause:'2'}))node(id).value=value;
const context={document:{documentElement:{dataset:{}},readyState:'loading',addEventListener(){},getElementById:node,querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{onLine:true},setTimeout:()=>++timeoutCalls,clearTimeout(){},setInterval:()=>++timeoutCalls,clearInterval(){},URL,console,AbortController};
context.window=context;vm.createContext(context);
vm.runInContext(player.replace('  g.ImamGuardianTahfeez={','  g.rc3Test={state,startPlayback,stop,playPause,finishPlayback,selectAyah,jumpAyah};\n  g.ImamGuardianTahfeez={'),context);
(async()=>{const t=context.rc3Test;t.state.selectedAyah=4;t.startPlayback();assert.equal(t.state.sequenceIndex,3,'resume must start at selected verse');await new Promise(resolve=>setImmediate(resolve));assert.equal(t.state.selectedAyah,4);assert.equal(playCalls,1);
 t.finishPlayback();t.startPlayback();assert.equal(t.state.sequenceIndex,0,'finished range restarts from first verse');await new Promise(resolve=>setImmediate(resolve));
 t.stop();t.state.playing=true;t.state.timer=1;t.playPause();assert.equal(t.state.paused,true);assert.equal(t.state.waitPaused,true);assert.equal(t.state.timer,null);t.stop();assert.equal(t.state.waitPaused,false);
 t.state.selectedAyah=2;const before=playCalls;t.jumpAyah(1);assert.equal(t.state.selectedAyah,3);assert.equal(playCalls,before,'idle next verse must not start media unexpectedly');
 console.log('PASS RC3: asset wiring, key-only offline scan, role filter, resume/replay, pause countdown, idle navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
