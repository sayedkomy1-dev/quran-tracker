'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
const sql=read('sql/academy-tenants-foundation.sql');
const script=read('js/features/academy-workspaces.js');
const html=read('index.html'),sw=read('sw.js'),auth=read('auth.js');
new vm.Script(script,{filename:'academy-workspaces.js'});
for(const table of ['quran_academies','quran_academy_memberships','quran_academy_branches','quran_academy_legacy_links','quran_academy_access_audit']){
 assert.match(sql,new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
 assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(sql,new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`));
}
assert.match(sql,/primary key \(academy_id,user_id\)/,'Memberships scoped by academy');
assert.match(sql,/unique \(academy_id,slug\)/,'Branch slug scoped by academy');
assert.match(sql,/legacy_owner_user_id uuid not null unique/);
assert.match(sql,/and m\.user_id=auth\.uid\(\)/,'Only own memberships');
assert.match(sql,/where m\.academy_id=p_academy_id and m\.user_id=auth\.uid\(\)/);
assert.match(sql,/when 'workspace_manage' then m\.role='owner'/);
assert.match(sql,/when 'team_manage' then m\.role in \('owner','admin'\)/);
assert.match(sql,/else false end/,'Unknown actions must fail closed');
assert.match(sql,/if not public\.quran_academy_permission\(p_academy_id,'workspace_manage'\)/);
assert.match(sql,/on conflict \(slug\) do nothing/,'Idempotent bootstrap');
assert.match(sql,/on conflict \(academy_id,user_id\) do nothing/);
assert.match(sql,/role='owner' and status='active'/);
for(const f of ['quran_academy_my_workspaces','quran_academy_permission','quran_academy_owner_overview']){
 assert.match(sql,new RegExp(`revoke all on function public\\.${f}\\(`));
 assert.match(sql,new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to authenticated`));
}
assert.ok(!/\b(drop|truncate)\b|\bdelete\s+from\b|alter\s+table\s+public\.(?:app_users|guardian_|app_teacher_)/i.test(sql),'Never mutate legacy records');
assert.ok(!/phone_hash|pin_hash|session_token|user_agent|ip_address|payment_amount/i.test(sql),'No sensitive guardian or finance metadata');
assert.ok(!/\.from\(['"]quran_academy_(?:memberships|legacy_links|access_audit)/.test(script),'No client-side direct table access');
assert.ok(!/\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(script),'Foundation UI is read-only');
assert.match(script,/!g\.WeLiveQuranAuth\?\.isOwner\?\.\(\)/,'Only legacy owner sees foundation card');
assert.match(script,/\.rpc\('quran_academy_my_workspaces'\)/);
assert.match(script,/لم تنتقل بعد/,'Status must disclaim legacy data isolation');
assert.match(html,/academy-workspaces\.css\?v=11\.7\.4-foundation/);
assert.match(html,/academy-workspaces\.js\?v=11\.7\.4-foundation/);
assert.match(auth,/ImamApp\?\.AcademyTenancy\?\.initialize/);
assert.match(sw,/const CACHE_NAME = 'quran-pwa-v11\.12\.1-beta\.12-workspace-workflow'/);
assert.match(read('js/core/runtime.js'),/version:'11\.12\.1-beta\.12',schema:12/);
// Behavioral smoke test with a minimal owner context; does not contact Supabase.
const nodes={};const settings={prepend(n){nodes[n.id]=n;}};
function element(id){return nodes[id]||null;}
const document={getElementById:element,createElement(){return {id:'',className:'',dir:'',innerHTML:'',remove(){delete nodes[this.id];}};}};
nodes['pg-settings']=settings;
const context={document,navigator:{onLine:false},WeLiveQuranAuth:{isOwner:()=>false},console};context.globalThis=context;
vm.runInNewContext(script,context);
context.ImamApp.AcademyTenancy.initialize();assert.equal(nodes.academyWorkspaceFoundation,undefined,'Teacher cannot see owner UI');
context.WeLiveQuranAuth.isOwner=()=>true;
context.ImamApp.AcademyTenancy.initialize();assert.ok(nodes.academyWorkspaceFoundation,'Owner card shown');
assert.match(nodes.academyWorkspaceFoundation.innerHTML,/هذه واجهة تحقق تأسيسية فقط/);
console.log('PASS academy-tenants-foundation: tenant permissions, no legacy migration, owner-only read view, RTL cache and local schema preserved');
