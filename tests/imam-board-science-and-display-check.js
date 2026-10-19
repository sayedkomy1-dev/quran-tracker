'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const board=fs.readFileSync(path.join(root,'js/features/imam-smart-board.js'),'utf8');
const display=fs.readFileSync(path.join(root,'imam-board-display.js'),'utf8');
const css=fs.readFileSync(path.join(root,'imam-smart-board.css'),'utf8');
const cache=new Map();const messages=[];let user='teacher-A',role='teacher',status='active';
const env={Date,Math,URL,JSON,console,crypto:{randomUUID:()=>`id-${Math.random()}`},setTimeout,clearTimeout,setInterval,clearInterval,
  S:[{n:'الفاتحة',a:7}],ImamApp:{State:{students:[{id:'s1',name:'طالب تجريبي'}],sessions:[],settings:{}}},
  WeLiveQuranAuth:{getAccess:()=>({user_id:user,role,status})},
  localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},
  __IMAM_BASE__:{save:()=>true},document:{getElementById:()=>null},
  FormData:class{constructor(f){this.fields=f;}get(k){return this.fields[k]||null;}},
  toast:(msg,type)=>messages.push({msg,type})};
env.globalThis=env;
const inst=board.replace('root.SmartBoard=Object.freeze(',`root.__ScienceTest={saveScienceCard,scientificCards,selectedScienceCard,readStore,setSession:(s)=>{sessionUser=s;active=true;},setLocation:(chapter,verse,word)=>{b.chapter=chapter;b.verse=verse;b.teacherWord=word;},shareScienceCard,scienceQuiz,getPublic:()=>b.publicExplanation,getGame:()=>b.game};\nroot.SmartBoard=Object.freeze(`);
vm.runInNewContext(inst,env,{filename:'imam-smart-board.js'});
const t=env.ImamApp.__ScienceTest;t.setSession('teacher-A');t.setLocation(1,2,'الرَّحْمَٰنِ');
function card(rights='on',url='https://example.edu/reference'){return{kind:'معنى كلمة',word:'الرَّحْمَٰنِ',content:'معنى تعليمي كتبه المحفظ ويحتاج مراجعة علمية',sourceTitle:'مرجع مكتوب محدد',sourceUrl:url,rights};}
t.saveScienceCard(card(null));assert.equal(t.scientificCards().length,0,'Missing rights acknowledgement must block persistence');
t.saveScienceCard(card('on','javascript:alert(1)'));assert.equal(t.scientificCards().length,0,'Unsafe URL scheme must be rejected');
t.saveScienceCard(card());assert.equal(t.scientificCards().length,1,'Properly sourced card must be stored in teacher account');
const saved=t.selectedScienceCard();assert.equal(saved.reviewStatus,'teacher-entry','User entry must not become scientifically approved');assert.equal(saved.rightsAsserted,true);
assert.equal(saved.sourceTitle,'مرجع مكتوب محدد');
user='teacher-B';t.setSession('teacher-B');assert.equal(t.scientificCards().length,0,'Private cards must not leak to another account');
user='teacher-A';t.setSession('teacher-A');assert.equal(t.scientificCards().length,1);
status='pending';t.saveScienceCard(card());assert.equal(t.scientificCards().length,0,'Pending users must not read stored cards');
status='active';
assert(board.includes('case \'scienceShare\':shareScienceCard();'));
assert(board.includes('case \'scienceQuiz\':scienceQuiz();'));
assert(board.includes('teacher-entry')&&board.includes('لم تعتمدها الأكاديمية آليًا'));
const displayRange=display.slice(display.indexOf("const svg=document.createElementNS"),display.indexOf('host.append(svg);'));
assert(displayRange.includes("d.kind==='rectangle'")&&displayRange.includes("d.kind==='highlight'")&&displayRange.includes("d.kind==='circle'")===false&&displayRange.includes("node=document.createElementNS(ns,'ellipse')"),'Display should render shapes with correct geometry');
assert(displayRange.includes('Number(d.from)!==Number(data.from)'),'Drawings must not bleed into other Quran ranges');
assert(board.includes('Number(row.from)!==Number(b.from)'),'Teacher canvas must use identical Quran-range filtering');
assert(css.includes('ib-science-editor')&&css.includes('ib-science-consent'));
console.log('PASS board beta.4: scoped scientific cards, source/rights validation, protected screen sharing, Quran-range drawing parity');
