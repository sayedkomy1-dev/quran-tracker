'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const coreSrc=fs.readFileSync('sync-core.js','utf8');
const syncCtx={globalThis:null,console,Date};syncCtx.globalThis=syncCtx;
vm.createContext(syncCtx);vm.runInContext(coreSrc,syncCtx);
const C=syncCtx.WLQSyncCore;
const pay=(id,amountCents,extras={})=>({id,date:'2026-10-19',amountCents,method:'cash',createdAt:'2026-10-19T15:00:00Z',...extras});
const student=(updatedAt,payments,more={})=>({id:'kid-1',name:'اسم الطالب',updatedAt,studentFinance:{rateCents:10000,plannedSessions:8,months:{'2026-10':{payments,closedAt:'',closedSnapshot:null}}},...more});
const A=student('2026-10-20T00:00:00Z',[pay('pay-a',30000)]);
const B=student('2026-10-21T00:00:00Z',[pay('pay-b',50000)]);
const payments=ls=>JSON.parse(JSON.stringify(ls))[0].studentFinance.months['2026-10'].payments;
const sum=ps=>ps.filter(p=>!p.voidedAt).reduce((s,p)=>s+p.amountCents,0);
const ab=C.mergeById([A],[B],'students',{students:{},sessions:{},tasks:{}});
const ba=C.mergeById([B],[A],'students',{students:{},sessions:{},tasks:{}});
assert.equal(sum(payments(ab)),80000,'must retain 300+500 EGP from two offline devices');
assert.deepEqual(payments(ab),payments(ba),'device order must not matter');
assert.equal(payments(C.mergeById(ab,[A],'students',{})).length,2,'repeat sync must not duplicate payments');
const voided=student('2026-10-18T00:00:00Z',[pay('pay-b',50000,{voidedAt:'2026-10-22T13:00:00Z',voidReason:'مكرر'})]);
const merged=C.mergeById(ab,[voided],'students',{});
assert.equal(payments(merged).find(p=>p.id==='pay-b').voidReason,'مكرر','payment cancellation must survive older student update');
assert.equal(sum(payments(merged)),30000);
assert.equal(sum(payments(C.mergeById([B],[voided],'students',{}))),0,'old replica must not resurrect canceled payment');
const closed=student('2026-10-15T00:00:00Z',[pay('pay-a',30000)]);
closed.studentFinance.months['2026-10'].closedAt='2026-10-16T13:00:00Z';
closed.studentFinance.months['2026-10'].closedSnapshot={paidCents:30000,balanceCents:10000};
const afterClose=C.mergeById([closed],[B],'students',{});
assert.equal(afterClose[0].studentFinance.months['2026-10'].closedSnapshot.paidCents,30000,'closed statement must not change itself');
assert.equal(sum(payments(afterClose)),80000,'later payment must be preserved anyway');
assert.equal(C.financeReview(afterClose).length,1,'closed-statement discrepancy must be flagged');
assert.equal(C.financeReview(C.mergeById([closed],[],'students',{})).length,0,'clean statement must not be flagged');
const first=C.mergeById([], [A], 'students',{});assert.equal(sum(payments(first)),30000);
// Test trusted-device TTL with a simulated clock while keeping existing UI fakes.
const authSrc=fs.readFileSync('auth.js','utf8');
function offlineEntry(verifiedAt){
 const store=new Map([['wlq.auth.trusted.v1',JSON.stringify({userId:'t-1',email:'teacher@example.com',role:'teacher',status:'active',verifiedAt})]]);
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const cl=()=>({add(){},remove(){}});
 const node=()=>({hidden:false,textContent:'',dataset:{},classList:cl(),setAttribute(){},addEventListener(){},querySelector(){return node()}});
 const gate=node(),document={body:{contains(){return true},appendChild(){}},documentElement:{dataset:{},classList:cl()},getElementById(){return null},createElement(){return gate},addEventListener(){}};
 const date=Date;const ctx={console,Date:date,document,localStorage,navigator:{onLine:false},location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},setTimeout(){},clearTimeout(){},globalThis:null};ctx.globalThis=ctx;
 vm.createContext(ctx);vm.runInContext(authSrc,ctx);
 return ctx.WeLiveQuranAuth.beforeAppInit().then(accepted=>({accepted,stored:store.has('wlq.auth.trusted.v1'),access:ctx.WeLiveQuranAuth.getAccess()}));
}
(async()=>{
 const now=Date.now();
 assert.equal((await offlineEntry(new Date(now-60*60*1000).toISOString())).accepted,true,'recent approved device must work offline');
 assert.equal((await offlineEntry(new Date(now-15*86400000).toISOString())).accepted,false,'15-day-old approval must require verification');
 assert.equal((await offlineEntry('not-a-date')).accepted,false,'invalid timestamp must not pass');
 assert.equal((await offlineEntry(new Date(now+86400000).toISOString())).accepted,false,'device clock in future must not automatically trust');
 // Escape function must be safe even in a double-quoted HTML attribute.
 const appSrc=fs.readFileSync('app.js','utf8');
 const escSrc=appSrc.match(/function esc\(str\)\{[\s\S]*?\n\}/)[0];
 const unsafe=vm.runInNewContext(escSrc+';esc("x\\\" autofocus onfocus=\\\"alert(1)")');
 assert.equal(unsafe.includes('"'),false,'attribute injection quote escaped');
 assert.equal(unsafe.includes('&quot;'),true,'double quote encoded');
 assert.equal(vm.runInNewContext(escSrc+';esc("\\\' < & >")'), '&#39; &lt; &amp; &gt;');
 console.log('beta28-rc7-finance-auth-behavior: PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
