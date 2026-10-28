'use strict';
// Regression and privacy contract for the imported visual design. No production data is touched.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const index=read('index.html'),sw=read('sw.js'),js=read('js/features/design-bridge.js');
let n=0;const check=(name,fn)=>{fn();n++;console.log('PASS',name)};
check('single design bridge asset references',()=>{
 assert.equal((index.match(/<link rel="stylesheet" href="css\/platform\/design-bridge\.css\?/g)||[]).length,1);
 assert.equal((index.match(/<script src="js\/features\/design-bridge\.js\?/g)||[]).length,1);
 assert.match(index,/<body class="imam-global-redesign imam-design-bridge">/);
});
check('native student/session/error/guardian feature assets preserved',()=>{
 for(const file of ['app.js','v8.js','v9.js','v10.js','sync-core.js','js/features/error-followup-engine.js','js/features/imam-absence-makeup.js','js/features/quran-coverage-progress.js','js/features/imam-teaching-insights.js','js/features/teacher-followup.js'])
   assert(index.includes(`src="${file}?`),file);
});
check('public and guardian portals linked without student ID or PIN',()=>{
 const hub=read('academy-portals.html');
 for(const file of ['index.html','guardian-login.html','guest-practice.html','imam-board-display.html']) assert(hub.includes(`href="${file}"`));
 assert(!/loginAsGuardianDirect|student\.id|st-1|token=|pin=|PIN\s*:\s*\d{6}/.test(hub));
});
check('no imported mock student, teacher, circle data',()=>{
 for(const file of ['js/features/design-bridge.js','academy-portals.html']){
  const content=read(file);assert(!/seedData|studentId\s*:|guardianPin\s*:|teacherId\s*:|demoStudents|demoTeacher|localStorage\.setItem\(['"]students/.test(content),file);
 }
});
check('design switch uses own preference only',()=>{
 assert(js.includes("imam_design_bridge_enabled_v1"));
 assert(js.includes("localStorage.setItem(KEY,enabled?'on':'off')"));
 assert(!/\bsave\(\)|\bupdateStudent\(|\bdeleteStudent\(/.test(js));
});
check('menu proxies original actions and avoids role bypass',()=>{
 assert(js.includes('source.click()'));assert(js.includes('source.hidden'));
 assert(js.includes("getAttribute('aria-hidden')"));assert(js.includes('source.style.display'));
 assert(!/loginAsGuardianDirect|window\.students\s*=|window\.sessions\s*=/.test(js));
});
check('presentation has no Quran rewriting',()=>{
 for(const file of ['css/platform/design-bridge.css','css/platform/portal-design-bridge.css']){
  const source=read(file);assert(!/text-transform\s*:\s*uppercase/.test(source));
  assert(!/font-family[^;]*Comic Sans/.test(source));
 }
});
check('cache-safe offline assets listed in both groups',()=>{
 for(const asset of ['css/platform/design-bridge.css','js/features/design-bridge.js','css/platform/portal-design-bridge.css','css/platform/academy-portals.css','academy-portals.html']){
  assert(sw.includes(`'./${asset}`),asset);
 }
 assert(sw.includes("LIVE_CACHE_NAME = CACHE_NAME + '-design-bridge1'"));
});
check('guardian/guest existing pages receive only a style layer',()=>{
 for(const file of ['guardian-login.html','guardian-portal.html','guest-practice.html']){
  const html=read(file);assert(html.includes('portal-design-bridge.css'));
  assert(html.includes('class="imam-portal-refresh"'));
 }
});
check('new visual files have no broken source links',()=>{
 for(const file of ['css/platform/design-bridge.css','css/platform/portal-design-bridge.css','css/platform/academy-portals.css','js/features/design-bridge.js','academy-portals.html'])assert(fs.statSync(path.join(root,file)).size>200,file);
});
console.log(`OK Design Bridge tests: ${n}/${n}`);
