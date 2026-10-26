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
for(const name of [...scripts,...css]){
 const ref=`${name}?v=${version}`;
 const versionedV9=`${name}?v=${version}-guardian-reactivation-hotfix4`;
 const versionedBoard=`${name}?v=${version}-quran-picker1`;
 assert(html.includes(ref)||html.includes(versionedV9)||html.includes(versionedBoard),`index missing fresh ${name}`);
 assert(sw.includes(`'./${ref}'`)||sw.includes(`'./${versionedV9}'`)||sw.includes(`'./${versionedBoard}'`),`SW missing fresh ${name}`);
}
for(const name of ['v9.js','v10.js','role-home.css','teacher-rating.css']){
 assert(sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./${name}?v=${version}`)
 ||(name==='v9.js'&&sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./v9.js?v=${version}-guardian-reactivation-hotfix4'`)),`Critical shell missing ${name}`);
}
assert(read('imam-board-display.html').includes(`imam-smart-board.css?v=${version}`));
for(const htmlFile of ['guardian-login.html','guardian-portal.html','guest-practice.html'])
 assert(read(htmlFile).includes(`css/platform/public-experience.css?v=${version}`));
assert(read('guardian-portal.html').includes(`teacher-rating.css?v=${version}`));
console.log('PASS release consistency beta17: app version, all changed asset URLs, critical shell, offline public pages');
