'use strict';const assert=require('assert'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/academy-learning-materials.json'));
const html=read('academy-learning.html'),js=read('js/features/academy-learning.js');
let n=0;function check(desc,fn){try{fn();n++;console.log('PASS',desc)}catch(e){console.error('FAIL',desc,e.message);process.exitCode=1}}
check('All 8 imported foundation levels present',()=>{assert.equal(data.foundation.length,8);assert.equal(new Set(data.foundation.map(x=>x.level)).size,8)});
check('Every foundation level has interactive lesson and assessment',()=>{data.foundation.forEach(x=>{assert(x.words.length);assert(x.examQuestions.length);assert(x.keyRules.length)})});
check('Q&A answer keys valid and explicative',()=>{[...data.foundation.flatMap(x=>x.examQuestions),...data.quiz].forEach(q=>{assert(Array.isArray(q.options));assert(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<q.options.length);assert(q.explanation)})});
check('Makharij, letters and tajweed reference data not empty',()=>{assert.equal(data.makharij.length,5);assert.equal(data.letters.length,28);assert.equal(data.ruleCategories.length,4);assert(data.quiz.length>=5);assert(data.speech.length>=5)});
check('No mock student progress write from educational exercises',()=>{assert(!/saveSession|sessions\.push|saveStudent|supabase|api\.post/i.test(js))});
check('No third-party AI requests in education material',()=>{assert(!/gemini|openai\.com|fetch\('https?:/i.test(js))});
check('Explicit no official evaluation and teaching review',()=>{assert(html.includes('لا تُسجل على طالب'));assert(data.provenance.review.includes('review'))});
check('Input text escaped using DOM textContent',()=>{assert(js.includes('textContent'));assert(!js.includes('innerHTML'))});
check('Training pace count choices 2 4 6',()=>{assert(html.includes('data-beats="2"'));assert(html.includes('data-beats="4"'));assert(html.includes('data-beats="6"'))});
check('Training results shown to user, without official record',()=>{assert(js.includes('لا تُحفظ ضمن درجات الطلاب'))});
check('Teacher guidance and similar verse references retained without verse snippets',()=>{assert(data.strategies.length>=6);assert(data.observations.length>=7);assert(data.challenges.length>=3);assert(data.mutashabihat.length>=20);assert(data.mutashabihat.every(x=>!x.ayahSnippet&&!x.similarSnippet))});
check('Expanded navigation includes teacher strategies and similar references',()=>{assert(html.includes('data-page="strategy"'));assert(html.includes('data-page="mutashabihat"'));assert(js.includes('renderStrategy()'));assert(js.includes('renderMutashabihat()'))});
console.log(`academy learning ${n}/12`);if(n!==12)process.exitCode=1;
