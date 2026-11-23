// Deterministic SHA-256 inventory. npm-free; supports 'write' or 'verify'.
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
const root=process.cwd();
const excluded=new Set(['.git','node_modules','SHA256SUMS.txt']);
async function files(dir=''){
  const names=await readdir(path.join(root,dir),{withFileTypes:true});
  const all=[];
  for(const entry of names){
    if(excluded.has(entry.name))continue;
    const rel=path.posix.join(dir,entry.name);
    if(entry.isDirectory())all.push(...await files(rel));
    else if(entry.isFile())all.push(rel);
  }
  return all;
}
const paths=(await files()).sort();
const lines=[];
for(const p of paths){
 const b=await readFile(path.join(root,p));
 lines.push(`${createHash('sha256').update(b).digest('hex')}  ./${p}`);
}
const expected=lines.join('\n')+'\n';
if(process.argv.includes('--write')){
 await writeFile(path.join(root,'SHA256SUMS.txt'),expected,'utf8');
 console.log(`SHA256SUMS: generated ${lines.length} file hashes`);
}else{
 const current=await readFile(path.join(root,'SHA256SUMS.txt'),'utf8');
 if(current!==expected){
  const actual=new Map(current.trimEnd().split('\n').map(line=>{const m=line.match(/^([0-9a-f]{64})  \.\/(.+)$/);return m?[m[2],m[1]]:['<invalid-line:'+line.slice(0,80)+'>',''];}));
  const expectedMap=new Map(lines.map(line=>{const split=line.indexOf('  ./');return[line.slice(split+4),line.slice(0,split)];}));
  const pathsToCheck=new Set([...actual.keys(),...expectedMap.keys()]);
  const differences=[...pathsToCheck].filter(p=>actual.get(p)!==expectedMap.get(p)).sort();
  console.error('SHA256SUMS: stale or missing content; run node scripts/release-integrity.mjs --write');
  console.error('First inventory differences ('+differences.length+' total):');
  for(const p of differences.slice(0,20))console.error('- '+p+' | expected: '+(expectedMap.get(p)||'missing')+' | actual: '+(actual.get(p)||'missing'));
  process.exitCode=1;
 }else console.log(`SHA256SUMS: verified ${lines.length} file hashes`);
}
