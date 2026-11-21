'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const css=read('css/platform/reference-palette.css'),sw=read('sw.js');
for(const file of ['guardian-login.html','guardian-portal.html','guest-practice.html','academy-portals.html'])assert(read(file).includes('css/platform/reference-palette.css?v=beta28-candidate2'));
for(const asset of ['css/platform/reference-palette.css','js/features/guest-palette.js'])assert(sw.includes(`'./${asset}?v=beta28-candidate2'`));
assert(sw.includes('-candidate2-reference-palette'));assert(css.includes('.tahfeez-ayah.playing>span'));assert(css.includes('.ia28-student-view'));assert(!css.includes('display:none'));
function run({guest=true,stored=null,fail=false}={}){let handler, saved=stored;const meta={},root={dataset:{},hasAttribute:()=>guest},button={setAttribute(k,v){this[k]=v},addEventListener(k,fn){handler=fn}};const ctx={document:{documentElement:root,readyState:'complete',querySelector:()=>meta,getElementById:()=>button},localStorage:{getItem(){if(fail)throw Error('denied');return saved},setItem(k,v){if(fail)throw Error('denied');saved=v}}};vm.runInNewContext(read('js/features/guest-palette.js'),ctx);return {root,button,meta,click:()=>handler(),saved:()=>saved};}
const a=run();assert.equal(a.root.dataset.portalTheme,'dark');assert.equal(a.meta.content,'#202329');a.click();assert.equal(a.root.dataset.portalTheme,'light');assert.equal(a.saved(),'light');assert.equal(a.button['aria-pressed'],'false');assert.equal(run({stored:'light'}).root.dataset.portalTheme,'light');const b=run({fail:true});b.click();assert.equal(b.root.dataset.portalTheme,'light');assert.equal(run({guest:false}).root.dataset.portalTheme,undefined);
console.log('PASS candidate2: portal styles, offline assets, guest default/toggle/persistence/storage failure and non-guest isolation');
