'use strict';
const assert=require('node:assert/strict');
const {projectSkillGraph,SKILLS}=require('../js/features/imam-learning-skill-graph-experiment.js');
function checkGraph(project,catalog,assert){
 let n=0;const check=(x,m)=>{assert(x,m);n++};
 const pattern=(type,letter=null)=>({kind:'observed-cross-location-pattern',requiresTeacherReview:true,type,letter,distinctDays:2,distinctLocations:2,evidence:[{sessionId:'s1'},{sessionId:'s2'}]});
 const input={patterns:[pattern('مد متصل'),pattern('مد منفصل'),pattern('مخرج حرف','ح'),pattern('غير معروف'),{type:'غنة',requiresTeacherReview:false}]};
 const before=JSON.stringify(input),g=project(input,catalog),find=id=>g.nodes.find(n=>n.id===id);
 check(g.nodes.length===13,'13 categories');
 check(find('derived-madd').patterns.length===2,'distinct patterns preserved');
 check(find('natural-madd').status==='unknown','no propagation of error');
 check(find('derived-madd').candidateChecks[0].skillId==='natural-madd','proposed check');
 check(find('derived-madd').candidateChecks[0].reviewStatus==='unreviewed','review required');
 check(find('articulation').patterns[0].letter==='ح','letter evidence retained');
 check(find('ghunnah').status==='unknown','unreviewable finding excluded');
 check(g.unmapped.length===1,'custom retained separately');
 check(g.nodes.every(x=>x.mastery===null),'never fabricate mastery');
 check(g.edges.every(x=>!x.causalInferenceAllowed),'no causality');
 check(JSON.stringify(input)===before,'no mutation');
 g.nodes.find(x=>x.id==='derived-madd').patterns[0].evidence[0].sessionId='changed';
 check(JSON.stringify(input)===before,'evidence detached');
 check(project({patterns:[]},catalog).nodes.every(n=>n.status==='unknown'),'empty data');
 check(project({patterns:[pattern('وقف وابتداء')]},catalog).nodes.find(n=>n.id==='stopping').status==='historical-pattern','legacy alias');
 let rejected=false;try{project(input,[['a','a',null,['x'],['b']],['b','b',null,['y'],['a']]])}catch(e){rejected=true}
 check(rejected,'cycle rejected');
 return n;
}
console.log('PASS',checkGraph(projectSkillGraph,SKILLS,assert),'skill graph checks');
