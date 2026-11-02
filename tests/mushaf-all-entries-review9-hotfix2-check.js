'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'), sw=read('sw.js'), js=read('js/features/mushaf-entry-unifier.js');
const reader=read('js/features/academy-mushaf.js'), shell=read('v9.js'), suite=read('v10.js');
for(const p of ['css/platform/mushaf-entry-unifier.css','js/features/mushaf-entry-unifier.js']){
 assert(html.includes(p+'?v=11.12.1-beta.27-review9-hotfix2'),p+' must be loaded in home');
 assert.equal(sw.split('./'+p+'?v=11.12.1-beta.27-review9-hotfix2').length,3,p+' must be in both fresh/cache shell lists');
}
assert(sw.includes("'-unified-entry1' + '-entry2'"),'new service-worker namespace needed');
assert(reader.includes('launchPage()')&&reader.includes("get('page')"),'HD viewer must accept exact page from teaching shortcuts');
assert(!shell.includes('id="v1053HomeMushafDownload"'),'Old standalone PDF download button must not return');
assert(suite.includes('مصحف المدينة عالي الدقة · يحتاج إلى اتصال الإنترنت'),'Card must no longer promise old offline reader');

class Elem {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.hidden=false;this.isConnected=true;this.classList={add:()=>{},remove:()=>{}};}
 set id(s){this._id=s; ids.set(s,this)}get id(){return this._id}
 append(...xs){this.children.push(...xs)}
 setAttribute(a,v){this.attrs[a]=v}
 addEventListener(a,cb){this.listeners[a]=cb}
 focus(){this.focused=true}
 removeAttribute(a){delete this.attrs[a];if(a==="src")delete this.src}
 querySelector(t){return this.children.flatMap(x=>[x,...x.children]).find(x=>x.tag===t)||null}
}
const ids=new Map(), body=new Elem('body'), keys=[];
const document={body,activeElement:new Elem('button'),getElementById:id=>ids.get(id),createElement:tag=>new Elem(tag),addEventListener:(name,cb)=>keys.push({name,cb})};
const mock={document,URL,location:{href:'https://welivequran.online/index.html'},ImamApp:{MushafOffline:{openTeacherReader:()=>{throw Error('LEGACY READER WAS OPENED')}}}};
mock.window=mock;
vm.createContext(mock);vm.runInContext(js,mock);
assert.equal(mock.ImamUnifiedHdMushaf.version,'review9-hotfix2');
const run=fn=>fn().then(()=>{});
(async()=>{
 await run(()=>mock.openTeacherMushaf());
 const layer=ids.get('imamUnifiedHdMushaf');assert(layer&&!layer.hidden);
 assert.equal(layer.querySelector('iframe').src,'https://welivequran.online/academy-mushaf.html?embedded=1');
 await run(()=>mock.ImamApp.MushafOffline.openTeacherReader(48));
 assert.equal(layer.querySelector('iframe').src,'https://welivequran.online/academy-mushaf.html?embedded=1&page=48');
 await run(()=>mock.openMushafReader(604));
 assert(layer.querySelector('iframe').src.endsWith('&page=604'));
 await run(()=>mock.openMushafLitePage(999));
 assert(!layer.querySelector('iframe').src.includes('&page='),'Bad page numbers are rejected');
 layer.querySelector('button').listeners.click();assert(layer.hidden,'must close without changing lesson');
 assert.equal(layer.querySelector('iframe').src,undefined,'closed frame must not keep streaming');
 console.log('PASS unified Mushaf direct API, teacher, review, legacy page opens, embedded HD 604 and close without legacy reader');
})().catch(e=>{console.error(e);process.exitCode=1});
