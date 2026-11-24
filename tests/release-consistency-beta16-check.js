'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const version=read('VERSION').trim();
assert.equal(version,'11.12.1-beta.27');
assert.equal(JSON.parse(read('package.json')).version,version);
assert.equal(JSON.parse(read('manifest.json')).version,version);
const html=read('index.html'),sw=read('sw.js');
assert(html.includes(`name="application-version" content="${version}"`));
assert(sw.includes(`const APP_VERSION = '${version}'`));
assert(sw.includes(`const CACHE_NAME = 'quran-pwa-v${version}-workspace-workflow'`));
for(const name of ['app.js','js/core/runtime.js','js/core/boot-health.js','js/core/offline-bootstrap.js','js/features/platform-workflow.js'])
 assert(!read(name).includes('11.12.1-beta.14'),`${name} has old release marker`);
const scripts=['app.js','v9.js','v10.js','js/features/imam-smart-board.js','js/features/platform-workflow.js','js/features/role-home.js','js/features/supervisor-dashboard.js'];
const css=['css/platform/responsive.css','imam-smart-board.css','role-home.css','teacher-rating.css'];
const homeAssets=['home-recitation.css','js/features/home-recitation-core.js','js/features/home-recitation.js'];
for(const name of homeAssets){
 const version=name==='js/features/home-recitation-core.js'?'beta28-rc16-home-recitation1':'beta28-rc16-ai-review1';
 const ref=`${name}?v=${version}`;
 assert(html.includes(ref)||read('guardian-portal.html').includes(ref),`HTML missing fresh ${name}`);
 assert(sw.includes(`'./${ref}'`),`SW missing fresh ${name}`);
}
const learningHubRef='js/features/rc16-learning-hub.js?v=beta28-rc16-learning-ledger1';
assert(html.includes(learningHubRef),'HTML missing fresh RC16 learning ledger module');
assert(sw.includes(`'./${learningHubRef}'`),'SW missing fresh RC16 learning ledger module');
for(const name of [...scripts,...css]){
 const ref=`${name}?v=${version}`;
 const versionedV9=`${name}?v=${version}-guardian-reactivation-hotfix4`;
 const versionedBoard=`${name}?v=${version}-quran-picker1`;
 const revision2=`${name}?v=${version}-absence-review2`;
 const rc7=`${name}?v=beta28-rc13`;
 const rc16=`${name}?v=beta28-rc16-learning-observations1`;
 const rc16Board=`${name}?v=beta28-rc16-board-recovery1`;
 assert(html.includes(ref)||html.includes(versionedV9)||html.includes(versionedBoard)||html.includes(revision2)||html.includes(rc7)||html.includes(rc16)||html.includes(rc16Board),`index missing fresh ${name}`);
 assert(sw.includes(`'./${ref}'`)||sw.includes(`'./${versionedV9}'`)||sw.includes(`'./${versionedBoard}'`)||sw.includes(`'./${revision2}'`)||sw.includes(`'./${rc7}'`)||sw.includes(`'./${rc16}'`)||sw.includes(`'./${rc16Board}'`),`SW missing fresh ${name}`);
}
for(const name of ['v9.js','v10.js','role-home.css','teacher-rating.css']){
 assert(sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./${name}?v=${version}`)
 ||(name==='v9.js'&&(sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./v9.js?v=${version}-guardian-reactivation-hotfix4'`)||sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./v9.js?v=beta28-rc13'`))),`Critical shell missing ${name}`);
}
assert(read('imam-board-display.html').includes(`imam-smart-board.css?v=${version}`));
for(const htmlFile of ['guardian-login.html','guardian-portal.html','guest-practice.html'])
 assert(read(htmlFile).includes(`css/platform/public-experience.css?v=${version}`));
assert(!read('guardian-portal.html').includes('teacher-rating.css')&&!read('guardian-portal.html').includes('guardian-ratings.js'),'guardian/student portal must not load teacher rating UI');
console.log('PASS release consistency beta17: app version, all changed asset URLs, critical shell, offline public pages');
