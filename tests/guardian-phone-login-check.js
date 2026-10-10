'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),{webcrypto}=require('crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const feature=read('js/features/guardian-portal-share.js');
const view=read('js/features/guardian-portal-view.js');
const loginJs=read('guardian-login.js');
const loginHtml=read('guardian-login.html');
const loginCss=read('guardian-login.css');
const portalHtml=read('guardian-portal.html');
const sql=read('sql/guardian-portal-login.sql');
const setup=read('sql/supabase-setup.sql');
const sw=read('sw.js');
const app=read('app.js');
new vm.Script(feature,{filename:'guardian-portal-share.js'});
new vm.Script(view,{filename:'guardian-portal-view.js'});
new vm.Script(loginJs,{filename:'guardian-login.js'});

assert(app.includes('const SCHEMA_VERSION=12'),'local Schema must remain 12');
assert(feature.includes("guardian_portal_access_enable")&&feature.includes("guardian_portal_access_reset_pin")&&feature.includes("guardian_portal_access_unlink")&&feature.includes("guardian_portal_access_refresh"),'teacher phone/PIN access RPC integration missing');
assert(feature.includes("new URL('guardian-login.html'")&&feature.includes('generatePin()'),'guardian login URL/PIN generation missing');
assert(loginHtml.includes('guardianLoginForm')&&loginHtml.includes('guardianPhone')&&loginHtml.includes('guardianPin'),'guardian public login form missing');
assert(!loginHtml.includes('auth.js')&&!loginHtml.includes('sync-core.js'),'guardian login must not bootstrap teacher auth/sync');
assert(loginJs.includes("guardian_portal_login")&&loginJs.includes("location.replace"),'guardian login RPC/redirect missing');
assert(loginJs.includes("رقم الهاتف أو رمز الدخول غير صحيح"),'credential error must remain generic');
assert(view.includes("guardian_portal_session_read")&&view.includes("guardian_portal_session_logout"),'authenticated guardian session read/logout missing');
assert(view.includes("sessionStorage.setItem")&&view.includes("history.replaceState"),'session token must be removed from the address bar after capture');
assert(portalHtml.includes('portalStudentSwitcher')&&portalHtml.includes('portalLogoutBtn'),'sibling selector/logout UI missing');
assert(loginCss.includes('.guardian-login-card'),'guardian login styling missing');
assert(/quran-pwa-v10\.10\.0-s(?:3(?:\.\d+)?|4)/.test(sw)&&sw.includes("'./guardian-login.html'")&&sw.includes("guardianLoginNav"),'Guardian login PWA shell/navigation update missing');

assert(sql.includes('create table if not exists public.guardian_portal_accounts'),'guardian account table missing');
assert(sql.includes('create table if not exists public.guardian_portal_login_guard'),'login throttling table missing');
assert(sql.includes('create table if not exists public.guardian_portal_sessions'),'guardian session table missing');
assert(sql.includes('guardian_portal_access_refresh')&&sql.includes('guardian_account_id is not null'),'phone-access snapshot refresh RPC missing');
assert(sql.includes('Keep phone/PIN access independent from the optional Stage 2 direct-link state'),'Stage 3 must stay independent from Stage 2 direct-link revocation');
assert(sql.includes("crypt(p_pin,gen_salt('bf',10))"),'PIN must be bcrypt-hashed');
assert(sql.includes("p_pin !~ '^[0-9]{6}$'"),'PIN must be six numeric digits');
assert(sql.includes("interval '12 hours'"),'guardian session expiry missing');
assert(sql.includes('v_attempts>=8')&&sql.includes("interval '15 minutes'"),'failed-login lockout missing');
assert(sql.includes("return jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS')"),'invalid login must return generic error without revealing phone existence');
assert(sql.includes('revoke all on table public.guardian_portal_accounts from public, anon, authenticated'),'guardian accounts direct access must be revoked');
assert(sql.includes('revoke all on table public.guardian_portal_sessions from public, anon, authenticated'),'guardian sessions direct access must be revoked');
assert(sql.includes('grant execute on function public.guardian_portal_login(text,text) to anon, authenticated'),'public login RPC grant missing');
assert(sql.includes('grant execute on function public.guardian_portal_session_read(uuid) to anon, authenticated'),'public session read grant missing');
assert(setup.includes('Guardian & Student Portal Stage 3')&&setup.includes('guardian_portal_login'), 'fresh Supabase setup must include Stage 3');

let enableArgs=null;
const fakeClient={rpc:async(name,args)=>{
  if(name==='guardian_portal_access_enable'){
    enableArgs=args;
    assert(args.p_phone==='201001234567','teacher access must use the registered student phone');
    assert(/^\d{6}$/.test(args.p_pin),'generated PIN must be six digits');
    assert(args.p_reset_pin===false,'normal activation must preserve an existing guardian PIN');
    assert(args.p_snapshot.student.name==='أحمد','activation snapshot missing student data');
    assert(!JSON.stringify(args.p_snapshot).includes('201001234567'),'snapshot leaked phone number');
    return {data:{ok:true,account_created:true,pin_changed:true,phone_last4:'4567',student_count:1},error:null};
  }
  if(name==='guardian_portal_access_status')return {data:{linked:true,active:true,phone_last4:'4567',student_count:1,updated_at:new Date().toISOString()},error:null};
  if(name==='guardian_portal_status')return {data:{exists:false},error:null};
  throw new Error('unexpected rpc '+name);
}};
const now=Date.now();
const context={
  console,Date,Math,Number,String,Object,Array,Set,Map,JSON,TextEncoder,TextDecoder,URL,Uint32Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),crypto:webcrypto,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,createElement:()=>({style:{},select:()=>{},remove:()=>{}}),body:{appendChild:()=>{}}},
  location:{href:'https://example.test/quran/index.html'},navigator:{onLine:true,clipboard:{writeText:async()=>{}}},open:()=>null,
  ImamApp:{State:{
    students:[{id:'s1',name:'أحمد',parent:'ولي أحمد',phone:'201001234567',group:'حلقة النور',studentStatus:'active'}],
    sessions:[{studentId:'s1',status:'حضر',date:new Date(now).toISOString(),assessmentScores:{new:90},new:{surah:'البقرة',from:6,to:10}}],
    settings:{circle:'أكاديمية الاختبار',name:'الشيخ محمد'},curStId:'s1'
  },Utils:{escapeHtml:v=>String(v)},StudentProgress:{calculate:()=>({mastery:90,attendance:100,repeats:0,newAyat:5,attention:[],trend:{label:'تحسن'}})}},
  WeLiveQuranAuth:{getClient:()=>fakeClient,getAccess:()=>({user_id:'11111111-2222-4333-8444-555555555555'}),isActive:()=>true},
  getQuranProgressPercent:()=>10,globalThis:null
};
context.globalThis=context;vm.createContext(context);vm.runInContext(feature,context,{filename:'guardian-portal-share.js'});
(async()=>{
  const out=await context.ImamApp.GuardianPortal.enablePhoneAccess('s1',{resetPin:false});
  assert(out&&out.ok&&enableArgs,'teacher guardian-access activation failed');
  assert(context.ImamApp.GuardianPortal.loginUrl()==='https://example.test/quran/guardian-login.html','guardian login URL must preserve deployment path');
  console.log('Guardian phone + PIN Stage 3 checks passed for v10.10.0');
})().catch(err=>{console.error(err);process.exit(1);});
