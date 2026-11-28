'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'v8.js'),'utf8');
const core=fs.readFileSync(path.join(root,'sync-core.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/RC30_sync_recovery_candidate.sql'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'js/features/supervisor-dashboard.js'),'utf8');
assert.match(sql,/EMPTY_ROSTER_BLOCKED/);
assert(dashboard.includes('data-supervision="backups"'),'owner/supervisor backup entry missing');
assert(dashboard.includes('app_teacher_backup_list_v1')&&dashboard.includes('app_teacher_backup_download_v1'),'JSON backup list/download actions missing');
assert(dashboard.includes('data-cap="backup"'),'owner must be able to grant scoped backup permission');
assert.match(sql,/PARTIAL_ROSTER_BLOCKED/);assert.match(sql,/BACKUP_REVISION_CONFLICT/);assert.match(sql,/view_backup boolean not null default false/);
assert(src.includes('rc30AutoConfigured=true')&&src.includes('settings.sync.auto=true'),'automatic sync must be enabled once for existing accounts');
assert(src.includes('24*3600000'),'local backup cadence must be daily');
assert.match(sql,/BACKUP_ACCESS_DENIED/);assert.match(sql,/app_teacher_backup_access_log/);assert.match(sql,/enable row level security/);
assert.match(sql,/revoke all on function public\.app_teacher_roster_publish_safe_v1\(jsonb,uuid,text\[\]\) from public,anon,authenticated/i);
assert(!/grant execute on function public\.app_teacher_roster_publish_safe_v1/i.test(sql));
assert(!/\b(?:truncate|delete from|drop table)\b/i.test(sql));
const logic=src.slice(src.indexOf('function mergeCloudPayload('),src.indexOf('// ──────────────────────────────────────\n// Import extension',src.indexOf('function mergeCloudPayload(')));
const clone=x=>JSON.parse(JSON.stringify(x));
const rows=new Map(),backups=new Map();
const record=id=>({id,name:id,updatedAt:'2026-01-01T00:00:00Z'});
function world(actor,local=[],options={}){
  let online=true,uid=actor,failBackup=false,failPull=false,failSave=false,clock=0;const events={},timers=[];let pushCount=0,pullCount=0,backupCount=0;
  const w={console:{warn(){},log(){}},Date,Intl,JSON,Set,Map,Number,String,Array,Object,Promise,Error,RegExp,crypto:{subtle:{}},APP_VERSION:'11.12.1-beta.30',SCHEMA_VERSION:12,
    storageScopeUserId:actor,students:clone(local),sessions:[],tasks:[],settings:{sync:{auto:true,passphrase:'password1',serverRevision:0},security:{},syncTombstones:{students:{},sessions:{},tasks:{}}},V8:{syncing:false},curPage:'home',
    navigator:{get onLine(){return online;}},document:{visibilityState:'visible',addEventListener:(k,f)=>events[k]=f},addEventListener:(k,f)=>events[k]=f,setInterval:()=>1,setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},
    WeLiveQuranAuth:{getAccess:()=>({user_id:uid,role:'teacher',status:'active'})},syncConfigValid:()=>true,v8Now:()=>new Date().toISOString(),renderSyncStatus(){},renderHome(){},renderSt(){},renderV8Settings(){},v8Toast(){},migrateV8Data(){},
    __IMAM_BASE__:{save:()=>!failSave},createAutoBackup:async()=>{backupCount++;},scheduleAutoBackup(){},
    decryptSyncPayload:async p=>clone(p),encryptSyncPayload:async p=>clone(p),
    cloudPayload:()=>({ownerUserId:actor,students:clone(w.students),sessions:clone(w.sessions),tasks:clone(w.tasks),settings:{...clone(w.settings),sync:undefined,security:undefined,syncTombstones:undefined},tombstones:clone(w.settings.syncTombstones)}),
    callAccountSyncRpc:async(name,args)=>{if(uid!==actor)throw Error('ACCOUNT_MISMATCH');if(name==='account_sync_pull_v2'){pullCount++;if(failPull)throw Error('NETWORK');return rows.has(actor)?[clone(rows.get(actor))]:[];}
      if(name==='account_sync_push_v2'){pushCount++;const rev=rows.get(actor)?.revision||0;if(rev!==args.p_expected_revision)throw Error('SYNC_REVISION_CONFLICT');rows.set(actor,{revision:rev+1,payload:clone(args.p_payload)});return{ok:true,revision:rev+1};}
      if(name==='app_teacher_backup_save_v1'){if(failBackup)throw Error('BACKUP_FAILED');assert.equal(args.p_payload.accountUserId,actor);assert.equal(args.p_revision,rows.get(actor).revision);backups.set(actor,clone(args.p_payload));return{ok:true,saved_at:new Date().toISOString()};}throw Error(name);}
  };
  w.globalThis=w;vm.createContext(w);vm.runInContext(core,w);vm.runInContext(logic,w);
  return {w,events,timers,offline:()=>online=false,online:()=>online=true,switchAccount:()=>uid='other',failBackup:()=>failBackup=true,failPull:()=>failPull=true,failSave:()=>failSave=true,stats:()=>({pushCount,pullCount,backupCount})};
}
(async()=>{
  const a=world('teacher-a',[record('a')]);assert.equal(await a.w.pushCloudSync({silent:true}),true);assert.equal(rows.get('teacher-a').payload.students[0].id,'a');assert.equal(backups.get('teacher-a').students.length,1);
  const b=world('teacher-b',[record('b')]);assert.equal(await b.w.pushCloudSync({silent:true}),true);
  const c=world('teacher-c',[record('c')]);assert.equal(await c.w.pushCloudSync({silent:true}),true);assert.equal(rows.size,3);
  const phone=world('teacher-a');assert.equal(await phone.w.pushCloudSync({silent:true}),true);assert.equal(phone.w.students[0].id,'a');assert.equal(phone.stats().pushCount,0,'empty phone pulls, does not overwrite');
  phone.offline();phone.w.students.push(record('a2'));assert.equal(await phone.w.pushCloudSync({silent:true}),false);assert.equal(rows.get('teacher-a').payload.students.length,1);phone.online();assert.equal(await phone.w.pushCloudSync({silent:true}),true);assert.equal(rows.get('teacher-a').payload.students.length,2);assert.equal(rows.get('teacher-b').payload.students.length,1);assert.equal(backups.get('teacher-a').students.length,2,'same-day new revision must update recovery snapshot');
  const empty=world('new-account');assert.equal(await empty.w.pushCloudSync({silent:true}),false);assert(!rows.has('new-account'));
  const broken=world('teacher-b',[record('local')]);broken.failPull();assert.equal(await broken.w.pushCloudSync({silent:true}),false);assert.equal(broken.stats().pushCount,0);assert.equal(broken.w.students[0].id,'local');
  const switched=world('teacher-c',[record('local')]);switched.switchAccount();assert.equal(await switched.w.pushCloudSync({silent:true}),false);assert.equal(switched.stats().pushCount,0);
  const bad=world('teacher-c',[record('local')]);const prior=clone(rows.get('teacher-c'));rows.set('teacher-c',{revision:prior.revision,payload:{...prior.payload,students:[]}});assert.equal(await bad.w.pushCloudSync({silent:true}),false);assert.equal(bad.stats().pushCount,0);assert.equal(bad.w.students[0].id,'local');rows.set('teacher-c',prior);
  const fail=world('teacher-c',[record('c'),record('c2')]);fail.failBackup();assert.equal(await fail.w.pushCloudSync({silent:true}),true);assert.equal(rows.get('teacher-c').payload.students.length,2);assert.equal(backups.get('teacher-c').students.length,1);
  const x=a.w.rc30Scrub({students:[{name:'x',guardianPin:'1234',accessToken:'secret',phone:'555'}],settings:{sync:{passphrase:'secret'},security:{pinHash:'secret'},syncTombstones:{students:{a:{deletedAt:'date'}}}}});assert(!JSON.stringify(x).includes('secret'));assert.equal(x.students[0].phone,'555');assert(x.settings.syncTombstones);
  const wake=world('teacher-a');wake.w.rc30StartSync();assert.equal(typeof wake.events.online,'function');assert.equal(typeof wake.events.visibilitychange,'function');wake.events.online();assert(wake.timers.length>=2);
  console.log('PASS RC30 simulated: three isolated accounts, empty-device pull, offline edits/reconnect, empty/failed pull blocking, account switch, backup failure, secret redaction, wake listeners');
})().catch(e=>{console.error(e);process.exitCode=1;});
