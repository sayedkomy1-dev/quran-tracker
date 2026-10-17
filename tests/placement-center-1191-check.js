'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const S=[{n:'الفاتحة',a:7},{n:'البقرة',a:286},{n:'آل عمران',a:200}];
const JZ=Array.from({length:30},(_,i)=>`جزء ${i+1}`);
const app={State:{students:[]},QuranStructure:{hizbLabel:(j,h)=>`الحزب ${h} في ${j}`,quarterLabel:(j,q)=>`الربع ${q} في ${j}`},RevisionQuranText:{segments:(j,r)=>[{surah:'البقرة',chapter:2,from:(j-1)*8+r,to:(j-1)*8+r} ]},RecitationCarry:{normalizeGrade:x=>x==='جيد جدًا'?'جيد جداً':x,isPassingGrade:x=>['ممتاز','جيد جداً','جيد'].includes(x)}};
const sandbox={ImamApp:app,S,JZ,console,globalThis:null,module:{exports:{}},setTimeout:()=>{}};
sandbox.globalThis=sandbox;
vm.runInNewContext(read('js/features/placement-center-1191.js'),sandbox,{filename:'placement-center-1191.js'});
const api=app.PlacementCenter;
assert.equal(api.allFor('surah').length,S.length);
assert.equal(api.allFor('juz').length,30);
assert.equal(api.allFor('hizb').length,60);
assert.equal(api.allFor('quarter').length,240);
assert.equal(api.items('quarter',4).length,8);
assert.equal(api.items('hizb',4).length,2);
for(const grade of ['ممتاز','جيد جداً','جيد'])assert.equal(api.statusFor(grade),'completed');
for(const grade of ['ضعيف','إعادة'])assert.equal(api.statusFor(grade),'repeat');
assert.equal(api.statusFor(''),'not_heard');
const unit=api.allFor('juz')[0];
let assessed=new Map([['quarter:1',{grade:'ممتاز',status:'completed'}]]);
assert.equal(api.summaryFor(unit,assessed).status,'partial','A single quarter must not pass a whole juz');
for(let i=2;i<=8;i++)assessed.set(`quarter:${i}`,{grade:'جيد',status:'completed'});
assert.equal(api.summaryFor(unit,assessed).status,'completed','All eight quarter grades can summarize a part');
assessed.set('quarter:8',{grade:'إعادة',status:'repeat'});
assert.equal(api.summaryFor(unit,assessed).status,'repeat','Repeats should affect the aggregate');
const hizb=api.allFor('hizb')[0];
assert.equal(api.normalizedSegments(hizb).length,1,'Contiguous same-surah ranges should coalesce');
const st={placementAssessments:[{id:'a',unitKey:'surah:1',grade:'ضعيف',at:'2026-10-01T10:00:00Z'},{id:'b',unitKey:'surah:1',grade:'جيد جداً',at:'2026-10-16T10:00:00Z'}]};
assert.equal(api.latestResults(st).get('surah:1').grade,'جيد جداً','Latest attempt should win without deleting prior history');
assert.equal(api.summaryFor({key:'surah:2',category:'surah'},api.latestResults(st)).status,'not_heard');
const html=read('index.html'),sw=read('sw.js');
for(const asset of ['placement-center-1191.js?v=11.9.1','placement-center-1191.css?v=11.9.1']){
  assert(html.includes(asset));assert(sw.includes(`'./${asset.startsWith('placement-center-1191.js')?'js/features/':''}${asset}'`));
}
assert(read('js/features/session-intelligence-119.js').includes('playGuardianWarning(e.outstanding.length>0)'));
assert(read('js/features/session-intelligence-119.js').includes('im119AudioEnabled'));
// Auditory warning must be opt-out and triggered synchronously by user click.
const pitches=[];let muted=false;
class FakeContext{
  constructor(){this.currentTime=0;this.destination={};}
  createOscillator(){return{type:'sine',frequency:{value:0},connect(){return this},start(t){pitches.push(t)},stop(){}}}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this}}}
  close(){return Promise.resolve()}
}
const audioApp={};
const audioSandbox={globalThis:null,ImamApp:audioApp,AudioContext:FakeContext,localStorage:{getItem(){return muted?'off':'on'}},setTimeout(){},console};
audioSandbox.globalThis=audioSandbox;
vm.runInNewContext(read('js/features/session-intelligence-119.js'),audioSandbox);
assert.equal(audioApp.SessionIntelligence.playGuardianWarning(true),true);
assert.equal(pitches.length,3,'Incomplete guardian message should sound three alert notes');
assert.equal(audioApp.SessionIntelligence.playGuardianWarning(false),true);
assert.equal(pitches.length,5,'A complete report should also have an audible pre-send alert');
muted=true;assert.equal(audioApp.SessionIntelligence.playGuardianWarning(true),false);assert.equal(pitches.length,5,'Mute choice should prevent sound');
console.log('PASS placement-center-1191: division, exact grading, no false passes, retry history, assets, guardian sound/mute');
