'use strict';
/* Research only. Caller must verify provenance and version of the canonical corpus. */
function createCorpusResolver(corpus, chapterMeta) {
  if (!corpus || typeof corpus.version!=='string'||!corpus.version.trim()||!Array.isArray(corpus.verses)||!Array.isArray(chapterMeta)) throw Error('invalid corpus');
  const index=new Map();
  const splitGraphemes=text=>{
    if(typeof Intl!=='undefined'&&Intl.Segmenter)return [...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(text)].map(x=>x.segment);
    return text.match(/\P{M}\p{M}*|\p{M}+/gu)||Array.from(text);
  };
  for(const v of corpus.verses){
    const m=chapterMeta[v?.surahId-1];
    if(!Number.isInteger(v?.surahId)||!m||typeof m.n!=='string'||!Number.isInteger(m.a)||!Number.isInteger(v.ayah)||v.ayah<1||v.ayah>m.a||typeof v.text!=='string'||!v.text.trim()||v.text.length>3000)throw Error('invalid verse');
    const key=`${v.surahId}:${v.ayah}`;
    if(index.has(key))throw Error('duplicate verse');
    const words=[...v.text.matchAll(/\S+/gu)].map(w=>({word:w[0],start:w.index,end:w.index+w[0].length,chars:splitGraphemes(w[0])}));
    index.set(key,{surah:m.n,text:v.text,words});
  }
  function verse(surahId,ayah){const v=index.get(`${surahId}:${ayah}`);return v?{surah:v.surah,text:v.text,words:v.words.map(w=>({...w,chars:[...w.chars]}))}:null;}
  function resolveLocation(p){
    if(!p||p.corpusVersion!==corpus.version||!Number.isInteger(p.surahId)||!Number.isInteger(p.ayah))return null;
    const v=index.get(`${p.surahId}:${p.ayah}`);
    if(!v)return null;
    const base={verified:true,corpusVersion:corpus.version,surah:v.surah,ayahText:v.text};
    if(p.targetLevel==='ayah'&&p.wordIndex===-1&&p.charIndex===-1)return base;
    if(!Number.isInteger(p.wordIndex)||p.wordIndex<0||p.wordIndex>=v.words.length)return null;
    const w=v.words[p.wordIndex];
    if(p.targetLevel==='word'&&p.charIndex===-1)return {...base,word:w.word};
    if(p.targetLevel==='char'&&Number.isInteger(p.charIndex)&&p.charIndex>=0&&p.charIndex<w.chars.length)return {...base,word:w.word,charText:w.chars[p.charIndex]};
    return null;
  }
  return {version:corpus.version,verse,resolveLocation};
}
function mapDraftForReview(draft, scope, resolver){
  const result={status:'requires-manual-reference',candidates:[],unmapped:[]};
  if(!draft||draft.format!=='imam-muaalem-draft-v1'||draft.approved!==false||draft.automaticImportAllowed!==false||!Array.isArray(draft.errors)||draft.errors.length>300||!scope||!resolver||scope.corpusVersion!==resolver.version)return result;
  const {start,end,uthmaniText}=draft;
  if(!start||!end||start.sura_idx!==end.sura_idx||start.aya_idx!==end.aya_idx||start.sura_idx!==scope.surahId||!Number.isInteger(start.aya_idx)||start.aya_idx<scope.fromAyah||start.aya_idx>scope.toAyah)return result;
  const v=resolver.verse(start.sura_idx,start.aya_idx);
  // V0.4 only accepts exact full single verses. No fuzzy matching, removal of
  // diacritics, offset guessing, or assuming code points are UTF-16 indexes.
  if(!v||v.text!==uthmaniText||start.uthmani_word_idx!==0||start.uthmani_char_idx!==0)return result;
  const codepoints=Array.from(v.text);
  const utf16At=[0];for(const c of codepoints)utf16At.push(utf16At[utf16At.length-1]+c.length);
  const ruleTypes=new Map([['المد الطبيعي','مد طبيعي'],['المد اللازم','مد لازم'],['المد الواجب المتصل','مد متصل'],['المد الجائز المنفصل','مد منفصل'],['الغنة','غنة'],['القلقلة','قلقلة'],['الإقلاب','إقلاب'],['الإظهار الحلقي','إظهار'],['الإدغام بغنة','إدغام بغنة'],['الإدغام بغير غنة','إدغام بغير غنة'],['الإخفاء الحقيقي','إخفاء']]);
  draft.errors.forEach((e,i)=>{
    const skip=reason=>result.unmapped.push({index:i,reason});
    const p=e?.uthmani_pos;
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<0||p[1]<=p[0]||p[1]>codepoints.length){skip('ambiguous-text-span');return;}
    if(!['insert','delete','replace'].includes(e.speech_error_type)){skip('unknown-operation');return;}
    const a=utf16At[p[0]],b=utf16At[p[1]];
    const hits=v.words.map((w,wi)=>({w,wi})).filter(({w})=>a>=w.start&&b<=w.end);
    if(hits.length!==1){skip('cross-word-or-whitespace-span');return;}
    const {w,wi}=hits[0];let off=w.start;
    const glyphs=w.chars.map((g,ci)=>{const l=off;off+=g.length;return {ci,start:l,end:off};}).filter(g=>a>=g.start&&b<=g.end);
    let type;
    if(e.error_type==='tashkeel')type='تشكيل / حركة';
    else if(e.error_type==='normal')type='نطق حرف';
    else if(e.error_type==='tajweed'){
      const rules=Array.isArray(e.ref_tajweed_rules)?e.ref_tajweed_rules:[];
      const labels=[...new Set(rules.map(r=>ruleTypes.get(r?.name?.ar)||null))];
      if(labels.length===1&&labels[0])type=labels[0];
    }
    if(!type){skip('requires-manual-error-classification');return;}
    const level=glyphs.length===1?'char':'word';
    // Word-level normal error cannot be labelled a specific letter fault.
    if(e.error_type==='normal'&&level!=='char'){skip('requires-manual-error-classification');return;}
    result.candidates.push({ownerId:scope.ownerId,studentId:scope.studentId,recordingId:scope.recordingId,sessionId:scope.sessionId,jobId:scope.jobId,corpusVersion:scope.corpusVersion,engineVersion:scope.engineVersion,candidateId:`draft-${i}`,surahId:scope.surahId,ayah:start.aya_idx,targetLevel:level,wordIndex:wi,charIndex:level==='char'?glyphs[0].ci:-1,type,alignmentStatus:'verified',startMs:null,endMs:null,reviewStatus:'pending',sourceDraftIndex:i});
  });
  result.status='review-required';
  return result;
}
if(typeof module==='object'&&module.exports)module.exports={createCorpusResolver,mapDraftForReview};
