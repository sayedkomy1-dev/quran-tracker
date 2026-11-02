"use strict";
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=x=>fs.readFileSync(x,'utf8');
const v9=read('v9.js'),home=read('index.html'),sw=read('sw.js'),role=read('js/features/role-home.js');
assert(home.includes('id="pg-mushaf" hidden aria-hidden="true"'), 'Internal offline compatibility mount must stay hidden');
assert(!v9.includes("document.getElementById('pg-mushaf')?.classList.add('on')"),'Old reader must not be activated');
assert(sw.includes("'-mushaf-hd-only' + '-unified-entry1'"),'Cache must refresh after redirect changes');
assert(role.includes("'المصحف','مصحف المدينة عالي الدقة','mushaf'"),'Teacher/supervisor action must describe new reader');
const start=v9.indexOf('function goPage(p){'),end=v9.indexOf('// ─────────────────────',start);
assert(start>0&&end>start,'Existing routing function missing');
let destinations=[],calls=[],closed=0,nav=[],scrolled=0;
const ctx={
 window:{location:{assign:url=>destinations.push(url)},scrollTo:()=>scrolled++},
 closeV9More:()=>closed++,V9_BASE:{goPage:p=>calls.push(p)},
 updateV9Nav:p=>nav.push(p),settings:{v9:{}}
};
vm.runInNewContext(v9.slice(start,end),ctx);
ctx.goPage('mushaf');
assert.deepEqual(destinations,['academy-mushaf.html']);assert.equal(calls.length,0);assert.equal(nav.length,0);
ctx.goPage('session');assert.deepEqual(calls,['session']);assert.deepEqual(nav,['session']);assert.equal(scrolled,1);
assert(v9.includes("goPage('mushaf')"),'Existing More and dashboard shortcuts still go through central route');
assert(!read('js/features/academy-mushaf.js').includes('classicUrl'),'New reader must not have old source');
console.log('PASS single Mushaf entry: old tab unreachable, teacher shortcuts redirect, other navigation stable');
