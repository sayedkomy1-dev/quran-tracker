'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1);}console.log('PASS:',msg);}
const code=fs.readFileSync(path.join(root,'js/features/smart-revision.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const portal=fs.readFileSync(path.join(root,'guardian-portal.html'),'utf8');
const share=fs.readFileSync(path.join(root,'js/features/guardian-portal-share.js'),'utf8');
const view=fs.readFileSync(path.join(root,'js/features/guardian-portal-view.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
ok(index.includes('js/features/smart-revision.js?v=11.3.0-s1'),'teacher shell loads Smart Revision');
ok(index.includes('smart-revision.css?v=11.3.0-s1'),'teacher shell loads Smart Revision CSS');
ok(portal.includes('id="portalSmartRevision"')&&portal.includes('smart-revision.css?v=11.3.0-s1'),'guardian portal has Smart Revision card');
ok(share.includes('smartRevision:')&&share.includes('SmartRevision?.buildGuardian'),'guardian snapshot contains smart revision data');
ok(view.includes('renderSmartRevision(data)')&&view.includes("origin:'smart_revision'"),'guardian renderer exposes smart-review practice bridge');
ok(sw.includes("quran-pwa-v11.3.0-smart-revision1")&&sw.includes("'./js/features/smart-revision.js?v=11.3.0-s1'")&&sw.includes("'./smart-revision.css?v=11.3.0-s1'"),'service worker caches Smart Revision assets');
const sessions=[
 {studentId:'s1',status:'حضر',sessionDate:'2026-10-10',recitationErrors:[{source:'quran-word',surahId:6,surah:'الأنعام',ayah:35,wordIndex:1,word:'اعتراضهم',type:'نطق حرف',group:'pronunciation',resolved:false,mode:'recitation'}]},
 {studentId:'s1',status:'حضر',sessionDate:'2026-10-11',recitationErrors:[{source:'quran-word',surahId:6,surah:'الأنعام',ayah:35,wordIndex:1,word:'اعتراضهم',type:'نطق حرف',group:'pronunciation',resolved:true,mode:'review'}]},
 {studentId:'s1',status:'حضر',sessionDate:'2026-10-11',recitationErrors:[{source:'quran-word',surahId:6,surah:'الأنعام',ayah:40,wordIndex:2,word:'أنكم',type:'تردد',group:'memory',resolved:false,mode:'recitation'}]}
];
const document={readyState:'loading',addEventListener(){},getElementById(){return null;}};
const ctx={console,Date,Intl,document,setTimeout(){},globalThis:null};ctx.globalThis=ctx;ctx.ImamApp={State:{sessions,students:[{id:'s1',name:'محمد'}]},Utils:{escapeHtml:x=>String(x)}};vm.createContext(ctx);vm.runInContext(code,ctx);
const engine=ctx.ImamApp.SmartRevision;ok(engine&&typeof engine.buildNotebook==='function','Smart Revision engine exports notebook API');
const book=engine.buildNotebook('s1',new Date('2026-10-12T12:00:00'));
const resolved=book.find(x=>x.word==='اعتراضهم'),due=book.find(x=>x.word==='أنكم');
ok(resolved&&resolved.occurrences===2&&resolved.repeated&&resolved.lastResolved,'repeated corrected location is aggregated persistently');
ok(resolved.dueDate==='2026-10-14','resolved location uses 3-day first spaced interval');
ok(due&&due.dueDate==='2026-10-12'&&due.status==='today'&&due.unresolved,'unresolved location becomes due next day');
const gd=engine.buildGuardian('s1');ok(gd&&Array.isArray(gd.today)&&Number.isInteger(gd.dueCount),'guardian revision payload is bounded and structured');
console.log('Smart Revision Stage 1 checks complete.');
