'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={console,globalThis:null,localStorage:{getItem:()=>null,setItem:()=>{}},document:{dispatchEvent:()=>{}},CustomEvent:function(){},Uint8Array,Map,Set};
context.globalThis=context;vm.createContext(context);
// Retrieve the existing canonical chapter-length list. Do not ship a second one.
const original=source('app.js'),match=original.match(/const S=(\[[\s\S]*?\]);\s*const JZ=/);
assert(match,'canonical chapter-length metadata not found');
vm.runInContext(`globalThis.testSurahs=${match[1]}`,context);
vm.runInContext(source('js/features/quran-structure.js'),context);
vm.runInContext(source('js/features/quran-coverage-progress.js'),context);
const api=context.ImamApp.QuranCoverageProgress;
const meta=context.testSurahs,qs=context.ImamApp.QuranStructure;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS:',name);}
const data=(sid,rows,verified)=>api.build(sid,rows,meta,verified,qs);
test('Surah metadata complete: 114 surahs 6236 ayat',()=>{
 const m=data('a',[],[]);assert.equal(m.total,6236);assert(m.quartersAvailable);
});
test('A student without sessions shows zero, not fabricated memorization',()=>{
 const a=data('a',[],[]);assert.equal(a.verified,0);assert.equal(a.review,0);assert.equal(a.surahRows.length,0);
});
test('Counts overlapping verified ranges once',()=>{
 const a=data('a',[],[{surah:'الفاتحة',from:1,to:5},{surah:'الفاتحة',from:4,to:7}]);
 assert.equal(a.verified,7);assert.equal(a.surahRows[0].pct,100);
});
test('Assignments and unevaluated attendance never count as memorized',()=>{
 const a=data('a',[{studentId:'a',status:'حضر',new:{surah:'البقرة',from:1,to:50},rec:{surah:'البقرة',from:1,to:10}}],[]);
 assert.equal(a.verified,0);assert.equal(a.review,0);
});
test('Only actual recitation with teacher score or grade counts as review',()=>{
 const ses={studentId:'a',status:'حضر',actualRecitation:{rec:{surah:'البقرة',from:3,to:9}},prevGrades:{rec:'جيد'}};
 const a=data('a',[ses],[]);assert.equal(a.review,7);assert.equal(a.verified,0);
});
test('Absent student or another student cannot contribute reviewed ayat',()=>{
 const list=[{studentId:'b',status:'حضر',actualRecitation:{rec:{surah:'الفاتحة',from:1,to:7}},prevGrades:{rec:'ممتاز'}},
 {studentId:'a',status:'غاب',actualRecitation:{far:{surah:'الفاتحة',from:1,to:7}},assessmentScores:{far:85}}];
 assert.equal(data('a',list,[]).review,0);
});
test('Grades without an explicit actually recited range do not imply coverage',()=>{
 const a=data('a',[{studentId:'a',status:'حضر',prevGrades:{rec:'ممتاز'},rec:{surah:'الفاتحة',from:1,to:7}}],[]);
 assert.equal(a.review,0);
});
test('No score 110, ambiguous grade, malformed ranges or mismatched surah ID accepted',()=>{
 const ses={studentId:'a',status:'حضر',actualRecitation:{rec:{surah:'الفاتحة',surahId:2,from:1,to:7},far:{surah:'البقرة',from:1,to:5}},assessmentScores:{rec:90,far:110}};
 assert.equal(data('a',[ses],[{surah:'البقرة',from:1,to:900}]).verified,0);
 assert.equal(data('a',[ses],[]).review,0);
});
test('Quarter and juz boundaries are driven by verified QuranStructure refs',()=>{
 const a=data('a',[],[{surah:'الفاتحة',from:1,to:7},{surah:'البقرة',from:26,to:26}]);
 const juz=a.juzRows.find(r=>r.juz===1);assert(juz);
 assert.equal(juz.quarters[0].verified,7);assert.equal(juz.quarters[1].verified,1);
});
test('Hizb and quarter counts across several juz remain consistent',()=>{
 const a=data('a',[],[{surah:'البقرة',from:1,to:286}]);
 assert(a.juzRows.length>=1);assert.equal(a.juzRows.reduce((s,r)=>s+r.verified,0),286);
 assert(a.juzRows.every(r=>r.quarters.length===8));
});
test('Corrupted Quran quarter metadata suppresses estimated juz breakdown',()=>{
 const a=api.build('a',[],meta,[{surah:'الفاتحة',from:1,to:7}],{RUB_STARTS:['1:1','1:1']});
 assert.equal(a.verified,7);assert.equal(a.quartersAvailable,false);
});
test('Archived student history remains counted and untouched',()=>{
 const rows=[{id:'one',studentId:'a',status:'حضر',actualRecitation:{rec:{surah:'الناس',from:1,to:6}},prevGrades:{rec:'ممتاز'}}];
 const copy=JSON.stringify(rows);const a=data('a',rows,[{surah:'الناس',from:1,to:6}]);
 assert.equal(a.verified,6);assert.equal(a.review,6);assert.equal(JSON.stringify(rows),copy);
});
test('Untrusted displayed Quran chapter strings are HTML-escaped',()=>{
 const fake=meta.map(x=>({...x}));fake[0].n='<img src=x onerror=alert(1)>';
 const html=api.render('a',[],fake,[{surah:fake[0].n,from:1,to:1}],qs);
 assert(!html.includes('<img src=x onerror'));assert(html.includes('&lt;img'));
});
test('No Quran source or verified sections means no misleading zero mastery',()=>{
 assert.equal(api.build('a',[],null,[],qs).available,false);
 assert.equal(data('a',[],null).available,false);
});
test('Existing student progress dashboard embeds same read-only module',()=>{
 const progress=source('js/features/student-progress.js');
 assert(progress.includes('v107CumulativeCoverage(studentId)'));
 assert(progress.includes('feature.render(studentId,v107StudentSessions(studentId,Infinity)')); 
 const html=source('index.html'),sw=source('sw.js');
 assert(html.includes('quran-coverage-progress.css?v=11.12.1-beta.27-coverage-review3'));
 assert(html.includes('quran-coverage-progress.js?v=11.12.1-beta.27-coverage-review3'));
 assert(sw.includes('quran-coverage-progress.js?v=11.12.1-beta.27-coverage-review3'));
 assert(sw.includes('quran-coverage-progress.css?v=11.12.1-beta.27-coverage-review3'));
});
console.log(`quran-coverage-progress-check: ${passed} cases passed`);
