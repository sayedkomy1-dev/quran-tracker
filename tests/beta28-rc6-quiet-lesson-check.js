// RC6 teacher-first regression gate — no business-data or save handler substitutions.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const src=(x)=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const js=src('js/features/quiet-lesson-rc6.js'),sound=src('js/features/beta19-experience.js'),css=src('css/platform/quiet-lesson-rc6.css'),html=src('index.html'),sw=src('sw.js');
new vm.Script(js);new vm.Script(sound);
for(const asset of ['css/platform/quiet-lesson-rc6.css','js/features/quiet-lesson-rc6.js']){
 assert(html.includes(asset+'?v=beta28-rc6'),`document must load ${asset}`);
 assert(sw.includes("'./"+asset+'?v=beta28-rc6'+"'"),`offline shell must include ${asset}`);
}
assert(sound.includes("pref(LESSON_NAV,'off')!=='on'"),'lesson sounds must be opt-in');
assert(js.includes('750'),'duplicate click guard must use short bounded interval');
assert(js.includes('stopImmediatePropagation'),'duplicate click capture must suppress duplicate handler');
assert(js.includes('setSessionStep(step)'),'keyboard navigation must reuse original step handler');
for(const id of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
assert(!js.includes('.innerHTML='),'avoid replacing business controls');
assert(!/\.remove\(\)|removeChild\(/.test(js),'no existing element is removed');
assert(css.includes('.ia28-quiet-focus')&&css.includes(':focus-visible'));
// Exercise real capture guard with isolated DOM, including normal click after timeout.
const storage=new Map(),handlers={};let now=1000;const pg={classList:{contains:x=>x==='on'},getAttribute:()=>''};
const doc={readyState:'loading',getElementById:id=>id==='pg-session'?pg:null,addEventListener:(name,fn)=>handlers[name]=fn,activeElement:null,querySelector:()=>null};
const scope={document:doc,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,v)},Date:{now:()=>now}};
vm.runInNewContext(js,scope,{filename:'quiet-lesson-rc6.js'});
assert(scope.ImamQuietLesson.isOn(),'quiet focus enabled by default');
let blocked=0;const action=id=>({target:{closest:()=>({id})},preventDefault:()=>blocked++,stopImmediatePropagation(){}});
handlers.click(action('saveSessionBtn'));assert.equal(blocked,0);
now+=200;handlers.click(action('saveSendSessionBtn'));assert.equal(blocked,1,'rapid double submission is blocked');
now+=900;handlers.click(action('saveSendSessionBtn'));assert.equal(blocked,1,'later intentional submission is allowed');
assert(!/\b(?:saveSession|saveAndSendWA|deleteStudent)\s*\(/.test(js),'new feature must not call data mutations');
console.log('PASS RC6: quiet lesson opt-in audio, semantic styling, no save handler replacement, no duplicate submits, offline wiring');
