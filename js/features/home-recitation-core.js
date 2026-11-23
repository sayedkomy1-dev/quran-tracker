'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImamHomeRecitationCore=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const MAX_FILE_BYTES=20*1024*1024;
  const MAX_DURATION_MS=20*60*1000;
  const MAX_PENDING_COUNT=3;
  const MAX_PENDING_BYTES=50*1024*1024;
  const MIME_EXT=Object.freeze({
    'audio/webm':'webm','audio/mp4':'m4a','audio/ogg':'ogg',
    'audio/wav':'wav','audio/mpeg':'mp3','audio/aac':'aac'
  });
  function normalizeMime(value){
    const raw=String(value||'').toLowerCase().split(';')[0].trim();
    if(raw==='audio/x-m4a'||raw==='audio/m4a')return'audio/mp4';
    if(raw==='audio/x-wav'||raw==='audio/wave')return'audio/wav';
    return raw;
  }
  function extensionForMime(value){return MIME_EXT[normalizeMime(value)]||'';}
  function validSurahRange(surah,from,to,suras){
    const ch=Number(surah),start=Number(from),end=Number(to),row=Array.isArray(suras)?suras[ch-1]:null;
    const max=Array.isArray(row)?Number(row[1]):0;
    return Number.isInteger(ch)&&ch>=1&&ch<=114&&Number.isInteger(start)&&Number.isInteger(end)&&start>=1&&end>=start&&max>=1&&end<=max;
  }
  function validDuration(value){
    const n=Number(value);
    return Number.isInteger(n)&&n>=0&&n<=MAX_DURATION_MS;
  }
  function cleanText(value,max=500){
    return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  }
  function validAnnotation(item,range,durationMs){
    if(!item||typeof item!=='object')return{ok:false,reason:'invalid'};
    const time=Number(item.time_ms);
    const ayah=item.ayah_no===null||item.ayah_no===undefined||item.ayah_no===''?null:Number(item.ayah_no);
    const note=cleanText(item.note,300);
    const duration=Number(durationMs)>0?Number(durationMs):MAX_DURATION_MS;
    if(!Number.isSafeInteger(time)||time<0||time>duration)return{ok:false,reason:'time'};
    if(ayah!==null&&(!Number.isInteger(ayah)||ayah<Number(range.from)||ayah>Number(range.to)))return{ok:false,reason:'ayah'};
    if(!note)return{ok:false,reason:'note'};
    return{ok:true,value:{id:String(item.id||''),time_ms:time,ayah_no:ayah,note}};
  }
  function formatTime(value){
    const seconds=Math.max(0,Math.floor((Number(value)||0)/1000));
    return String(Math.floor(seconds/60))+':'+String(seconds%60).padStart(2,'0');
  }
  function canQueue(count,bytes,newBytes){
    const n=Number(newBytes)||0;
    return Number(count)<MAX_PENDING_COUNT&&n>0&&n<=MAX_FILE_BYTES&&Number(bytes)+n<=MAX_PENDING_BYTES;
  }
  function fileAllowed(file){
    const mime=normalizeMime(file?.type);
    return !!MIME_EXT[mime]&&Number(file?.size)>=128&&Number(file?.size)<=MAX_FILE_BYTES;
  }
  function formatBytes(value){
    const n=Math.max(0,Number(value)||0);
    return n>=1024*1024?(n/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  }
  return Object.freeze({
    MAX_FILE_BYTES,MAX_DURATION_MS,MAX_PENDING_COUNT,MAX_PENDING_BYTES,
    normalizeMime,extensionForMime,validSurahRange,validDuration,cleanText,
    validAnnotation,formatTime,canQueue,fileAllowed,formatBytes
  });
});
