'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const version=read('VERSION').trim();
assert.equal(version,'11.12.1-beta.29');
assert.equal(JSON.parse(read('package.json')).version,version);
assert.equal(JSON.parse(read('manifest.json')).version,version);
const html=read('index.html'),portal=read('guardian-portal.html'),sw=read('sw.js');
assert(html.includes(`name="application-version" content="${version}"`));
assert(sw.includes(`const APP_VERSION = '${version}'`));
assert(sw.includes(`const CACHE_NAME = 'quran-pwa-v${version}-workspace-workflow'`));
for(const name of ['app.js','js/core/runtime.js','js/core/boot-health.js','js/core/offline-bootstrap.js','js/features/platform-workflow.js'])
 assert(!read(name).includes('11.12.1-beta.14'),`${name} has old release marker`);
const requiredAssets=[
 ['app.js','app.js?v=beta29-rc17'],
 ['js/core/runtime.js',`js/core/runtime.js?v=${version}`],
 ['js/core/boot-health.js',`js/core/boot-health.js?v=${version}`],
 ['js/core/offline-bootstrap.js',`js/core/offline-bootstrap.js?v=${version}`],
 ['js/features/imam-smart-board.js','js/features/imam-smart-board.js?v=rc16'],
 ['imam-smart-board.css','imam-smart-board.css?v=rc16'],
 ['js/features/role-home.js','js/features/role-home.js?v=beta29-rc17'],
 ['js/features/guardian-portal-share.js','js/features/guardian-portal-share.js?v=rc17'],
 ['js/features/guardian-portal-view.js','js/features/guardian-portal-view.js?v=rc17'],
 ['js/features/learning-growth-rc16.js','js/features/learning-growth-rc16.js?v=rc16'],
 ['js/features/teacher-home-recitation-rc16.js','js/features/teacher-home-recitation-rc16.js?v=rc16'],
 ['js/features/guardian-home-recitation-rc16.js','js/features/guardian-home-recitation-rc16.js?v=rc17']
];
for(const [name,ref] of requiredAssets){
 assert(read(name).length>0,`missing changed asset ${name}`);
 assert((html+portal+read('imam-board-display.html')).includes(ref),`HTML missing fresh ${ref}`);
 assert(sw.includes(`'./${ref}'`),`SW missing fresh ${ref}`);
}
for(const name of ['v9.js','v10.js','role-home.css','teacher-rating.css']){
 assert(sw.includes(`'./${name}?v=11.12.1-beta.27'`)||sw.includes(`'./${name}?v=11.12.1-beta.27-guardian-reactivation-hotfix4'`)||sw.includes(`'./${name}?v=beta28-rc13'`),`critical/offline shell missing retained ${name}`);
}
assert(read('imam-board-display.html').includes('imam-smart-board.css?v=rc16'));
for(const htmlFile of ['guardian-login.html','guardian-portal.html','guest-practice.html'])
 assert(read(htmlFile).includes('css/platform/public-experience.css'),'public experience stylesheet missing from '+htmlFile);
assert(!read('guardian-portal.html').includes('teacher-rating.css')&&!read('guardian-portal.html').includes('guardian-ratings.js'),'guardian/student portal must not load teacher rating UI');
console.log('PASS release consistency beta17: app version, all changed asset URLs, critical shell, offline public pages');
