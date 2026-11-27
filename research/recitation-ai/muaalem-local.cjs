'use strict';
/* Independent research client. Requires local Muaalem app, Node 18+ and ffmpeg. */
function validateDraft(payload){
  const validPosition=p=>p&&Number.isInteger(p.sura_idx)&&p.sura_idx>=1&&p.sura_idx<=114&&Number.isInteger(p.aya_idx)&&p.aya_idx>=1&&p.aya_idx<=286&&Number.isInteger(p.uthmani_word_idx)&&p.uthmani_word_idx>=0&&Number.isInteger(p.uthmani_char_idx)&&p.uthmani_char_idx>=0;
  if(!payload||!validPosition(payload.start)||!validPosition(payload.end)||typeof payload.uthmani_text!=='string'||!payload.uthmani_text||payload.uthmani_text.length>10000||typeof payload.predicted_phonemes!=='string'||typeof payload.reference_phonemes!=='string'||!Array.isArray(payload.errors)||payload.errors.length>300)throw Error('Unexpected Muaalem response; no findings imported');
  if(payload.end.sura_idx<payload.start.sura_idx||(payload.end.sura_idx===payload.start.sura_idx&&payload.end.aya_idx<payload.start.aya_idx))throw Error('Invalid reference range');
  const range=r=>Array.isArray(r)&&r.length===2&&r.every(Number.isInteger)&&r[0]>=0&&r[1]>=r[0];
  const errors=payload.errors.map(e=>{
    if(!e||!range(e.uthmani_pos)||!range(e.ph_pos)||e.uthmani_pos[1]>payload.uthmani_text.length||typeof e.error_type!=='string'||typeof e.speech_error_type!=='string')throw Error('Unexpected error position/type');
    return {...e,alignmentStatus:'unverified',reviewStatus:'pending',audioTiming:null};
  });
  return {format:'imam-muaalem-draft-v1',status:'unreviewed-model-output',approved:false,automaticImportAllowed:false,engine:'quran-muaalem',start:payload.start,end:payload.end,uthmaniText:payload.uthmani_text,predictedPhonemes:payload.predicted_phonemes,referencePhonemes:payload.reference_phonemes,errors,warning:'Reference match, rule, corpus offsets and all errors require teacher verification. Empty errors are not mastery. Text offsets are not audio timestamps.'};
}

const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
function decodeShortAudio(path){
  const stat=fs.statSync(path);
  if(!stat.isFile()||stat.size<1||stat.size>10*1024*1024)throw Error('Select a local audio file under 10 MB');
  // Decode at most 16 seconds: reject rather than silently truncate a longer recording.
  const pcm=execFileSync('ffmpeg',['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',path,'-t','16','-map','0:a:0','-ac','1','-ar','16000','-f','s16le','pipe:1'],{maxBuffer:600000,timeout:30000,stdio:['ignore','pipe','pipe']});
  if(pcm.length<16000||pcm.length>480000||pcm.length%2)throw Error('Use a recording between 0.5 and 15 seconds');
  let energy=0;for(let i=0;i<pcm.length;i+=2){const x=pcm.readInt16LE(i)/32768;energy+=x*x;}
  if(Math.sqrt(energy/(pcm.length/2))<0.0005)throw Error('Audio appears silent');
  const h=Buffer.alloc(44);
  h.write('RIFF',0);h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
  return Buffer.concat([h,pcm]);
}
async function boundedJson(response){
  if(!response.ok||!response.body||!String(response.headers.get('content-type')||'').includes('application/json'))throw Error('Local model returned an unsuccessful or invalid response');
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1024*1024){await reader.cancel();throw Error('Model response too large');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function analyzeLocal(wav){
  const form=new FormData();form.append('file',new Blob([wav],{type:'audio/wav'}),'sample.wav');form.append('error_ratio','0.1');
  // Fixed loopback endpoint; no client-controlled URLs, no redirects.
  const res=await fetch('http://127.0.0.1:8001/correct-recitation',{method:'POST',body:form,redirect:'error',signal:AbortSignal.timeout(120000)});
  return validateDraft(await boundedJson(res));
}
async function main(){
  const args=process.argv.slice(2);
  if(args.length!==3||args[0]!=='--consented-test-audio'){throw Error('Usage: node research/recitation-ai/muaalem-local.cjs --consented-test-audio input.wav output.json');}
  const input=require('node:path').resolve(args[1]),output=require('node:path').resolve(args[2]);
  if(!output.endsWith('.json')||fs.existsSync(output))throw Error('Choose a new .json output path');
  const wav=decodeShortAudio(input);
  const draft=await analyzeLocal(wav);
  const record={...draft,localRunId:randomUUID(),createdAt:new Date().toISOString(),durationMs:(wav.length-44)/32};
  fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Unreviewed research draft written. No student records were modified.');
}
if(require.main===module)main().catch(e=>{console.error(String(e.message||e));process.exitCode=1;});
module.exports={validateDraft,decodeShortAudio,boundedJson,analyzeLocal};
