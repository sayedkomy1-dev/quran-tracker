'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const feature=read('js/features/guardian-portal-share.js');
const view=read('js/features/guardian-portal-view.js');
const html=read('index.html');
const portal=read('guardian-portal.html');
const css=read('guardian-portal.css');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));
new vm.Script(feature,{filename:'guardian-portal-share.js'});
new vm.Script(view,{filename:'guardian-portal-view.js'});
assert(pkg.version==='10.10.0','package version must be 10.10.0');
assert(html.includes('guardian-portal-share.js?v=10.10.0'),'guardian portal share feature missing from main app');
assert(sw.includes("'./guardian-portal.html'")&&sw.includes("'./guardian-portal.css?v=10.10.0'")&&sw.includes("'./js/features/guardian-portal-view.js?v=10.10.0'"),'guardian portal assets missing from offline shell');
assert(sw.includes("portalNav=url.pathname.endsWith('/guardian-portal.html')"),'guardian portal navigation fallback missing');
assert(portal.includes('name="robots" content="noindex,nofollow,noarchive"'),'guardian portal must be noindex');
assert(!portal.includes('auth.js')&&!portal.includes('supabase'),'read-only snapshot portal must not bootstrap teacher authentication or Supabase');
assert(portal.includes('نسخة قراءة فقط')&&portal.includes('آخر الحصص')&&portal.includes('التكليف الحالي'),'guardian portal core UI sections missing');
assert(css.includes('.portal-kpis')&&css.includes('@media print'),'guardian portal responsive/print styling missing');
assert(feature.includes('function buildSnapshot')&&feature.includes('function portalUrl')&&feature.includes('function ensureMoreItem'),'portal snapshot/share integration helpers missing');

const now=Date.now();
const context={
  console,Date,Math,Number,String,Object,Array,Set,Map,JSON,TextEncoder,TextDecoder,URL,btoa:s=>Buffer.from(s,'binary').toString('base64'),
  setTimeout:()=>0,clearTimeout:()=>{},
  document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),body:{}},
  location:{href:'https://example.test/quran/index.html'},
  navigator:{},open:()=>null,
  students:[{id:'s1',name:'أحمد',parent:'ولي أحمد',phone:'201001234567',group:'حلقة النور',level:'متوسط',studentStatus:'active'}],
  sessions:[
    {id:'secret-session-id',studentId:'s1',status:'حضر',date:new Date(now-2*86400000).toISOString(),assessmentScores:{new:88},actualRecitation:{new:{surah:'البقرة',from:1,to:5}},new:{surah:'البقرة',from:6,to:10},rec:{surah:'الفاتحة',from:1,to:7}},
    {id:'absence-id',studentId:'s1',status:'غاب',date:new Date(now-86400000).toISOString()}
  ],
  settings:{circle:'أكاديمية الاختبار',name:'الشيخ محمد'},
  getQuranProgressPercent:()=>12,
  ImamApp:{Utils:{escapeHtml:v=>String(v)},StudentProgress:{calculate:()=>({mastery:88,attendance:50,repeats:1,newAyat:5,attention:[{label:'سورة البقرة 1–5',score:60,grade:'ضعيف'}],trend:{label:'تحسن +8'}})}},
  curStId:'s1',globalThis:null
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(feature,context,{filename:'guardian-portal-share.js'});
const snap=context.v1010BuildPortalSnapshot('s1');
assert(snap.student.name==='أحمد'&&snap.student.guardian==='ولي أحمد','student/guardian display data missing');
assert(snap.metrics.mastery===88&&snap.metrics.attendance===50&&snap.metrics.quranProgress===12,'portal metrics not derived from current analytics');
assert(snap.assignment.items.some(x=>x.label==='الحفظ الجديد'&&x.text.includes('6–10')),'current assignment missing from snapshot');
assert(snap.recent.length===2&&snap.recent.some(x=>x.status==='غاب'),'recent attendance history missing');
const serialized=JSON.stringify(snap);
assert(!serialized.includes('201001234567'),'phone number must never be embedded in portal snapshot');
assert(!serialized.includes('secret-session-id')&&!serialized.includes('absence-id')&&!serialized.includes('"s1"'),'internal IDs must never be embedded in portal snapshot');
const shareUrl=context.v1010PortalUrl('s1');
assert(shareUrl.startsWith('https://example.test/quran/guardian-portal.html#data='),'portal URL must preserve the GitHub Pages/project path and store data in the fragment');
const encoded=new URL(shareUrl).hash.slice('#data='.length).replace(/-/g,'+').replace(/_/g,'/');
const padded=encoded+'='.repeat((4-encoded.length%4)%4);
const decoded=JSON.parse(Buffer.from(padded,'base64').toString('utf8'));
assert(decoded.student.name==='أحمد'&&!JSON.stringify(decoded).includes('201001234567'),'portal URL payload roundtrip failed or leaked phone data');
console.log('Guardian & Student Portal Stage 1 checks passed for v10.10.0');
