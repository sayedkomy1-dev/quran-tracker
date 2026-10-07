const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
const feature=read('js/features/student-progress.js');
const html=read('index.html');
const css=read('v10.css');
const sw=read('sw.js');
new vm.Script(feature,{filename:'student-progress.js'});
assert(html.includes('id="profProgress"'),'profile progress card missing');
assert(html.includes('id="v107Range"'),'progress date-range control missing');
assert(html.includes('student-progress.js?v=10.10.0'),'progress feature is not cache-busted in HTML');
assert(sw.includes("'./js/features/student-progress.js?v=10.10.0'"),'progress feature not available offline');
assert(feature.includes("['new','الحفظ']")&&feature.includes("['rec','المراجعة القريبة']")&&feature.includes("['far','المراجعة البعيدة']"),'core mastery sections missing');
assert(feature.includes('assessmentScores')&&feature.includes('reviewResults'),'teacher-entered mastery scores are not consumed');
assert(feature.includes("score<65")&&feature.includes("grade==='إعادة'"),'stabilization/repeat logic missing');
assert(feature.includes('v107SendProgressWhatsApp'),'progress WhatsApp summary missing');
assert(css.includes('.v107-kpis')&&css.includes('.v107-grade-dist'),'dashboard responsive styling missing');

// Small runtime analytics smoke test: percentages remain teacher-entered values,
// attendance excludes vacation, and the latest weak item is surfaced.
const context={
  console,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Map,
  JSON,
  globalThis:null,
  students:[{id:'s1',name:'طالب تجريبي'}],
  sessions:[
    {id:'a',studentId:'s1',date:'2026-10-01T10:00:00Z',status:'حضر',assessmentScores:{new:80,rec:70},prevGrades:{new:'جيد جداً',rec:'جيد'},actualRecitation:{new:{surah:'الفاتحة',from:1,to:7},rec:{surah:'البقرة',from:1,to:5}}},
    {id:'b',studentId:'s1',date:'2026-10-03T10:00:00Z',status:'غاب'},
    {id:'c',studentId:'s1',date:'2026-10-04T10:00:00Z',status:'حضر',assessmentScores:{new:90},prevGrades:{new:'ممتاز'},actualRecitation:{new:{surah:'البقرة',from:6,to:10}},reviewResults:[{id:'r',items:[{id:'q1',label:'الربع الأول',score:50,grade:'ضعيف',status:'repeat'}]}]},
    {id:'d',studentId:'s1',date:'2026-10-05T10:00:00Z',status:'إجازة'}
  ],
  countUniqueAyatFromSessions:()=>12,
  document:{getElementById:()=>null,querySelectorAll:()=>[]},
  curStId:'s1'
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(feature,context,{filename:'student-progress.js'});
const result=context.ImamApp.StudentProgress.calculate('s1',Infinity);
assert(result.present.length===2&&result.absent.length===1,'attendance status filtering failed');
assert(result.attendance===67,'attendance percentage should be 2/3 rounded');
assert(result.mastery===73,'session-balanced mastery average failed');
assert(result.sectionAvgs.new===85&&result.sectionAvgs.rec===70&&result.sectionAvgs.review===50,'section mastery averages failed');
assert(result.newAyat===12,'new memorization ayah count failed');
assert(result.attention.some(x=>x.label.includes('الربع الأول')),'weak review item not surfaced for stabilization');
console.log('student-progress-check: PASS');
