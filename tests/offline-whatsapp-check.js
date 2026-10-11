'use strict';
const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m);}
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const auth=fs.readFileSync('auth.js','utf8');
ok(app.includes('const offlineComposer=`whatsapp://send?text=${text}`'),'offline WhatsApp must use the documented text composer scheme');
ok(app.includes('if(navigator.onLine===false)'),'offline WhatsApp branch missing');
ok(app.includes('window.location.href=offlineComposer'),'offline composer must be opened directly from the user gesture');
ok(app.includes('const webUrl=`https://wa.me/${phone}?text=${text}`'),'online click-to-chat must preserve recipient and text');
ok(!app.includes('whatsapp://send?phone=${phone}&text=${text}'),'unsupported offline phone parameter must not be used');
ok(app.includes('اختر ولي الأمر'),'offline UX must explain recipient selection');
ok(!html.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"'),'blocking Supabase CDN script must stay removed');
ok(auth.indexOf("if(navigator.onLine===false)")<auth.indexOf('const libReady=await ensureSupabaseLibrary()'),'trusted offline decision must happen before loading Supabase');
console.log('offline-whatsapp-check: PASS');
