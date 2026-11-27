'use strict';
const assert=require('node:assert/strict');
const {validateDraft}=require('../research/recitation-ai/muaalem-local.cjs');
function testDraft(validate,assert){
 const p={start:{sura_idx:1,aya_idx:2,uthmani_word_idx:0,uthmani_char_idx:0},end:{sura_idx:1,aya_idx:2,uthmani_word_idx:0,uthmani_char_idx:4},uthmani_text:'fixture',predicted_phonemes:'abc',reference_phonemes:'abcd',errors:[{uthmani_pos:[0,1],ph_pos:[0,1],error_type:'tajweed',speech_error_type:'replace'}]};
 let n=0;const check=(x,m)=>{assert(x,m);n++;};const fails=x=>{try{validate(x);return false}catch{return true}};
 const out=validate(p);
 check(out.errors.length===1,'draft received');
 check(out.approved===false&&!out.automaticImportAllowed,'never auto import');
 check(out.errors[0].audioTiming===null,'text offsets not timing');
 check(out.errors[0].alignmentStatus==='unverified','location not verified');
 check(out.errors[0].reviewStatus==='pending','review pending');
 check(validate({...p,errors:[]}).status==='unreviewed-model-output','empty not mastery');
 check(fails({...p,start:{...p.start,sura_idx:115}}),'surah bounds');
 check(fails({...p,end:{...p.end,aya_idx:1}}),'reversed reference');
 check(fails({...p,errors:[{...p.errors[0],uthmani_pos:[0,100]}]}),'invalid text position');
 check(fails({...p,errors:[{...p.errors[0],ph_pos:[-1,1]}]}),'negative phoneme position');
 check(fails({...p,errors:null}),'invalid errors');
 return n;
}
console.log('PASS',testDraft(validateDraft,assert),'Muaalem draft checks');
