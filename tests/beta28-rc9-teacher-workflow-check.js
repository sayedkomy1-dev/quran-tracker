'use strict';
/* RC9 focused checks: audio assembly, active offline scripts, and screenshot-specific UX constraints. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),sw=read('sw.js'),flow=read('js/features/rc9-lesson-flow.js');
const style=read('css/platform/rc9-lesson-flow.css');
assert(html.includes('js/features/rc9-lesson-flow.js?v=beta28-rc9'));
assert(html.includes('css/platform/rc9-lesson-flow.css?v=beta28-rc9'));
for(const file of ['js/features/rc9-lesson-flow.js','css/platform/rc9-lesson-flow.css','js/features/offline-audio-library.js','js/features/quran-audio-export.js','js/features/session-intelligence-119.js','js/features/teacher-error-marking.js']){
  const version=file==='js/features/session-intelligence-119.js'?'beta28-rc11':'beta28-rc9';
  assert(sw.includes(`'./${file}?v=${version}'`),`${file}: latest offline asset not included`);
}
assert(flow.includes("student.insertAdjacentElement('afterend',wizard)"),'lesson steps should follow student selector');
assert(flow.includes('ia29LessonExtras')&&flow.includes("makeDetails('ia29ReaderTools'"),'optional cards and text tools need disclosures');
assert(flow.includes("if(v9&&v9.parentElement===pg)"),'keep legacy V9 home directly under page to avoid a blank home');
assert(!flow.includes("details.append(v9Home)"),'home must never be moved beneath hidden legacy children');
assert(flow.includes("g.setSessionMode?.('guided',false)"),'default is guided, not display-everything');
assert(style.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'four lesson tabs must be available without horizontal swiping');
assert(read('v9.js').includes("const nextHeading='ابدأ الحصة الآن'"),'home start must be generic');
const marker=read('js/features/teacher-error-marking.js');
assert(marker.includes('if(!opened)')&&marker.includes('تعذر فتح محادثة ولي الأمر'),'send should distinguish saved from WhatsApp-open failure');
assert(!marker.includes("toast('تم حفظ الحصة وفتح رسالة ولي الأمر'"),'do not claim success without checking handoff');
const checks=read('js/features/session-intelligence-119.js');
assert(checks.includes('const reconciled=checks.map('),'selected visible grade must be considered');
assert(checks.includes('const latest=validateCurrent()'),'warning must be recomputed at click');

const requests=[];
const ctx={Blob,File,Uint8Array,Date,Math,navigator:{onLine:false},ImamOfflineAudio:{
 key(r,c,a){if(!['mishary','husary'].includes(r)||!Number.isInteger(c)||c<1||c>114||!Number.isInteger(a)||a<1||a>286)throw Error('INVALID_VERSE');},
 async verse(r,c,a){requests.push(`${c}:${a}`);return new Blob([Uint8Array.from([c,a,255])],{type:'audio/mpeg'});},
 audioPayload:b=>b,isMp3:()=>true
}};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(read('js/features/quran-audio-export.js'),ctx);
(async()=>{
  let f=await ctx.ImamQuranAudioExport.buildFile({chapter:2,from:34,to:38,reciter:'mishary',surah:'البقرة'});
  assert.deepEqual(requests,['1:1','2:34','2:35','2:36','2:37','2:38'],'mid-surah must prefix one Basmala');
  assert.equal(f.size,18);assert.deepEqual(Array.from(new Uint8Array(await f.arrayBuffer())).slice(0,3),[1,1,255]);
  requests.length=0;
  f=await ctx.ImamQuranAudioExport.buildFile({chapter:9,from:10,to:12,reciter:'mishary',surah:'التوبة'});
  assert.deepEqual(requests,['9:10','9:11','9:12'],'At-Tawbah must not prepend Basmala');assert.equal(f.size,9);
  requests.length=0;
  f=await ctx.ImamQuranAudioExport.buildFile({chapter:2,from:1,to:2,reciter:'mishary',surah:'البقرة'});
  assert.deepEqual(requests,['2:1','2:2'],'verse one uses its own recorded opening, never double-prefix');
  assert(!requests.includes('1:1'));
  const lib=read('js/features/offline-audio-library.js');
  assert(lib.includes('async function downloadVerses')&&lib.includes('if(c!==9&&f>1)rows.unshift([1,1])'),'offline download must include standalone Basmala for mid-surah');
  assert(lib.includes('data-assignment')&&flow.includes('ia29DownloadAudio'),'audio-download action must be reachable from lesson');
  console.log('PASS RC9: teacher tabs directly after student, foldable text tools and secondary panels, preserved V9 homepage, recipient error handoff, current-grade validation, Basmala MP3 on mid-surah, Tawbah exclusion, offline library wiring');
})().catch(e=>{console.error(e);process.exitCode=1;});
