const fs=require('fs'),vm=require('vm');
const read=f=>fs.readFileSync(f,'utf8');
const ok=(v,m)=>{if(!v)throw new Error(m)};
const teacher=read('js/features/teacher-error-marking.js');
const v8=read('v8.js');
const css=read('teacher-error-marking.css');
const tahCss=read('guardian-tahfeez.css');
const tahHtml=read('guardian-portal.html');
const tahJs=read('js/features/guardian-tahfeez.js');
const app=read('app.js');
const v10=read('v10.js');
const sw=read('sw.js');
new vm.Script(teacher,{filename:'teacher-error-marking.js'});
new vm.Script(tahJs,{filename:'guardian-tahfeez.js'});
for(const name of ['captureDraft','applyDraft','buildSesData'])ok(teacher.includes(`legacy.override('${name}'`),`missing final ${name} persistence bridge`);
ok(teacher.includes("PREF_KEY='imam:qmark:prefs:v2'")&&teacher.includes('state.enabled=p.enabled!==false'),'correction mode preference not remembered');
ok(teacher.includes('qmarkCustomInput')&&teacher.includes('addCustomError')&&teacher.includes("group,'custom'")||teacher.includes("addError(type,'custom')"),'custom typed error workflow missing');
ok(v8.includes("const isQuranWord=x.source==='quran-word'")&&v8.includes('out.ayahText=v8SafeText(x.ayahText,1200)')&&v8.includes("'custom'"),'custom Quran annotations are not sanitizer-safe');
ok(teacher.includes('buildSnapshotCanvas')&&teacher.includes('navigator.share')&&teacher.includes("type:'image/png'"),'annotated PNG Web Share path missing');
ok(css.includes('.qmark-custom-entry')&&css.includes('.qmark-share')&&css.includes('background:#fff0ea!important')&&css.includes('color:#71301f!important'),'high-contrast/custom controls missing');
for(const id of ['tahfeezFrom','tahfeezTo','tahfeezSingle','tahfeezGroupFrom','tahfeezGroupTo']){
  const re=new RegExp(`id="${id}"[^>]*type="number"[^>]*inputmode="numeric"`);ok(re.test(tahHtml),`${id} is not a typed numeric input`);
}
ok(tahJs.includes('setAyahNumberInput')&&!tahJs.includes("$('tahfeezFrom').innerHTML=optionRows"),'numeric ayah input logic not active');
ok(tahCss.includes('.tahfeez-ayah.playing>span')&&tahCss.includes('color:#103d2d!important')&&tahCss.includes('background:#dff2e7!important'),'current ayah contrast fix missing');
ok(app.includes('${esc(j)} (${i+1})'),'Juz dropdown number label missing');
ok(v10.includes('${parsed.juzName} (${j}) —')&&v10.includes('${it.juzName} (${j}) —'),'Juz review labels do not include number');
ok(sw.includes("quran-pwa-v11.2.0-error1.1")&&sw.includes("uiStage:'11.2-error-marking-1.1'"),'service worker hotfix cache/version missing');
console.log('Interactive error marking Stage 1.1 hotfix checks passed');
