'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),{webcrypto,createHash}=require('crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const feature=read('js/features/guardian-portal-share.js');
const loginJs=read('guardian-login.js');
const loginHtml=read('guardian-login.html');
const loginCss=read('guardian-login.css');
const sql=read('sql/guardian-portal-reset-requests.sql');
const setup=read('sql/supabase-setup.sql');
const sw=read('sw.js');
const app=read('app.js');
new vm.Script(feature,{filename:'guardian-portal-share.js'});
new vm.Script(loginJs,{filename:'guardian-login.js'});

assert(app.includes('const SCHEMA_VERSION=12'),'local Schema must remain 12');
assert(loginHtml.includes('id="guardianForgotBtn"')&&loginHtml.includes('id="guardianForgotState"'),'forgot-PIN UI controls missing');
assert(loginJs.includes("guardian_portal_request_pin_reset")&&loginJs.includes('REQUEST_RECORDED')===false,'forgot-PIN request RPC missing or client exposes backend state');
assert(loginJs.includes('تم تسجيل الطلب')&&loginJs.includes('guardianForgotBtn'),'guardian forgot success UX missing');
assert(loginCss.includes('.guardian-forgot-state')&&loginCss.includes('.guardian-login-help button'),'forgot-PIN styling missing');
assert(feature.includes('guardian_portal_reset_requests_list')&&feature.includes('guardian_portal_reset_request_resolve')&&feature.includes('guardian_portal_reset_request_dismiss'),'teacher reset-request RPC integration missing');
assert(feature.includes('🔐 إنشاء رمز دخول لولي الأمر')&&feature.includes('📲 إرسال رابط الدخول'),'teacher access-polish controls missing');
assert(feature.includes('v1010ResetRequestsList')&&feature.includes('طلبات استعادة الرمز'),'teacher reset request center missing');
assert(sw.includes("quran-pwa-v10.10.0-s3.3"),'PWA cache generation not bumped to Stage 3.3');

assert(sql.includes('create table if not exists public.guardian_portal_reset_requests'),'reset request table missing');
assert(sql.includes('create table if not exists public.guardian_portal_reset_guard'),'reset request rate-limit table missing');
assert(sql.includes('create or replace function public.guardian_portal_request_pin_reset'),'public forgot-PIN RPC missing');
assert(sql.includes("return jsonb_build_object('ok',true,'status','REQUEST_RECORDED')"),'public reset response must remain generic');
assert(sql.includes("interval '24 hours'")&&sql.includes('v_count>=3'),'24-hour / 3-request rate limit missing');
assert(sql.includes("status='resolved'")&&sql.includes("crypt(p_pin,gen_salt('bf',10))"),'teacher resolve must rotate bcrypt PIN and resolve requests');
assert(sql.includes('guardian_portal_close_reset_requests_on_pin_change'),'manual PIN reset must also close pending forgot-PIN requests');
assert(sql.includes('where v_account_id=any(account_ids) and revoked_at is null'),'PIN reset must revoke existing guardian sessions');
assert(sql.includes('revoke all on table public.guardian_portal_reset_requests from public, anon, authenticated'),'direct reset-request table access must be revoked');
assert(sql.includes('grant execute on function public.guardian_portal_request_pin_reset(text) to anon, authenticated'),'public reset request grant missing');
assert(sql.includes('grant execute on function public.guardian_portal_reset_requests_list() to authenticated'),'teacher list grant missing');
assert(setup.includes('Guardian Portal Stage 3.3')&&setup.includes('guardian_portal_request_pin_reset'),'fresh setup must include Stage 3.3');

const owner='11111111-2222-4333-8444-555555555555';
const studentId='s1';
const studentRef=createHash('sha256').update(`guardian-portal-v1|${owner}|${studentId}`).digest('hex');
let resolvedPin='';
const fakeClient={rpc:async(name,args)=>{
  if(name==='guardian_portal_reset_requests_list')return {data:{requests:[{id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',phone_last4:'4567',requested_at:new Date().toISOString(),request_count:1,students:[{student_ref:studentRef,name:'أحمد'}]}]},error:null};
  if(name==='guardian_portal_reset_request_resolve'){
    resolvedPin=args.p_pin;
    assert(args.p_request==='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee','wrong reset request id');
    assert(/^\d{6}$/.test(args.p_pin),'resolved PIN must be a generated six-digit code');
    return {data:{ok:true,phone_last4:'4567',students:[{student_ref:studentRef,name:'أحمد'}]},error:null};
  }
  if(name==='guardian_portal_access_status')return {data:{linked:true,active:true,phone_last4:'4567',student_count:1,updated_at:new Date().toISOString()},error:null};
  if(name==='guardian_portal_status')return {data:{exists:false},error:null};
  throw new Error('unexpected rpc '+name);
}};
const elements=new Map();
function el(id){
  if(!elements.has(id))elements.set(id,{id,hidden:false,innerHTML:'',textContent:'',className:'',value:id==='v1010PortalStudent'?studentId:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}},querySelector:()=>null});
  return elements.get(id);
}
const context={
  console,Date,Math,Number,String,Object,Array,Set,Map,JSON,TextEncoder,TextDecoder,URL,Uint32Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),crypto:webcrypto,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,
  document:{readyState:'loading',addEventListener:()=>{},getElementById:id=>el(id),querySelector:()=>null,createElement:()=>({style:{},select:()=>{},remove:()=>{},classList:{toggle:()=>{}}}),body:{appendChild:()=>{}}},
  location:{href:'https://example.test/quran/index.html'},navigator:{onLine:true,clipboard:{writeText:async()=>{}}},open:()=>null,
  ImamApp:{State:{students:[{id:studentId,name:'أحمد',parent:'ولي أحمد',phone:'201001234567',group:'حلقة النور',studentStatus:'active'}],sessions:[],settings:{circle:'أكاديمية الاختبار'},curStId:studentId},Utils:{escapeHtml:v=>String(v)},StudentProgress:{calculate:()=>({mastery:null,attendance:null,repeats:0,newAyat:0,attention:[],trend:{label:'—'}})}},
  WeLiveQuranAuth:{getClient:()=>fakeClient,getAccess:()=>({user_id:owner}),isActive:()=>true},
  globalThis:null
};
context.globalThis=context;vm.createContext(context);vm.runInContext(feature,context,{filename:'guardian-portal-share.js'});
(async()=>{
  const requests=await context.v1010RefreshResetRequests();
  assert(requests.length===1,'teacher pending reset request list failed');
  const ok=await context.v1010ResolveResetRequest('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  assert(ok===true&&/^\d{6}$/.test(resolvedPin),'teacher reset request resolution failed');
  console.log('Guardian reset request Stage 3.3 checks passed for v10.10.0');
})().catch(err=>{console.error(err);process.exit(1);});
