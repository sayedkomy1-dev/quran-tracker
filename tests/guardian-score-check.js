const fs=require('fs');
function assert(c,m){if(!c){console.error('FAIL:',m);process.exit(1);}}
const v10=fs.readFileSync('v10.js','utf8');
const v8=fs.readFileSync('v8.js','utf8');
const css=fs.readFileSync('v10.css','utf8');
assert(v10.includes('assessmentScores:{}'),'teacher score state missing');
assert(v10.includes('function setAssessmentScore(')&&v10.includes('function setReviewItemScore('),'teacher percentage entry handlers missing');
assert(v10.includes('type="number" min="0" max="100"'),'0-100 numeric score input missing');
assert(v10.includes('يكتبها المحفظ من 100'),'teacher-entered score guidance missing');
assert(v10.includes('d.assessmentScores=Object.fromEntries'),'session score persistence missing');
assert(v10.includes('score:v1061ScoreValue(it.score)'),'item-level review score persistence missing');
assert(v10.includes('v1061AssessmentScores'),'draft score persistence missing');
assert(v10.includes("'🟩'.repeat(filled)")&&v10.includes("'⬜'.repeat(10-filled)"),'WhatsApp progress bar generation missing');
assert(v10.includes('v1061ScoreBar(n,true)'),'WhatsApp score bar must include the exact /100 value');
assert(v10.includes('━━━━━━━━━━━━━━━━━━')&&v10.includes('📖 *التكليف للحصة القادمة*'),'sectioned guardian report missing');
assert(v8.includes('raw.assessmentScores')&&v8.includes("['new','rec','far','juz','surahReview']"),'portable import must preserve teacher-entered percentages');
assert(css.includes('.v1061-score-box')&&css.includes('.v1061-score-preview'),'score entry UI styling missing');
console.log('guardian score/report checks passed for v10.6.1');
