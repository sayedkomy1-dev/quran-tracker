'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html'),sw=read('sw.js'),role=read('js/features/role-home.js'),guide=read('js/features/ux-guidance.js'),style=read('role-home.css'),mark=read('js/features/teacher-error-marking.js'),portal=read('js/features/guardian-portal-view.js'),mushaf=read('js/features/mushaf-offline.js'),guest=read('guest-practice.html');
for(const [k,text] of [['role',role],['guidance',guide],['error',mark],['portal',portal]])new vm.Script(text,{filename:k});
for(const ref of ['role-home.css?v=11.12.1-beta.10','ux-guidance.css?v=11.7.4.2','js/features/role-home.js?v=11.12.1-beta.10','js/features/ux-guidance.js?v=11.7.4.2','js/features/teacher-error-marking.js?v=11.8.0']){
 assert(index.includes(ref),'missing HTML ref '+ref);assert(sw.includes(ref),'missing offline ref '+ref);
}
assert(style.includes('v92-actions{display:none!important}'),'old duplicate buttons must be hidden in workspace');
assert(role.includes('switchRole')&&role.includes('data.helpText')===false&&role.includes('btn.dataset.helpText'),'role switching/help metadata missing');
assert(guide.includes('savedKey')&&guide.includes('setItem(savedKey(active)')&&guide.includes('guides[role]'),'guide must be one time per role');
assert(!guest.includes('🔒 لا يعرض هذا القسم'),'technical guest footer still visible');
assert(!mushaf.includes('<span class="v92-kicker">مصحف المدينة النبوية · قارئ 11.0.0'),'technical mushaf heading still visible');
assert(portal.includes('function correctionPhase(')&&portal.includes('gr.phase'),'guardian corrections not separated');
assert(mark.includes('snapshotPages')&&mark.includes('scale=2')&&mark.includes('shareSnapshotFile(state.previewFiles'),'multipage high-density PNG share missing');
assert(mark.includes("safeOpenWhatsApp(st,msg);")&&mark.includes("'saveAndSendWA'"),'direct guardian WhatsApp workflow changed');
// Behavioral: 42 errors across three learning phases, with same-verse overflow.
const events={};const doc={readyState:'loading',addEventListener:(k,v)=>events[k]=v,getElementById:()=>null,createElement:()=>{throw Error('not used');}};
const world={document:doc,console,Date,Intl,Math,Number,String,Array,Set,Map,JSON,localStorage:{getItem:()=>null}};world.globalThis=world;
vm.runInNewContext(mark,world);
const api=world.ImamTeacherErrorMarking;
function row(i,mode){return {id:'x'+mode+i,source:'quran-word',mode,group:'memory',type:'تردد',surah:'النبأ',surahId:78,ayah:1+Math.floor(i/5),wordIndex:i%5,word:'عَمَّ',ayahText:'عَمَّ يَتَسَاءَلُونَ',resolved:false};}
const rows=[...Array.from({length:29},(_,i)=>row(i,'new_read')),...Array.from({length:13},(_,i)=>row(i,'recitation')),...Array.from({length:8},(_,i)=>row(i,'review'))];
const pages=api.snapshotPages({recitationErrors:rows});
assert.equal(pages.flatMap(p=>p.rows).length,rows.length,'error marks must never be dropped');
assert(pages.every(p=>p.rows.length<=12),'max marks per image should be bounded');
assert(pages.every(p=>new Set(p.rows.map(r=>`${r.surahId}:${r.ayah}`)).size<=2),'a PNG should contain <=2 verses');
assert(pages.every(p=>p.rows.every(r=>r.mode==='new_read'&&p.phase==='new'||r.mode==='recitation'&&p.phase==='recitation'||r.mode==='review'&&p.phase==='review')),'error stages must not mix within image');
const groups=api.phaseStats(rows);assert.equal(groups.new,29);assert.equal(groups.recitation,13);assert.equal(groups.review,8);
// Ensure old rows without mode are still classified as recitation instead of lost.
assert.equal(api.phaseStats([{source:'quran-word'}]).recitation,1);
// Exercise the real canvas generator with a deterministic graphics context.
const drawn=[];
function fakeContext(){return new Proxy({}, {get(_t,key){if(key==='measureText')return v=>({width:String(v).length*24});if(key==='fillText')return v=>drawn.push(String(v));if(['fillRect','beginPath','moveTo','arcTo','closePath','fill','stroke','lineTo','drawImage','scale'].includes(key))return ()=>{};return undefined;},set(){return true;}});}
const canvasWorld={document:{readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return fakeContext();}};}},console,Date,Intl,Math,Number,String,Array,Set,Map,JSON};canvasWorld.globalThis=canvasWorld;
vm.runInNewContext(mark.replace('g.ImamTeacherErrorMarking={init,','g.ImamTeacherErrorMarking={buildSnapshotCanvas,init,'),canvasWorld);
const c=canvasWorld.ImamTeacherErrorMarking.buildSnapshotCanvas({name:'طالب تجريبي'}, {date:'2026-10-16',recitationErrors:pages[0].rows});
assert.equal(c.width,2160,'PNG must be 2x high-density for better readability');
assert(c.height>=1200&&c.height<=9200,'PNG page unexpectedly oversized');
assert(drawn.some(t=>t.includes('الحفظ الجديد')),'card must carry the correct stage heading');
assert(!read('sw.js').includes("self.skipWaiting(); // automatic"),'explicit PWA update unexpectedly altered');
console.log(`PASS role-ux-errors-batch: guided roles, no duplicates, privacy copy, ${pages.length} separate high-resolution PNG pages, staged errors, legacy compatibility, WA unchanged`);
