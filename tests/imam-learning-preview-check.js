'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('../js/features/imam-learning-preview.js');
const row=(id,studentId,date,ayah,type='نطق حرف')=>({id,studentId,date,status:'حضر',recitationErrors:[{source:'quran-word',type,surahId:1,ayah,wordIndex:0,targetLevel:'char',charIndex:0,charText:'حَ'}]});
const records=[row('s1','a','2026-11-01',2),row('s2','a','2026-11-02',3),row('b1','b','2026-11-01',2),row('b2','b','2026-11-02',3),row('x1','x','2026-11-01',2),row('x2','x','2026-11-02',3)];
const visible=[{st:{id:'a'}},{st:{id:'a'}},{st:{id:'x',studentStatus:'archived'}}];
let n=0;const check=(v,m)=>{assert(v,m);n++;};
const before=JSON.stringify(records);
const profiles=api.build(records,visible,'2026-11-27');
check(profiles.size===1,'only visible active student');
check(!profiles.has('b')&&!profiles.has('x'),'no sibling/archived leakage');
check(profiles.get('a').patterns.length===1,'pattern');
check(profiles.get('a').activities.length===1,'practice proposal');
check(api.renderStudentProfile(profiles.get('a')).includes('الذاكرة التعليمية'),'render');
check(api.renderStudentProfile(profiles.get('a')).includes('لا تحليل صوتي آلي'),'clear limitation');
check(api.renderStudentProfile({patterns:[]})==='','empty no phantom result');
check(JSON.stringify(records)===before,'read only');
check(!api.renderStudentProfile({patterns:[{type:'<img src=x>',distinctDays:2,distinctLocations:2,lastSeen:'2026-11-01'}],activities:[]}).includes('<img'),'escape type');
check(api.build(records,[],'2026-11-27').size===0,'fail closed without visible scope');
const read=p=>fs.readFileSync(p,'utf8');
const src=read('js/features/imam-learning-preview.js');
for(const p of ['imam-learning-memory-experiment','imam-learning-skill-graph-experiment','imam-personal-plan-experiment']){
 const original=read('js/features/'+p+'.js').replace(/^if\(typeof module==='object'.*$/gm,'');
 check(src.includes(original),'bundle matches '+p);
}
check(read('index.html').includes('imam-learning-preview.js?v=ai-research-06'),'HTML load');
check(read('sw.js').includes('./js/features/imam-learning-preview.js?v=ai-research-06'),'offline load');
check(read('js/features/teacher-followup.js').includes('ImamLearningPreview?.build?.(Array.isArray(sessions)?sessions:[],visible'),'existing visible scope');
console.log('PASS',n,'read-only teacher integration checks');
