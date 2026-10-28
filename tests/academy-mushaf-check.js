'use strict';const fs=require('fs'),assert=require('assert'),path=require('path');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('assets/kfgqpc/mushaf-meta.json')),js=read('js/features/academy-mushaf.js'),html=read('academy-mushaf.html'),sw=read('sw.js');
assert.equal(data.pageCount,604);assert.equal(data.surahs.length,114);assert.equal(data.juz.length,30);
assert(js.includes('assets/kfgqpc/mushaf604/page-'));assert(js.includes('https://cdn.quran.ws/svg/pages/v1.1.1/hafs-kfqc/'));
assert(!/studentId|guardianPin|donationCount|waqfImpactStats|fetch\('https:\/\/.*AI/.test(js));assert(html.includes('لا نستقبل تبرعات'));
assert(sw.split('academy-mushaf.html').length>=3);assert(html.includes('guest-practice.html'));
console.log('PASS public mushaf source/data/privacy and resource loading (8 checks)');
