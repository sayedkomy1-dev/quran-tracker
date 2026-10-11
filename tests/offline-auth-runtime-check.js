'use strict';
const fs=require('fs'),vm=require('vm');
function ok(v,m){if(!v)throw new Error(m);}
function classList(){const s=new Set();return{add:(...x)=>x.forEach(v=>s.add(v)),remove:(...x)=>x.forEach(v=>s.delete(v)),contains:v=>s.has(v)};}
const storage=new Map();
storage.set('wlq.auth.trusted.v1',JSON.stringify({userId:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com',displayName:'Teacher',role:'teacher',status:'active',verifiedAt:new Date().toISOString()}));
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i]??null,get length(){return storage.size;}};
function fakeChild(){return{hidden:false,textContent:'',className:'',dataset:{},addEventListener(){},classList:classList()};}
const children={};
const gate={id:'wlqAuthGate',className:'',dataset:{},classList:classList(),setAttribute(){},addEventListener(){},querySelector(sel){return children[sel]||(children[sel]=fakeChild());}};
const body={contains:x=>x===gate,appendChild(){}};
const document={body,documentElement:{dataset:{},classList:classList()},createElement:()=>gate,getElementById:()=>null,querySelector:()=>null,addEventListener(){}};
const client={auth:{getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({})}};
const ctx={console,document,localStorage,navigator:{onLine:false},location:{hash:'',pathname:'/',search:'',replace(){}},history:{replaceState(){}},alert(){},globalThis:null,supabase:{createClient:()=>client}};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('auth.js','utf8'),ctx);
(async()=>{
  const allowed=await ctx.WeLiveQuranAuth.beforeAppInit();
  ok(allowed===true,'trusted device should enter while offline even if Supabase local session is absent');
  const access=ctx.WeLiveQuranAuth.getAccess();
  ok(access&&access.offline===true&&access.user_id==='11111111-1111-4111-8111-111111111111','offline trusted profile was not restored');
  ok(storage.has('wlq.auth.trusted.v1'),'trusted marker must not be cleared during offline startup');
  console.log('offline-auth-runtime-check: PASS');
})().catch(e=>{console.error(e);process.exit(1);});
