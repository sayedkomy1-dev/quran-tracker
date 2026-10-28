'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const h=read('index.html'),sw=read('sw.js'),home=read('js/features/academy-suite.js'),css=read('css/platform/academy-suite.css'),portal=read('academy-portals.html'),js=read('js/features/academy-portal-suite.js');
let tests=0;function check(name,fn){try{fn();tests++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}}
check('Suite style and functionality loaded once',()=>{assert.equal((h.match(/academy-suite.css\?v=/g)||[]).length,1);assert.equal((h.match(/academy-suite.js\?v=/g)||[]).length,1)});
check('Existing session, guardian, board and error systems retained',()=>{['js/features/teacher-followup.js','js/features/imam-smart-board.js','js/features/error-followup-engine.js','js/features/quran-coverage-progress.js'].forEach(p=>assert(h.includes(p)))});
check('Student, teacher and circles seed records are never injected',()=>{assert(!/seedData|demoStudents|demoTeachers|mockSessions/.test(home));assert(!/seedData|demoStudents|demoTeachers|mockSessions/.test(js))});
check('Suite uses native existing actions not parallel lesson or session storage',()=>{assert(home.includes('goPage'));assert(home.includes('nativeVisible'));assert(!/localStorage\.setItem\(['"]students/.test(home))});
check('Arabic heading and navigable service cards',()=>{assert(home.includes('لأن كل آية تستحق عناية'));assert(home.includes('academy-learning.html'));assert(home.includes('guardian-login.html'));assert(home.includes('imamSmartBoardTab'))});
check('UI opt-out hides suite with original user theme',()=>{assert(css.includes('body:not(.imam-design-bridge) .ias-home{display:none!important}'));assert(css.includes('body.imam-design-bridge #pg-home :is(.imam-bridge-hero,.imam-bridge-section)'))});
check('No Quran canonical text styled with letter distortion',()=>{assert(!/\.quran-ayah[^\n]*letter-spacing\s*:\s*[1-9]/.test(css))});
check('Portal center lists functioning existing routes',()=>{assert(portal.includes('apsContent'));assert(js.includes('guest-practice.html'));assert(js.includes('guardian-login.html'));assert(js.includes('academy-learning.html'))});
check('No publication of demo or direct guardian login',()=>{assert(!js.includes('loginAsGuardianDirect'));assert(!js.includes('WAQF_MEMORIAL_NAMES_LIST'))});
check('All new assets are in both offline shell lists',()=>{const a=['academy-learning.html','data/academy-learning-materials.json','css/platform/academy-portal-suite.css','js/features/academy-suite.js'];for(const path of a)assert(sw.split(path).length>=3,`Missing ${path} from one shell list`)});
check('Cache namespace changed to prevent stale asset reuse',()=>{assert(sw.includes("'-academy-suite-review7'"))});
console.log(`academy suite ${tests}/11`);if(tests!==11)process.exitCode=1;
