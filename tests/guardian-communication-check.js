const fs=require('fs');
function assert(c,m){if(!c){console.error('FAIL:',m);process.exit(1);}}
const js=fs.readFileSync('js/features/guardian-communication.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');
assert(js.includes("mode:'session'")&&js.includes("mode==='absence'")&&js.includes("mode==='assignment'")&&html.includes('data-guardian-mode="custom"'),'four guardian message modes missing');
assert(js.includes("setBroadcastRecipients('absent')")||html.includes("setBroadcastRecipients('absent')"),'absent-today recipient scope missing');
assert(html.includes('id="guardianGroup"')&&js.includes("mode==='group'"),'group recipient scope missing');
assert(js.includes('/^20\\d{10}$/')&&html.includes('guardianInvalidCount'),'phone validation and invalid counter missing');
assert(html.includes('guardianPreviewStudent')&&js.includes('guardianMessage(st)'),'personalized preview missing');
assert(js.includes('openWhatsApp(st,text)')&&html.includes('الإرسال النهائي يدوي'),'manual WhatsApp handoff guarantee missing');
assert(js.includes('buildWAMsg(st,ses)'),'session report must reuse detailed guardian report');
assert(js.includes('assignmentLines(ses)')&&js.includes('ملاحظة المحفظ'),'assignment reminder or teacher note missing');
assert(css.includes('.guardian-mode-grid')&&css.includes('.guardian-send-actions'),'guardian center responsive styling missing');
console.log('guardian communication check: PASS');
