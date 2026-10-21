'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('js/core/mobile-navigation.js','utf8');
function test(authorized){
 const events={};const pages={home:{id:'pg-home',active:true},students:{id:'pg-students',active:false}};
 const cls=(name)=>({contains:n=>n==='on'&&pages[name].active,add:n=>{if(n==='on')pages[name].active=true;},remove:n=>{if(n==='on')pages[name].active=false;}});
 const lookup={home:{id:'pg-home',classList:cls('home')},students:{id:'pg-students',classList:cls('students')}};
 const hist={state:{__wlqMobileNav:1,kind:'page',page:'students'},stack:[],index:-1,exited:false,replaceState(x){this.state=x;this.stack[this.index<0?0:this.index]=x;this.index=Math.max(0,this.index);},pushState(x){this.stack=this.stack.slice(0,this.index+1);this.stack.push(x);this.index++;this.state=x;},back(){if(this.index<=0){this.exited=true;return;}this.index--;this.state=this.stack[this.index];(events.popstate||[]).forEach(fn=>fn({state:this.state}));}};
 const doc={readyState:'complete',documentElement:{classList:{contains:()=>false}},body:{classList:{remove(){}}},querySelector:s=>s==='.pg.on'?Object.values(lookup).find(x=>x.classList.contains('on')):null,querySelectorAll:()=>[],getElementById:id=>lookup[id.replace(/^pg-/,'')]||null};
 const g={document:doc,history:hist,location:{href:'https://local.example/app/'},navigator:{},Date,console,toast(){},setTimeout(fn,ms){if(ms<=250)fn();},addEventListener(k,fn){(events[k]||(events[k]=[])).push(fn);},getComputedStyle:()=>({display:'block',visibility:'visible'}),WeLiveQuranAuth:{isActive:()=>authorized},goPage(key){for(const [name,p] of Object.entries(pages))p.active=name===key;},goBack(){},ImamApp:{}};g.globalThis=g;vm.createContext(g);vm.runInContext(src,g);
 assert.strictEqual(doc.querySelector('.pg.on').id,authorized?'pg-students':'pg-home','refresh should restore only an authenticated local screen');
 for(let i=0;i<8;i++)hist.back();
 assert.strictEqual(hist.exited,false,'rapid repeated Back must not close PWA');
 assert.strictEqual(doc.querySelector('.pg.on').id,'pg-home');
}
test(true);test(false);console.log('mobile-refresh-safety-check: PASS');
