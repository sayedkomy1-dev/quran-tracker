'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
const html=read('index.html'),ui=read('js/features/v11-ui.js'),css=read('archive/historical-css/v11.css'),sw=read('sw.js'),goal=read('js/features/goal-planning.js');
for(const [name,path,version] of [['style','css/platform/legacy-features.css','11.12.1-beta.13'],['ui','js/features/v11-ui.js','11.4.1-profile-ui'],['logic','js/features/goal-planning.js','11.4.2-s2']]){
  const ref=path+'?v='+version;
  assert.ok(html.includes(ref),name+' live HTML cache-bust not updated');
  assert.ok(sw.includes("'./"+ref+"'"),name+' SW cache must match HTML');
}
assert.ok(sw.includes("quran-pwa-v11.5.0-student-finance1"));
assert.ok(ui.includes('v11ProfileActionsDisclosure')&&ui.includes("document.createElement('details')"));
assert.ok(ui.includes("document.getElementById('v9ProfileTabs')||hdr"));
assert.ok(css.includes('#pg-profile .v11-profile-actions{position:static;bottom:auto'));
assert.ok(css.includes('.v11-profile-action-panel>summary'));
assert.ok(css.includes('.v11-profile-action-panel:not([open]) #profileActions{display:none!important}'),'closed actions must not cover the screen, despite the inline display:flex attribute');
assert.ok(goal.includes('Legacy v6: prevGrades.new belongs to the previous session'));
assert.ok(!goal.includes('reviewOutcome'));
console.log('PASS goal-planning-mobile-hotfix-check (real cache refs, mobile actions, legacy grades)');
