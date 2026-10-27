'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const api=require('../js/features/imam-absence-makeup.js');
const base=path.join(__dirname,'..');
let checks=0;
function run(label,fn){fn();checks++;console.log('PASS',label);}
const s=[
 {id:'a1',studentId:'A',sessionDate:'2026-10-15',status:'غاب',absenceExcused:true,excuseReason:'مرض',absenceArrangement:'makeup',makeupPlannedDate:'2026-10-22'},
 {id:'a2',studentId:'A',sessionDate:'2026-10-17',status:'غاب'},
 {id:'b1',studentId:'B',sessionDate:'2026-10-18',status:'غاب'},
 {id:'m1',studentId:'A',sessionDate:'2026-10-22',status:'حضر',makeupForSessionId:'a1'}
];
const incoming=(record,status='غاب',existing=null,all=s,studentId='A',dateKey='2026-10-20')=>api.validate({studentId,dateKey,status,record,existing,records:all});
run('Strict real-calendar date parsing',()=>{
 for(const x of ['2026-02-30','2026-13-04','27-10-2026','2026-2-03','2026-10-00'])assert(!api.validDay(x));
 assert(api.validDay('2026-10-27'));
});
run('Missing student/date rejected',()=>assert.equal(api.validate({studentId:'',dateKey:'2026-10-19',status:'غاب'}).ok,false));
run('Unexcused absence keeps no fabricated excuse',()=>{
 const r=incoming({absenceExcused:false,excuseReason:'private',absenceArrangement:'none'});
 assert.equal(r.ok,true);assert.equal(r.fields.excuseReason,'');assert.equal(r.fields.learningCompleted,false);
});
run('Excused absence requires meaningful reason',()=>assert.equal(incoming({absenceExcused:true,excuseReason:'   '}).ok,false));
run('Excuse truncated and control characters removed',()=>{
 const r=incoming({absenceExcused:true,excuseReason:'مرض\n'+('x'.repeat(400))});
 assert(r.ok);assert.equal(r.fields.excuseReason.length,300);assert(!r.fields.excuseReason.includes('\n'));
});
run('Unplanned absence never registers a planned date',()=>{
 const r=incoming({absenceArrangement:'none',makeupPlannedDate:'2026-11-08'});
 assert(r.ok);assert.equal(r.fields.makeupPlannedDate,'');
});
run('Postponement and makeup plan must be on later valid dates',()=>{
 for(const status of ['makeup','postponed'])for(const d of ['2026-10-20','2026-10-19','2026-02-30',''])assert.equal(incoming({absenceArrangement:status,makeupPlannedDate:d}).ok,false);
 const r=incoming({absenceArrangement:'postponed',makeupPlannedDate:'2026-10-28'});
 assert(r.ok);assert.equal(r.fields.absenceArrangement,'postponed');
});
run('Only same-student prior actual absence can be linked',()=>{
 const ok=incoming({makeupForSessionId:'a2'},'حضر',null,s,'A','2026-10-23');assert(ok.ok);
 for(const id of ['b1','missing','m1','a1'])assert.equal(incoming({makeupForSessionId:id},'حضر',null,s,'A','2026-10-23').ok,false);
});
run('No linking a future absence to an earlier session',()=>assert.equal(incoming({makeupForSessionId:'a2'},'حضر',null,s,'A','2026-10-16').ok,false));
run('Existing makeup link survives edit without duplicate rejection',()=>{
 const r=incoming({makeupForSessionId:'a1'},'حضر',s[3],s,'A','2026-10-22');assert.equal(r.ok,true);
});
run('Previously compensated absence cannot silently change status',()=>{
 assert.equal(incoming({},'حضر',s[0],s,'A','2026-10-15').ok,false);
});
run('Available absence list filters siblings and completed links',()=>{
 const list=api.availableAbsences('A','2026-10-23',s);assert.deepEqual(list.map(x=>x.id),['a2']);
 assert.deepEqual(api.availableAbsences('A','2026-10-23',s,'m1').map(x=>x.id),['a2','a1']);
});
run('Holiday has no phantom makeup fields',()=>assert.deepEqual(incoming({makeupForSessionId:'a2'},'إجازة').fields,{}));
run('An unrelated attended session stays ordinary',()=>assert.deepEqual(incoming({makeupForSessionId:''},'حضر').fields,{}));
run('Assignment alone cannot be mistaken for completed makeup recitation',()=>{
 assert.equal(api.hasRecitationEvidence({new:{surah:'الملك',from:1,to:3}}),false);
 assert.equal(api.hasRecitationEvidence({prevGrades:{new:'ممتاز'}}),true);
 assert.equal(api.hasRecitationEvidence({actualRecitation:{rec:{surah:'الملك',from:1,to:5}}}),true);
});
run('Source wiring provides controls and offline assets',()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8'),sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
 for(const file of ['imam-absence-makeup.css','js/features/imam-absence-makeup.js']){
   assert.equal(html.split(file).length-1,1);assert(sw.includes(file));
 }
 assert(html.includes('id="imamAbsenceMakeup"'));
 assert(html.indexOf('id="imamAbsenceMakeup"')<html.indexOf('id="sesContent"'));
 assert(sw.includes('absence-review2'));
});
// Execute the actual final app.js session-saving function in an isolated VM to check that
// validation happens before mutation, that it uses the existing session ID, and rollback.
const source=fs.readFileSync(path.join(base,'app.js'),'utf8');
const begin=source.lastIndexOf('function saveSession(opts={})');
const end=source.indexOf('\nfunction fillFromLast()',begin);
assert(begin>0&&end>begin,'effective app.js saveSession not found');
const saveFn=source.slice(begin,end);
function testSave({status,metadata={},records=[],existingId=null,saveOK=true,evidence=false,day='2026-10-20'}){
 const data=structuredClone(records),events=[];
 const fake={sesSt:{value:'A'},sesDate:{value:day},saveSessionBtn:{textContent:''}};
 const context={
  document:{getElementById(id){return fake[id]||null;}},sesStatus:status,editingSessionId:existingId,sessions:data,
  globalThis:{ImamAbsenceMakeup:{prepare(args){return api.validate({...args,record:metadata});},hasRecitationEvidence:api.hasRecitationEvidence}},
  validateSessionSections:()=>'',buildSesData:()=>({new:{surah:'الملك',from:1,to:3},...(evidence?{prevGrades:{new:'ممتاز'}}:{})}),
  makeId:()=>`new-${data.length+1}`,makeSessionISO:k=>`${k}T12:00:00.000Z`,
  findDailySession:(id,date)=>data.find(x=>x.studentId===id&&x.sessionDate===date)||null,
  buildSumText:x=>x.status,save:()=>{events.push('save');return saveOK;},clearDraft:()=>events.push('clearDraft'),
  setDraftState:()=>{},toast:x=>events.push(x),vibrate:()=>{},renderHome:()=>{},setTimeout:()=>{},celebrate:()=>{},grades:{},
 };
 context.globalThis=context.globalThis;
 vm.createContext(context);vm.runInContext(saveFn,context);return{value:vm.runInContext('saveSession({silent:true})',context),data:context.sessions,events,context};
}
run('Save: absence only stores attendance/plan, never fake Quran section',()=>{
 const o=testSave({status:'غاب',metadata:{absenceExcused:true,excuseReason:'مرض',absenceArrangement:'makeup',makeupPlannedDate:'2026-10-25'}});
 assert.equal(o.value.status,'غاب');assert.equal(o.value.learningCompleted,false);assert.equal(o.value.new,undefined);assert.equal(o.data.length,1);
});
run('Save: linked makeup without recitation evidence is rejected before saving',()=>{
 const o=testSave({status:'حضر',metadata:{makeupForSessionId:'a2'},records:[structuredClone(s[1])],day:'2026-10-25'});
 assert.equal(o.value,null);assert.equal(o.data.length,1);assert(!o.events.includes('save'));
});
run('Save: linked attended makeup leaves original absence untouched',()=>{
 const original=structuredClone(s[1]);const o=testSave({status:'حضر',metadata:{makeupForSessionId:'a2'},records:[original],day:'2026-10-25',evidence:true});
 assert.equal(o.value.makeupForSessionId,'a2');assert.equal(o.data[0].status,'غاب');assert.equal(o.data[0].id,'a2');assert.equal(o.data.length,2);
});
run('Save: duplicate makeup link rejected before any changes',()=>{
 const orig=structuredClone(s);const o=testSave({status:'حضر',metadata:{makeupForSessionId:'a1'},records:orig,day:'2026-10-25'});
 assert.equal(o.value,null);assert.equal(o.data.length,orig.length);assert(!o.events.includes('save'));
});
run('Save: existing absence is updated by ID, never duplicated',()=>{
 const o=testSave({status:'غاب',metadata:{absenceExcused:false},records:[{id:'a1',studentId:'A',sessionDate:'2026-10-20',status:'غاب'}],existingId:'a1'});
 assert.equal(o.data.length,1);assert.equal(o.data[0].id,'a1');
});
run('Save: failed persistence rolls the entire session change back',()=>{
 const initial=structuredClone(s[1]);const o=testSave({status:'غاب',metadata:{absenceExcused:true,excuseReason:'سفر'},records:[initial],existingId:'a2',day:'2026-10-17',saveOK:false});
 assert.equal(o.value,null);assert.equal(o.data[0].absenceExcused,undefined);assert(!o.events.includes('clearDraft'));
});
run('Save: invalid excuse does not invoke persistence',()=>{
 const o=testSave({status:'غاب',metadata:{absenceExcused:true,excuseReason:''}});
 assert.equal(o.value,null);assert(!o.events.includes('save'));
});
// Verify actual portable-backup sanitation preserves validated makeup IDs and remaps
// them safely rather than creating orphan links on restore.
const saniBegin=source.indexOf('function sanitizeBackupData(d)');
const saniEnd=source.indexOf('\nfunction importData(',saniBegin);
assert(saniBegin>0&&saniEnd>saniBegin);
const sanitizerCode=source.slice(saniBegin,saniEnd);
function restoreSample(input){
 let serial=0;
 const ctx={
  globalThis:{ImamAbsenceMakeup:api},
  cleanText:(v,n)=>String(v??'').slice(0,n),
  safeImportedId:(v,prefix,used)=>{let id=String(v??'');if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id)||used.has(id))id=`${prefix}-safe-${++serial}`;used.add(id);return id;},
  GRADE_MAP:{'ممتاز':5},S:[],makeId:()=>`gen-${++serial}`,
  sanitizeCircleDiscipline:()=>[],sanitizeTeacherSessionMeta:()=>null,sanitizeRecitationErrors:()=>[],
  normalizeJuzChip:v=>v,normalizeSurahReviewChip:v=>v,cleanImportedSection:()=>null
 };
 vm.createContext(ctx);vm.runInContext(sanitizerCode,ctx);
 return vm.runInContext('sanitizeBackupData',ctx)(input);
}
run('Portable backup preserves attendance, excuse, planned date, makeup link',()=>{
 const output=restoreSample({students:[{id:'A',name:'طالب'}],sessions:[
 {id:'a-abs',studentId:'A',sessionDate:'2026-10-12',status:'غاب',absenceExcused:true,excuseReason:'مرض',absenceArrangement:'makeup',makeupPlannedDate:'2026-10-15'},
 {id:'a-make',studentId:'A',sessionDate:'2026-10-15',status:'حضر',makeupForSessionId:'a-abs'}]});
 assert.equal(output.sessions[0].absenceArrangement,'makeup');
 assert.equal(output.sessions[0].makeupPlannedDate,'2026-10-15');
 assert.equal(output.sessions[1].makeupForSessionId,'a-abs');
});
run('Portable backup remaps imported invalid session IDs consistently',()=>{
 const output=restoreSample({students:[{id:'A',name:'طالب'}],sessions:[
 {id:'bad absence #',studentId:'A',sessionDate:'2026-10-12',status:'غاب'},
 {id:'bad makeup #',studentId:'A',sessionDate:'2026-10-15',status:'حضر',makeupForSessionId:'bad absence #'}]});
 assert.equal(output.sessions[1].makeupForSessionId,output.sessions[0].id);
});
run('Portable backup rejects duplicate/foreign/orphan makeup refs',()=>{
 const output=restoreSample({students:[{id:'A',name:'طالب'},{id:'B',name:'آخر'}],sessions:[
 {id:'a-abs',studentId:'A',sessionDate:'2026-10-12',status:'غاب'},
 {id:'a-make1',studentId:'A',sessionDate:'2026-10-15',status:'حضر',makeupForSessionId:'a-abs'},
 {id:'a-make2',studentId:'A',sessionDate:'2026-10-16',status:'حضر',makeupForSessionId:'a-abs'},
 {id:'b-make',studentId:'B',sessionDate:'2026-10-16',status:'حضر',makeupForSessionId:'a-abs'}]});
 assert.equal(output.sessions[1].makeupForSessionId,'a-abs');
 assert.equal(output.sessions[2].makeupForSessionId,undefined);
 assert.equal(output.sessions[3].makeupForSessionId,undefined);
});
console.log(`Imam absence/makeup: ${checks} tests passed`);
