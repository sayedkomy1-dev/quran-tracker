'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const tests=[
 'imam-learning-memory-experiment-check.js',
 'imam-learning-skill-graph-experiment-check.js',
 'imam-recitation-review-bridge-experiment-check.js',
 'imam-reviewed-learning-profile-experiment-check.js',
 'imam-muaalem-local-draft-check.js',
 'imam-recitation-corpus-experiment-check.js',
 'imam-skill-evidence-experiment-check.js',
 'imam-review-lab-check.js',
 'imam-personal-plan-experiment-check.js',
 'imam-audio-authorization-research-check.mjs'
];
for(const t of tests){
 const p=spawnSync(process.execPath,[path.join(root,'tests',t)],{cwd:root,stdio:'inherit'});
 if(p.error)throw p.error;
 if(p.status!==0){process.exitCode=1;break;}
}
if(!process.exitCode)console.log('PASS isolated Imam AI research suite; NOT a production or acoustic accuracy test.');
