'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const version=read('VERSION').trim();assert.equal(version,'11.12.1-beta.27');
const html=read('index.html'),sw=read('sw.js'),css=read('css/platform/surah-picker.css'),script=read('js/features/surah-picker-17.js'),app=read('app.js');
for(const section of ['new','rec','far']){
 assert(html.includes(`id="${section}-s"`)&&html.includes(`id="vb-${section}"`));
 assert(html.includes(`id="${section}-surah-dropdown"`));
}
assert(html.includes(`css/platform/surah-picker.css?v=${version}`));
assert(html.includes(`js/features/surah-picker-17.js?v=${version}`));
for(const file of ['css/platform/surah-picker.css','js/features/surah-picker-17.js'])
 assert(sw.includes(`'./${file}?v=${version}'`),`Offline shell missing ${file}`);
assert(script.includes('field.readOnly=true')&&script.includes('visualViewport')&&script.includes('height:h+\'px\''),'keyboard avoidance and resizing');
assert(script.includes("fillAyah(key);scheduleDraftSave();close(key)"),'selected surah must update original form contract');
assert(script.includes("legacy.override(name,fn,'surah-picker-beta17')"),'latest adapter must override old picker');
assert(app.includes("input.value=S[idx].n;input.dataset.userTouched='1';fillAyah(sec)"),'voice must write canonical surah name into official input');
assert(css.includes('grid-template-columns:minmax(0,1fr) 50px'),'name field must be wider than microphone');
const ctx={globalThis:{ImamApp:{Legacy:{override:(n,f)=>ctx.globalThis[n]=f}}},document:{addEventListener:()=>{}},matchMedia:()=>({matches:true})};
vm.runInNewContext(script,ctx,{filename:'surah-picker-17.js'});
const norm=ctx.globalThis.ImamSurahPicker17.normalize;
assert.equal(norm('سورة آل عمران'),'ال عمران');
assert.equal(norm('سُورَةُ ٱلْفَاتِحَةِ').includes('الفاتحه'),true);
assert.equal(norm('سورة النساء'),'النساء');
const match=app.match(/const S=(\[[\s\S]*?\]);\s*const JZ=/);assert(match,'canonical Quran surah table is present');
const names=vm.runInNewContext(match[1]);assert.equal(names.length,114);
assert.deepEqual(Array.from(names.slice(0,3).map(x=>x.n)),['الفاتحة','البقرة','آل عمران']);

// Execute the actual latest voice parser in isolation using fake session inputs.
const voiceStart=app.lastIndexOf('function parseVoiceInput(sec,txt){');
const voiceEnd=app.indexOf('\nfunction fmtActualResult',voiceStart);
assert(voiceStart>=0&&voiceEnd>voiceStart);
const values={'new-s':{value:'',dataset:{}},'new-full':{checked:false}};
let rangeUpdates=0,draftUpdates=0;
const voiceCtx={
 S:names,GRADE_MAP:{},toast:()=>{},setGr:()=>{},
 document:{getElementById:id=>values[id]||null},
 fillAyah:()=>{rangeUpdates++;},scheduleDraftSave:()=>{draftUpdates++;},
 globalThis:{ImamSurahPicker17:{normalize:norm,close:()=>{}}}
};
vm.runInNewContext(app.slice(voiceStart,voiceEnd)+'\nparseVoiceInput("new","سورة آل عمران");',voiceCtx);
assert.equal(values['new-s'].value,'آل عمران');
assert.equal(values['new-s'].dataset.userTouched,'1');
assert.equal(rangeUpdates,1);assert.equal(draftUpdates,1);

console.log('PASS beta17 Surah picker: RTL, 114 canonical surahs, typed/voice normalization, mobile keyboard, original save field, offline asset pinning');
