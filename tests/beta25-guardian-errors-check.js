'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const js=read('v9.js'),css=read('css/platform/responsive.css'),guardian=read('js/features/guardian-portal-share.js'),reportSource=read('js/features/teacher-correction-document.js'),error=read('js/features/teacher-error-marking.js');
assert.equal(read('VERSION').trim(),'11.12.1-beta.25');
for(const step of ['assessment','new','review','notes'])assert(js.includes(step));
assert(js.includes("footer.insertAdjacentElement('afterend',errors)"));
assert(js.includes("errors.hidden=V9.step!=='notes'"));
assert(js.includes("errors.dataset.v9Step='notes'"));
assert(!js.includes("legacy.dataset.v9Step='notes'"));
assert(css.includes('grid-template-columns:minmax(0,1fr)'));
assert(css.includes('#pg-session .session-errors-card[hidden]'));
for(const label of ['🎧 مشاركة صوت التكليف (الحفظ الجديد)','🧭 مشاركة أخطاء الحصة'])assert(js.includes(label));
for(const value of ['saveSessionBtn','saveSendSessionBtn','teacherAssignmentAudioBtn','ia25ShareErrorsButton'])assert(js.includes(value));
assert(guardian.includes('v1010-guardian-more')&&guardian.includes('إدارة ولي الأمر'));
for(const id of ['v1010EnablePhoneBtn','v1010ResetPhoneBtn','v1010UnlinkPhoneBtn','v1010PhoneStatus','v1010PortalStudent','v1010GuardianSecret'])assert(guardian.includes(id));
const document={readyState:'loading',addEventListener(){},getElementById(){return null;}};
const ctx={document,Intl,console,Date,globalThis:null};ctx.globalThis=ctx;
vm.runInNewContext(reportSource,ctx);
const api=ctx.ImamCorrectionDocument;
const rows=[
 {source:'quran-word',mode:'new_read',surah:'البقرة',surahId:2,ayah:2,word:'ذلك',charText:'ل',targetLevel:'char',type:'تشكيل'},
 {source:'quran-word',mode:'recitation',surah:'النساء',surahId:4,ayah:7,word:'الذين',type:'تردد'},
 {source:'quran-word',mode:'review',surah:'الملك',surahId:67,ayah:1,word:'تبارك',type:'وقف/ابتداء'},
 {type:'نسيان آية',section:'مراجعة الأجزاء',at:'2026-10-22T12:00:00Z'},
 {type:'حفظ',section:'التصحيح على النص الجديد',at:'2026-10-22T12:01:00Z'}
];
const st={id:'p1',name:'طالب <img>'},ses={studentId:'p1',date:'2026-10-22',status:'حضر',recitationErrors:rows};
const html=api.reportHtml(st,ses,{errorsOnly:true});
for(const word of ['ذلك','الذين','تبارك','تشكيل','تردد','وقف/ابتداء','نسيان آية','حفظ'])assert(html.includes(word),`HTML missing ${word}`);
assert(html.includes('5</strong>أخطاء مسجلة'));
assert(html.includes('مراجعة الأجزاء')&&html.includes('التصحيح على النص الجديد'), 'manual error contexts in HTML');
assert(!html.includes('نتيجة التسميع والتقييم'),'separate report must not contain full assignment');
assert(!html.includes('<img>'),'escape student name for HTML');
const full=api.reportHtml(st,ses);assert(full.includes('نتيجة التسميع والتقييم'),'original full report remains');
const lines=api.rowsForPng(ses);assert.equal(lines.length,5);assert(lines.some(x=>x.includes('الملك'))&&lines.some(x=>x.includes('نسيان آية')));
const plain=api.errorsPlainText(ses);assert(plain.includes('تشكيل')&&plain.includes('حفظ')&&plain.includes('مراجعة الأجزاء')); 
const start=error.indexOf('  function correctionDetailsText(ses){'),end=error.indexOf('  function appendCorrectionDetails(msg,ses){',start);
assert(start>0&&end>start);
const formatter=vm.runInNewContext(`(function(){const quranErrors=rs=>rs.filter(x=>x.source==='quran-word');const phase=m=>m==='new_read'||m==='talaqqin'?'new':m==='review'?'review':'recitation';const phaseLabel=p=>({new:'الحفظ الجديد',recitation:'التسميع',review:'المراجعة'})[p];const rowIsChar=e=>e.targetLevel==='char';const ctxLabel=m=>m;${error.slice(start,end)};return correctionDetailsText;})()`,{});
const wa=formatter(ses);
assert(wa.includes('مواضع التصحيح على النص')&&wa.includes('أخطاء سجلها المحفظ'));
assert(wa.includes('نسيان آية')&&wa.includes('تشكيل')&&wa.includes('وقف/ابتداء'));
assert(wa.includes('مراجعة الأجزاء')&&wa.includes('التصحيح على النص الجديد'), 'manual context in WA');
assert.equal(rows.length,api.rowsForPng(ses).length,'all error classes must survive export');
assert(fs.readFileSync('v8.js','utf8').includes('if(!isQuranWord&&V8_ERROR_CONTEXTS.includes(x.section))out.section=x.section'), 'legacy normalization must preserve chip context');
assert(fs.readFileSync('index.html','utf8').includes('id="ia25ErrorContext"'), 'manual context choice exists');
const v8=read('v8.js');const normStart=v8.indexOf('function v8NormalizeErrorRecord('),normEnd=v8.indexOf('function v8Toast(',normStart);
const normalized=vm.runInNewContext(`(function(){const V8_ERROR_TYPES=['حفظ','تردد'];const V8_ERROR_CONTEXTS=['التسميع','مراجعة الأجزاء'];const v8SafeText=(v,max)=>String(v??'').slice(0,max);const v8Now=()=> '2026-10-22'; ${v8.slice(normStart,normEnd)} return v8NormalizeErrorRecord;})()`,{});
assert.equal(normalized({type:'تردد',section:'مراجعة الأجزاء',at:'today'}).section,'مراجعة الأجزاء','manual context must survive normalized save');
assert.equal(normalized({type:'تردد',section:'<script>',at:'today'}).section,undefined,'reject unknown context on import');
assert(reportSource.includes('بطاقة التصحيح الملونة (أخطاء النص)')&&reportSource.includes('previewCurrentDraftImage'),'keep previous marked PNG path');
console.log('PASS beta25: notes-only original error ledger + four unique actions + guardian UI + mixed-error HTML/PNG/text/WhatsApp report');
