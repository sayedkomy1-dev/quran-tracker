'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const cert=fs.readFileSync(path.join(root,'js/features/achievement-certificates.js'),'utf8');
const qmark=fs.readFileSync(path.join(root,'js/features/teacher-error-marking.js'),'utf8');
const css=fs.readFileSync(path.join(root,'teacher-error-marking.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
for(const asset of ['achievement-certificates.css?v=11.8.0','js/features/achievement-certificates.js?v=11.9.0','teacher-error-marking.css?v=11.8.0']){
  assert(html.includes(asset),'missing HTML asset: '+asset);
  assert(sw.includes('./'+asset),'not in offline app shell: '+asset);
}
assert(qmark.includes('qmarkMinimize')&&qmark.includes('qmark-inspecting'),'missing collapsible error inspector');
assert(css.includes('pointer-events:none')&&css.includes('qmark-minimized')&&css.includes('quran-box'),'inspector must keep Quran visible');
const students=[{id:'one',name:'طالب تجريبي'}],sessions=[],complete=new Set(['1:1','1:2','1:3']);
const scope={console,Date,Set,Array,Math,Intl,Blob,URL,document:{},S:[{n:'الفاتحة',a:7},{n:'البقرة',a:286}]};
scope.ImamApp={State:{students,sessions,settings:{name:'شيخ',circle:'أكاديمية الإمام'},curStId:'one'},GoalPlanner:{completedKeys:()=>complete,targetVerses:g=>{
 if(g.targetType==='surah')return Array.from({length:g.to-g.from+1},(_,i)=>({surahId:g.surahId,ayah:i+g.from}));
 if(g.targetType==='juz')return g.juz===1?[{surahId:1,ayah:1},{surahId:1,ayah:2}]:[{surahId:2,ayah:1}];
 return [{surahId:2,ayah:1}];
}}};
scope.globalThis=scope;
vm.createContext(scope);vm.runInContext(cert,scope,{filename:'achievement-certificates.js'});
const api=scope.ImamApp.AchievementCertificates;
assert.equal(api.eligibility('one','surah','1').ok,false,'partial surah may not qualify');
assert.equal(api.eligibility('one','juz','1').ok,true,'complete range should qualify');
assert.equal(api.eligibility('one','five','').ok,false,'cannot claim five Juz from one');
assert.equal(api.eligibility('one','attendance','').ok,false,'no attendance cert without sessions');
assert.equal(api.eligibility('one','tajweed','',false).ok,false,'tajweed must be confirmed');
assert.equal(api.eligibility('one','tajweed','',true).ok,true,'manual teacher attestation needed');
assert.equal(api.records(students[0]).length,0,'must not create certificates merely by opening a view');
const standalone=api.certificateHTML({id:'IMAM-2026-123456',title:'حفظ',label:'جزء',issuedAt:'2026-10-16',evidence:'تم'},students[0]);
assert(standalone.includes('IMAM-2026-123456')&&standalone.includes('بالقرآن نحيا'),'printable certificate must contain details');
console.log('PASS v11.8 eligibility, certificates history, offline and unobstructed inspector');
