'use strict';
// Structural + behavioral regression: no storage or remote operations.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),v9=read('v9.js'),ui=read('js/features/platform-workflow.js'),render=read('js/features/session-intelligence-119.js'),css=read('css/platform/responsive.css'),v11=read('js/features/v11-ui.js');
assert.equal(read('VERSION').trim(),'11.12.1-beta.24');
for(const id of ['sesSt','sesDate','draftState','saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn','repeatBar','im119ExtraCount']){
  if(id==='im119ExtraCount')assert(render.includes(`id="${id}"`));
  else assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
}
assert(!ui.includes('d.body.append(dock)'),'no duplicate floating save action');
assert(ui.includes("if(key==='students'||key==='session'"),'redundant lesson heading must not be generated');
assert(v11.includes("if(page==='session')return;"),'redundant second session hero must not be generated');
assert(!v11.includes("ctx.innerHTML='<div class=\"v11-context-avatar\""),'second student context should not be created');
assert(v9.includes('main.appendChild(saveBtn)')&&v9.includes('main.appendChild(sendBtn)'),'official handlers remain in their footer');
assert(v9.includes("main.insertAdjacentElement('beforebegin',audio)"),'audio stays directly above originals');
const inside=html.split('<div id="sesContent">')[1];
assert(inside.includes('id="repeatBar"')&&inside.indexOf('id="repeatBar"')<inside.indexOf('id="prevCard"'),'large repeat placed in recitation');
assert(inside.includes('data-v9-step="assessment"')&&inside.includes('onclick="fillFromLast()"'),'existing repeat contract retained');
assert(!html.includes('♻️ تحميل نفس التكليف السابق'),'no redundant secondary repeat action');
assert(css.includes('#pg-session #repeatBar.ia21-repeat-step-hidden{display:none!important}'),'recitation-only repeat enforced');
assert(v9.includes("repeat.classList.toggle('ia21-repeat-step-hidden',V9.step!=='assessment')"),'step switching hides repeat');
assert(render.includes("more.id='ia21CompletionMore'")&&render.includes('more.append(checklist)')&&render.includes('more.append(advancedOptions)'),'advanced settings remain reachable in one disclosure');
assert(render.includes('const saveHealth=by(\'im119SaveState\')')&&render.includes('more.append(saveHealth)'),'save/sync state not discarded');
assert(html.includes('id="v1059StopToggle"')&&html.includes('id="v1059ReviewToggle"'),'followup details remain interactive');
assert(css.includes('.ia21-student-card')&&css.includes('.ia21-followup-heading'),'compact session design in active stylesheet');
assert(!css.includes('.ia20-save-jump-button'),'old floating dock styling not reintroduced');
for(const f of ['v9.js','js/features/platform-workflow.js','js/features/session-intelligence-119.js','js/features/v11-ui.js'])new vm.Script(read(f),{filename:f});
// Execute the real function with dummy DOM nodes and verify assessment vs notes.
const match=v9.match(/^function applySessionStepVisibility\(\)\{[^\n]*\}/m);assert(match,'effective step visibility function missing');
const rec={classList:{toggle(name,value){if(name==='ia21-repeat-step-hidden')this.hide=value;}}};
const footer={hidden:false};
const doc={querySelectorAll(){return[];},getElementById(id){return id==='repeatBar'?rec:id==='v9SessionFooter'?footer:null;}};
const ctx={document:doc,settings:{v9:{mode:'guided'}},V9:{step:'assessment'}};
vm.runInNewContext(match[0]+';this.run=applySessionStepVisibility;',ctx);
ctx.run();assert.equal(rec.classList.hide,false);assert.equal(footer.hidden,true);
ctx.V9.step='notes';ctx.run();assert.equal(rec.classList.hide,true);assert.equal(footer.hidden,false);
ctx.settings.v9.mode='expert';ctx.run();assert.equal(rec.classList.hide,true,'repeat must remain recitation-only even in quick mode');
ctx.V9.step='assessment';ctx.run();assert.equal(rec.classList.hide,false);
console.log('beta21-session-compression-check: PASS — recitation-only large repeat, zero floating save, compact disclosure, official save parity');
