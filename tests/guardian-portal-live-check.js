'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),{webcrypto}=require('crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const feature=read('js/features/guardian-portal-share.js');
const view=read('js/features/guardian-portal-view.js');
const portal=read('guardian-portal.html');
const sql=read('sql/guardian-portal-live.sql');
const setup=read('sql/supabase-setup.sql');
const css=read('guardian-portal.css');
const appCss=read('v10.css');
new vm.Script(feature,{filename:'guardian-portal-share.js'});
new vm.Script(view,{filename:'guardian-portal-view.js'});
assert(feature.includes("guardian_portal_publish")&&feature.includes("guardian_portal_status")&&feature.includes("guardian_portal_revoke"),'teacher live-link RPC integration missing');
assert(feature.includes("url.hash='p='")&&feature.includes('copySnapshotLink'),'stable live token or Stage 1 fallback missing');
assert(view.includes("guardian_portal_read")&&view.includes("'apikey':PUBLISHABLE_KEY"),'public read RPC must use the publishable key');
assert(view.includes("هذا النوع من الروابط يحتاج اتصالًا بالإنترنت"),'live links must fail closed offline instead of persisting guardian data');
assert(portal.includes('portalRefreshBtn')&&portal.includes('portalLiveState'),'live portal refresh/status UI missing');
assert(css.includes('.portal-live-state')&&appCss.includes('.v1010-portal-status'),'Stage 2 styling missing');
assert(sql.includes('create table if not exists public.guardian_portal_shares'),'portal share table missing');
assert(sql.includes('revoke all on table public.guardian_portal_shares from public, anon, authenticated'),'direct table access must be revoked');
assert(sql.includes('grant execute on function public.guardian_portal_read(uuid) to anon, authenticated'),'public read must be capability-token RPC only');
assert(sql.includes("app_users u where u.user_id=v_uid and u.status='active'"),'teacher publish/revoke must require an active app account');
assert(sql.includes("u.user_id=s.owner_user_id and u.status='active'"),'public live links must stop if the owning teacher account is disabled');
assert(sql.includes('set share_token=gen_random_uuid()')&&sql.includes('revoked_at is not null'),'republish after revoke must rotate the old token');
assert(setup.includes('v10.10.0 Guardian & Student Portal Stage 2'),'fresh Supabase setup must include Stage 2 definitions');

const now=Date.now();
let publishedRef='';
const token='a0b1c2d3-e4f5-4a67-8b90-123456789abc';
const fakeClient={
  rpc:async(name,args)=>{
    if(name==='guardian_portal_publish'){
      publishedRef=args.p_student_ref;
      assert(/^[0-9a-f]{64}$/.test(publishedRef),'student_ref must be a SHA-256 hex digest');
      assert(args.p_snapshot.student.name==='أحمد','published snapshot missing student data');
      assert(!JSON.stringify(args.p_snapshot).includes('201001234567'),'published snapshot leaked phone number');
      return {data:{ok:true,token,updated_at:new Date(now).toISOString(),created:true,rotated:false},error:null};
    }
    if(name==='guardian_portal_status')return {data:{exists:true,active:true,token,updated_at:new Date(now).toISOString()},error:null};
    if(name==='guardian_portal_revoke')return {data:{ok:true,revoked:true},error:null};
    return {data:null,error:new Error('unexpected rpc')};
  }
};
const context={
  console,Date,Math,Number,String,Object,Array,Set,Map,JSON,TextEncoder,TextDecoder,URL,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),crypto:webcrypto,
  setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,createElement:()=>({style:{},select:()=>{},remove:()=>{}}),body:{appendChild:()=>{}}},
  location:{href:'https://example.test/quran/index.html'},navigator:{onLine:true,clipboard:{writeText:async()=>{}}},open:()=>null,
  students:[{id:'s1-private-id',name:'أحمد',parent:'ولي أحمد',phone:'201001234567',group:'حلقة النور',level:'متوسط',studentStatus:'active'}],
  sessions:[{id:'secret-session-id',studentId:'s1-private-id',status:'حضر',date:new Date(now-86400000).toISOString(),assessmentScores:{new:90},new:{surah:'البقرة',from:6,to:10},actualRecitation:{new:{surah:'البقرة',from:1,to:5}}}],
  settings:{circle:'أكاديمية الاختبار',name:'الشيخ محمد'},getQuranProgressPercent:()=>11,
  ImamApp:{Utils:{escapeHtml:v=>String(v)},StudentProgress:{calculate:()=>({mastery:90,attendance:100,repeats:0,newAyat:5,attention:[],trend:{label:'تحسن'}})}},
  WeLiveQuranAuth:{getClient:()=>fakeClient,getAccess:()=>({user_id:'11111111-2222-4333-8444-555555555555'}),isActive:()=>true},
  curStId:'s1-private-id',globalThis:null
};
context.globalThis=context;vm.createContext(context);vm.runInContext(feature,context,{filename:'guardian-portal-share.js'});
(async()=>{
  const live=await context.v1010PublishLivePortal('s1-private-id');
  assert(live.url===`https://example.test/quran/guardian-portal.html#p=${token}`,'live portal URL must use a stable token in the fragment');
  assert(!live.url.includes('s1-private-id')&&!live.url.includes('201001234567'),'live URL leaked internal/student data');
  const status=await context.v1010PortalStatus('s1-private-id');assert(status.active&&status.url.endsWith(`#p=${token}`),'live status lookup failed');
  const revoked=await context.v1010RevokePortal('s1-private-id');assert(revoked===true,'revoke flow failed');
  assert(/^[0-9a-f]{64}$/.test(publishedRef),'stable hashed student ref missing');
  console.log('Guardian & Student Portal Stage 2 checks passed for v10.10.0');
})().catch(err=>{console.error(err);process.exit(1);});
