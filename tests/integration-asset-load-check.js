'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const required=['js/features/student-progress.js','js/features/quran-coverage-progress.js','js/features/imam-makeup-agenda.js','js/features/imam-teaching-insights.js','js/features/teacher-followup.js','js/features/integrated-teacher-brief.js','js/features/imam-absence-makeup.js'];
let n=0;
for(const rel of required){const escaped=rel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rx=new RegExp(`<script\\s+src="${escaped}\\?[^"<>]+"\\s+defer><\\/script>`,'g');const found=[...html.matchAll(rx)];assert.equal(found.length,1,`exactly one well-formed script for ${rel}, got ${found.length}`);assert(fs.existsSync(path.join(root,rel)));n++;}
for(const rel of ['quran-coverage-progress.css','imam-makeup-agenda.css','imam-teaching-insights.css']){assert(html.includes(`<link rel="stylesheet" href="${rel}?`));assert(fs.existsSync(path.join(root,rel)));n++;}
assert(!/src="[^"<>]+"\s*\n\s*<script\b/.test(html),'malformed script declaration found');n++;
for(const rel of ['imam-makeup-agenda.css','js/features/imam-makeup-agenda.js','js/features/imam-teaching-insights.js','imam-teaching-insights.css','quran-coverage-progress.css','js/features/quran-coverage-progress.js']){assert(sw.includes(`./${rel}?`));n++;}
assert(sw.includes("LIVE_CACHE_NAME = CACHE_NAME + '-design-bridge1'"));n++;
console.log(`OK assets declaration checks: ${n}/${n}`);
