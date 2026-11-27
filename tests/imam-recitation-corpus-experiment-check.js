'use strict';
const assert=require('node:assert/strict');
const {createCorpusResolver,mapDraftForReview}=require('../js/features/imam-recitation-corpus-experiment.js');
function tests(create,map,assert){
  let n=0;const check=(v,m)=>{assert(v,m);n++;};
  const meta=[{n:'fixture',a:7}];
  // Synthetic text, not a Quran quotation.
  const text='حَ كُ';
  const corpus={version:'v1',verses:[{surahId:1,ayah:2,text}]};
  const r=create(corpus,meta);
  const scope={ownerId:'o',studentId:'s',recordingId:'r',sessionId:'x',jobId:'j',corpusVersion:'v1',engineVersion:'e',surahId:1,fromAyah:2,toAyah:2};
  const draft={format:'imam-muaalem-draft-v1',approved:false,automaticImportAllowed:false,start:{sura_idx:1,aya_idx:2,uthmani_word_idx:0,uthmani_char_idx:0},end:{sura_idx:1,aya_idx:2},uthmaniText:text,errors:[{uthmani_pos:[1,2],error_type:'tashkeel',speech_error_type:'replace'}]};
  const run=(d=draft,s=scope)=>map(d,s,r);
  const x=run();check(x.candidates.length===1,'exact full verse');
  check(x.candidates[0].charIndex===0&&x.candidates[0].wordIndex===0,'diacritic maps to grapheme');
  check(r.resolveLocation(x.candidates[0]).charText==='حَ','canonical grapheme');
  check(x.candidates[0].startMs===null,'no invented audio timestamp');
  check(x.candidates[0].reviewStatus==='pending','pending only');
  check(run({...draft,uthmaniText:'ح ك'}).candidates.length===0,'no normalization');
  check(run({...draft,end:{sura_idx:1,aya_idx:3}}).candidates.length===0,'multi verse blocked');
  check(run(draft,{...scope,fromAyah:3}).candidates.length===0,'out of assignment');
  check(run({...draft,start:{...draft.start,uthmani_char_idx:1}}).candidates.length===0,'partial blocked');
  check(run({...draft,errors:[{...draft.errors[0],uthmani_pos:[2,3]}]}).unmapped.length===1,'space blocked');
  check(run({...draft,errors:[{...draft.errors[0],uthmani_pos:[1,4]}]}).unmapped.length===1,'cross word blocked');
  check(run({...draft,errors:[{...draft.errors[0],uthmani_pos:[0,0]}]}).unmapped.length===1,'insertion ambiguity');
  check(run({...draft,errors:[{...draft.errors[0],error_type:'tajweed'}]}).unmapped.length===1,'unknown rule not fabricated');
  check(run({...draft,errors:[{...draft.errors[0],error_type:'tajweed',ref_tajweed_rules:[{name:{ar:'المد اللازم'}}]}]}).candidates[0].type==='مد لازم','explicit known rule');
  check(r.resolveLocation({...x.candidates[0],corpusVersion:'v2'})===null,'corpus mismatch');
  check(r.resolveLocation({...x.candidates[0],charIndex:99})===null,'out of range char');
  check(r.resolveLocation({...x.candidates[0],ayah:8})===null,'out of range ayah');
  let fail=false;try{create({...corpus,verses:[...corpus.verses,...corpus.verses]},meta);}catch{fail=true;}check(fail,'duplicate corpus verse');
  const unicode='𞸀 حَ';const r2=create({version:'v1',verses:[{surahId:1,ayah:2,text:unicode}]},meta);
  check(map({...draft,uthmaniText:unicode,errors:[{...draft.errors[0],uthmani_pos:[2,3]}]},scope,r2).candidates[0].wordIndex===1,'python code points to UTF16');
  return n;
}
console.log('PASS',tests(createCorpusResolver,mapDraftForReview,assert),'corpus mapping checks');
