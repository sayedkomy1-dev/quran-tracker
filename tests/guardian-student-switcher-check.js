const fs=require('fs');
const html=fs.readFileSync('guardian-portal.html','utf8');
const js=fs.readFileSync('js/features/guardian-portal-view.js','utf8');
const css=fs.readFileSync('guardian-portal.css','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg)}
assert(html.includes('portalStudentChoices'),'student choices container missing');
assert(!html.includes('id="portalStudentSelect"'),'legacy native student select should be removed');
assert(js.includes('data-student-index'),'student choice data index missing');
assert(js.includes("addEventListener('click'"),'student choice click handler missing');
assert(js.includes('selectSessionStudent(btn.dataset.studentIndex)'),'student switching handler is not wired');
assert(css.includes('.portal-student-choice.active'),'active student button styling missing');
console.log('guardian-student-switcher-check: PASS');
