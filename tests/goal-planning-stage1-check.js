'use strict';
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
function need(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1);}}
const goal=read('js/features/goal-planning.js');
const idx=read('index.html');
const gp=read('guardian-portal.html');
const view=read('js/features/guardian-portal-view.js');
const share=read('js/features/guardian-portal-share.js');
const sw=read('sw.js');
need(goal.includes('JUZ_STARTS')&&goal.includes('memorizationGoal'),'goal planner must support Juz/Surah stored goals');
need(goal.includes('recommended')&&goal.includes('expectedPct')&&goal.includes('milestones'),'automatic pacing/milestones missing');
need(goal.includes('goalPlanningApply')&&(goal.includes("setSectionAutoValue?.('new'")||goal.includes("setSectionAutoValue('new'")),'one-click next assignment missing');
need(goal.includes("legacy.override('saveSt'")&&goal.includes("legacy.override('sanitizeBackupData'"),'student save/import preservation hooks missing');
need(idx.includes('goal-planning.css?v=11.4.2-s2')&&(idx.includes('js/features/goal-planning.js?v=11.4.0-s1')||idx.includes('js/features/goal-planning.js?v=11.4.2-s2')),'teacher app assets not wired');
need(share.includes('memorizationPlan')&&share.includes('GoalPlanner?.buildGuardian'),'guardian snapshot must include plan summary');
need(gp.includes('portalGoalCard')&&gp.includes('portalGoalNext'),'guardian goal card markup missing');
need(view.includes('function renderGoalPlan')&&view.includes('portalGoalPractice')&&view.includes("practiceMode:'tutor'"),'guardian goal rendering/practice missing');
need(sw.includes("quran-pwa-v11.5.0-student-finance1")&&sw.includes('goal-planning.css?v=11.4.2-s2'),'service worker cache not bumped');
need(!goal.includes('reviewOutcome')&&!goal.includes('needs_stabilization'),'deferred smart revision outcome ledger must not be introduced');
console.log('PASS goal-planning-stage1-check');
