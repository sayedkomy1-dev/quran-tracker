'use strict';
const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m);}
const sw=fs.readFileSync('sw.js','utf8'),app=fs.readFileSync('app.js','utf8');
ok(sw.includes("quran-pwa-v10.10.0-s5.4"),'Stage 5.4 cache generation missing');
ok(sw.includes('async function fetchWithTimeout'),'service-worker network timeout missing');
ok(sw.includes('if(cached){event.waitUntil(refreshSameOrigin(cache,req));return cached;}'),'code assets must be cache-first');
ok(sw.includes("if(req.mode==='navigate')")&&sw.includes('if(cached){'),'navigation must prefer cached shell');
ok(!sw.includes('networkFirstSameOrigin(req)'),'blocking network-first code path must be removed');
ok(app.includes("document.addEventListener('DOMContentLoaded'"),'app boot must not wait for window load');
ok(app.includes('globalThis.__wlqAppStarted'),'boot must be idempotent');
console.log('offline-instant-shell-check: PASS');
