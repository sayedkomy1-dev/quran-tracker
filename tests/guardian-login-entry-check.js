const fs=require('fs');
function must(cond,msg){if(!cond)throw new Error(msg);}
const auth=fs.readFileSync('auth.js','utf8');
const css=fs.readFileSync('auth.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
must(auth.includes('id="wlqGuardianLogin"'),'guardian entry link missing from auth gate');
must(auth.includes('href="guardian-login.html"'),'guardian entry does not point to guardian-login.html');
must(auth.includes('guardian:true'),'guardian entry is not enabled for logged-out gate');
must(css.includes('.wlq-guardian-btn'),'guardian login button styles missing');
must(sw.includes('quran-pwa-v11.2.0-error1'),'service-worker cache was not bumped for hotfix/navigation/offline stage');
console.log('guardian-login-entry-check PASS');
