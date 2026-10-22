'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const v9=fs.readFileSync('v9.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const tag='11.12.1-beta.24-mobile-nav-hotfix1';
assert(index.includes(`v9.js?v=${tag}`),'HTML must request the updated mobile menu');
assert(sw.includes(`'./v9.js?v=${tag}'`),'offline precache must use the patched menu');
assert(sw.slice(sw.indexOf('const CRITICAL_FRESH_SHELL'),sw.indexOf('const APP_SHELL')).includes(`'./v9.js?v=${tag}'`),'menu must be installed fresh without an old-cache fallback');
assert(sw.includes(`quran-pwa-v11.12.1-beta.24-workspace-workflow`),'cache generation must change');
assert(index.includes('id="imamSmartBoardTab"'),'existing desktop entry must stay intact');
const start=v9.indexOf('function v9CanOpenSmartBoard()');
const end=v9.indexOf('function updateV9Nav(',start);
assert(start>0&&end>start,'functions for mobile board permission and More entry must exist');
let role='student',status='active',opens=0,errors=[];
const grid={items:[],querySelector(){return this.items.find(x=>x.attrs['data-v9-smart-board']==='1')||null;},appendChild(x){x.parent=this;this.items.push(x);}};
function fakeButton(){return {
 attrs:{},listeners:{},className:'',innerHTML:'',type:'',
 setAttribute(k,v){this.attrs[k]=v;},
 addEventListener(k,v){this.listeners[k]=v;},
 remove(){const i=this.parent?.items.indexOf(this);if(i>=0)this.parent.items.splice(i,1);},
 click(){this.listeners.click?.();}
};}
const modal={classes:new Set(),attrs:{},classList:{add(k){modal.classes.add(k);},remove(k){modal.classes.delete(k);}},setAttribute(k,v){this.attrs[k]=v;}};
const ctx={
 WeLiveQuranAuth:{getAccess:()=>({role,status})},
 ImamApp:{SmartBoard:{open:()=>opens++}},
 document:{getElementById:(id)=>id==='v9MoreGrid'?grid:id==='v9MoreSheet'?modal:null,createElement:fakeButton},
 v9Icon:()=>'<svg></svg>',toast:(message,type)=>errors.push({message,type}),
};
ctx.globalThis=ctx;
vm.runInNewContext(v9.slice(start,end)+'\n'+"function closeV9More(){const m=document.getElementById('v9MoreSheet');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');}}",ctx);
ctx.syncV9SmartBoardEntry();assert.equal(grid.items.length,0,'student must not see the teacher board');
for (const denied of ['guardian','guest','student']){role=denied;ctx.openV9More();assert.equal(grid.items.length,0,`${denied} must not see board`);}
role='teacher';ctx.openV9More();assert.equal(grid.items.length,1,'teacher must see board');
assert.equal(grid.items[0].attrs['aria-label'],'السبورة التفاعلية');
assert(modal.classes.has('open'));
ctx.openV9More();assert.equal(grid.items.length,1,'entry must not duplicate');
grid.items[0].click();assert.equal(opens,1,'mobile menu must open native board');assert(!modal.classes.has('open'),'More must close before board opens');
role='owner';ctx.openV9More();assert.equal(grid.items.length,1);
role='supervisor';ctx.openV9More();assert.equal(grid.items.length,1);
status='suspended';ctx.openV9More();assert.equal(grid.items.length,0,'inactive account must hide board immediately');
status='active';role='teacher';ctx.openV9More();delete ctx.ImamApp.SmartBoard;grid.items[0].click();assert.equal(opens,1,'absent feature must not run');assert.equal(errors.length,1,'absent board must show an error');
console.log('PASS mobile board entry, permissions, account switching, click, offline asset freshness');
