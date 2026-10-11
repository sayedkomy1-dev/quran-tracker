const fs=require('fs');
const js=fs.readFileSync('js/features/guardian-tahfeez.js','utf8');
const css=fs.readFileSync('guardian-tahfeez.css','utf8');
const html=fs.readFileSync('guardian-portal.html','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(js.includes('role="button" tabindex="0" class="tahfeez-ayah'),'Quran ayah wrappers must not use native button geometry');
ok(!js.includes('`<button type="button" class="tahfeez-ayah'),'native tahfeez ayah buttons still present');
ok(css.includes('mobile Quran reader geometry fix')&&css.includes('min-height:0!important')&&css.includes('appearance:none'),'mobile blank-area geometry fix missing');
ok(html.includes('guardian-tahfeez.css?v=11.2.0-s1.1')&&html.includes('guardian-tahfeez.js?v=11.2.0-s1.1'),'guardian tahfeez cache-busted assets missing');
console.log('Guardian Tahfeez mobile layout checks passed');
