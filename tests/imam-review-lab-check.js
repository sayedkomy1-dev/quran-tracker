'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const paths=[
  "js/features/imam-learning-memory-experiment.js",
  "js/features/imam-learning-skill-graph-experiment.js",
  "js/features/imam-recitation-review-bridge-experiment.js",
  "js/features/imam-reviewed-learning-profile-experiment.js",
  "js/features/imam-recitation-corpus-experiment.js",
  "js/features/imam-skill-evidence-experiment.js",
  "research/recitation-ai/review-lab.js"
];
function runLabChecks(load,assert){
 class Node{
   constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attrs={};this.textContent='';this.hidden=false;this.files=[];this.value='';this.checked=false;}
   append(...items){this.children.push(...items);}
   replaceChildren(...items){this.children=items;}
   addEventListener(name,fn){this.events[name]=fn;}
   setAttribute(k,v){this.attrs[k]=v;}
   removeAttribute(k){delete this[k];}
   pause(){} load(){} reset(){}
   click(){this.events.click?.({preventDefault(){}});}
 }
 const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},createElement:tag=>new Node(tag)};
 const $=id=>document.getElementById(id),textOf=n=>[n.textContent,...n.children.map(textOf)].join(' '),flat=n=>[n,...n.children.flatMap(flat)];
 load(document);
 let n=0;const check=(v,m)=>{assert(v,m);n++;};
 $('demo').click();
 check(!$('results').hidden,'demo results opened');
 check($('reviewList').children.length===2,'two actual mapped candidates');
 check(textOf($('scopeInfo')).includes('ليست آيات'),'demo text clearly synthetic');
 const approved=()=>flat($('reviewList')).filter(x=>x.tagName==='BUTTON'&&x.textContent==='اعتماد تجريبي');
 const rejected=()=>flat($('reviewList')).filter(x=>x.tagName==='BUTTON'&&x.textContent==='رفض');
 check($('summary').children[1].children[1].textContent==='0','pending excluded');
 approved()[0].click();
 check($('summary').children[1].children[1].textContent==='1','one accepted');
 check($('summary').children[2].children[1].textContent==='0','one day no pattern');
 approved()[1].click();
 check($('summary').children[1].children[1].textContent==='2','both accepted');
 check($('summary').children[2].children[1].textContent==='1','two days pattern');
 check($('skills').children.length===13,'all skills visible');
 const skill=()=> $('skills').children.find(x=>textOf(x).includes('نطق الحروف ومخارجها'));
 check(textOf(skill()).includes('نمط تاريخي مسجل'),'memory graph update');
 check(textOf(skill()).includes('لم تُختبر'),'no automatic positive result');
 $('demonstrated').click();
 check(textOf(skill()).includes('أظهر المهارة في الاختبار'),'explicit positive evidence');
 rejected()[1].click();
 check($('summary').children[2].children[1].textContent==='0','rejection updates preview');
 check(textOf(skill()).includes('أظهر المهارة في الاختبار'),'independent positive evidence retained');
 $('clear').click();
 check($('results').hidden&&$('reviewList').children.length===0&&$('skills').children.length===0,'clear removes preview');
 return n;
}
const html=fs.readFileSync(path.join(__dirname,'..','research/recitation-ai/review-lab.html'),'utf8');
assert(html.includes("connect-src 'none'"),'no network policy');
assert(!/https?:\/\//.test(html),'no remote assets');
const n=runLabChecks(document=>vm.runInNewContext(paths.map(p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')).join('\n;\n'),{document}),assert);
console.log('PASS',n,'review lab simulated DOM checks and 2 static contracts');
