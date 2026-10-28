'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const html=read('index.html'), sw=read('sw.js'), feature=read('js/features/teacher-followup.js');
let n=0;
function check(name,cb){cb();n++;console.log('PASS',name);}
check('initial panel has visible loading/status message, not hidden',()=>{
  assert.match(html,/<section id="imamTeachingInsights"[^>]*><div class="iti-panel iti-unavailable"/);
  assert(!/<section id="imamTeachingInsights"[^>]*hidden/.test(html));
});
check('panel loader does not silently hide rendering problems',()=>{
  assert(feature.includes('v108InsightsUnavailable(panel)'));
  assert(!feature.includes('panel.hidden=!insights'));
  assert(!feature.includes('if(panel)panel.hidden=true'));
});
check('fresh service worker release and asset versions are consistent',()=>{
  assert(sw.includes("LIVE_CACHE_NAME = CACHE_NAME + '-design-bridge1'"));
  for(const f of ['js/features/teacher-followup.js','imam-teaching-insights.css']){
    assert(html.includes(f+'?v=11.12.1-beta.27-teaching-review5-hotfix1'));
    assert(sw.includes('./'+f+'?v=11.12.1-beta.27-teaching-review5-hotfix1'));
  }
});
function scenario(mode){
 const node={hidden:true,innerHTML:'',setAttribute(){},querySelector(){return null;}};
 const list={innerHTML:''};
 const boxes={imamTeachingInsights:node,v108List:list};
 for(const id of ['v108UrgentCount','v108FollowCount','v108AttendanceCount','v108OverdueCount','v108VisibleCount']) boxes[id]={textContent:''};
 boxes.v108Group={innerHTML:'',value:''};
 const page={classList:{contains:()=>true},querySelector:()=>null,prepend(x){boxes[x.id]=x;}};
 boxes['pg-followup']=page;
 const mockDoc={readyState:'loading',addEventListener(){},getElementById(id){return boxes[id]||null;},querySelectorAll(){return [];},createElement(){return {id:'',hidden:false,innerHTML:'',setAttribute(){},querySelector(){return null;}}}};
 const logs=[];
 const context={document:mockDoc,console:{warn(...a){logs.push(a.join(' '));}},students:[],sessions:[],setTimeout(){},ImamApp:{StudentProgress:{calculate:()=>null}}};
 if(mode==='available')context.ImamTeachingInsights={renderInto(host){host.innerHTML='خطة التدخل التعليمي';return {byId:new Map()};}};
 if(mode==='throws')context.ImamTeachingInsights={renderInto(){throw Error('deliberate test error');}};
 vm.runInNewContext(feature,context);
 context.renderV108Followup();
 return {node,list,logs};
}
check('successful render unhides educational panel',()=>{
 const out=scenario('available');assert.equal(out.node.hidden,false);assert.equal(out.node.innerHTML,'خطة التدخل التعليمي');
});
check('missing module shows retry action and does not hide panel',()=>{
 const out=scenario('missing');assert.equal(out.node.hidden,false);assert.match(out.node.innerHTML,/تعذر عرض التحليل الآن/);assert.match(out.node.innerHTML,/إعادة المحاولة/);
});
check('rendering exception is visible but original center remains operational',()=>{
 const out=scenario('throws');assert.equal(out.node.hidden,false);assert.match(out.node.innerHTML,/تعذر عرض التحليل الآن/);assert.equal(out.list.innerHTML.includes('لا توجد نتائج'),true);
});
console.log(`OK visibility/diagnostic hotfix ${n}/${n}`);
