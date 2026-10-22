'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const main=read('index.html');
const css=read('css/platform/components.css');
const publicCSS=read('css/platform/public-experience.css');
const studentCSS=read('css/platform/student-display.css');
const worker=read('sw.js');
const appVersion=read('VERSION').trim();
const version='11.12.1-beta.25';
assert.equal(appVersion,version);
// Both root scrolling elements are guarded; no touch-action:none or JS touchmove cancellation.
for(const [name,source] of Object.entries({main,css,publicCSS,studentCSS})){
  assert(/html\s*,\s*body\s*\{\s*overscroll-behavior-y\s*:\s*none\s*;?\s*\}/.test(source),`${name}: root scrolling overscroll guard missing`);
}
assert(!/touch-action\s*:\s*none/.test(css),'normal touch scrolling must continue');
assert(!/addEventListener\s*\(\s*['"]touchmove/.test(css),'must not install touchmove suppression');
for(const file of ['css/platform/components.css','css/platform/public-experience.css','css/platform/student-display.css']){
  assert(worker.includes(`./${file}?v=${version}`),`SW must cache fresh ${file}`);
}
assert(worker.includes(`quran-pwa-v${version}`),'SW cache namespace must change');
assert(main.includes(`css/platform/components.css?v=${version}`),'current CSS link must be refreshed');
console.log('pwa-pull-refresh-check: PASS');
