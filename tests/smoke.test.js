'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');
const {webcrypto}=require('crypto');

const code=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const sandbox={
  console,
  setTimeout:()=>0,
  clearTimeout:()=>{},
  URLSearchParams,
  Date,Math,JSON,Set,Map,
  window:{addEventListener:()=>{},devicePixelRatio:1},
  document:{documentElement:{getAttribute:()=> 'light'},addEventListener:()=>{}},
  navigator:{},
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{},length:0},
  crypto:webcrypto
};
vm.createContext(sandbox);
vm.runInContext(code,sandbox);
const run=expr=>vm.runInContext(expr,sandbox);

assert.strictEqual(
  run("countUniqueAyatFromSections([{surah:'البقرة',from:1,to:10},{surah:'البقرة',from:5,to:15}])"),
  15,
  'Overlapping ayah ranges must not be double-counted'
);

run(`
  const __today=new Date();
  const __yesterday=new Date(__today);__yesterday.setDate(__today.getDate()-1);
  const __twoDays=new Date(__today);__twoDays.setDate(__today.getDate()-2);
  globalThis.__streakDays=[localDateKey(__today),localDateKey(__yesterday),localDateKey(__twoDays)];
`);
assert.strictEqual(run('calcStreakFromDays(globalThis.__streakDays)'),3,'Streak must require consecutive days');

run(`students=[
  {id:'a',name:'أحمد',scheduleDays:[0],scheduleTime:'16:00',sessionDuration:60},
  {id:'b',name:'محمود',scheduleDays:[0],scheduleTime:'16:30',sessionDuration:30},
  {id:'c',name:'علي',scheduleDays:[1],scheduleTime:'16:30',sessionDuration:30}
];`);
assert.strictEqual(run("getScheduleConflicts(students[0],'a').length"),1,'Schedule overlap must be detected');

run(`sessions=[
  {id:'s1',studentId:'a',status:'حضر',date:'2026-01-01T12:00:00Z',sessionDate:'2026-01-01',new:{surah:'البقرة',from:3,to:10},prevGrades:{}},
  {id:'s2',studentId:'a',status:'حضر',date:'2026-01-03T12:00:00Z',sessionDate:'2026-01-03',new:{surah:'البقرة',from:27,to:35},prevGrades:{new:'ممتاز'},actualRecitation:{new:{surah:'البقرة',from:3,to:26}}},
  {id:'s3',studentId:'a',status:'حضر',date:'2026-01-05T12:00:00Z',sessionDate:'2026-01-05',prevGrades:{new:'جيد'},actualRecitation:{new:{surah:'البقرة',from:27,to:35}}}
];`);
assert.strictEqual(run("calcTotalAyat('a')"),33,'Actual recitation beyond the assigned amount must count toward verified progress');
assert.strictEqual(run('getAssessmentAverage(sessions[1])'),4,'Assessment average must use prevGrades');
assert.strictEqual(run("getSurahIndex('سورة البقرة')"),1,'Editable surah field must accept سورة prefix');
assert.strictEqual(run("getQuranProgressPercent('a')"),Number((33/6236*100).toFixed(1)),'Quran progress percentage must use verified actual recitation');

console.log('✓ smoke tests passed');
