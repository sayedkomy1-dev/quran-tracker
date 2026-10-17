'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const original=fs.readFileSync('js/features/teacher-error-marking.js','utf8');
const report=fs.readFileSync('js/features/teacher-correction-document.js','utf8');
const supervision=fs.readFileSync('js/features/supervisor-dashboard.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
new vm.Script(original);new vm.Script(report);new vm.Script(supervision);
assert(!original.includes('category.slice(0,15)'),'WhatsApp correction detail must not be truncated');
assert(!original.includes('أخطاء أخرى محفوظة في سجل هذه المرحلة'),'No hidden corrections footer');
assert(html.includes('teacher-correction-document.js?v=11.7.4.5'),'Document UI must be loaded');
for(const asset of ['correction-document.css?v=11.7.4.5','teacher-correction-document.js?v=11.7.4.5'])assert(sw.includes(asset),'Document asset omitted from offline shell');
assert(supervision.includes('حالة مزامنة الأكاديمية')&&supervision.includes('rosterSyncState'),'Owner synchronization health list required');
assert(!supervision.includes('phone:')||supervision.includes('phone|الهواتف'),"Don't add phone data to synced roster");
// Execute the real WhatsApp detail formatter with 22 corrections across three stages.
const start=original.indexOf('  function correctionDetailsText(ses){');
const end=original.indexOf('  function appendCorrectionDetails(msg,ses){',start);
assert(start>0&&end>start);
const part=original.slice(start,end);
const world={};
const funcs=vm.runInNewContext(`(function(){const quranErrors=rows=>rows.filter(x=>x.source==='quran-word');const phase=m=>m==='new_read'||m==='talaqqin'?'new':m==='review'?'review':'recitation';const phaseLabel=p=>({new:'الحفظ الجديد',recitation:'التسميع',review:'المراجعة'})[p];const rowIsChar=e=>e.targetLevel==='char';${part};return correctionDetailsText;})()`,world);
const rows=Array.from({length:22},(_,i)=>({source:'quran-word',surah:i<8?'السجدة':i<16?'الزلزلة':'العاديات',surahId:i<8?32:i<16?99:100,ayah:(i%8)+1,word:`كلمة${i+1}`,type:i%2?'تردد':'تشكيل',mode:i<8?'new_read':i<16?'recitation':'review',targetLevel:i%3?'word':'char',charText:'ل',resolved:i===21}));
const msg=funcs({recitationErrors:rows});
for(const e of rows)assert(msg.includes(`«${e.word}»`),`Missing WhatsApp error ${e.word}`);
assert(!msg.includes('مواضع أخرى')&&!msg.includes('أخطاء أخرى'));
const doc={readyState:'loading',addEventListener:()=>{},getElementById:()=>null};
const g={document:doc,Date,Intl,console};g.globalThis=g;
vm.runInNewContext(report,g);
const rendered=g.ImamCorrectionDocument.reportHtml({name:'طالب تجريبي <script>alert(1)</script>'},{date:'2026-10-16',status:'حضر',recitationErrors:rows,
  assessmentScores:{new:15},prevGrades:{new:'إعادة'},new:{surah:'السجدة',from:9,to:14},
  reviewResults:[{items:[{label:'سورة القارعة',score:20,grade:'ضعيف'},{label:'سورة الزلزلة',score:90,grade:'ممتاز'}]}],
  carryForward:{items:[{label:'سورة القارعة'}]},notes:'يراجع الطالب المواضع'});
assert.equal((rendered.match(/class="(?:unresolved|resolved)"/g)||[]).length,22);
assert(rendered.includes('22</strong>أخطاء مسجلة'));
assert(rendered.includes('سورة القارعة')&&rendered.includes('ممتاز')&&rendered.includes('90 من 100'));
assert(rendered.includes('الإعادة التلقائية المقترحة'));
assert(!rendered.includes('<script>alert(1)</script>'),'User text must be HTML-escaped');
assert(rendered.includes('dir="rtl"')&&rendered.includes('@page{size:A4'));
assert(!rendered.includes('fonts.googleapis.com')&&!rendered.includes('http://'));
const tempDir=fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(),'imam-report-'));
fs.writeFileSync(require('node:path').join(tempDir,'report-example.html'),rendered);
fs.rmSync(tempDir,{recursive:true,force:true});
console.log('PASS complete-corrections-sync-health: 22/22 WhatsApp+HTML, review grades, XSS escape, RTL vector print and owner state');
