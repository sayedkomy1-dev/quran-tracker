/* Beta27 hotfix: one student editor, layout geometry and safe PWA update. */
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const css=read('css/platform/components.css'), html=read('index.html'), app=read('app.js'), sw=read('sw.js');
assert.equal((html.match(/id="stModal"/g)||[]).length,1,'single student modal');
assert.equal((html.match(/id="m-name"/g)||[]).length,1,'single student name field');
assert.equal((html.match(/id="m-phone"/g)||[]).length,1,'single student guardian field');
assert(html.includes('css/platform/components.css?v=11.12.1-beta.27'),'active stylesheet used');
assert(css.includes('#stModal > .mo-box{'),'dedicated scroll boundary not set');
const section=css.slice(css.indexOf('#stModal > .mo-box{'),css.indexOf('@media (max-width:899px)',css.indexOf('#stModal > .mo-box{')));
assert(section.includes('max-height:88dvh')&&section.includes('overflow-y:auto'),'desktop sized scrolling required');
assert(css.includes('max-height:92dvh')&&css.includes('env(safe-area-inset-bottom)'),'mobile safe-area scroll required');
assert.equal((app.match(/document\.querySelector\?\.\('#stModal > \.mo-box'\)/g)||[]).length,2,'add and edit must reset scroll');
assert(/const LIVE_CACHE_NAME = CACHE_NAME \+ '-[a-z0-9-]+';/.test(sw),'distinct offline cache required after subsequent hotfixes');
assert(sw.includes('caches.open(LIVE_CACHE_NAME)'),'install should never overwrite old release cache');
assert(sw.includes('k!==LIVE_CACHE_NAME'),'activate must preserve new cache');
console.log('PASS student modal: bounded scrolling, start-at-top, one field set, distinct offline release cache');
