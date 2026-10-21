'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/features/academy-analytics-1112.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const roleHome=fs.readFileSync(path.join(root,'js/features/role-home.js'),'utf8');
assert(html.includes('academy-analytics-1112.css?v=11.12.1-beta.16'));
assert(html.includes('js/features/academy-analytics-1112.js?v=11.12.1-beta.16'));
assert(worker.includes("'./academy-analytics-1112.css?v=11.12.1-beta.16'"));
assert(worker.includes("'./js/features/academy-analytics-1112.js?v=11.12.1-beta.16'"));
assert(roleHome.includes("['📊','تحليلات الأكاديمية'"));
assert(roleHome.includes("['📊','تحليلات نطاق الإشراف'"));
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'administrative data must not persist locally');
assert(!source.includes('guardian_teacher_ratings'),'private ratings must not be included');
const nodes=new Map();
function el(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,innerHTML:'',textContent:'',style:{},addEventListener(){},querySelector(){return {focus(){}};}});return nodes.get(id);}
const events={};let ticker=null;
const document={
  getElementById: id=>nodes.get(id)||null,
  createElement:()=>({id:'',className:'',hidden:false,innerHTML:'',addEventListener(){},querySelector(){return {focus(){}};}}),
  body:{appendChild(node){nodes.set(node.id,node);}},addEventListener(){}
};
let user='owner',active=true,onLine=true,responseAuth={allowed:true},responseDashboard={owner:true,teachers:[]};
let pending=null,requests=[];
const rpc=async(name,args)=>{
  requests.push([name,args]);
  if(name==='app_supervision_access')return {data:responseAuth};
  if(name==='app_supervision_dashboard')return pending?new Promise(resolve=>{pending=resolve;}):{data:responseDashboard};
  if(name==='app_supervision_students')return {data:{students:[{name:'أحمد',group:'حلقة النور',level:'مبتدئ',present:3,absent:null,roster:true}],roster_synced_at:'2026-10-17T08:00:00Z'}};
  throw Error('unexpected RPC '+name);
};
const ctx={document,console,Date,Map,Number,String,Array,Set,
  navigator:{get onLine(){return onLine;}},
  addEventListener(name,fn){events[name]=fn;},
  setInterval(fn){ticker=fn;return 11;},clearInterval(){ticker=null;},
  WeLiveQuranAuth:{getAccess(){return {user_id:user};},getClient(){return {rpc};},isActive(){return active;}},
  ImamApp:{}};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
const A=ctx.ImamApp.AcademyAnalytics;
for(const id of ['a112Summary','a112Crumbs','a112Content','a112Status','a112Updated']){const n=el(id);n.replaceChildren=()=>{n.innerHTML='';n.textContent='';};}
const summary=A.summary([
  {roster_synced_at:'2026-10-17',roster_students:5,can_students:true},
  {roster_synced_at:null,roster_students:99,can_students:true},
  {roster_synced_at:'2026-10-17',roster_students:60,can_students:false}
]);
assert.equal(summary.teachers,3);
assert.equal(summary.students,5,'missing/restricted rosters must not be treated as available students');
assert.equal(summary.unsynced,1);
assert.equal(summary.synced,1);
const groups=A.groupsOf([{group:'حلقة النور',name:'أ'},{group:'حلقة النور',name:'ب'},{group:'',name:'ج'}]);
assert.equal(groups.length,2);assert.equal(groups.find(g=>g.name==='حلقة النور').students.length,2);
assert.equal(groups.find(g=>g.name==='حلقة النور').students[1].index,1);
(async()=>{
  responseAuth={allowed:false};requests=[];
  A.open();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(requests.map(x=>x[0]),['app_supervision_access']);
  assert.equal(nodes.get('a112Status').textContent.includes('تعذر'),true,'unauthorized user gets no dashboard');
  A.close();
  responseAuth={allowed:true};
  responseDashboard={owner:false,teachers:[{id:'teacher-1',name:'عبد الله',can_students:true,roster_synced_at:'2026-10-17',roster_students:3}]};
  requests=[];A.open();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(requests.map(x=>x[0]),['app_supervision_access','app_supervision_dashboard']);
  assert(nodes.get('a112Content').innerHTML.includes('عبد الله'));
  // Switching accounts must instantly close the dialog and wipe all previously loaded rows.
  user='different';ticker();
  assert.equal(nodes.get('academyAnalytics112').hidden,true);
  assert.equal(nodes.get('a112Content').innerHTML.includes('عبد الله'),false,'dialog must clear private data on account switch');
  // A new account is not granted old RPC data while its access check has not run.
  requests=[];responseAuth={allowed:false};A.open();await new Promise(resolve=>setImmediate(resolve));
  assert(!nodes.get('a112Content').innerHTML.includes('عبد الله'),'new session must not see prior account information');
  assert.deepEqual(requests.map(x=>x[0]),['app_supervision_access']);
  A.close();
  console.log('PASS 11.12 analytics Stage 1: scoped server calls, roster aggregation, group drill-down, no local persistence, account switching');
})().catch(e=>{console.error(e);process.exitCode=1;});
