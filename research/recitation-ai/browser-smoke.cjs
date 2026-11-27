'use strict';
const http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const allowed=new Set([
 '/research/recitation-ai/review-lab.html','/research/recitation-ai/review-lab.js',
 ...['imam-learning-memory-experiment','imam-learning-skill-graph-experiment','imam-recitation-review-bridge-experiment','imam-reviewed-learning-profile-experiment','imam-recitation-corpus-experiment','imam-skill-evidence-experiment','imam-personal-plan-experiment'].map(x=>'/js/features/'+x+'.js')
]);
const harness='<!doctype html><meta charset="utf-8"><output id="result">WAIT</output><iframe id="lab" src="/research/recitation-ai/review-lab.html"></iframe><script src="/harness.js"></script>';
const harnessJs=String.raw`window.addEventListener('load',()=>{
 const result=document.getElementById('result');
 try{
  const d=document.getElementById('lab').contentDocument,$=id=>d.getElementById(id);
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  $('demo').click();
  const approve=()=>[...$('reviewList').querySelectorAll('button')].filter(x=>x.textContent==='اعتماد تجريبي');
  const reject=()=>[...$('reviewList').querySelectorAll('button')].filter(x=>x.textContent==='رفض');
  assert(!$('results').hidden,'demo');
  assert(approve().length===2,'two candidates');
  approve()[0].click();approve()[1].click();
  assert($('summary').children[2].textContent.includes('1'),'history');
  assert($('personalPlan').textContent.includes('اختبار متابعة بسبب نمط تاريخي'),'plan');
  $('demonstrated').click();
  assert($('skills').textContent.includes('أظهر المهارة في الاختبار'),'positive evidence');
  reject()[1].click();
  assert($('summary').children[2].textContent.includes('0'),'rejection');
  $('needsPractice').click();
  assert($('personalPlan').textContent.includes('اختبار المحفظ أظهر حاجة إلى التدريب'),'independent test');
  $('clear').click();
  assert($('results').hidden,'clear');
  result.textContent='PASS_IMAM_BROWSER_SMOKE';
 }catch(e){result.textContent='FAIL_IMAM_BROWSER_SMOKE: '+e.message;}
});`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1').pathname;
 if(url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(harness);}
 if(url==='/harness.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(harnessJs);}
 if(!allowed.has(url)){res.statusCode=404;return res.end();}
 try{const body=fs.readFileSync(path.join(root,url.slice(1)));res.setHeader('Content-Type',url.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(body);}catch{res.statusCode=404;res.end();}
});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'imam-browser-'));
server.listen(0,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+server.address().port+'/';
 const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=10000',url],{stdio:['ignore','pipe','pipe']});
 let out='',err='',finished=false;
 const timer=setTimeout(()=>{chrome.kill('SIGKILL');},45000);
 chrome.stdout.on('data',b=>out+=b);chrome.stderr.on('data',b=>err=(err+b).slice(-4000));
 const finish=code=>{if(finished)return;finished=true;clearTimeout(timer);server.close();try{fs.rmSync(profile,{recursive:true,force:true});}catch{}process.exitCode=code;};
 chrome.on('error',e=>{console.error(e.message);finish(1);});
 chrome.on('close',code=>{if(code===0&&out.includes('<output id="result">PASS_IMAM_BROWSER_SMOKE</output>')){console.log('PASS real Chromium review lab');finish(0);}else{console.error(out.slice(0,3000),err);finish(1);}});
});
