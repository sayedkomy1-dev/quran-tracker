'use strict';
// Maintenance regression coverage: never silently lose issued certificates,
// archive states or academic progress during an export/import round trip.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const source=app.slice(app.indexOf('function cleanText('),app.indexOf('function importData('));
assert(source.includes('function sanitizeBackupData('));
const ctx={console,Date,Math,Set,Map,S:[{n:'الفاتحة',a:7}],GRADE_MAP:{'ممتاز':4},
  makeId:()=>`generated-${Date.now()}`,clampSection:x=>x,
  normalizeJuzChip:x=>x,normalizeSurahReviewChip:x=>x};
ctx.globalThis=ctx;
vm.runInNewContext(source+'\nglobalThis.clean= sanitizeBackupData;',ctx);
const cert={id:'IMAM-2026-A1B2C3',studentName:'طالب مؤرشف',kind:'surah',subject:'1',title:'حفظ سورة',
 label:'سورة الفاتحة',evidence:'7 آيات مجتازة',issuedAt:'2026-10-10T10:00:00.000Z',
 teacher:'معلم',academy:'أكاديمية الإمام',version:1,approvedByTeacher:true,proofMode:'verified-recitation',proofCount:7};
const data={students:[{id:'st001',name:'طالب مؤرشف',studentStatus:'archived',achievementCertificates:[cert,
 {...cert,id:'',kind:'fake'},{...cert,id:'IMAM-BAD',kind:'surah',note:'<img src=x onerror=alert(1)>'}]}],sessions:[],tasks:[]};
const clean=ctx.clean(data);
assert.equal(clean.students.length,1);
assert.equal(clean.students[0].studentStatus,'archived','archive state must survive backup');
assert.equal(clean.students[0].achievementCertificates.length,2,'invalid achievements discarded');
assert.equal(clean.students[0].achievementCertificates[0].id,cert.id);
assert.equal(clean.students[0].achievementCertificates[0].proofCount,7);
assert.equal(clean.students[0].achievementCertificates[1].note,'<img src=x onerror=alert(1)>','keep data as text; rendering must escape');
assert.equal(clean.students[0].achievementCertificates[0].approvedByTeacher,true);
assert.equal(ctx.clean({students:[{id:'st002',name:'حالي'}],sessions:[],tasks:[]}).students[0].studentStatus,undefined,
  'legacy students remain active by default');
const src=read('js/features/progress-bridge-1111.js');
const g={Date,Math,Map,Set,console,crypto:webcrypto,TextEncoder,
 ImamApp:{GuardianPortal:{studentRef:async sid=>'a'.repeat(64)},State:{students:[],sessions:[]}}};
g.globalThis=g;
vm.runInNewContext(src,g);
const bridge=g.ImamApp.ProgressBridge;
const roster=[{id:'st001',name:'test'},{id:'st002',name:'other'}];
const valid={id:'s1',studentId:'st001',sessionDate:'2026-10-15',date:'invalid legacy timestamp',status:'حضر',
 prevGrades:{rec:'جيد جدًا'},teacher119:{extra:[]},recitationErrors:[]};
const malformed={...valid,id:'bad-date',sessionDate:'2026-02-31'};
const stale={...valid,id:'bad-source',date:'not a date',updatedAt:'not a timestamp'};
assert.equal(bridge.safelyPublishable([valid,malformed,stale],roster).length,2,
 'reject impossible dates but support valid legacy date-only sessions');
// Local midnight is already the 18th while UTC is still the 17th.
// A valid local-day session must not vanish from the progress bridge.
class LocalMidnightDate extends Date {
 constructor(...args){super(...(args.length?args:['2026-10-17T22:30:00Z']));this.isNow=!args.length;}
 getFullYear(){return this.isNow?2026:super.getFullYear();}
 getMonth(){return this.isNow?9:super.getMonth();}
 getDate(){return this.isNow?18:super.getDate();}
}
const local={Date:LocalMidnightDate,Math,Map,Set,console,crypto:webcrypto,TextEncoder,ImamApp:{GuardianPortal:{studentRef:async()=> 'a'.repeat(64)},State:{students:[],sessions:[]}}};
local.globalThis=local;vm.runInNewContext(src,local);
assert.equal(local.ImamApp.ProgressBridge.safelyPublishable([{...valid,id:'local',sessionDate:'2026-10-18',date:'2026-10-18'}],roster).length,1,
 'allow a valid local-day session before UTC midnight');
(async()=>{
 const rows=await bridge.makeBatch([valid,malformed,stale],roster,'teacher1');
 assert.equal(rows.length,2,'one bad session cannot poison the whole upload');
 assert.equal(rows[0].grade,'جيد جداً','alternate Arabic spelling normalized');
 assert.match(rows[0].updated_at,/^2026-10-15T/);
 assert.match(rows[0].session_ref,/^[0-9a-f]{64}$/);
 const exams=read('js/features/academic-exams-1111.js');
 const c={Date,Math,Map,Set,console,ImamApp:{State:{students:[],sessions:[]}}};c.globalThis=c;
 vm.runInNewContext(exams,c);
 assert.equal(c.ImamApp.AcademicExams.weekBounds('2025-W53'),null,'nonexistent ISO week rejected');
 assert.equal(c.ImamApp.AcademicExams.weekBounds('2020-W53')[0],'2020-12-28');
 assert.equal(c.ImamApp.AcademicExams.contactEvent(null,'2026-10','confirmed_sent').ok,false);
 console.log('PASS 11.11.1 backup certificate/archive preservation, safe academic progress and ISO week validation');
})().catch(e=>{console.error(e);process.exitCode=1;});
