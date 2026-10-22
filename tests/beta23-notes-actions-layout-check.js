'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),v9=read('v9.js'),css=read('css/platform/responsive.css');
assert.equal(read('VERSION').trim(),'11.12.1-beta.23');
for(const id of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn','sessionWaModes','sesNotes','prevCard','sessionErrorsCard'])
 assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,'duplicate original element '+id);
assert(v9.includes("content.insertBefore(footer,notesCard)"),'original actions must precede parent notes');
assert(v9.includes("notesCard.dataset.v9Step='notes'"),'parent notes belong only to notes tab');
assert(v9.includes("legacy.dataset.v9Step='notes'"),'previous and error cards must move after notes');
assert(v9.includes("anchor.insertAdjacentElement('afterend',legacy)"),'legacy sections physically reordered');
assert(v9.includes("main.appendChild(audioBtn)")&&v9.includes("main.appendChild(saveBtn)")&&v9.includes("main.appendChild(sendBtn)"),'original action handlers must be retained');
assert(!css.includes('#pg-session #v9SessionFooter{position:fixed'),'fixed footer must be gone');
assert(css.includes('#pg-session #v9SessionFooter{position:relative'),'footer must be in normal document flow');
assert(css.includes('#pg-session #v9SessionFooter[hidden]{display:none!important}'),'notes-only footer visibility honored');
assert(!css.includes('body.ui-session-keyboard #pg-session #v9SessionFooter{display:none!important}'),'no outdated floating-dock keyboard hide');
const fn=v9.match(/^function applySessionStepVisibility\(\)\{[^\n]*\}/m)?.[0];assert(fn);
const cards=['notes','notes','assessment'].map(v=>({dataset:{v9Step:v},classList:{toggle(k,v){this.hidden=v;}}}));
const footer={hidden:false};const rec={classList:{toggle(k,v){this.hidden=v;}}};
const ctx={settings:{v9:{mode:'guided'}},V9:{step:'assessment'},document:{querySelectorAll:()=>cards,getElementById:id=>id==='v9SessionFooter'?footer:id==='repeatBar'?rec:null}};
vm.runInNewContext(fn+';this.run=applySessionStepVisibility;',ctx);
for(const step of ['assessment','new','review','notes']){
 ctx.V9.step=step;ctx.run();assert.equal(footer.hidden,step!=='notes','footer must show ONLY in notes');
 assert.equal(cards[0].classList.hidden,step!=='notes','reordered old cards notes-only');
}
ctx.settings.v9.mode='expert';ctx.V9.step='review';ctx.run();assert.equal(footer.hidden,true,'expert view cannot display actions outside notes');
ctx.V9.step='notes';ctx.run();assert.equal(footer.hidden,false);
for(const src of ['index.html','sw.js','manifest.json'])assert(read(src).includes('11.12.1-beta.23'));
assert(html.includes('v9.js?v=11.12.1-beta.23')&&read('sw.js').includes("'./v9.js?v=11.12.1-beta.23'"),'new v9 script must be fetched');
new vm.Script(v9,{filename:'v9.js'});
console.log('beta23-notes-actions-layout-check: PASS — single original notes action section, in-flow; notes/errors moved below');
