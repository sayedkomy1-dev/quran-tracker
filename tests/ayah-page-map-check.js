const fs=require('fs');
const path=require('path');
const file=path.join(__dirname,'..','assets','kfgqpc','ayah-page-map.json');
const d=JSON.parse(fs.readFileSync(file,'utf8'));
function assert(c,m){if(!c)throw new Error(m)}
assert(d.pageCount===604,'page count must be 604');
assert(Array.isArray(d.surahs)&&d.surahs.length===114,'must have 114 surah page maps');
assert(d.surahs.reduce((n,a)=>n+a.length,0)===6236,'must map all 6236 Hafs ayat');
assert(d.surahs[0][0]===1,'Al-Fatiha 1:1 must be page 1');
assert(d.surahs[1][0]===2,'Al-Baqarah 2:1 must be page 2');
assert(d.surahs[1][25]===5,'Al-Baqarah 2:26 must be page 5');
assert(d.surahs[1][285]===49,'Al-Baqarah 2:286 must be page 49');
console.log('KFGQPC ayah-page map checks passed: 6236 ayat / 604 pages');
