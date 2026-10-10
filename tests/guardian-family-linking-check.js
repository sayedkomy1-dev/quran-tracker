'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),{webcrypto}=require('crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
const feature=read('js/features/guardian-portal-share.js');
const css=read('guardian-portal.css');
const sql=read('sql/guardian-portal-login.sql');
new vm.Script(feature,{filename:'guardian-portal-share.js'});
assert(feature.includes('familyStudentsForPhone'),'automatic family phone grouping missing');
assert(feature.includes('جارٍ ربط ${ordered.length} طلاب بنفس رقم ولي الأمر'),'family activation progress missing');
assert(feature.includes('familyLinked:linkedCount'),'family link result metadata missing');
assert(css.includes('.portal-switcher[hidden]{display:none!important}'),'hidden sibling switcher must stay hidden for one student');
assert(sql.includes('guardian_portal_access_enable'),'Stage 3 SQL dependency missing');
let enableCalls=[];
const fakeClient={rpc:async(name,args)=>{
  if(name==='guardian_portal_access_enable'){
    enableCalls.push(args);
    return {data:{ok:true,account_created:enableCalls.length===1,pin_changed:enableCalls.length===1,phone_last4:'4567',student_count:enableCalls.length},error:null};
  }
  if(name==='guardian_portal_access_status')return {data:{linked:true,active:true,phone_last4:'4567',student_count:2,updated_at:new Date().toISOString()},error:null};
  if(name==='guardian_portal_status')return {data:{exists:false},error:null};
  throw new Error('unexpected rpc '+name);
}};
const now=Date.now();
const students=[
  {id:'s1',name:'حنين',parent:'ولي الأمر',phone:'01001234567',studentStatus:'active'},
  {id:'s2',name:'محمد',parent:'ولي الأمر',phone:'+20 100 123 4567',studentStatus:'active'},
  {id:'s3',name:'طالب آخر',parent:'آخر',phone:'201112345678',studentStatus:'active'}
];
const context={console,Date,Math,Number,String,Object,Array,Set,Map,JSON,TextEncoder,TextDecoder,URL,Uint32Array,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),crypto:webcrypto,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,
 document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,createElement:()=>({style:{},select:()=>{},remove:()=>{}}),body:{appendChild:()=>{}}},
 location:{href:'https://example.test/quran/index.html'},navigator:{onLine:true,clipboard:{writeText:async()=>{}}},open:()=>null,
 ImamApp:{State:{students,sessions:[
   {studentId:'s1',status:'حضر',date:new Date(now).toISOString(),assessmentScores:{new:90},new:{surah:'البقرة',from:1,to:5}},
   {studentId:'s2',status:'حضر',date:new Date(now).toISOString(),assessmentScores:{new:85},new:{surah:'آل عمران',from:1,to:5}}
 ],settings:{circle:'أكاديمية الاختبار',name:'الشيخ'},curStId:'s1'},Utils:{escapeHtml:v=>String(v)},StudentProgress:{calculate:()=>({mastery:90,attendance:100,repeats:0,newAyat:5,attention:[],trend:{label:'تحسن'}})}},
 WeLiveQuranAuth:{getClient:()=>fakeClient,getAccess:()=>({user_id:'11111111-2222-4333-8444-555555555555'}),isActive:()=>true},
 getQuranProgressPercent:()=>10,globalThis:null};
context.globalThis=context;vm.createContext(context);vm.runInContext(feature,context,{filename:'guardian-portal-share.js'});
(async()=>{
  const out=await context.ImamApp.GuardianPortal.enablePhoneAccess('s1',{resetPin:false});
  assert(out&&out.ok,'family activation failed');
  assert(out.familyLinked===2,'exactly two same-phone active students should be linked');
  assert(enableCalls.length===2,'enable RPC must run once per same-phone student');
  assert(enableCalls.every(x=>x.p_phone==='201001234567'),'all family calls must use one canonical Egyptian phone');
  assert(enableCalls[0].p_pin===enableCalls[1].p_pin,'siblings must receive one shared PIN');
  assert(enableCalls[0].p_reset_pin===false&&enableCalls[1].p_reset_pin===false,'normal family activation must preserve any existing PIN');
  assert(enableCalls[0].p_snapshot.student.name==='حنين'&&enableCalls[1].p_snapshot.student.name==='محمد','each sibling must publish its own snapshot');
  console.log('guardian-family-linking-check: PASS');
})().catch(err=>{console.error(err);process.exit(1);});
