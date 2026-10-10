const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const login=fs.readFileSync(path.join(root,'guardian-login.js'),'utf8');
const share=fs.readFileSync(path.join(root,'js/features/guardian-portal-share.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function ok(v,m){if(!v)throw new Error(m);}
ok(login.includes('/[٠-٩]/g')&&login.includes('/[۰-۹]/g'),'guardian login Arabic digit normalization missing');
ok(login.includes('normalizePin(pin.value)'),'PIN input normalization missing');
ok(login.includes("p_pin:pinValue"),'normalized PIN not sent to RPC');
ok(share.includes('/[٠-٩]/g')&&share.includes('/[۰-۹]/g'),'teacher phone Arabic digit normalization missing');
ok(/quran-pwa-v10\.10\.0-s3\.[2-9]/.test(sw),'cache generation not bumped');
console.log('guardian-arabic-digits-check: PASS');
