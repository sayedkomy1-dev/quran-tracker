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
const auth=read('auth.js');
const authCss=read('auth.css');
const css9=read('v9.css');
const css10=read('v10.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.json'));
const pkg=JSON.parse(read('package.json'));
const version=read('VERSION').trim();

// Syntax first: a single parse error must fail the release.
new vm.Script(app,{filename:'app.js'});
new vm.Script(v8,{filename:'v8.js'});
new vm.Script(v9,{filename:'v9.js'});
new vm.Script(v10,{filename:'v10.js'});
new vm.Script(auth,{filename:'auth.js'});
new vm.Script(sw,{filename:'sw.js'});

assert(version==='10.1.3','VERSION must be 10.1.3');
assert(pkg.version===version,'package.json version mismatch');
assert(manifest.version===undefined || manifest.version===version,'manifest version mismatch');
assert(html.includes(`content="${version}"`),'HTML application-version mismatch');
assert(app.includes(`const APP_VERSION='${version}'`),'app.js APP_VERSION mismatch');
assert(app.includes('const SCHEMA_VERSION=12'),'schema version must be 12 for item-level review migration');
assert(sw.includes(`const APP_VERSION = '${version}'`),'sw.js APP_VERSION mismatch');
assert(sw.includes("'./v9.js'")&&sw.includes("'./v9.css'")&&sw.includes("'./v10.js'")&&sw.includes("'./v10.css'")&&sw.includes("'./auth.js'")&&sw.includes("'./auth.css'"),'service worker must cache v9/v10/auth assets');
assert(manifest.display_override?.includes('window-controls-overlay'),'manifest missing desktop display override');

// Required files and local references.
['icon-96.png','icon-192.png','icon-512.png','icon-maskable.png','styles.css','v9.css','v10.css','auth.css','app.js','auth.js','v8.js','v9.js','v10.js','privacy.html','terms.html','MUSHAF-SOURCES.md','V9-IMPLEMENTATION.md'].forEach(f=>assert(fs.existsSync(file(f)),`missing ${f}`));
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
const js=app+'\n'+v8+'\n'+v9+'\n'+v10;
const defs=new Set([...js.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
const builtins=new Set(['if','for','while','switch','confirm','prompt','alert','setTimeout','setInterval','clearTimeout','clearInterval','parseInt','parseFloat','Number','String','Boolean','Date','Math','JSON','encodeURIComponent','decodeURIComponent']);
for(const hm of html.matchAll(/\bon(?:click|change|input|submit|contextmenu|keydown|keyup|blur|focus)=["']([^"']+)["']/gi)){
  for(const fm of hm[1].matchAll(/(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g)){
    const name=fm[1]; assert(defs.has(name)||builtins.has(name),`inline handler references missing function: ${name}`);
  }
}

assert(v9.includes('qurancomplex.gov.sa/en/apps-hafs/'),'official Mushaf app/source link missing');
assert(v9.includes('pdf.quran.ws/pdfs/hafs/quran-hafs-mushaf.pdf'),'direct 604-page PDF download link missing');
assert(v9.includes('downloadMadinahMushafDirect'),'direct Mushaf download action missing');
assert(v9.includes('Husary_128kbps')||v8.includes('Husary_128kbps'),'Husary reciter missing');
assert(v8.includes('Alafasy_128kbps'),'Alafasy reciter missing');
assert(css9.includes('.v9-nav')&&css9.includes('.v9-session-steps')&&css9.includes('.v92-primary-card')&&css9.includes('.v92-install-flow'),'v9.2 design system incomplete');
assert(html.includes('id="tog-juz"')&&html.includes('id="tog-surahReview"'),'parts and surah review must remain independent');
assert(!html.includes('id="gr-new"')&&!html.includes('id="gr-rec"')&&!html.includes('id="gr-far"'),'assignment rating controls must not return');


// v10.1 runtime UX regression guards.
assert(v10.includes('V10_HOME_SECTIONS')&&v10.includes('enhanceV10HomeSections'),'collapsible home-section enhancer missing');
assert(v10.includes("homeSections={primary:true,stats:true,actions:true,students:true"),'home-section persisted state defaults missing');
assert(v10.includes("closeSurahDropdown(key,true);return"),'explicit Surah dropdown close must bypass stale-blur focus guard');
assert(v10.includes('onpointerdown="event.preventDefault();selectSurahOption'),'Surah dropdown touch/pointer selection missing');
assert(v10.includes("classList.toggle('open-up',up)"),'adaptive Surah dropdown placement missing');
const juzMatch=v10.match(/const V10_JUZ_RANGES=(\[[^;]+\]);/);
assert(juzMatch,'Juz range map missing');
const juzRanges=vm.runInNewContext(juzMatch[1]);
assert(juzRanges.length===30,'Juz range map must contain exactly 30 Ajza');
assert(JSON.stringify(juzRanges[28])==='[67,77]'&&JSON.stringify(juzRanges[29])==='[78,114]','Juz Tabarak/Amma Surah ranges are misaligned');
assert(v10.includes("hadithNumber:'6013'")&&!v10.includes("6013/6018"),'starter hadith reference must not be ambiguous');
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
assert(v8.includes("callAccountSyncRpc('account_sync_push'")&&v8.includes("callAccountSyncRpc('account_sync_pull'"),'account cloud sync must use authenticated account RPC endpoints');
assert(!v8.includes('/rest/v1/imam_sync?on_conflict='),'direct cloud table write must be removed');
assert(!v8.includes('/rest/v1/imam_sync?select=payload'),'direct cloud table read must be removed');
const syncSql=fs.readFileSync(file('sql/supabase-sync.sql'),'utf8');
assert(syncSql.includes('revoke all on table public.imam_sync from anon, authenticated'),'sync table direct grants must be revoked');
assert(syncSql.includes('imam_sync_push')&&syncSql.includes('imam_sync_pull'),'secure sync RPC functions missing');
assert(!/for select to anon using\s*\(true\)/i.test(syncSql),'broad anon SELECT policy must not return');
assert(!/for update to anon using\s*\(true\)/i.test(syncSql),'broad anon UPDATE policy must not return');
assert(!/for insert to anon with check\s*\(true\)/i.test(syncSql),'broad anon INSERT policy must not return');
assert(v8.includes('localSync=settings.sync')&&v8.includes('accountOwner:owner'),'backup/cloud restore must preserve current account ownership and device secrets');
assert(sw.includes("quran-pwa-v10.1.3"),'service worker cache must match v10.1.3');


// v10.1.2 Google Auth and access-control regression guards.
assert(html.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')&&html.includes('src="auth.js"'),'Supabase auth bootstrap scripts missing');
assert(html.includes('href="auth.css"'),'auth stylesheet missing');
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
assert(v8.includes("callAccountSyncRpc('account_sync_push'")&&v8.includes("callAccountSyncRpc('account_sync_pull'"),'account-owned cloud RPC calls missing');
assert(v8.includes('ownerUserId:storageScopeUserId'),'encrypted cloud payload must bind to the local authenticated account');
const accountSyncSql=fs.readFileSync(file('sql/account-sync.sql'),'utf8');
assert(accountSyncSql.includes('create table if not exists public.account_sync'),'account_sync table setup missing');
assert(accountSyncSql.includes('owner_user_id uuid primary key references auth.users(id)'),'account_sync must be one row per authenticated account');
assert(accountSyncSql.includes('where s.owner_user_id = auth.uid()'),'account_sync pull must scope to auth.uid()');
assert(accountSyncSql.includes('revoke all on table public.account_sync from anon, authenticated'),'account_sync direct table access must be revoked');
assert(accountSyncSql.includes('grant execute on function public.account_sync_push(text) to authenticated'),'account_sync push RPC grant missing');
assert(accountSyncSql.includes('grant execute on function public.account_sync_pull() to authenticated'),'account_sync pull RPC grant missing');
assert(!/grant execute on function public\.account_sync_(?:push|pull)[^\n]*to anon/i.test(accountSyncSql),'anonymous account sync RPC execute must not be granted');

assert(manifest.short_name==='أكاديمية الإمام'&&manifest.display==='standalone','PWA install identity mismatch');
console.log('Static checks passed for We Live Quran v10.1.3');
