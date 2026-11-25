'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const sync=read('js/features/data-protection-sync-rc30.js');
const sql=read('sql/RC30_DATA_PROTECTION_AND_CLOUD_BACKUPS.sql');
const v8=read('v8.js');
const html=read('index.html');
const sw=read('sw.js');
const supervisor=read('js/features/supervisor-dashboard.js');
const version=read('VERSION').trim();
const pkg=JSON.parse(read('package.json'));
new vm.Script(sync,{filename:'data-protection-sync-rc30.js'});
new vm.Script(v8,{filename:'v8.js'});
new vm.Script(supervisor,{filename:'supervisor-dashboard.js'});

assert.equal(version,'11.12.1-beta.30');
assert.equal(pkg.version,version);
assert.match(sync,/account_sync_pull_v3/);
assert.match(sync,/account_sync_push_v3/);
assert.match(sync,/account_sync_backup_daily/);
assert.match(sync,/DESTRUCTIVE_SYNC_CONFIRM_REQUIRED/);
assert.match(sync,/CLOUD_SNAPSHOT_MISSING_BLOCKED/);
assert.match(sync,/navigator\?\.onLine===false/);
assert.match(sync,/restoreEncryptedCloudBackup/);
assert.match(sync,/p_allow_destructive:allowDestructive/);
assert.doesNotMatch(sync,/settings\.sync\.auto=true;/,'manual sync must preserve the teacher auto-sync preference');
assert.match(sql,/create table if not exists public\.account_sync_backups/);
assert.match(sql,/alter table public\.account_sync_backups enable row level security/);
assert.match(sql,/revoke all on public\.account_sync_backups from public,anon,authenticated/);
assert.match(sql,/create or replace function public\.account_sync_backup_daily/);
assert.match(sql,/create or replace function public\.account_sync_backup_all_daily/);
assert.match(sql,/create or replace function public\.account_sync_push_v3/);
assert.match(sql,/raise exception 'SYNC_CLIENT_UPGRADE_REQUIRED'/);
assert.match(sql,/raise exception 'DESTRUCTIVE_SYNC_CONFIRM_REQUIRED'/);
assert.match(sql,/view_backups boolean not null default false/);
assert.match(sql,/app_teacher_backup_list/);
assert.match(sql,/app_teacher_backup_download/);
assert.match(sql,/cron\.schedule/);
assert.match(sql,/created_at<now\(\)-interval '90 days'/);
assert.match(sql,/'backups' then sc\.view_backups/);
assert.match(sql,/'can_backups'/);
assert.match(v8,/<24\*3600000/);
assert.match(v8,/all\.slice\(7\)/);
assert.match(html,/data-protection-sync-rc30\.js\?v=11\.12\.1-beta\.30/);
assert.match(html,/id="cloudBackupStatus"/);
assert.match(html,/restoreEncryptedCloudBackup\(event\)/);
assert.match(html,/application-version" content="11\.12\.1-beta\.30"/);
assert.match(sw,/const APP_VERSION = '11\.12\.1-beta\.30'/);
assert.match(sw,/data-protection-sync-rc30\.js\?v=11\.12\.1-beta\.30/);
assert.match(supervisor,/app_teacher_backup_list/);
assert.match(supervisor,/app_teacher_backup_download/);
assert.match(supervisor,/data-cap="backups"/);
assert.match(supervisor,/can_backups===true/);

async function runtimeChecks(){
  const calls=[];
  const fakeCrypto=require('node:crypto').webcrypto;
  const world={
    console,crypto:fakeCrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,JSON,Date,Math,String,Number,Boolean,Set,Map,Promise,Blob,URL,
    navigator:{onLine:true},
    document:{visibilityState:'visible',getElementById:()=>null,addEventListener:()=>{}},
    addEventListener:()=>{},setInterval:()=>1,setTimeout:()=>1,clearTimeout:()=>{},
    confirm:()=>false,prompt:()=>'',settings:{sync:{auto:true,passphrase:'test-passphrase-123',
      serverRevision:1,deviceId:'device-test',lastCloudCounts:{students:1,sessions:0,tasks:0}}},
    students:[{id:'student-1'}],sessions:[],tasks:[],V8:{syncing:false},curPage:'home',
    WeLiveQuranAuth:{getAccess:()=>({user_id:'teacher-1'})},
    __IMAM_BASE__:{save:()=>true},syncConfigValid:()=>true,
    cloudPayload:()=>({ownerUserId:'teacher-1',students:[{id:'student-1'}],sessions:[],tasks:[],settings:{}}),
    encryptSyncPayload:async()=>'{"encrypted":"test"}',
    decryptSyncPayload:async()=>({ownerUserId:'teacher-1',students:[{id:'student-1'}],sessions:[],tasks:[],settings:{}}),
    mergeCloudPayload:(remote,revision)=>{world.settings.sync.serverRevision=revision;},
    callAccountSyncRpc:async(name,args)=>{
      calls.push({name,args});
      if(name==='account_sync_pull_v3')return [{payload:'ciphertext',revision:1,student_count:1,session_count:0,task_count:0}];
      if(name==='account_sync_push_v3')return {ok:true,revision:2};
      if(name==='account_sync_backup_daily')return {ok:true,created:true,created_at:'2026-11-25T00:00:00Z'};
      throw Error('Unexpected RPC '+name);
    },
    renderSyncStatus:()=>{},renderHome:()=>{},renderSt:()=>{},renderV8Settings:()=>{},v8Toast:()=>{},
    sanitizeBackupData:x=>x
  };
  world.globalThis=world;
  vm.runInNewContext(sync,world);
  const ok=await world.pushCloudSync({silent:true});
  assert.equal(ok,true,'valid same-count cloud snapshot should sync');
  assert.deepEqual(calls.map(x=>x.name),[
    'account_sync_pull_v3','account_sync_push_v3','account_sync_backup_daily'
  ],'sync must pull, guarded-push, then create/check daily backup');
  assert.equal(calls[1].args.p_expected_revision,1,'push must use server revision');
  assert.equal(calls[1].args.p_allow_destructive,false,'normal sync must not bypass destructive guard');
  assert.equal(world.settings.sync.serverRevision,2,'confirmed server revision must be saved');

  calls.length=0;
  world.mergeCloudPayload=()=>{world.students=[];};
  const blocked=await world.pushCloudSync({silent:true});
  assert.equal(blocked,false,'silent sync must stop when merge indicates records were removed');
  assert.deepEqual(calls.map(x=>x.name),['account_sync_pull_v3'],
    'reduced data must never be pushed automatically');

  calls.length=0;
  world.navigator.onLine=false;
  const offline=await world.pushCloudSync({silent:true});
  assert.equal(offline,false);
  assert.equal(calls.length,0,'offline sync must make no RPC calls');
}
runtimeChecks().then(()=>console.log('PASS RC30 data protection: SQL safeguards, daily encrypted backups, supervisor export scope, revision-safe sync, destructive-change block, offline-first behavior'))
.catch(err=>{console.error(err);process.exitCode=1;});
