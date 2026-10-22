'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),js=read('v9.js'),css=read('css/platform/responsive.css');
assert.equal(read('VERSION').trim(),'11.12.1-beta.24');
for(const id of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,`${id} must occur once`);
}
for(const call of ['onclick="saveSession()"','onclick="saveAndSendWA()"','onclick="shareCurrentAssignmentAudio()"'])
 assert(html.includes(call),`original button handler changed: ${call}`);
assert(js.includes('content.insertBefore(footer,content.firstElementChild)'), 'real action footer must be first child of session content');
assert(!js.includes("legacy.dataset.v9Step='notes'"),'never reclassify recitation cards as Notes');
assert(js.includes("c.id==='prevCard'||c.id==='sessionErrorsCard'"),'recitation cards remain assessment');
assert(css.includes('#pg-session #v9SessionFooter{position:relative;inset:auto;z-index:auto;'),'footer must be in normal document flow');
assert(!css.includes('#pg-session #v9SessionFooter{position:fixed'),'old fixed actions must not reappear');
assert(!js.includes("if(f)f.hidden=guided&&V9.step!=='notes'&&!mobile"),'mobile always-visible action bar prohibited');
const match=js.match(/^function applySessionStepVisibility\(\)\{[^\n]*\}/m);
assert(match,'real step visibility implementation missing');
for(const mode of ['guided','expert']) for(const mobile of [true,false]) {
 const footer={hidden:false},repeat={classList:{toggle(n,val){this.hide=val;}}};
 const doc={querySelectorAll(){return [];},getElementById(id){return id==='v9SessionFooter'?footer:id==='repeatBar'?repeat:null;}};
 const ctx={document:doc,window:{matchMedia:()=>({matches:mobile})},settings:{v9:{mode}},V9:{step:'assessment'}};
 vm.runInNewContext(match[0]+';this.run=applySessionStepVisibility;',ctx);
 for(const step of ['assessment','new','review','notes']) {
  ctx.V9.step=step;ctx.run();
  assert.equal(footer.hidden,step!=='notes',`${mode}/${mobile}/${step}: original actions only in Notes`);
  assert.equal(repeat.classList.hide,step!=='assessment',`${mode}/${mobile}/${step}: repeat only in recitation`);
 }
}
assert(html.indexOf('id="prevCard"')<html.indexOf('id="sessionErrorsCard"'), 'recitation cards keep original sequence');
assert(html.indexOf('id="sessionErrorsCard"')<html.indexOf('id="sesNotes"'), 'error log remains in recitation and not after notes');
assert(css.includes('#v10SuggestionAccordion{display:none}'),'auto-repeat card should not intrude in other guided steps');
console.log('beta24-notes-only-actions-check: PASS — single original actions, notes only, in-flow, preserved assessment/error cards');
