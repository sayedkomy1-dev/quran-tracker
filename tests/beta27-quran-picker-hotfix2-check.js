'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const code=fs.readFileSync('js/features/teacher-quran-range-picker.js','utf8');
const marker=fs.readFileSync('js/features/teacher-error-marking.js','utf8');
const css=fs.readFileSync('teacher-quran-range-picker.css','utf8');
const ver='11.12.1-beta.27-quran-picker-hotfix2';
for(const file of ['teacher-quran-range-picker.css','js/features/teacher-quran-range-picker.js','js/features/teacher-error-marking.js']) {
 assert(html.includes(file+'?v='+ver), 'new asset browser version: '+file);
 assert(sw.includes("'./"+file+'?v='+ver+"'"), 'new asset PWA cache version: '+file);
}
assert(css.includes('min-width:42px')&&css.includes('min-height:42px'),'verse selection must have a phone-size tap target');
assert(code.includes("if(!draft||!e.target.closest('.quran-ayah-num, .ia27-choose-end'))return"),'separate verse number selection from word errors');
assert(code.includes("g.closeQuranTextModal?.()"),'after approval return to teacher session editor');
assert(marker.includes("classList.contains('ia27-selecting-range')"),'word/letter editor must not block initial full-surah selection');
assert(code.includes('chapterReady')&&code.includes('chapterPending')&&code.includes('prefetchChapter(key)'),'memory cache and deduplication must be present');
async function run(){
 let loads=0;
 const fake={
   globalThis:null,Map,Promise,Number,Object,setTimeout,clearTimeout,
   document:{readyState:'complete',getElementById:()=>null},
   fetchQpcHafsChapter:async(ch)=>{loads++;return [{ayah:1,text:'test fixture — not Quran'}]},
   ImamApp:{}
 };fake.globalThis=fake;
 vm.runInNewContext(code,fake);
 const two=await Promise.all([fake.fetchQpcHafsChapter(18),fake.fetchQpcHafsChapter(18)]);
 const again=await fake.fetchQpcHafsChapter(18);
 assert.equal(loads,1,'concurrent and repeated chapter reads should share a single underlying load');
 assert.equal(two[0].length,1);assert.equal(again.length,1);
 console.log('PASS picker hotfix2: mobile touch selection, fast repeat access, PWA refs, correction tool isolation');
}
run().catch(err=>{console.error(err);process.exitCode=1;});
