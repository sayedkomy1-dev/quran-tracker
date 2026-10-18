'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const source=fs.readFileSync('js/features/supervisor-dashboard.js','utf8');
const auth=fs.readFileSync('auth.js','utf8');
assert.match(html,/src="auth\.js\?v=11\.7\.4-foundation"/);
assert.match(sw,/\.\/auth\.js\?v=11\.7\.4-foundation/);
assert.match(sw,/\.\/js\/features\/supervisor-dashboard\.js\?v=11\.12\.1/);
assert.match(auth,/ImamApp\?\.Supervision\?\.initialize/);

const css=fs.readFileSync('teacher-rating.css','utf8');
const olderCss=fs.readFileSync('v9.css','utf8');
assert.match(olderCss,/#pg-home\.v9-home-ready > :not\(#v9Home\)\{display:none!important\}/, 'Document the hidden legacy home rule');
assert.match(css,/#pg-home\.v9-home-ready > #supervisorShortcut\.supervision-home-entry\s*\{\s*display:flex!important;/, 'Explicit Premium home exemption required');

const objects={};let rpcCalls=[],backendAllow=false,backendError=null,owner=true;
function el(id){return objects[id]||(objects[id]={id,hidden:true,textContent:'',classList:{add(){},remove(){}},listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn;},replaceChildren(){this.textContent='';},remove(){delete objects[this.id];},parentElement:null});}
const home=el('pg-home');
const premium=el('v9Home');
let homeChildren=[premium];
Object.defineProperty(home,'firstChild',{get(){return homeChildren[0]||null;}});
Object.defineProperty(home,'firstElementChild',{get(){return homeChildren[0]||null;}});
home.insertBefore=(node,other)=>{homeChildren=homeChildren.filter(x=>x!==node);const index=homeChildren.indexOf(other);homeChildren.splice(index<0?homeChildren.length:index,0,node);node.parentElement=home;objects[node.id]=node;};
// This is the exact Premium dashboard that hides the old .smart-actions.
el('teacherInboxHomeButton').parentElement={prepend(){throw Error('Old hidden shortcuts should not be used');}};
const doc={readyState:'complete',getElementById:id=>objects[id]||null,querySelector:()=>null,createElement:tag=>({id:'',tagName:tag,hidden:false,classList:{add(){},remove(){}},innerHTML:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn;},setAttribute(){},remove(){delete objects[this.id];homeChildren=homeChildren.filter(x=>x!==this);}}),body:{classList:{add(){},remove(){}},appendChild(node){objects[node.id]=node;}},addEventListener(){}};
const context={document:doc,navigator:{onLine:true},console:{warn(){}},setTimeout(){},addEventListener(){},WeLiveQuranAuth:{isActive:()=>true,isOwner:()=>owner,getClient:()=>({rpc:async(name)=>{rpcCalls.push(name);if(backendError)return {error:backendError};if(name==='app_supervision_access')return {data:{allowed:backendAllow,owner:backendAllow&&owner}};return {data:{teachers:[]}};}})}};
context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  await context.ImamApp.Supervision.initialize();
  assert.ok(objects.supervisorShortcut,'Owner shortcut must be present even if permission RPC refused');
  assert.equal(home.firstElementChild,objects.supervisorShortcut,'Prominent shortcut must appear BEFORE Premium dashboard');
  assert.match(objects.supervisorShortcut.innerHTML,/لوحة الإشراف/);
  assert.equal(rpcCalls.filter(n=>n==='app_supervision_dashboard').length,0,'No dashboard RPC without permission');
  backendAllow=true;await context.ImamApp.Supervision.initialize();
  assert.equal(homeChildren.filter(x=>x.id==='supervisorShortcut').length,1,'Do not duplicate owner button');
  backendAllow=false;backendError=new Error('Invalid JWT');await context.ImamApp.Supervision.initialize();
  assert.equal(rpcCalls.filter(n=>n==='app_supervision_dashboard').length,0,'No access after failed verification');
  // A regular teacher must NOT see the card without server-granted supervisor role.
  owner=false;await context.ImamApp.Supervision.initialize();
  assert.equal(Boolean(objects.supervisorShortcut),false,'Non-owner with no supervisor grant cannot see shortcut');
  backendError=null;backendAllow=true;await context.ImamApp.Supervision.initialize();
  assert.ok(objects.supervisorShortcut,'Server-approved supervisor can see shortcut');
  assert.equal(homeChildren[0],objects.supervisorShortcut);
  console.log('PASS supervision-home-entry: first card on Premium home, visible CSS, owner, grants, deny, no duplicate');
})().catch(err=>{console.error(err);process.exitCode=1;});
