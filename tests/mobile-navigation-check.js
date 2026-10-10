'use strict';
const fs=require('fs');
function ok(cond,msg){if(!cond)throw new Error(msg);}
const index=fs.readFileSync('index.html','utf8');
const nav=fs.readFileSync('js/core/mobile-navigation.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
ok(index.includes('js/core/mobile-navigation.js?v=10.10.0'),'navigation script must be loaded');
ok(index.indexOf('js/core/mobile-navigation.js')>index.indexOf('js/features/guardian-portal-share.js'),'navigation must load after feature navigation wrappers');
ok(nav.includes("addEventListener('popstate',handlePop)"),'popstate handler missing');
ok(nav.includes('history.pushState'),'page history push missing');
ok(nav.includes('history.replaceState'),'root guard missing');
ok(nav.includes("document.querySelectorAll('.mo.open')")||nav.includes("d.querySelectorAll('.mo.open')"),'modal Back handling missing');
ok(nav.includes('closeTeacherMushafReader'),'Mushaf reader Back handling missing');
ok(nav.includes('اضغط رجوع مرة أخرى للخروج'),'double-back exit guard missing');
ok(sw.includes("./js/core/mobile-navigation.js?v=10.10.0"),'navigation script must be in PWA shell');
ok(sw.includes("quran-pwa-v10.10.0-s4"),'service worker cache generation must advance');
console.log('mobile-navigation-check: PASS');
