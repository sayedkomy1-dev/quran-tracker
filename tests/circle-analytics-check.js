'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(cond,msg){if(!cond)throw new Error(msg);}

const feature=read('js/features/circle-analytics.js'),html=read('index.html'),sw=read('sw.js'),css=read('v10.css'),pkg=JSON.parse(read('package.json'));
new vm.Script(feature,{filename:'circle-analytics.js'});
assert(pkg.version==='10.10.0','package version must be 10.10.0');
assert(html.includes('id="pg-analytics"')&&html.includes('تحليلات وتقارير الحلقة'),'analytics page missing');
assert(html.includes('circle-analytics.js?v=10.10.0'),'analytics script missing from HTML');
assert(sw.includes("'./js/features/circle-analytics.js?v=10.10.0'"),'analytics feature missing from offline shell');
assert(feature.includes('function v109Analyze')&&feature.includes('function v109WeakItems'),'analytics core helpers missing');
assert(feature.includes('v109ExportCSV')&&feature.includes('v109Print')&&feature.includes('v109CopySummary')&&feature.includes('v109ShareSummary'),'report actions missing');
assert(css.includes('.v109-kpis')&&css.includes('.v109-table')&&css.includes('.v109-weak-list'),'analytics styles missing');

const now=Date.now(),day=86400000;
const context={
  console,Date,Math,Number,String,Object,Array,Set,Map,JSON,
  setTimeout:()=>0,clearTimeout:()=>{},
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelectorAll:()=>[]},
  students:[
    {id:'s1',name:'متحسن',studentStatus:'active',group:' A '},
    {id:'s2',name:'يحتاج متابعة',studentStatus:'active',group:'A'},
    {id:'s3',name:'حلقة ب',studentStatus:'active',group:'B'},
    {id:'s4',name:'متوقف',studentStatus:'paused',group:'A'}
  ],
  sessions:[
    {studentId:'s1',status:'حضر',date:new Date(now-2*day).toISOString(),assessmentScores:{new:95},prevGrades:{new:'ممتاز'},actualRecitation:{new:{surah:'البقرة',from:1,to:5}}},
    {studentId:'s2',status:'حضر',date:new Date(now-3*day).toISOString(),assessmentScores:{new:55},prevGrades:{new:'يحتاج متابعة'},actualRecitation:{new:{surah:'آل عمران',from:1,to:5}},reviewResults:[{items:[{label:'الربع الأول',score:80,grade:'إعادة',status:'repeat'}]}]},
    {studentId:'s2',status:'غاب',date:new Date(now-1*day).toISOString()},
    {studentId:'s3',status:'حضر',date:new Date(now-2*day).toISOString(),assessmentScores:{new:80},prevGrades:{new:'جيد جداً'},actualRecitation:{new:{surah:'النساء',from:1,to:5}}},
    {studentId:'s4',status:'حضر',date:new Date(now-2*day).toISOString()}
  ],
  settings:{circle:'حلقة الاختبار'},
  ImamApp:{StudentProgress:{calculate:(id)=>({
    s1:{present:[1],absent:[],mastery:90,attendance:100,repeats:0,newAyat:20,trend:{delta:10,label:'تحسن +10',cls:'up'},gradeCounts:{'ممتاز':2,'جيد جداً':0,'جيد':0,'ضعيف':0,'إعادة':0}},
    s2:{present:[1],absent:[1],mastery:60,attendance:50,repeats:2,newAyat:10,trend:{delta:-10,label:'تراجع -10',cls:'down'},gradeCounts:{'ممتاز':0,'جيد جداً':0,'جيد':0,'ضعيف':1,'إعادة':1}},
    s3:{present:[1],absent:[],mastery:80,attendance:100,repeats:0,newAyat:8,trend:{delta:0,label:'مستقر',cls:'neutral'},gradeCounts:{'ممتاز':0,'جيد جداً':1,'جيد':0,'ضعيف':0,'إعادة':0}}
  }[id]||null)}},
  globalThis:null
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(feature,context,{filename:'circle-analytics.js'});
const a=context.ImamApp.CircleAnalytics.analyze('30','A');
assert(a.students.length===2,'group analytics must trim group names and include active students in the chosen group only');
assert(a.mastery===75,'circle mastery must be student-balanced (90 and 60 => 75)');
assert(a.attendance===67,'circle attendance must exclude vacation and use present/(present+absent)');
assert(a.repeats===2&&a.newAyat===30,'repeat/new memorization totals are wrong');
assert(a.trendCounts.up===1&&a.trendCounts.down===1,'trend distribution is wrong');
assert(a.improving[0]?.st.id==='s1'&&a.declining[0]?.st.id==='s2','improvement/decline ranking failed');
assert(a.weakItems.some(x=>x.label.includes('آل عمران'))&&a.weakItems.some(x=>x.label.includes('الربع الأول')&&x.repeats===1),'weak Quran items must include explicit repeat status even when its numeric score is >=65');
assert(!a.rows.some(x=>x.studentId==='s4'),'paused student sessions must not enter circle analytics');
console.log('Circle analytics & reports checks passed for v10.10.0');
