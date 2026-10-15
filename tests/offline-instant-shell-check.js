'use strict';
const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m);}
const sw=fs.readFileSync('sw.js','utf8'),app=fs.readFileSync('app.js','utf8');
ok(sw.includes("quran-pwa-v11.2.0-error1"),'Stage 5.5 cache generation missing');
ok(sw.includes('async function fetchWithTimeout'),'service-worker network timeout missing');
ok(sw.includes('if(cached)return cached; // opt-in update: no silent JS/CSS refresh'),'code assets remain immutable until user-confirmed update');
ok(sw.includes("if(req.mode==='navigate')")&&sw.includes('if(cached)return cached;'),'navigation must prefer cached shell');
ok(!sw.includes('networkFirstSameOrigin(req)'),'blocking network-first code path must be removed');
ok(app.includes("document.addEventListener('DOMContentLoaded'"),'app boot must not wait for window load');
ok(app.includes('globalThis.__wlqAppStarted'),'boot must be idempotent');
console.log('offline-instant-shell-check: PASS');
