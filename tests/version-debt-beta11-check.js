'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),path=require('path');
const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html'),sw=read('sw.js'),nav=read('js/core/mobile-navigation.js');
const expected={"styles.css": "ca9ea955d72108b3a8cc7d2c9ec2c2e5486538cbeaaf05572c5ae47a6970822e", "v9.css": "eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef", "v10.css": "e4d356ac5b94834eba94661c023afd6665a438edb64953aaf42240d2c09b78df", "v11.css": "27d01ded6c327acd95c4efb1d4f84297345911c2236cd7d78bd512847396640b"};
for(const [filename,digest] of Object.entries(expected)){
 assert.equal(fs.existsSync(filename),false,`legacy CSS still in runtime root: ${filename}`);
 const a=`archive/historical-css/${filename}`;
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex'),digest,`snapshot changed: ${filename}`);
}
const tags=html.match(/<(?:script|link)\b[^>]*>/g)||[];
for(const tag of tags){
 const src=(tag.match(/(?:src|href)=["']([^"']+)["']/)||[])[1];
 if(!src||src.startsWith('http:')||src.startsWith('https:')||src.startsWith('data:')||src.startsWith('#'))continue;
 const pathname=src.split(/[?#]/)[0].replace(/^\.\//,'');
 assert(fs.existsSync(pathname),`missing primary HTML asset: ${pathname}`);
 assert(!/^(styles|v9|v10|v11)\.css$/.test(pathname),`historical cascade loaded: ${pathname}`);
}
assert(sw.includes("const APP_VERSION = '11.12.1-beta.17'"));
assert(sw.includes("const CACHE_NAME = 'quran-pwa-v11.12.1-beta.17-workspace-workflow'"));
assert(nav.includes('RELOAD_PAGES')&&nav.includes("g.WeLiveQuranAuth?.isActive?.()===true"),'auth-gated reload recovery missing');
assert(!nav.includes('exitPromptAt'),'unsafe timed PWA exit remains');
assert.equal(read('VERSION').trim(),'11.12.1-beta.17');
assert(read('js/features/role-home.js').includes('supervisorCard.hidden=true'),'canonical role hub must hide legacy launcher in DOM');
assert(read('js/features/supervisor-dashboard.js').includes('button.hidden=hasCanonicalHub'),'late supervision injection must honor canonical role hub');
console.log('version-debt-beta11-check: PASS');
