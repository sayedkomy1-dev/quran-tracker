'use strict';
const fs=require('fs'),vm=require('vm');
function ok(v,m){if(!v)throw new Error(m);}
function cls(initial=[]){const s=new Set(initial);return{contains:x=>s.has(x),add:(...x)=>x.forEach(y=>s.add(y)),remove:(...x)=>x.forEach(y=>s.delete(y)),_s:s};}
const pages={home:{id:'pg-home',classList:cls(['pg','on'])},students:{id:'pg-students',classList:cls(['pg'])}};
const modal={id:'taskModal',classList:cls(['mo']),hidden:false,setAttribute(){},style:{}};
const listeners={};const timers=[];const toasts=[];
const document={
  readyState:'complete',documentElement:{classList:cls()},body:{classList:cls()},
  querySelector(sel){if(sel==='.pg.on')return Object.values(pages).find(p=>p.classList.contains('on'))||null;return null;},
  querySelectorAll(sel){
    if(sel==='.wlq-user-pop:not([hidden])'||sel==='.surah-dropdown.open')return[];
    if(sel==='.mo.open')return modal.classList.contains('open')?[modal]:[];
    return[];
  },
  getElementById(){return null;}
};
const history={entries:[{state:null}],i:0,state:null,
  replaceState(s){this.entries[this.i]={state:s};this.state=s;},
  pushState(s){this.entries=this.entries.slice(0,this.i+1);this.entries.push({state:s});this.i++;this.state=s;},
  back(){if(this.i<=0){this.exited=true;return;}this.i--;this.state=this.entries[this.i].state;listeners.popstate?.forEach(fn=>fn({state:this.state}));}
};
const ctx={console,document,history,location:{href:'https://example.test/app/'},navigator:{},Date,
  getComputedStyle:()=>({display:'block',visibility:'visible'}),
  setTimeout:(fn,ms=0)=>{if(ms<=250){fn();return 1;}timers.push({fn,ms});return timers.length;},clearTimeout:()=>{},
  addEventListener:(type,fn)=>{(listeners[type]||(listeners[type]=[])).push(fn);},
  goPage(p){Object.values(pages).forEach(x=>x.classList.remove('on'));pages[p]?.classList.add('on');},
  goBack(){this.goPage('home');},toast:m=>toasts.push(m),ImamApp:{},globalThis:null
};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/core/mobile-navigation.js','utf8'),ctx);
ok(history.entries.length===2&&history.state.page==='home','root guard + home entry were not initialized');
ctx.goPage('students');
ok(document.querySelector('.pg.on').id==='pg-students','goPage wrapper failed');
ok(history.entries.length===3&&history.state.page==='students','student page history entry missing');
modal.classList.add('open');history.back();
ok(!modal.classList.contains('open'),'hardware Back should close modal first');
ok(document.querySelector('.pg.on').id==='pg-students','closing modal via Back must keep current page');
ok(history.state.page==='students','modal Back must restore current page history entry');
history.back();
ok(document.querySelector('.pg.on').id==='pg-home','second Back should restore previous page');
history.back();
ok(toasts.some(x=>String(x).includes('رجوع مرة أخرى')),'Home Back exit hint missing');
ok(document.querySelector('.pg.on').id==='pg-home','Home Back must keep Home visible');
console.log('mobile-navigation-runtime-check: PASS');
