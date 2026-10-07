'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(cond,msg){if(!cond)throw new Error(msg);}

const html=read('index.html'),sw=read('sw.js'),feature=read('js/features/teacher-followup.js'),css=read('v10.css'),pkg=JSON.parse(read('package.json'));
assert(pkg.version==='10.9.0','package version must be 10.9.0');
assert(html.includes('id="pg-followup"')&&html.includes('مركز متابعة الطلاب'),'follow-up page missing');
assert(html.includes('teacher-followup.js?v=10.9.0'),'follow-up feature missing from HTML');
assert(sw.includes("'./js/features/teacher-followup.js?v=10.9.0'"),'follow-up feature missing from offline shell');
assert(html.includes('data-v108-filter="urgent"')&&html.includes('data-v108-filter="mastery"')&&html.includes('data-v108-filter="attendance"'),'follow-up filters missing');
assert(feature.includes("!st.studentStatus||st.studentStatus==='active'"),'follow-up must only rank active students');
assert(feature.includes('StudentProgress?.calculate')&&feature.includes('(studentId,30)'),'follow-up must reuse 30-day student analytics');
assert(feature.includes("mastery<70")&&feature.includes("attendance<75")&&feature.includes("repeats>=2"),'priority rules missing');
assert(feature.includes('v108ContactGuardian')&&feature.includes("typeof openWhatsApp==='function'"),'manual guardian action missing');
assert(css.includes('.v108-student.urgent')&&css.includes('.v108-home-card'),'follow-up visual states missing');

const now=Date.now();
const context={
  console,
  setTimeout:()=>0,
  clearTimeout:()=>{},
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelectorAll:()=>[]},
  students:[
    {id:'u1',name:'Urgent',studentStatus:'active',group:'A'},
    {id:'s1',name:'Stable',studentStatus:'active',group:'A'},
    {id:'p1',name:'Paused',studentStatus:'paused',group:'A'}
  ],
  sessions:[
    {studentId:'u1',status:'حضر',date:new Date(now-20*86400000).toISOString()},
    {studentId:'s1',status:'حضر',date:new Date(now).toISOString()}
  ],
  ImamApp:{StudentProgress:{calculate:(id)=> id==='u1'?{
    present:[1,2,3],absent:[1,2],mastery:55,attendance:60,repeats:2,attention:[{label:'A'},{label:'B'},{label:'C'}],trend:{cls:'down',label:'تراجع'}
  }:{present:[1,2,3],absent:[],mastery:92,attendance:100,repeats:0,attention:[],trend:{cls:'up',label:'تحسن'}}}},
  globalThis:null
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(feature,context,{filename:'teacher-followup.js'});
const rows=context.ImamApp.TeacherFollowup.rows();
assert(rows.length===2,'paused student must be excluded');
const urgent=rows.find(x=>x.st.id==='u1'),stable=rows.find(x=>x.st.id==='s1');
assert(urgent&&urgent.priority==='urgent'&&urgent.score>=6,'urgent priority calculation failed');
assert(stable&&stable.priority==='stable','stable priority calculation failed');
assert(urgent.reasons.some(x=>String(x).includes('إتقان 55%')),'priority reasons must explain low mastery');
console.log('Teacher follow-up center checks passed for v10.9.0');
