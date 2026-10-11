'use strict';
const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m);}
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const auth=fs.readFileSync('auth.js','utf8');
ok(app.includes('whatsapp://send?phone=${phone}&text=${text}'),'Android/offline WhatsApp must use the native URI scheme');
ok(app.includes("android||navigator.onLine===false"),'native WhatsApp handoff must be selected on Android or offline');
ok(app.includes('سيتم الإرسال عند توفر الإنترنت'),'offline WhatsApp UX should explain that final delivery waits for connectivity');
ok(!html.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"'),'blocking Supabase CDN script must stay removed');
ok(auth.indexOf("if(navigator.onLine===false)")<auth.indexOf('const libReady=await ensureSupabaseLibrary()'),'trusted offline decision must happen before loading Supabase');
console.log('offline-whatsapp-check: PASS');
