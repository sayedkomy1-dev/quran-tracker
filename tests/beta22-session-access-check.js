'use strict';
// Assertions against live code; this test uses no production data or network.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),v9=read('v9.js'),css=read('css/platform/responsive.css');
assert.equal(read('VERSION').trim(),'11.12.1-beta.27');
for(const id of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn','teacherAssignmentAudioReciter','sessionJourneyCard','ia22FollowupDisclosure']){
 assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} duplicated`);
}
assert(html.includes('<details id="ia22FollowupDisclosure"')&&!html.includes('<details id="ia22FollowupDisclosure" open'),'followup collapsed by default');
assert(html.includes('id="v1059StopToggle"')&&html.includes('id="v1059ReviewToggle"'),'existing follow-up tools retained');
assert(css.includes('#pg-session[data-ia-session-step]:not([data-ia-session-step="assessment"]) #sessionJourneyCard{display:none!important}'),'followup only in recitation');
assert(css.includes('#pg-session #v9SessionFooter{position:relative;inset:auto;z-index:auto;'),'official actions must be in normal document flow');
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'three touch actions accessible together');
assert(v9.includes("main.appendChild(audioBtn)")&&v9.includes("main.appendChild(saveBtn)")&&v9.includes("main.appendChild(sendBtn)"),'one copy of the real handlers');
assert(v9.includes("observer.observe(main,{childList:true})"),'secondary PDF report should not clutter actions');
assert(v9.includes('content.insertBefore(footer,content.firstElementChild)'),'official actions appear first under session tabs');
const fn=v9.match(/^function applySessionStepVisibility\(\)\{[^\n]*\}/m)?.[0];assert(fn,'real step visibility method not found');
function test(mobile){
 const rec={};rec.classList={toggle(n,v){if(n==='ia21-repeat-step-hidden')rec.hidden=v;}};
 const footer={hidden:false};
 const doc={querySelectorAll:()=>[],getElementById:id=>id==='repeatBar'?rec:id==='v9SessionFooter'?footer:null};
 const ctx={document:doc,window:{matchMedia:()=>({matches:mobile})},settings:{v9:{mode:'guided'}},V9:{step:'assessment'}};
 vm.runInNewContext(fn+'\nthis.check=applySessionStepVisibility;',ctx);
 ctx.check();assert.equal(footer.hidden,true,'actions hidden outside Notes on all screens');assert.equal(rec.hidden,false);
 ctx.V9.step='new';ctx.check();assert.equal(footer.hidden,true,'no actions in memorization');assert.equal(rec.hidden,true);
 ctx.V9.step='review';ctx.check();assert.equal(footer.hidden,true);
 ctx.V9.step='notes';ctx.check();assert.equal(footer.hidden,false);
}
test(true);test(false);
for(const name of ['index.html','sw.js','manifest.json'])assert(read(name).includes('11.12.1-beta.27'),`${name}: release marker missing`);
console.log('beta22-session-access-check: PASS — single action trio, phone shortcuts, followup recitation-only and closed, original data handlers');
