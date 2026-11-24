'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html'),sw=read('sw.js'),nav=read('js/core/mobile-navigation.js');

const expected={
  'styles.css':'ca9ea955d72108b3a8cc7d2c9ec2c2e5486538cbeaaf05572c5ae47a6970822e',
  'v9.css':'eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef',
  'v10.css':'e4d356ac5b94834eba94661c023afd6665a438edb64953aaf42240d2c09b78df',
  'v11.css':'27d01ded6c327acd95c4efb1d4f84297345911c2236cd7d78bd512847396640b'
};
for(const [filename,digest] of Object.entries(expected)){
  assert.equal(fs.existsSync(filename),false,'legacy CSS still in runtime root: '+filename);
  const archive='archive/historical-css/'+filename;
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),digest,'historical CSS snapshot changed: '+filename);
}

const safeDeletions=JSON.parse(read('review/SAFE-DELETIONS.json'));
assert.equal(Object.keys(safeDeletions).length,53,'historical deletion manifest size changed');
for(const rel of Object.keys(safeDeletions)){
  assert.equal(fs.existsSync(rel),false,'verified historical source remains: '+rel);
}

const duplicateImages=[
  'screenshots/branding/academy-badge-source.png',
  'screenshots/branding/academy-icon-source.png',
  'screenshots/favicon.png',
  'screenshots/icon-96.png',
  'screenshots/icon-192.png',
  'screenshots/icon-512.png',
  'screenshots/icon-maskable.png',
  'screenshots/screenshots/desktop-home-v8.png',
  'screenshots/screenshots/desktop-home.png',
  'screenshots/screenshots/mobile-home-v8.png',
  'screenshots/screenshots/mobile-home.png',
  'screenshots/screenshots/mobile-session-v8.png',
  'screenshots/screenshots-v9.1/home-mobile-fixed.png',
  'screenshots/screenshots-v9.1/session-mobile-fixed.png',
  'screenshots/screenshots-v9.1/session-windows-fixed.png'
];
for(const rel of duplicateImages){
  assert.equal(fs.existsSync(rel),false,'duplicate historical image remains: '+rel);
}
const retainedScreenshots=[
  'desktop-home-v8.png',
  'desktop-home.png',
  'mobile-home-v8.png',
  'mobile-home.png',
  'mobile-session-v8.png'
].sort();
assert.deepEqual(fs.readdirSync('screenshots').sort(),retainedScreenshots,'screenshots/ must contain only the five retained reference screenshots');
for(const rel of retainedScreenshots)assert(fs.existsSync('screenshots/'+rel),'retained reference screenshot missing: '+rel);
for(const rel of ['screenshots-v9.1/home-mobile-fixed.png','screenshots-v9.1/session-mobile-fixed.png','screenshots-v9.1/session-windows-fixed.png']){
  assert(fs.existsSync(rel),'v9.1 reference screenshot missing: '+rel);
}

const tags=html.match(/<(?:script|link)[^>]*>/g)||[];
for(const tag of tags){
  const src=(tag.match(/(?:src|href)=["']([^"']+)["']/)||[])[1];
  if(!src||src.startsWith('http:')||src.startsWith('https:')||src.startsWith('data:')||src.startsWith('#'))continue;
  let pathname=src.split(/[?#]/)[0];
  if(pathname.startsWith('./'))pathname=pathname.slice(2);
  assert(fs.existsSync(pathname),'missing primary HTML asset: '+pathname);
  assert(!['styles.css','v9.css','v10.css','v11.css'].includes(pathname),'historical cascade loaded: '+pathname);
}
assert(sw.includes("const APP_VERSION = '11.12.1-beta.27'"));
assert(sw.includes("const CACHE_NAME = 'quran-pwa-v11.12.1-beta.27-workspace-workflow'"));
assert(nav.includes('RELOAD_PAGES')&&nav.includes("g.WeLiveQuranAuth?.isActive?.()===true"),'auth-gated reload recovery missing');
assert(!nav.includes('exitPromptAt'),'unsafe timed PWA exit remains');
assert.equal(read('VERSION').trim(),'11.12.1-beta.27');
assert(read('js/features/role-home.js').includes('supervisorCard.hidden=true'),'canonical role hub must hide legacy launcher in DOM');
assert(read('js/features/supervisor-dashboard.js').includes('button.hidden=hasCanonicalHub'),'late supervision injection must honor canonical role hub');
console.log('repository-cleanup-rc15-check: PASS');
