const fs=require('fs');
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
for(const needle of ['quran-pwa-v11.2.0-error1','ignoreSearch:true','canonicalRequest','matchLocalAsset']){if(!sw.includes(needle))throw new Error('missing '+needle)}
if(!html.includes('wlqCriticalOfflineStyle'))throw new Error('missing inline critical offline style');
console.log('offline style fallback check: PASS');
