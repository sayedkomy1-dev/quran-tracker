/* Review8 non-regression: additive UI + distinct read-only Mushaf source. */
'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..'),rd=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=rd('index.html'),ports=rd('academy-portals.html'),learn=rd('academy-learning.html'),mushaf=rd('academy-mushaf.html'),reader=rd('js/features/academy-mushaf.js'),life=rd('js/features/academy-life.js'),sw=rd('sw.js');
for(const page of [home,ports,learn])assert(page.includes('css/platform/academy-life.css?v=11.12.1-beta.27-life-review8'));
assert(home.includes('js/features/academy-life.js?v=11.12.1-beta.27-life-review8'));
assert(life.includes('getElementById(\'imamAcademySuite\')'));assert(life.includes('academy-mushaf.html'));
assert(reader.includes('assets/kfgqpc/mushaf604/page-'));assert(reader.includes('https://cdn.quran.ws/svg/pages/v1.1.1/hafs-kfqc/'));
assert(reader.includes('https://raw.githubusercontent.com/akram-seid/quran-hd-images/main/images/'));
assert(mushaf.includes('data-mushaf-source="classic"'));assert(mushaf.includes('data-mushaf-source="hd"'));
assert(mushaf.includes('amZoomIn'));assert(mushaf.includes('amFocus'));assert(mushaf.includes('amTheme'));
for(const asset of ['css/platform/academy-life.css?v=11.12.1-beta.27-life-review8','js/features/academy-life.js?v=11.12.1-beta.27-life-review8','css/platform/academy-mushaf.css?v=11.12.1-beta.27-life-review8','js/features/academy-mushaf.js?v=11.12.1-beta.27-life-review8'])assert(sw.split(asset).length>=3,`${asset} must appear in both shell lists`);
assert(sw.includes("'-academy-life-review8'"));assert(reader.includes("const KEY='imam.public.mushaf.lastpage.v1'"));
for(const bad of [/studentId/,/saveSession\(/,/writeStudent\(/,/donationCount/,/autoplay/])assert(!bad.test(reader));
assert(!/\.quran-ayah[^\n]*letter-spacing\s*:\s*[1-9]/.test(rd('css/platform/academy-life.css')));
console.log('PASS life review8: 17 regression groups + two-source Mushaf + offline references');
