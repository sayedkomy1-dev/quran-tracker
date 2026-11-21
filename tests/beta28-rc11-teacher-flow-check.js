'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html'),sw=read('sw.js'),css=read('css/platform/rc11-teacher-flow.css'),js=read('js/features/rc11-teacher-flow.js');
for(const name of ['css/platform/rc11-teacher-flow.css','js/features/rc11-teacher-flow.js']){
 assert(index.includes(`${name}?v=beta28-rc11`),'must load '+name);
 assert(sw.includes(`'./${name}?v=beta28-rc11'`),'must cache '+name);
}
assert.equal((index.match(/id="saveSendSessionBtn"/g)||[]).length,1,'guardian-send button must not be cloned');
assert.equal((index.match(/id="saveSessionBtn"/g)||[]).length,1,'official save button stays single');
assert(!/createElement\(['"]button['"]\)[\s\S]*saveSendSessionBtn/.test(js),'no cloned send button');
assert(css.includes('position:fixed!important')&&css.includes('.ia30-step-next'),'next button accessible without bottom scrolling');
assert(js.includes("details.append(row)")&&js.includes('details.append(board)'),'existing controls moved inside collapsible disclosure');
assert(js.includes("if(!st.phone)"),'missing guardian number has explicit diagnostic');
assert(js.includes("SaveHealth"),'local save health controls failure detail');
const elements={sesSt:{value:'s1'},sesDate:{value:'2026-11-21'}};
const g={document:{readyState:'loading',addEventListener(){},getElementById:id=>elements[id]||null},ImamApp:{SaveHealth:{ok:false,error:'QuotaExceededError'},State:{students:[{id:'s1',phone:'01012345678'}]}}};
g.globalThis=g;vm.createContext(g);vm.runInContext(js,g);
assert.match(g.ImamTeacherFlowRC11.explainError('save'),/مساحة تخزين/);
g.ImamApp.SaveHealth={ok:true};g.ImamApp.State.students[0].phone='';
assert.match(g.ImamTeacherFlowRC11.explainError('send'),/رقم ولي الأمر غير مسجل/);
g.ImamApp.State.students[0].phone='01012345678';
assert.match(g.ImamTeacherFlowRC11.explainError('send'),/واتساب/);
elements.sesSt.value='';assert.match(g.ImamTeacherFlowRC11.explainError('save'),/اختر الطالب/);
const checks=read('js/features/session-intelligence-119.js');
assert(checks.includes("critical?'mo open im119-dialog':'ia31-inline-warning'"),'noncritical must be inline, no overlay');
assert(checks.includes('const latest=validateCurrent()'),'revalidation is required');
console.log('PASS RC11: save/send remains single; visible inline soft warnings, failure explanation, mobile next access, offline script references');
