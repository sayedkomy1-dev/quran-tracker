#!/usr/bin/env node
/* Developer-only local packer for a rights-cleared download.
   The project intentionally contains NO third-party tafsir texts. */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const names=new Set(['التفسير الميسر','تفسير السعدي','تفسير ابن كثير','تفسير الطبري','تفسير القرطبي','تفسير البغوي','تفسير الجلالين','تفسير الوسيط']);
const [source,target,book,...flags]=process.argv.slice(2);
if(!source||!target||!book||!names.has(book)||!flags.includes('--rights-cleared')){
 console.error('Usage: node scripts/pack-imam-tafsir.mjs INPUT_DIRECTORY OUTPUT_DIRECTORY "التفسير الميسر" --rights-cleared');
 console.error('Do NOT distribute generated files without verified rights from the actual rights holders.');
 process.exit(2);
}
const appSource=await readFile(new URL('../app.js',import.meta.url),'utf8');
const surahData=/const S=\[([\s\S]*?)\];\s*const JZ=/.exec(appSource);
if(!surahData)throw Error('Cannot locate the project Quran structural reference');
const officialCounts=Array.from(surahData[1].matchAll(/\{n:\"[^\"]+\",a:(\d+)\}/g),m=>Number(m[1]));
if(officialCounts.length!==114||officialCounts.reduce((a,b)=>a+b,0)!==6236)throw Error('Project Quran reference totals differ from expected');
const files=(await readdir(source)).filter(x=>/^\d{3}_.+\.json$/i.test(x)).sort();
if(files.length!==114)throw Error(`Expected 114 surah files, found ${files.length}`);
await mkdir(target,{recursive:true});
let count=0,covered=0,empty=0;const chapters=[];
for(const file of files){
 const raw=await readFile(join(source,file));const json=JSON.parse(raw.toString('utf8'));
 const ch=Number(json.number);
 if(Number(file.slice(0,3))!==ch)throw Error(`Filename/chapter mismatch in ${file}`);
 if(!Number.isInteger(ch)||ch<1||ch>114||!Array.isArray(json.ayahs)||!json.ayahs.length)throw Error(`Malformed chapter in ${file}`);
 if(chapters.some(x=>x.chapter===ch))throw Error(`Duplicate chapter ${ch}`);
 const used=new Set(),ayahs=[];
 for(const ay of json.ayahs){
   const n=Number(ay.ayah_number);
   if(!Number.isInteger(n)||n<1||n>286||used.has(n)||typeof ay.text!=='string'||!Array.isArray(ay.tafsir))throw Error(`Malformed ayah in ${file}`);
   used.add(n);const matches=ay.tafsir.filter(t=>t.type===book||(book==='تفسير الوسيط'&&['تفسير الوسيط لطنطاوي','تفسير الوسيط للطنطاوي','التفسير الوسيط للطنطاوي'].includes(t.type)));
   if(matches.length>1)throw Error(`Duplicate tafsir for chapter ${ch} verse ${n}`);
   if(typeof matches[0]?.text==='string'&&matches[0].text.trim())covered++;else empty++;
   ayahs.push({ayah_number:n,text:ay.text,tafsir:matches});
 }
 if(used.size!==officialCounts[ch-1]||Math.max(...used)!==officialCounts[ch-1])throw Error(`Surah ${ch} count or ayah numbering differs from the project Quran reference`);
 count+=ayahs.length;
 const minimal=Buffer.from(JSON.stringify({surah:json.surah,number:ch,ayahs}));
 const packed=gzipSync(minimal,{level:9});const filename=`${String(ch).padStart(3,'0')}_tafsir.json.gz`;
 await writeFile(join(target,filename),packed);
 chapters.push({chapter:ch,ayahs:ayahs.length,packedBytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex')});
}
if(count!==6236)throw Error(`Ayah sum is ${count} not 6236. The generated files must not be treated as complete.`);
const manifest={format:'imam-science-prep-v1',source:'meibassam/mosahaf-tafseer',book,chapters:chapters.sort((a,b)=>a.chapter-b.chapter),surahCount:114,ayahCount:count,covered,empty,provenance:'upstream automated aggregation',quranTextMatched:false,scholarlyVerified:false,rightsStatus:'operator declared, not programmatically verified'};
await writeFile(join(target,'audit-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({surahCount:114,ayahCount:count,covered,empty,compressedBytes:chapters.reduce((a,x)=>a+x.packedBytes,0)},null,2));
