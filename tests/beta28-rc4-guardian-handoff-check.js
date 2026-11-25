'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const elements={sesSt:{value:'s1'},sesDate:{value:'2026-11-21'},'new-full':{checked:false},'new-f':{value:'1'},'new-t':{value:'3'},teacherAssignmentAudioReciter:{value:'mishary',replaceChildren(...opts){this.options=opts;}}};
const student={id:'s1',name:'طالب الاختبار',phone:'01012345678',guardianName:'ولي اختبار'};
let buildCount=0,messages=[],queueRows=new Map();
const db={
  objectStoreNames:{contains:()=>true},
  transaction(){
    const tx={objectStore(){
      return {
        put(row){queueRows.set(row.id,row);queueMicrotask(()=>tx.oncomplete?.());},
        get(id){const req={result:queueRows.get(String(id))||null};queueMicrotask(()=>req.onsuccess?.());return req;},
        getAll(){const req={result:[...queueRows.values()]};queueMicrotask(()=>req.onsuccess?.());return req;},
        delete(id){queueRows.delete(String(id));queueMicrotask(()=>tx.oncomplete?.());}
      };
    }};
    return tx;
  }
};
const indexedDB={open(){const req={result:db};queueMicrotask(()=>{req.onsuccess?.();});return req;}};
const document={
  readyState:'complete',
  getElementById:id=>elements[id]||null,
  addEventListener(){},
  createElement(tag){return tag==='option'?{value:'',textContent:''}:{tagName:tag,querySelector(){return null;},addEventListener(){},remove(){}};},
  body:{appendChild(){}}
};
const context={
  console,Date,Math,Blob,File,document,indexedDB,navigator:{onLine:false},addEventListener(){},
  ImamApp:{State:{students:[student]}},
  ImamOfflineAudio:{SURAHS:[[0,7]],message:()=> 'تعذر تجهيز الصوت'},
  readSection:()=>({surahId:1,surah:'الفاتحة',from:1,to:3}),
  normalizeWhatsAppPhone:p=>p.startsWith('01')?'20'+p.slice(1):p,
  ImamQuranAudioExport:{
    RECITERS:{mishary:{label:'الشيخ مشاري العفاسي'}},
    async buildFile(){buildCount++;return Object.assign(new Blob([new Uint8Array([1,2,3])],{type:'audio/mpeg'}),{name:'assignment.mp3'});},
    async shareFile(){return{shared:true};}
  },
  toast:m=>messages.push(String(m)),setTimeout,clearTimeout,localStorage:{getItem:()=>null}
};
context.globalThis=context;
vm.runInNewContext(read('js/features/assignment-audio-share.js'),context);
(async()=>{
 await context.shareCurrentAssignmentAudio();
 assert.equal(buildCount,1,'selected assignment should be converted to MP3 once');
 assert.equal(queueRows.size,1,'offline assignment audio must be persisted in IndexedDB');
 const queued=[...queueRows.values()][0];
 assert.equal(queued.studentId,'s1');assert.equal(queued.phone,'201012345678');assert.equal(queued.status,'queued');
 assert.equal(queued.blob.type,'audio/mpeg');assert(messages.some(x=>x.includes('عند عودة الإنترنت')),'offline queue status must be explicit');
 student.phone='';await context.shareCurrentAssignmentAudio();assert.equal(buildCount,1,'missing guardian number blocks audio generation');assert(messages.some(x=>x.includes('رقم واتساب')));
 student.phone='01012345678';elements.sesSt.value='';await context.shareCurrentAssignmentAudio();assert.equal(buildCount,1,'no student prevents audio generation');
 const audio=read('js/features/assignment-audio-share.js');
 assert(audio.includes('https://wa.me/${item.phone}?text=')&&audio.includes('async function flushQueue()')&&audio.includes("g.addEventListener?.('online'"),'online upload queue and direct guardian WhatsApp deep link are required');
 assert(audio.includes('createSignedUrl(item.path,LINK_TTL)'),'WhatsApp receives a private expiring audio link, not an unprotected storage path');
 const media=read('js/features/temporary-media-share.js');assert(media.includes('navigator.share')&&media.includes('اختر واتساب من قائمة المشاركة')&&!media.includes('https://wa.me/')&&!media.includes('data-chat'),'native share remains a separate manual file-share path');
 const index=read('index.html'),sw=read('sw.js');
 assert(index.includes('assignment-audio-share.js?v=beta29-rc17')&&sw.includes('assignment-audio-share.js?v=beta29-rc17'));
 assert(index.includes('temporary-media-share.js?v=beta28-rc13')&&sw.includes('temporary-media-share.js?v=beta28-rc13'));
 const original=read('js/features/session-intelligence-119.js');
 const instrumented=original.replace('root.SessionIntelligence={evaluate,','root.SessionIntelligence={showWarning,focusMissing,evaluate,');
 const fake={};let modal,step='',saveCount=0,focusCount=0,opened=false;
 const parent={tagName:'DETAILS',open:false,parentElement:null};
 fake['pgr-new']={id:'pgr-new',tagName:'DIV',parentElement:parent,classList:{add(){},remove(){}},querySelector:()=>({matches:()=>false,setAttribute(){},focus(){focusCount++},scrollIntoView(){}}),setAttribute(){},scrollIntoView(){}};
 const btns=[];
 const wdoc={readyState:'loading',getElementById:id=>fake[id]||null,addEventListener(){},createElement:()=>{modal={innerHTML:'',querySelectorAll(q){if(q==='[data-missing-target]')return [];if(q==='[data-action]')return btns;return[]},remove(){},};return modal;},body:{appendChild(m){this.last=m}}};
 const ctx={console,Date,Math,document:wdoc,ImamApp:{Utils:{escapeHtml:x=>String(x)},State:{students:[],sessions:[]}},setSessionStep:s=>step=s,saveAndSendWA:()=>saveCount++,setTimeout:fn=>{fn();return 1},localStorage:{getItem:()=>null},toast:()=>{}};ctx.globalThis=ctx;
 vm.runInNewContext(instrumented,ctx);
 assert(ctx.ImamApp.SessionIntelligence.focusMissing('pgr-new'));assert.equal(step,'assessment');assert.equal(parent.open,true);assert.equal(focusCount,1);
 const api=ctx.ImamApp.SessionIntelligence;
 const important={outstanding:[{id:'grade-new',target:'pgr-new',label:'تقييم الحفظ',severity:'important'}],critical:[]};
 fake.im119OverrideReason={value:''};fake.sesSt={value:'s1'};fake.sesDate={value:'2026-11-21'};ctx.buildSesData=()=>({});
 btns.push({dataset:{action:'approve'}});
 api.showWarning(important,'send');assert(modal.innerHTML.includes('تخطي التنبيه والمتابعة'));
 btns[0].onclick();assert.equal(saveCount,1,'teacher can override a noncritical send warning');
 fake.sesSt.value='';btns.length=0;btns.push({dataset:{action:'cancel'}});
 api.showWarning({outstanding:[{id:'student',label:'اختر الطالب',target:'sesSt',severity:'critical'}],critical:[{id:'student'}]},'send');
 assert(!modal.innerHTML.includes('تخطي التنبيه والمتابعة'),'critical issues still block sending');
 console.log('PASS RC4/RC17: offline assignment audio queue, guardian number validation, expiring WhatsApp link, manual native file share, guided focus, noncritical override and critical block');
})().catch(e=>{console.error(e);process.exitCode=1});
