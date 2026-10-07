const fs=require('fs');
const v10=fs.readFileSync('v10.js','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(v10.includes("'■'.repeat(filled)")&&v10.includes("'□'.repeat(10-filled)"),'compact score squares missing');
assert(!v10.includes("'🟩'.repeat(filled)"),'large emoji score squares must not remain');
assert(v10.includes("reviewBlocks.join('\\n────\\n')"),'item review spacing is not compact');
assert(v10.includes('`\\n──────\\n${label}`'),'main assessment spacing is not compact');
assert(v10.includes('assessmentScores'),'teacher-entered score persistence contract missing');
console.log('guardian-report-polish-check: PASS');
