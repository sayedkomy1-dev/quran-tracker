'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),js=read('js/features/revision-quran-text.js'),app=read('app.js'),v10=read('v10.js'),sw=read('sw.js');
assert(html.includes('revision-quran-text.js?v=11.8.1'));
assert(sw.includes("'./js/features/revision-quran-text.js?v=11.8.1'"));
for(const stage of ['rec','far'])assert(html.includes(`v1181OpenCurrentSection('${stage}')`));
assert(v10.includes('v1181OpenQuarterText')&&v10.includes('v1181OpenJuzChipText'));
assert(app.includes('v1181OpenSurahReviewChip'));
const fakeS=Array.from({length:114},(_,i)=>({n:`س${i+1}`,a:300}));
const STRUCT=require('../js/features/quran-structure.js');
const doc={addEventListener(){},getElementById(){return null}};
const context={document:doc,S:fakeS,ImamApp:{QuranStructure:STRUCT,RecitationCarry:{parseJuzChip(){return null;}}},globalThis:null};
context.globalThis=context;
vm.runInNewContext(js,context,{filename:'revision-quran-text.js'});
const seg=context.ImamApp.RevisionQuranText.segments;
// Single-surah quarter: exact inclusive end at next rub' boundary - 1.
const q1=seg(1,1);
assert.equal(q1[0].from,1);
assert.equal(q1[1].to,25); // second surah stops just before Al-Baqarah 26.
assert.equal(q1.length,2); // test setup: Fatiha -> Al-Baqarah
// Multi-surah quarter in Juz Amma.
const last=seg(30,8);assert(last.length>=1);assert(last[0].surah.startsWith('س'));
const q30=seg(30,1);assert(q30.length>=1);
for(const r of [...q1,...q30,...last])assert(r.from>=1&&r.to>=r.from,'no empty or reversed ranges');
// Storage fallback never chooses an empty snapshot over an existing good one.
const chooserBlock=app.match(/function chooseAccountBootSnapshot\([\s\S]*?\n\}/);
assert(chooserBlock,'snapshot chooser missing');
const ctx={snapshotHasData:x=>!!((x?.students?.length||0)+(x?.sessions?.length||0)+(x?.tasks?.length||0))};
vm.runInNewContext(chooserBlock[0]+'\nthis.choose=chooseAccountBootSnapshot;',ctx);
const good={students:[{id:1}],sessions:[],tasks:[]},empty={students:[],sessions:[],tasks:[]};
assert.equal(ctx.choose(empty,good),good);
assert.equal(ctx.choose(good,empty),good);
assert.equal(ctx.choose(good,empty,100,200,190),empty,'confirmed account reset must stay empty');
assert.equal(ctx.choose(good,{students:[{id:2}],sessions:[],tasks:[]},100,200).students[0].id,2);
assert.equal(ctx.choose(good,{students:[{id:2}],sessions:[],tasks:[]},200,100),good);
assert(app.includes('if(!snapshotHasData(next)&&snapshotHasData(prior))return;'));
assert(app.includes("accountIdbKey('savedAt')"));
console.log('Stage 11.8.1 review text / snapshot boot tests passed');
