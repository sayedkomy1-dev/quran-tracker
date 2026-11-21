// A deterministic guard for the initial HTML-linked payload, not a speed benchmark.
import fs from 'node:fs';import zlib from 'node:zlib';
const html=fs.readFileSync('index.html','utf8');
const resources=[...html.matchAll(/(?:src|href)="([^"#]+(?:\.js|\.css)(?:\?[^\"]*)?)"/g)].map(x=>x[1].split('?')[0]);
const seen=new Set();const sums={js:0,css:0};let count=0;
for(const p of resources){if(seen.has(p)||p.startsWith('http'))continue;seen.add(p);
 if(!fs.existsSync(p))throw Error('HTML asset missing: '+p);
 const type=p.endsWith('.js')?'js':p.endsWith('.css')?'css':null;
 if(type){sums[type]+=zlib.gzipSync(fs.readFileSync(p)).length;count++;}
}
const limits={js:850*1024,css:250*1024};
for(const type of Object.keys(sums)){const kb=Math.round(sums[type]/1024);console.log(`${type}: ${kb} KiB gzip / limit ${Math.round(limits[type]/1024)} KiB`);if(sums[type]>limits[type])process.exitCode=1;}
console.log(`${count} local linked JS/CSS assets (not a measured network-load time)`);
