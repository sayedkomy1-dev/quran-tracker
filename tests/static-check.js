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
new vm.Script(sw,{filename:'sw.js'});

assert(version==='10.0.0','VERSION must be 10.0.0');
assert(pkg.version===version,'package.json version mismatch');
assert(manifest.version===undefined || manifest.version===version,'manifest version mismatch');
assert(html.includes(`content="${version}"`),'HTML application-version mismatch');
assert(app.includes(`const APP_VERSION='${version}'`),'app.js APP_VERSION mismatch');
assert(app.includes('const SCHEMA_VERSION=12'),'schema version must be 12 for item-level review migration');
assert(sw.includes(`const APP_VERSION = '${version}'`),'sw.js APP_VERSION mismatch');
assert(sw.includes("'./v9.js'")&&sw.includes("'./v9.css'")&&sw.includes("'./v10.js'")&&sw.includes("'./v10.css'"),'service worker must cache v9/v10 assets');
assert(manifest.display_override?.includes('window-controls-overlay'),'manifest missing desktop display override');

// Required files and local references.
['icon-96.png','icon-192.png','icon-512.png','icon-maskable.png','styles.css','v9.css','v10.css','app.js','v8.js','v9.js','v10.js','MUSHAF-SOURCES.md','V9-IMPLEMENTATION.md'].forEach(f=>assert(fs.existsSync(file(f)),`missing ${f}`));
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

assert(v10.includes('reviewAssignments')&&v10.includes('not_heard')&&v10.includes('repeat'),'v10 item-level review model missing');
assert(v10.includes('نفس التكليف للحصة القادمة'),'weak-grade repeat action missing');
assert(v10.includes('facebookUrl')&&v10.includes('settings.facebookUrl'),'Facebook setting must be configurable');
assert(v10.includes('V10_THEMES')&&css10.includes('#145A3A'),'theme architecture/palette A missing');
assert(manifest.short_name==='أكاديمية الإمام'&&manifest.display==='standalone','PWA install identity mismatch');
console.log('Static checks passed for Imam Academy v10.0.0');
