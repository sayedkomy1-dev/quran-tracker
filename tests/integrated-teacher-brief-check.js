'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../js/features/integrated-teacher-brief.js');
const date='2026-10-27';
const students=[{id:'a',name:'الأول',studentStatus:'active'},{id:'b',name:'الأخ',studentStatus:'active'},{id:'z',studentStatus:'archived'}];
const sessions=[
  {id:'a-1',studentId:'a',sessionDate:'2026-10-20',status:'حضر',new:{surah:'الملك',from:1,to:5},rec:{surah:'البقرة',from:1,to:3},prevGrades:{new:'جيد'},assessmentScores:{new:80},notes:'راجع آخر آيتين'},
  {id:'b-1',studentId:'b',sessionDate:'2026-10-21',status:'حضر',new:{surah:'الفلق',from:1,to:5},assessmentScores:{new:95}},
  {id:'a-2',studentId:'a',sessionDate:'2026-10-25',status:'غاب'},
  {id:'a-future',studentId:'a',sessionDate:'2026-11-02',status:'حضر',new:{surah:'الرحمن',from:1,to:5},assessmentScores:{new:5}}
];
const tasks=[{studentId:'a',title:'راجع المدود',dueDate:'2026-10-25',done:false},{studentId:'b',title:'لا يخصه',done:false},{studentId:'a',title:'مستقبلي',dueDate:'2027-01-01',done:false},{studentId:'a',title:'مكتمل',done:true}];
function test(name,fn){fn();console.log('PASS',name);}
test('No student means no brief',()=>assert.equal(api.integrate(null,[],[],date),null));
test('Empty student has explicit empty states and no invented score',()=>{
 const x=api.integrate(students[0],[],[],date);
 assert.equal(x.mean,null);assert.equal(x.latest,null);assert.deepEqual(x.assignments,[]);assert.equal(x.pending.length,0);assert.match(x.alerts.join(' '),/لا توجد حصص/);
});
test('Archived students do not receive active session brief',()=>{
 assert.equal(api.integrate(students[2],sessions,tasks,date).inactive,true);
});
test('Last absent day and last attended assignments are separate',()=>{
 const x=api.integrate(students[0],sessions,tasks,date);
 assert.equal(x.latest.status,'غاب');assert.equal(x.previous.day,'2026-10-20');assert.match(x.assignments[0].value,/الملك/);
 assert(x.absencePlan);assert.equal(x.mean,80);assert.equal(x.todo.length,1);
});
test('Future-dated sessions and tasks do not contaminate summary',()=>{
 const x=api.integrate(students[0],sessions,tasks,date);assert.equal(x.mean,80);
 assert(!x.assignments.some(a=>a.value.includes('الرحمن')));assert.equal(x.todo.length,1);
});
test('Sibling student isolation',()=>{
 const a=api.integrate(students[0],sessions,tasks,date),b=api.integrate(students[1],sessions,tasks,date);
 assert.equal(b.mean,95);assert.equal(b.absences,0);assert(!b.assignments.some(x=>x.value.includes('الملك')));assert.equal(b.todo.length,1);assert.equal(b.todo[0].title,'لا يخصه');
});
test('Existing error/revision engine values read without mutation',()=>{
 const e=[{type:'مد',where:'سورة الملك',occurrences:2}];const r=[{label:'مراجعة الملك',due:date}];
 const before=JSON.stringify({e,r,sessions,tasks});
 const x=api.integrate(students[0],sessions,tasks,date,{errors:e,reviews:r});
 assert.equal(x.pending.length,1);assert.equal(x.due.length,1);assert.equal(x.alerts.length,[...new Set(x.alerts)].length);
 assert.equal(JSON.stringify({e,r,sessions,tasks}),before);
});
test('Only genuine numeric assessment scores included',()=>{
 const x=api.integrate(students[0],[{studentId:'a',sessionDate:'2026-10-26',status:'حضر',assessmentScores:{rec:'',far:0,new:'foo'}}],[],date);
 assert.equal(x.mean,0);assert.equal(x.previous.scores.length,1);
});
test('Missing review dates do not become due',()=>{
 const x=api.integrate(students[0],[],[],date,{reviews:[{label:'x'},{label:'y',due:'2026-11-01'}]});
 assert.equal(x.due.length,0);
});
test('HTML output escapes untrusted student notes and tasks',()=>{
 const fake={innerHTML:'',hidden:true};const x=api.integrate(students[0],
  [{studentId:'a',sessionDate:'2026-10-20',status:'حضر',notes:'<img src=x onerror=alert(1)>'}],
  [{studentId:'a',title:'<script>bad</script>',done:false}],date);
 api.render(fake,x);assert(!fake.innerHTML.includes('<script>'));assert(!fake.innerHTML.includes('<img'));assert.equal(fake.hidden,false);
 api.render(fake,null);assert.equal(fake.hidden,true);
});
test('Index and service worker wire both new assets only once',()=>{
 const idx=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 for(const x of ['js/features/integrated-teacher-brief.js','integrated-teacher-brief.css']){
  assert.equal(idx.split(x).length-1,1);
  assert(sw.includes(x));
 }
 assert(idx.indexOf('id="integratedTeacherBrief"')>0);
 assert(idx.indexOf('id="integratedTeacherBrief"')<idx.indexOf('id="sessionJourneyCard"'));
 assert(sw.includes('integration-review1'));
});
console.log('Integrated teacher brief: 11 tests passed');
