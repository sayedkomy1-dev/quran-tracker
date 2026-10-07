'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('app.js'),v10=read('v10.js'),css=read('v10.css');
function assert(c,m){if(!c)throw new Error(m);}
for(const g of ['ممتاز','جيد جداً','جيد','ضعيف','إعادة'])assert(v10.includes(`'${g}':{`),`missing assessment choice ${g}`);
assert(v10.includes("if(g==='إعادة')")&&v10.includes('repeatPrevAssignment(key)'), 'repeat assessment must copy the same assignment forward');
assert(v10.includes("if(g==='ضعيف')")&&v10.includes('يحتاج تثبيت قبل التقديم'), 'follow-up assessment behavior missing');
assert(app.includes("'إعادة':0.5"), 'repeat grade must survive backup/import and reporting');
assert(app.includes('isPassingGrade(ses.prevGrades.new)'), 'repeat/follow-up must not be counted as verified new memorization');
assert(css.includes('.v10511-grade-grid')&&css.includes('.v10511-grade-choice.repeat'), 'prominent assessment styles missing');
console.log('Assessment controls checks passed for v10.6.1');
