/* beta.27 add/edit regression tests; no network, database, or real student data. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const v9=fs.readFileSync(path.join(root,'v9.js'),'utf8');
function method(src,name){
 const from=src.indexOf('function '+name+'(');
 assert(from>=0,'missing '+name);
 const body=src.indexOf('{',from);let depth=0;
 for(let i=body;i<src.length;i++){
  if(src[i]==='{')depth++;
  if(src[i]==='}'&&!--depth)return src.slice(from,i+1);
 }
 throw Error('unbalanced '+name);
}
const elements=new Map(), dayOptions=[];
function field(id){if(!elements.has(id)) elements.set(id,{value:'',textContent:'',classList:{_open:false,add(n){if(n==='open')this._open=true;},remove(n){if(n==='open')this._open=false;},contains(n){return n==='open'&&this._open;}}});return elements.get(id);}
const logs=[];
const sandbox={students:[],editId:null,curStId:null,DAY_NAMES:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],document:{getElementById:field,querySelectorAll(sel){return sel.includes('checked')?dayOptions.filter(d=>d.checked):dayOptions;}},toast:(m,level)=>logs.push({m,level}),renderSt:()=>{},renderHome:()=>{},getScheduleConflicts:()=>[],makeId:(()=>{let seq=0;return()=>`test-st-${++seq}`;})(),localDateKey:()=> '2026-10-24',save:()=>true,confirm:()=>true};
vm.createContext(sandbox);
vm.runInContext(['normPhone','openAddSt','closeMo','saveSt','editSt'].map(n=>method(app,n)).join('\n'),sandbox);
function prepare(name,phone){sandbox.openAddSt();field('m-name').value=name;field('m-phone').value=phone;field('m-level').value='مبتدئ';field('m-duration').value='30';}
assert.equal(sandbox.normPhone('٠١٠١٢٣٤٥٦٧٨'),'201012345678');
assert.equal(sandbox.normPhone('+966 50 123 4567'),'966501234567');
assert.equal(sandbox.normPhone('0020 1012345678'),'201012345678');
prepare('طالب تجريبي','٠١٠١٢٣٤٥٦٧٨');sandbox.saveSt();
assert.equal(sandbox.students.length,1);assert.equal(sandbox.students[0].phone,'201012345678');
prepare('طالب تجريبي','01012345678');sandbox.saveSt();
assert.equal(sandbox.students.length,1,'duplicate name+phone must not create record');
assert.equal(field('stModal').classList.contains('open'),true,'duplicate should leave modal open');
prepare('شقيق الطالب','01012345678');sandbox.saveSt();
assert.equal(sandbox.students.length,2,'siblings with same guardian number must be allowed');
prepare('طالب دولي','+966501234567');sandbox.saveSt();
assert.equal(sandbox.students.length,3,'international E164 phone should work');
sandbox.curStId=sandbox.students[0].id;sandbox.editSt();
field('m-name').value='طالب تجريبي معدل';sandbox.saveSt();
assert.equal(sandbox.students.length,3,'editing must not add another student');
assert.equal(sandbox.students[0].id,'test-st-1','editing must retain immutable ID');
assert.equal(sandbox.students[0].name,'طالب تجريبي معدل');
// Required input rejection does not create a student.
prepare('طالب بلا هاتف','');sandbox.saveSt();
assert.equal(sandbox.students.length,3);assert.equal(field('stModal').classList.contains('open'),true);
assert(v9.includes('openStudentEditor('),'list editing entry should be present');
assert(v9.includes("getElementById('v9StudentStatusFilter')"),'filter must use actual DOM ID');
assert(app.includes('✏️ تعديل بيانات الطالب'),'profile editing entry should be visible');
console.log('PASS beta27: Arabic/international phone, duplicate prevention, siblings, editing immutable ID, missing phone rejection, visible edit entry, status filter');
