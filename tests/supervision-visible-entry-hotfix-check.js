'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const source=fs.readFileSync('js/features/supervisor-dashboard.js','utf8');
const auth=fs.readFileSync('auth.js','utf8');
assert.match(html,/src="auth\.js\?v=11\.7\.1-supervision"/);
assert.match(sw,/\.\/auth\.js\?v=11\.7\.1-supervision/);
assert.match(sw,/\.\/js\/features\/supervisor-dashboard\.js\?v=11\.7\.1-supervision/);
assert.match(auth,/ImamApp\?\.Supervision\?\.initialize/);

const objects={};let rpcCalls=[],backendAllow=false,backendError=null,owner=true;
function el(id){return objects[id]||(objects[id]={id,hidden:true,textContent:'',classList:{add(){},remove(){}},listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn;},replaceChildren(){this.textContent='';},parentElement:null});}
const parent={prepend(node){objects[node.id]=node;node.parentElement=parent;}};
el('teacherInboxHomeButton').parentElement=parent;
const doc={readyState:'complete',getElementById:id=>objects[id]||null,querySelector:()=>null,createElement:tag=>({id:'',tagName:tag,hidden:false,classList:{add(){},remove(){}},innerHTML:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn;}}),body:{classList:{add(){},remove(){}},appendChild(node){objects[node.id]=node;}},addEventListener(){}};
const context={document:doc,navigator:{onLine:true},console:{warn(){}},setTimeout(){},addEventListener(){},WeLiveQuranAuth:{isActive:()=>true,isOwner:()=>owner,getClient:()=>({rpc:async(name)=>{rpcCalls.push(name);if(backendError)return {error:backendError};if(name==='app_supervision_access')return {data:{allowed:backendAllow,owner:backendAllow&&owner}};return {data:{teachers:[]}};}})}};
context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  await context.ImamApp.Supervision.initialize();
  assert.ok(objects.supervisorShortcut,'Owner shortcut must be present even if permission RPC refused');
  assert.equal(rpcCalls.filter(n=>n==='app_supervision_dashboard').length,0,'No dashboard RPC without permission');
  backendAllow=true;await context.ImamApp.Supervision.initialize();
  assert.ok(objects.supervisorShortcut,'Owner shortcut survives retry');
  assert.equal(Object.keys(objects).filter(k=>k==='supervisorShortcut').length,1,'Single shortcut');
  // Failure after success must remove authorization and prevent access.
  backendAllow=false;backendError=new Error('Invalid JWT');await context.ImamApp.Supervision.initialize();
  assert.equal(rpcCalls.filter(n=>n==='app_supervision_dashboard').length,0);
  console.log('PASS supervision-visible-entry-hotfix: owner entry, denied data, retry, single button, cache bust');
})().catch(err=>{console.error(err);process.exitCode=1;});
