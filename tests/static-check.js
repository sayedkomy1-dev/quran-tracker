const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(cond,msg){if(!cond)throw new Error(msg);}
function file(f){return path.join(root,f);}
const html=read('index.html');
const app=read('app.js');
const v8=read('v8.js');
const v9=read('v9.js');
const v10=read('v10.js');
const quranEngine=read('js/features/quran-engine.js');
const mushafOffline=read('js/features/mushaf-offline.js');
const runtime=read('js/core/runtime.js');
const v10Data=read('js/features/v10-data.js');
const quranStructure=read('js/features/quran-structure.js');
const recitationCarry=read('js/features/recitation-carry.js');
const guardianCommunication=read('js/features/guardian-communication.js');
const auth=read('auth.js');
const syncCore=read('sync-core.js');
const authCss=read('auth.css');
const css9=read('v9.css');
const css10=read('v10.css');
const quranCss=read('quran-engine.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.json'));
const pkg=JSON.parse(read('package.json'));
const version=read('VERSION').trim();

// Syntax first: a single parse error must fail the release.
new vm.Script(app,{filename:'app.js'});
new vm.Script(v8,{filename:'v8.js'});
new vm.Script(v9,{filename:'v9.js'});
new vm.Script(v10,{filename:'v10.js'});
new vm.Script(quranEngine,{filename:'js/features/quran-engine.js'});
new vm.Script(mushafOffline,{filename:'js/features/mushaf-offline.js'});
new vm.Script(runtime,{filename:'js/core/runtime.js'});
new vm.Script(v10Data,{filename:'js/features/v10-data.js'});
new vm.Script(quranStructure,{filename:'js/features/quran-structure.js'});
new vm.Script(recitationCarry,{filename:'js/features/recitation-carry.js'});
new vm.Script(guardianCommunication,{filename:'js/features/guardian-communication.js'});
new vm.Script(auth,{filename:'auth.js'});
new vm.Script(syncCore,{filename:'sync-core.js'});
new vm.Script(sw,{filename:'sw.js'});

assert(version==='10.6.2','VERSION must be 10.6.2');
assert(pkg.version===version,'package.json version mismatch');
assert(manifest.version===undefined || manifest.version===version,'manifest version mismatch');
assert(html.includes(`content="${version}"`),'HTML application-version mismatch');
assert(app.includes("const APP_VERSION=globalThis.ImamApp?.meta?.version||'10.6.2'"),'app.js APP_VERSION must come from ImamApp runtime');
assert(app.includes('const SCHEMA_VERSION=12'),'schema version must be 12 for item-level review migration');
assert(sw.includes(`const APP_VERSION = '${version}'`),'sw.js APP_VERSION mismatch');
assert(sw.includes("'./v9.js?v=10.6.2'")&&sw.includes("'./v9.css?v=10.6.2'")&&sw.includes("'./v10.js?v=10.6.2'")&&sw.includes("'./v10.css?v=10.6.2'")&&sw.includes("'./js/core/runtime.js?v=10.6.2'")&&sw.includes("'./js/features/v10-data.js?v=10.6.2'")&&sw.includes("'./js/features/quran-engine.js?v=10.6.2'")&&sw.includes("'./js/features/mushaf-offline.js?v=10.6.2'")&&sw.includes("'./quran-engine.css?v=10.6.2'")&&sw.includes("'./auth.js?v=10.6.2'")&&sw.includes("'./sync-core.js?v=10.6.2'")&&sw.includes("'./auth.css?v=10.6.2'")&&sw.includes("'./js/features/guardian-communication.js?v=10.6.2'"),'service worker must cache versioned architecture/v9/v10/auth assets');
assert(manifest.display_override?.includes('window-controls-overlay'),'manifest missing desktop display override');

// Required files and local references.
['icon-96.png','icon-192.png','icon-512.png','icon-maskable.png','styles.css','v9.css','v10.css','auth.css','sync-core.js','app.js','auth.js','v8.js','v9.js','v10.js','js/core/runtime.js','js/features/v10-data.js','js/features/quran-structure.js','js/features/recitation-carry.js','js/features/quran-engine.js','js/features/mushaf-offline.js','js/features/guardian-communication.js','quran-engine.css','privacy.html','terms.html','MUSHAF-SOURCES.md','V9-IMPLEMENTATION.md','ARCHITECTURE-10.2.md'].forEach(f=>assert(fs.existsSync(file(f)),`missing ${f}`));
for(const m of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
  const ref=m[1].split(/[?#]/)[0];
  if(!ref||/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(ref))continue;
  assert(fs.existsSync(file(ref)),`missing local asset referenced by HTML: ${ref}`);
}

// No duplicate IDs in the static DOM.
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const seen=new Set();
for(const id of ids){assert(!seen.has(id),`duplicate HTML id: ${id}`);seen.add(id);}

// Core v9 shell and preserved core workflow.
['pg-mushaf','v9MushafApp','v9Nav','v9MoreSheet','v9Onboarding','quranTextModal','sessionJourneyCard','saveSessionBtn','saveSendSessionBtn','sessionWaModes'].forEach(id=>assert(html.includes(`id="${id}"`),`missing #${id}`));
['initV9Layer','renderV9Home','setSessionMode','setSessionStep','ensureSessionActionDock','openOfficialMushafPortal','importMushafPDF','openMushafReader','toggleMushafBookmark','toggleMushafView','downloadQuranTextPack','markAllPresentV9','createDemoData','openGroupOverview'].forEach(fn=>assert(new RegExp(`(?:async\\s+)?function\\s+${fn}\\s*\\(`).test(v9),`missing v9 ${fn}()`));
assert(v8.includes('globalThis.__IMAM_V8_BASE__'),'v8-to-v9 compatibility bridge missing');
assert(v9.includes('globalThis.__IMAM_V8_BASE__'),'v9 must consume v8 compatibility bridge');
assert(!/function\s+migrateV8Data\s*\(/.test(v9),'v9 must not override v8 migration');
assert(!/function\s+save\s*\(/.test(v9),'v9 must not override the stable save() implementation');

// Regression guard: save/send controls must NEVER be hidden by v9 CSS.
assert(!/#saveSessionBtn[^{}]*\{[^{}]*display\s*:\s*none/i.test(css9),'save button is hidden by v9 CSS');
assert(!/#saveSendSessionBtn[^{}]*\{[^{}]*display\s*:\s*none/i.test(css9),'save+send button is hidden by v9 CSS');
assert(!/\.wa-mode-row[^{}]*\{[^{}]*display\s*:\s*none/i.test(css9),'WhatsApp message modes are hidden by v9 CSS');
assert(v9.includes("main.appendChild(saveBtn)")&&v9.includes("main.appendChild(sendBtn)"),'session action area does not preserve the original save/send buttons');
assert(v9.includes('content.appendChild(footer)'),'session save/send area must live inside session content');
assert(!/\.v9-session-footer\{[^}]*position\s*:\s*fixed/i.test(css9),'session save/send area must not float over the page');
assert(v9.includes("secondary.appendChild(waModes)"),'session action dock does not preserve message mode controls');
assert(!css9.includes('\n#mainNav{display:none!important}'),'legacy navigation must remain available if v9 initialization fails');
assert(css9.includes('body.v9-shell-ready #mainNav{display:none!important}'),'new shell must hide legacy navigation only after successful initialization');
assert(css9.includes('body.v9-shell-ready .v9-nav{display:flex}'),'v9 navigation must become visible only when ready');
assert(v9.includes("document.body.classList.add('v9-shell-ready')"),'v9 shell readiness flag missing');
assert(sw.includes('self.skipWaiting()'),'stabilization service worker should activate promptly over the broken v9 cache');

assert(sw.includes('trimRuntimeCache'),'service worker runtime cache must be bounded');
assert(sw.includes('APP_SHELL.map(async url'),'service-worker precache should tolerate a single failed asset');
assert(app.includes("candidateStatus!=='active'")&&app.includes("st.studentStatus!=='active'"),'paused/archived students must not reserve schedule slots');
assert(v8.includes("pinKdf:'pbkdf2-sha256'")&&v8.includes('250000'),'PIN must use salted PBKDF2');
assert(v8.includes('verifyStoredPin')&&v8.includes('pinLockedUntil'),'PIN migration/throttling is missing');
assert(!v9.includes("addEventListener('timeupdate',renderMiniPlayer)"),'mini-player must not rebuild DOM on every timeupdate');
assert(v9.includes('تعذر تحديد رقم الصفحة بدقة')&&v9.includes('return null;'),'Mushaf page lookup must fail safely instead of opening page 1');
assert(v9.includes("bulkSetStatus('active')")&&v9.includes('إعادة تنشيط'),'student reactivation flow missing');
assert(v9.includes('Promise.allSettled(voiceIds.map(x=>mediaDelete(x)))'),'student deletion must clean local voice notes');
assert(v9.includes('v9MediaKeys')&&v9.includes('ملف صوتي محلي غير مرتبط بحصة'),'data health must inspect local voice-note lifecycle');
assert(v9.includes("setAttribute('aria-current','step')"),'guided session stepper must expose aria-current');
['branding/academy-icon-source.png','branding/academy-badge-source.png','sql/supabase-sync.sql','screenshots/desktop-home.png','screenshots-v9.1/session-mobile-fixed.png'].forEach(f=>assert(fs.existsSync(file(f)),`missing full-project asset ${f}`));
assert(fs.statSync(file('branding/academy-badge-source.png')).size>1000000,'branding source asset appears incomplete');

// All inline handlers must resolve to an application function or browser builtin.
const js=runtime+'\n'+v10Data+'\n'+quranStructure+'\n'+auth+'\n'+syncCore+'\n'+app+'\n'+v8+'\n'+v9+'\n'+mushafOffline+'\n'+quranEngine+'\n'+v10+'\n'+guardianCommunication;
const defs=new Set([...js.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
for(const m of v10.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*v10[A-Za-z_$][\w$]*/g))defs.add(m[1]);
const builtins=new Set(['if','for','while','switch','confirm','prompt','alert','setTimeout','setInterval','clearTimeout','clearInterval','parseInt','parseFloat','Number','String','Boolean','Date','Math','JSON','encodeURIComponent','decodeURIComponent']);
for(const hm of html.matchAll(/\bon(?:click|change|input|submit|contextmenu|keydown|keyup|blur|focus)=["']([^"']+)["']/gi)){
  for(const fm of hm[1].matchAll(/(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g)){
    const name=fm[1]; assert(defs.has(name)||builtins.has(name),`inline handler references missing function: ${name}`);
  }
}

assert(v9.includes('qurancomplex.gov.sa/en/apps-hafs/'),'official Mushaf app/source link missing');
assert(v9.includes('downloadMadinahMushafDirect'),'direct Mushaf download action missing');
assert(v9.includes('Husary_128kbps')||v8.includes('Husary_128kbps'),'Husary reciter missing');
assert(v8.includes('Alafasy_128kbps'),'Alafasy reciter missing');
assert(css9.includes('.v9-nav')&&css9.includes('.v9-session-steps')&&css9.includes('.v92-primary-card')&&css9.includes('.v92-install-flow'),'v9.2 design system incomplete');
assert(html.includes('id="tog-juz"')&&html.includes('id="tog-surahReview"'),'parts and surah review must remain independent');
assert(!html.includes('id="gr-new"')&&!html.includes('id="gr-rec"')&&!html.includes('id="gr-far"'),'assignment rating controls must not return');



// v10.6.2 compact home + page-based teacher Mushaf guards.
assert(v9.includes('function toggleTodayStudents()'),'Today students toggle function missing');
assert(v9.includes('role=\"switch\"')&&v9.includes('v1053-switch'),'Today students must use the compact switch UI');
assert(v10.includes('layout1053')&&v10.includes('homeSections.students=false'),'Today students must reset closed once on v10.6.2 migration');
assert(css10.includes('.v1052-today-card .v92-today-list[hidden]{display:none!important}'),'collapsed Today list must actually hide');
assert(mushafOffline.includes('function openTeacherReader(')&&mushafOffline.includes('function teacherTurn('),'integrated teacher Mushaf reader/navigation missing');
assert(mushafOffline.includes('touchstart')&&mushafOffline.includes('touchend'),'teacher Mushaf swipe navigation missing');
assert(mushafOffline.includes('function playPageFlipSound('),'page flip sound missing');
assert(mushafOffline.includes('cdn.quran.ws/svg/pages'),'page-based online Mushaf source missing');
assert(!v9.includes('pdf.quran.ws/pdfs/hafs/quran-hafs-mushaf.pdf'),'legacy external PDF download path must be removed');
assert(css10.includes('.v1053-mushaf-ornament')&&css10.includes('.v1053-reader-modal'),'decorative full-screen Mushaf reader styles missing');
assert(mushafOffline.includes('teacherTurn(dx>0?1:-1)'),'teacher Mushaf swipe must advance on right swipe');
assert(mushafOffline.includes('v1054SurahDrawer')&&mushafOffline.includes('jumpTeacherMushafSurah'),'Surah drawer/navigation missing');
assert(mushafOffline.includes('READER_THEME_KEY')&&mushafOffline.includes('toggleReaderTheme'),'Mushaf night mode persistence missing');
assert(mushafOffline.includes("btn.style.setProperty('display','none','important')")&&css10.includes('.v1055-reader-bar.v1058-pack-complete'),'completed Mushaf download button must be removed from layout');
assert(css10.includes('.v1054-surah-drawer')&&css10.includes('[data-theme=\"night\"]'),'premium Surah drawer/night styles missing');

// v10.1 runtime UX regression guards.
assert(v10.includes('V10_HOME_SECTIONS')&&v10.includes('enhanceV10HomeSections'),'collapsible home-section enhancer missing');
assert(v10.includes("homeSections={primary:true,stats:true,actions:true,students:false"),'home-section persisted state defaults missing');
assert(v10.includes("closeSurahDropdown(key,true);return"),'explicit Surah dropdown close must bypass stale-blur focus guard');
assert(v10.includes('onpointerdown="event.preventDefault();selectSurahOption'),'Surah dropdown touch/pointer selection missing');
assert(v10.includes("classList.toggle('open-up',up)"),'adaptive Surah dropdown placement missing');
const dataSandbox={};dataSandbox.globalThis=dataSandbox;vm.runInNewContext(runtime,dataSandbox,{filename:'js/core/runtime.js'});vm.runInNewContext(v10Data,dataSandbox,{filename:'js/features/v10-data.js'});
const juzRanges=JSON.parse(JSON.stringify(dataSandbox.ImamApp.V10Data.juzRanges));
assert(Array.isArray(juzRanges),'Juz range map missing');
assert(juzRanges.length===30,'Juz range map must contain exactly 30 Ajza');
assert(JSON.stringify(juzRanges[28])==='[67,77]'&&JSON.stringify(juzRanges[29])==='[78,114]','Juz Tabarak/Amma Surah ranges are misaligned');
assert(v10Data.includes("hadithNumber:'6013'")&&!v10Data.includes("6013/6018"),'starter hadith reference must not be ambiguous');
assert(v10.includes("root.style.setProperty('--v9-primary',t.p)"),'theme palette must drive visible v9.2 shell tokens');
assert((v8.match(/globalThis\.v10Migrate/g)||[]).length>=3,'backup/import/cloud restore paths must re-run v10 migration');
assert(v10.includes("Object.prototype.hasOwnProperty.call(settings,'facebookUrl')"),'Facebook config must permit an intentionally empty value');

assert(v10.includes('reviewAssignments')&&v10.includes('not_heard')&&v10.includes('repeat'),'v10 item-level review model missing');
assert(v10.includes('نفس التكليف للحصة القادمة'),'weak-grade repeat action missing');
assert(v10.includes('facebookUrl')&&v10.includes('settings.facebookUrl'),'Facebook setting must be configurable');
assert(v10.includes('V10_THEMES')&&css10.includes('#145A3A'),'theme architecture/palette A missing');

// v10.1.1 security regression guards.
assert(app.includes('function sanitizeSettingsForExport'),'portable backup sanitizer missing');
assert(app.includes('delete cfg.sync.key')&&app.includes('delete cfg.sync.passphrase')&&app.includes('delete cfg.sync.authSecret'),'portable backup must strip sync credentials');
assert(app.includes('delete cfg.security.pinHash')&&app.includes('delete cfg.security.pinSalt')&&app.includes('delete cfg.security.credentialId'),'portable backup must strip local security secrets');
assert(app.includes("backupType:'portable'")&&app.includes('settings:sanitizeSettingsForExport(settings)'),'portable backup must use sanitized settings');
const sanitizerMatch=app.match(/function sanitizeSettingsForExport\(source=settings\)\{([\s\S]*?)\n\}/);
assert(sanitizerMatch,'portable backup sanitizer source not found');
const sanitizeSettingsForExport=vm.runInNewContext(`(function(source){${sanitizerMatch[1]}})`);
const sanitized=sanitizeSettingsForExport({sync:{url:'https://x.supabase.co',id:'safe-id',key:'KEY',passphrase:'PASS',authSecret:'AUTH'},security:{lockEnabled:true,pinHash:'HASH',pinSalt:'SALT',pinKdf:'KDF',pinIterations:250000,credentialId:'CRED'},accountOwner:{userId:'u1',email:'x@example.com'},theme:'light'});
assert(sanitized.theme==='light'&&sanitized.sync.url==='https://x.supabase.co','portable backup sanitizer must preserve non-secret settings');
assert(!('key' in sanitized.sync)&&!('passphrase' in sanitized.sync)&&!('authSecret' in sanitized.sync),'portable backup leaked sync credentials');
assert(!('accountOwner' in sanitized),'portable backup leaked authenticated account ownership metadata');
assert(!('pinHash' in sanitized.security)&&!('pinSalt' in sanitized.security)&&!('credentialId' in sanitized.security),'portable backup leaked local security credentials');
assert(sanitized.security.lockEnabled===false,'portable backup must not reactivate a device lock without its credentials');
assert(v8.includes('function v8BackupPayload')&&v8.includes('settings:JSON.parse(JSON.stringify(settings))'),'internal local recovery backup should remain device-complete');
assert(v8.includes('generateSecureSyncCredentials'),'legacy sync credential adapter missing');
assert(v8.includes("callAccountSyncRpc('account_sync_push_v2'")&&v8.includes("callAccountSyncRpc('account_sync_pull_v2'"),'account cloud sync must use revision-safe authenticated account RPC endpoints');
assert(!v8.includes('/rest/v1/imam_sync?on_conflict='),'direct cloud table write must be removed');
assert(!v8.includes('/rest/v1/imam_sync?select=payload'),'direct cloud table read must be removed');
const syncSql=fs.readFileSync(file('sql/supabase-sync.sql'),'utf8');
assert(syncSql.includes('revoke all on table public.imam_sync from anon, authenticated'),'sync table direct grants must be revoked');
assert(syncSql.includes('imam_sync_push')&&syncSql.includes('imam_sync_pull'),'secure sync RPC functions missing');
assert(!/for select to anon using\s*\(true\)/i.test(syncSql),'broad anon SELECT policy must not return');
assert(!/for update to anon using\s*\(true\)/i.test(syncSql),'broad anon UPDATE policy must not return');
assert(!/for insert to anon with check\s*\(true\)/i.test(syncSql),'broad anon INSERT policy must not return');
assert(v8.includes('localSync=settings.sync')&&v8.includes('accountOwner:owner'),'backup/cloud restore must preserve current account ownership and device secrets');
assert(sw.includes("quran-pwa-v10.6.2"),'service worker cache must match v10.6.2');


// v10.1.2 Google Auth and access-control regression guards.
assert(html.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')&&html.includes('src="auth.js?v=10.6.2"'),'Supabase auth bootstrap scripts missing');
assert(html.includes('href="auth.css?v=10.6.2"'),'auth stylesheet missing');
assert(auth.includes("supabaseUrl:'https://svtcntalwfmexthcnvqe.supabase.co'"),'Supabase project URL mismatch');
assert(auth.includes("publishableKey:'sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j'"),'Supabase publishable key mismatch');
assert(auth.includes("ownerEmail:'info.welivequran@gmail.com'"),'owner account mismatch');
assert(app.includes('WeLiveQuranAuth.beforeAppInit')&&app.indexOf('WeLiveQuranAuth.beforeAppInit')<app.indexOf('await initDB()'),'auth gate must run before IndexedDB app initialization');
assert(app.includes('WeLiveQuranAuth.afterAppInit'),'post-auth UI hook missing');
assert(auth.includes('wlq.auth.trusted.v1')&&auth.includes('useTrustedFallback'),'trusted-device offline fallback missing');
assert(auth.includes("profile.status!=='active'")&&auth.includes("profile.status==='blocked'"),'pending/blocked access gating missing');
assert(auth.includes('loadAdminUsers')&&auth.includes('setUserStatus'),'owner access-management UI missing');
assert(v8.includes('WeLiveQuranAuth?.getAccessToken')&&v8.includes('Authorization:`Bearer ${accessToken}`'),'cloud sync must use authenticated bearer session');
assert(!v8.includes('Authorization:`Bearer ${settings.sync.key}`'),'cloud sync must not authenticate as the publishable key');
const authSql=fs.readFileSync(file('sql/auth-access.sql'),'utf8');
const setupSql=fs.readFileSync(file('sql/supabase-setup.sql'),'utf8');
assert(authSql.includes('create table if not exists public.app_users'),'app_users table setup missing');
assert(authSql.includes("'info.welivequran@gmail.com'")&&authSql.includes("then 'owner'")&&authSql.includes("then 'active'"),'owner auto-activation trigger missing');
assert(authSql.includes('app_users_select_self_or_owner')&&authSql.includes('app_users_owner_update'),'app_users RLS policies missing');
assert(setupSql.includes('grant execute on function public.imam_sync_push(text,text,text) to authenticated'),'sync RPC must be authenticated');
assert(!/grant execute on function public\.imam_sync_(?:push|pull)[^\n]*to anon/i.test(setupSql),'anonymous sync RPC execute must not be granted');
assert(syncSql.includes('v_uid uuid := auth.uid()')&&syncSql.includes('owner_user_id'),'sync rows must be scoped to auth.uid()');
assert(fs.existsSync(file('privacy.html'))&&fs.existsSync(file('terms.html')),'OAuth legal pages missing');
assert(sw.includes("'./privacy.html'")&&sw.includes("'./terms.html'"),'legal pages should be available offline after install');
assert(authCss.includes('.wlq-auth-gate'),'auth gate styling missing');

// v10.1.3 account ownership + account-scoped storage/cloud regression guards.
assert(app.includes("const WLQ_LEGACY_CLAIM_KEY='wlq.legacy.claim.v1'"),'legacy ownership marker missing');
assert(app.includes('function accountIdbKey(kind)')&&app.includes('acct:${storageScopeUserId}:${kind}'),'IndexedDB account namespace missing');
assert(app.includes('function accountLocalKey(kind)')&&app.includes('wlq.account.${storageScopeUserId}.${kind}'),'localStorage account namespace missing');
assert(app.includes('askLegacyDataClaim')&&app.includes('ربط البيانات بهذا الحساب'),'legacy ownership confirmation flow missing');
assert(app.includes('writeLegacyClaim(counts)')&&app.includes('migrateLegacyDraftsToAccount'),'legacy claim persistence/draft migration missing');
assert(app.includes('isCurrentAccountDraftKey'),'session drafts must be account scoped');
assert(v8.includes('function autoBackupPrefix()')&&v8.includes('autobackup:${storageScopeUserId}:'),'automatic backups must be account scoped');
assert(html.includes('id="syncAccount"')&&!html.includes('id="syncId"')&&!html.includes('id="syncAuthSecret"'),'sync settings UI must be account-owned, without manual sync ID/secret');
assert(v8.includes("callAccountSyncRpc('account_sync_push_v2'")&&v8.includes("callAccountSyncRpc('account_sync_pull_v2'"),'revision-safe account-owned cloud RPC calls missing');
assert(v8.includes('ownerUserId:storageScopeUserId'),'encrypted cloud payload must bind to the local authenticated account');
const accountSyncSql=fs.readFileSync(file('sql/account-sync.sql'),'utf8');
assert(accountSyncSql.includes('create table if not exists public.account_sync'),'account_sync table setup missing');
assert(accountSyncSql.includes('owner_user_id uuid primary key references auth.users(id)'),'account_sync must be one row per authenticated account');
assert(accountSyncSql.includes('v_uid uuid := auth.uid()')&&accountSyncSql.includes('where s.owner_user_id = v_uid'),'account_sync pull must scope to auth.uid()');
assert(accountSyncSql.includes('revoke all on table public.account_sync from anon, authenticated'),'account_sync direct table access must be revoked');
assert(accountSyncSql.includes('revision bigint not null default 0'),'account_sync revision column missing');
assert(accountSyncSql.includes('account_sync_push_v2')&&accountSyncSql.includes('p_expected_revision bigint'),'revision-safe push RPC missing');
assert(accountSyncSql.includes('account_sync_pull_v2')&&accountSyncSql.includes('revision bigint'),'revision-safe pull RPC missing');
assert(accountSyncSql.includes('SYNC_REVISION_CONFLICT'),'compare-and-swap conflict guard missing');
assert(accountSyncSql.includes('grant execute on function public.account_sync_push_v2(text,bigint) to authenticated'),'account_sync v2 push RPC grant missing');
assert(accountSyncSql.includes('grant execute on function public.account_sync_pull_v2() to authenticated'),'account_sync v2 pull RPC grant missing');
assert(accountSyncSql.includes("revoke all on function public.account_sync_push(text) from anon, authenticated"),'unsafe v1 push RPC must be revoked');
assert(!/grant execute on function public\.account_sync_(?:push|pull)(?:_v2)?[^\n]*to anon/i.test(accountSyncSql),'anonymous account sync RPC execute must not be granted');

assert(manifest.short_name==='أكاديمية الإمام'&&manifest.display==='standalone','PWA install identity mismatch');

// v10.1.4 safe multi-device sync behavior.
assert(html.includes('src="sync-core.js?v=10.6.2"'),'safe sync core script missing from HTML');
assert(app.includes('function markStudentCascadeDeletion')&&v9.includes('markStudentCascadeDeletion(id)'),'student deletion tombstones missing');
assert(app.includes("markSyncDeletion('tasks',t)"),'task deletion tombstone missing');
assert(v8.includes('safeSyncVersion:2')&&v8.includes('settings.sync.auto=false'),'safe-sync migration must disable legacy auto-sync once');
assert(v8.includes("callAccountSyncRpc('account_sync_pull_v2'")&&v8.includes("callAccountSyncRpc('account_sync_push_v2'"),'v2 sync RPC calls missing');
assert(v8.indexOf("await pullRemoteIntoLocal()")<v8.indexOf("callAccountSyncRpc('account_sync_push_v2'"),'push must pull/merge before uploading');
assert(v8.includes('isSyncRevisionConflict')&&v8.includes('attempt<3'),'sync conflict retry missing');
assert(v8.includes('sourceDeviceId')&&v8.includes('tombstones:'),'cloud payload must include device identity and deletion tombstones');

const syncSandbox={};syncSandbox.globalThis=syncSandbox;vm.runInNewContext(syncCore,syncSandbox,{filename:'sync-core.js'});const C=syncSandbox.WLQSyncCore;
assert(C&&typeof C.mergeById==='function'&&typeof C.mergeTombstones==='function','safe sync core exports missing');
const t1='2026-10-05T08:00:00.000Z',t2='2026-10-05T09:00:00.000Z',t3='2026-10-05T10:00:00.000Z',t4='2026-10-05T11:00:00.000Z';
let ts=C.markTombstone(null,'students','st-1',t3,'device-a');
assert(C.mergeById([{id:'st-1',updatedAt:t1,name:'old'}],[{id:'st-1',updatedAt:t2,name:'new'}],'students',{} )[0].name==='new','newer record must win');
assert(C.mergeById([{id:'st-1',updatedAt:t2,name:'new'}],[],'students',ts).length===0,'newer tombstone must delete record');
assert(C.mergeById([{id:'st-1',updatedAt:t4,name:'restored'}],[],'students',ts)[0].name==='restored','record newer than tombstone must allow explicit restore');
const mergedTs=C.mergeTombstones(ts,C.markTombstone(null,'students','st-1',t4,'device-b'));
assert(mergedTs.students['st-1'].deviceId==='device-b','newer tombstone must win across devices');
const deleted=C.deletedStudentIds([],ts);assert(C.filterDeletedChildren([{id:'ses-1',studentId:'st-1'}],deleted).length===0,'deleted student must remove descendant sessions/tasks');


// v10.2.0 architecture regression guards.
assert(html.indexOf('js/core/runtime.js')<html.indexOf('app.js'),'architecture runtime must load before legacy application scripts');
assert(html.indexOf('js/features/v10-data.js')<html.indexOf('v10.js'),'v10 data module must load before v10 feature layer');
assert(runtime.includes('root.Legacy')&&runtime.includes('override(name,impl'),'explicit legacy override registry missing');
assert(v10.includes("globalThis.ImamApp.Legacy.override(name,impl,'v10.2')"),'v10 explicit compatibility registration missing');
assert(!/function\s+(?:loadPrevTask|setPrevGr|buildSesData|captureDraft|applyDraft|openSurahDropdown|closeSurahDropdown|toggleSurahDropdown|selectSurahOption|filterSurahDropdown|academyFooter|buildWAMsg)\s*\(/.test(v10),'v10 must not re-declare legacy override names implicitly');
assert(v10Data.includes('juzRanges:Object.freeze')&&v10Data.includes('themes:Object.freeze')&&v10Data.includes('hadith:Object.freeze')&&v10Data.includes('dua:Object.freeze'),'v10 static data separation incomplete');

// v10.3 Quran teaching engine regression guards.
assert(html.indexOf('v9.js')<html.indexOf('js/features/quran-engine.js')&&html.indexOf('js/features/quran-engine.js')<html.indexOf('v10.js'),'Quran engine load order invalid');
assert(app.includes("if(typeof initQuranEngine==='function') await initQuranEngine()"),'Quran engine init hook missing');
['Minshawy_Murattal_128kbps','Minshawy_Teacher_128kbps','MaherAlMuaiqly128kbps','Husary_128kbps','Alafasy_128kbps'].forEach(id=>assert(quranEngine.includes(id),`missing Quran reciter ${id}`));
['quranAyahRepeat','quranRangeRepeat','quranTutorPause','quranPlayMode','quranDownloadSurahBtn'].forEach(id=>assert(quranEngine.includes(id),`missing Quran engine control ${id}`));
assert(quranEngine.includes('mediaPut')&&quranEngine.includes('mediaGet')&&quranEngine.includes('mediaDelete'),'offline surah audio must use IndexedDB media store');
assert(quranEngine.includes('rangeLoopsLeft')&&quranEngine.includes('itemRepeatsLeft'),'flexible range/ayah repeat engine missing');
assert(quranEngine.includes('tutorPauseSec')&&quranEngine.includes('setTimeout'),'manual tutoring pause missing');
assert(quranCss.includes('.quran-ayah.selected')&&quranCss.includes('.quran-offline-tools'),'Quran engine UI styles missing');
assert(quranCss.includes('min-height:32dvh')&&quranCss.includes('max-height:38dvh'),'mobile Quran text must keep viewport priority');
assert(quranCss.includes('.quran-play-actions')&&quranCss.includes('.quran-action-primary'),'compact Quran action layout missing');
assert(quranEngine.includes('requestIdleCallback')&&quranEngine.includes('g.__IMAM_BASE__?.save?.()'),'Quran preferences must save in the background without the heavy auto-sync save path');
assert(!quranEngine.includes("content.addEventListener('dblclick'"),'double-click Quran selection should not be used on touch devices');

assert(v10.includes('function v10WaGrade')&&v10.includes('ممتاز ⭐⭐⭐')&&v10.includes('جيد جدًا ⭐⭐')&&v10.includes('يحتاج متابعة 😕'),'guardian report grade motivation mapping missing');
assert(v10.includes('📝 *ملاحظات المحفظ*')&&v10.includes('*التاريخ:*'),'guardian report notes/date formatting missing');
assert(v10.includes('📖 *التكليف للحصة القادمة*'),'guardian report next-assignment section missing');
assert(html.includes('id="v1051-juz-quarter"')&&html.includes('الجزء كاملًا — حزبان — 8 أرباع')&&html.includes('الربع الثامن 8/8'),'8-quarter juz assignment picker missing');
assert(html.includes('js/features/quran-structure.js?v=10.6.2'),'Quran structure helper missing from HTML');
assert(sw.includes("'./js/features/quran-structure.js?v=10.6.2'"),'Quran structure helper missing from service worker');
assert(quranStructure.includes('30 juz = 60 hizb = 240 rub')&&quranStructure.includes('RUB_STARTS'),'30 juz / 60 hizb / 240 quarter metadata missing');
assert(html.includes('id="v1059StopPanel"')&&html.includes('id="v1059ReviewPanel"'),'collapsible teacher insight panels missing');
assert(v10.includes('function toggleV1059SessionPanel')&&v10.includes('function v1059SmartReviewItems'),'teacher insight/review engine missing');
assert(html.includes('class="v10510-insight-button"')&&html.includes('عرض التفاصيل')&&html.includes('عرض الاقتراحات'),'teacher insight panels must use explicit visible buttons, not chevron-only controls');
assert(v10.includes('function v10510ResolveMushafPage')&&v10.includes('api.getVersePage')&&v10.includes("point==='last'?(Number(sec.to)"),'teacher Mushaf links must resolve exact last/next ayah pages');
assert(v10.includes("v1059OpenJourneyMushaf('${key}','last')")&&v10.includes("v1059OpenJourneyMushaf('${key}','next')"),'where-we-stopped cards must expose separate last/next Mushaf actions');
assert(html.includes('js/features/recitation-carry.js?v=10.6.2'),'recitation carry helper missing from HTML');
assert(sw.includes("'./js/features/recitation-carry.js?v=10.6.2'"),'recitation carry helper missing from service worker');
assert(v10.includes('setReviewItemGrade')&&v10.includes('V1051_GRADE_CHOICES'),'item-level recitation grades missing');
assert(v10.includes('v1051MergeCarryIntoData')&&v10.includes('carryForward'),'automatic carry-forward engine missing');
assert(v8.includes('function v8WaGrade')&&v8.includes('📝 *ملاحظات المحفظ*'),'short/detailed WhatsApp modes must use upgraded guardian report formatting');
console.log('Static checks passed for We Live Quran v10.6.2');



// v10.6.2 runtime/cache bridge guards.
assert(html.includes('js/features/mushaf-offline.js?v=10.6.2'),'Mushaf feature must be cache-busted in HTML');
assert(sw.includes('isCodeAsset')&&sw.includes("fetch(req,{cache:'no-store'})"),'service worker must use network-first for code assets');
assert(v9.includes('ImamApp?.MushafOffline?.render')&&v9.includes('ImamApp?.MushafOffline?.openCurrent'),'v9 must explicitly bridge to the new Mushaf runtime');
assert(mushafOffline.includes('render:renderPrimaryUI')&&mushafOffline.includes('openCurrent:currentMushafPage'),'Mushaf runtime must export explicit render/openCurrent entry points');
assert(mushafOffline.includes('قارئ 10.6.2'),'Mushaf UI field verification marker missing');

// v10.4 lightweight Mushaf offline page-pack regression guards.
assert(html.indexOf('v9.js')<html.indexOf('js/features/mushaf-offline.js'),'Mushaf offline layer must load after v9');
assert(sw.includes("'./js/features/mushaf-offline.js?v=10.6.2'"),'service worker must cache versioned Mushaf offline feature');
assert(mushafOffline.includes('cdn.quran.ws/svg/pages')&&mushafOffline.includes('hafs-kfqc'),'versioned SVG Mushaf CDN missing');
assert(mushafOffline.includes("PAGE_COUNT=604")&&mushafOffline.includes("PAGE_PREFIX='mushaf:kfgqpc:v1057:page:'")&&mushafOffline.includes('BUNDLED_OPENING_PAGES=2'),'604-page KFGQPC composite offline pack keys missing');
assert(mushafOffline.includes('downloadRange(1,PAGE_COUNT)'),'full lightweight Mushaf download action missing');
assert(mushafOffline.includes('downloadCurrentRangePages'),'memorization-range page download missing');
assert(mushafOffline.includes("Legacy.override('renderV9Mushaf'")&&mushafOffline.includes("Legacy.override('openCurrentMushafPage'"),'Mushaf integration must use explicit compatibility overrides');
assert(mushafOffline.includes('Quran.ws')&&mushafOffline.includes('موارد مصحف المدينة المستخرجة'),'source-trust disclosure missing');

// v10.6.2 teacher Mushaf page-first navigation guards.
assert(mushafOffline.includes('JUZ_START_PAGES=Object.freeze(['),'Juz start-page map missing');
assert((mushafOffline.match(/JUZ_START_PAGES=Object\.freeze\(\[/g)||[]).length===1,'Juz start-page map should be declared once');
assert(mushafOffline.includes('openTeacherJuzMenu')&&mushafOffline.includes('jumpTeacherMushafJuz'),'Juz navigation hooks missing');
assert(mushafOffline.includes('openTeacherQuickMenu')&&mushafOffline.includes('teacherMushafQuickGo'),'quick page navigation missing');
assert(mushafOffline.includes('dx>0?1:-1'),'RTL swipe must keep right = next, left = previous');
assert(css10.includes('.v1055-mushaf-header')&&css10.includes('.v1055-surah-drawer')&&css10.includes('.v1055-juz-drawer'),'page-first Surah/Juz reader styling missing');
assert(css10.includes('background:#c9c0aa!important')&&css10.includes('brightness(.73)'),'safe night parchment treatment missing');

// v10.6.2 KFGQPC composite Mushaf guards.
assert(fs.existsSync(file('assets/kfgqpc/mushaf-meta.json'))&&fs.existsSync(file('assets/kfgqpc/mushaf604/frame.png')),'KFGQPC Mushaf metadata/frame assets missing');
assert(fs.existsSync(file('assets/kfgqpc/mushaf604/page-001.png'))&&fs.existsSync(file('assets/kfgqpc/mushaf604/page-002.png')),'authentic Fatiha/Baqarah opening pages missing');
assert(fs.existsSync(file('assets/kfgqpc/sura-names/114.png'))&&fs.existsSync(file('assets/kfgqpc/part-names/30.png')),'Surah/Juz artwork extracted from Madina Mushaf missing');
assert(sw.includes("'./assets/kfgqpc/mushaf-meta.json'")&&sw.includes("'./assets/kfgqpc/mushaf604/frame.png'"),'core KFGQPC Mushaf assets must be available offline');
assert(fs.existsSync(file('assets/kfgqpc/ayah-page-map.json'))&&sw.includes("'./assets/kfgqpc/ayah-page-map.json'"),'exact KFGQPC ayah-to-page map must be bundled and available offline');
assert(mushafOffline.includes('loadAyahPageMap')&&mushafOffline.includes('localVersePage')&&mushafOffline.includes('getVersePage'),'local exact ayah-page resolver missing');
assert(mushafOffline.includes('KFG_META_URL')&&mushafOffline.includes('loadKfgMeta'),'local KFGQPC metadata loader missing');
assert(mushafOffline.includes('openingAsset(page')&&mushafOffline.includes('mushaf-opening-night'),'authentic opening-page day/night switch missing');
assert(mushafOffline.includes("page===1?'fatiha':page===2?'baqarah'"),'Fatiha/Baqarah opening-page modes missing');
assert(css10.includes('.mushaf-kfg-frame')&&css10.includes('.mushaf-opening-page'),'KFGQPC page-frame/opening-page styling missing');
