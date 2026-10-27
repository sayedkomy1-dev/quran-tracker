'use strict';
// Scoped feature contract: actual phone/production acceptance remains separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const html=read('index.html'),board=read('js/features/imam-smart-board.js'),js=read('js/features/teacher-quran-range-picker.js'),sw=read('sw.js');
for(const key of ['new','rec','far'])assert(html.includes(`ia27OpenAssignmentText('${key}')`),key+' has text button');
assert(html.includes('ia27OpenAssessmentText()'),'assessment reader entry');
assert(html.includes("ia27OpenReviewListText('juz')"),"juz header text entry");
assert(html.includes("ia27OpenReviewListText('surah')"),"surah header text entry");
assert(html.includes('v1181OpenJuzChipText')||read('v10.js').includes('v1181OpenJuzChipText'),'juz reader still present');
assert(html.includes('v1181OpenSurahReviewChip')||read('app.js').includes('v1181OpenSurahReviewChip'),'surah review reader still present');
assert(js.includes('to:s.max'),'new range must show to end of surah, not selected endpoint');
assert(js.includes("e.target.closest('.quran-ayah-num, .ia27-choose-end')"),'clicking ayah number explicitly chooses endpoint');
assert(js.includes("dispatchEvent(new Event('change'"),'form updated without official save');
assert(board.includes('loadStudentAssignmentOnBoard()'),'board loads current student task');
assert(board.includes("if(current&&visibleStudents().some"),'board opened in lesson chooses selected student');
assert(board.includes('activeAssignment(label)'),'board prefers saved new/near/far assignment');
assert(board.includes('Math.min(range.to,range.from+100)'),'board safe length retained');
for(const file of ['js/features/teacher-quran-range-picker.js','teacher-quran-range-picker.css']){
 assert(html.includes(file+'?v=11.12.1-beta.27-quran-picker-hotfix2'),'new asset in HTML '+file);
 assert(sw.includes("'./"+file+'?v=11.12.1-beta.27-quran-picker-hotfix2\''),'new asset in offline shell '+file);
}
const S=[{n:'الفاتحة',a:7},{n:'البقرة',a:286}];
const values={'new-s':'الفاتحة','new-f':'3','new-t':'','new-full':false,'rec-s':'البقرة','rec-f':'10','rec-t':'','rec-full':false};
const context={S,globalThis:null,document:{readyState:'loading',addEventListener(){},getElementById(id){return id in values?{value:values[id],checked:values[id]}:null;}},ImamApp:{}};context.globalThis=context;
vm.runInNewContext(js,context);
const p=context.ImamApp.QuranRangePicker;
assert.equal(p.snapshot('new').from,3);assert.equal(p.snapshot('new').to,null);assert.equal(p.snapshot('new').max,7);
assert.equal(p.snapshot('rec').from,10);assert.equal(p.snapshot('rec').to,null);assert.equal(p.snapshot('rec').max,286);
assert.equal(p.snapshot('far'),null);
console.log('PASS beta27 Quran text chooser, sections, board task, read-to-surah-end, offline references');
