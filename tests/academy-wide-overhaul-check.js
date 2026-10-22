'use strict';
/* Structural release checks only. They do not replace a live phone/session QA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),worker=read('sw.js'),roles=read('js/features/role-home.js');
const css=read('role-home.css'),responsive=read('css/platform/responsive.css');
const components=read('css/platform/components.css'),more=read('v9.js');
const version='11.12.1-beta.19';
assert.equal(read('VERSION').trim(),version);
assert.equal(JSON.parse(read('package.json')).version,version);
assert(html.includes(`application-version" content="${version}`));
assert(worker.includes(`const APP_VERSION = '${version}'`));
assert(worker.includes(`const CACHE_NAME = 'quran-pwa-v${version}`));
for(const key of ['home','checkin','students','session','mushaf','reports','settings','tasks','followup','analytics','profile','compare','circle-manager','academic-exams']){
 assert(html.includes(`id="pg-${key}"`),`missing page ${key}`);
}
for(const id of ['sesSt','sesDate','sesNotes','saveSessionBtn','saveSendSessionBtn','draftState']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,`duplicate/missing official control ${id}`);
}
assert(!/<link[^>]*href="(?:styles|v9|v10|v11)\.css/i.test(html),'old edition CSS reloaded');
assert(css.includes('#pg-home[data-workspace-role="owner"] #v9Home')&&css.includes('#pg-home[data-workspace-role="supervisor"] #v9Home'),'duplicated teacher dashboard for administrators');
assert(roles.includes('g.ImamApp?.Supervision?.open?.()')&&roles.includes('g.ImamApp?.SmartBoard?.open'),'authority-bearing destinations preserved');
assert(more.includes('imamMoreSearch')&&more.includes('const label=(btn.textContent'), 'More menu search must filter existing permitted items');
assert(more.includes("['home','home','الرئيسية'")&&more.includes('syncV9SmartBoardEntry()'),'permitted navigation and smart board entry retained');
assert(responsive.includes('--imam-bottom-nav:66px')&&responsive.includes('safe-area-inset-bottom'),'real phone safe area');
assert.equal((responsive.match(/@media\(max-width:799px\)/g)||[]).length,1,'one canonical phone breakpoint');
for(const selector of ['#pg-students','#pg-session','#pg-reports','#pg-analytics','#pg-settings','#pg-circle-manager','#pg-academic-exams']){
 assert(components.includes(selector),`shared workspace design misses ${selector}`);
}
assert(read('css/platform/public-experience.css').includes('.portal-quick-nav'),'guardian and guest UI kept');
assert(read('css/platform/student-display.css').includes('.imam-student-display'),'student screen kept separate');
assert(read('imam-smart-board.css').includes('.ib-board-area{min-height:330px}'),'phone Quran area compacted');
assert(!fs.existsSync(path.join(__dirname,'..','screenshots','index.html')),'duplicate historical source remains in screenshots runtime tree');
assert(fs.existsSync(path.join(__dirname,'..','screenshots','desktop-home.png')),'reference image lost');
assert(fs.existsSync(path.join(__dirname,'..','review','HISTORICAL-SNAPSHOT-CLEANUP.json')),'archive record missing');
console.log('PASS academy-wide beta12: 14 pages, existing save contract, role workspace, responsive ownership, More discovery, guardian/student separation and safe archive');
