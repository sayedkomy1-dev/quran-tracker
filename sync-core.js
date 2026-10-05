/* We Live Quran — safe multi-device sync core v10.4.0
 * Pure helpers only: deterministic record merge + durable tombstones.
 */
'use strict';
(function(global){
  const KINDS=['students','sessions','tasks'];
  function isoTime(value){
    const t=new Date(value||0).getTime();
    return Number.isFinite(t)?t:0;
  }
  function itemTimestamp(x){return isoTime(x?.updatedAt||x?.createdAt||x?.date||0);}
  function normalizeTombstones(source){
    const out={students:{},sessions:{},tasks:{}};
    const src=source&&typeof source==='object'?source:{};
    KINDS.forEach(kind=>{
      const map=src[kind]&&typeof src[kind]==='object'?src[kind]:{};
      Object.entries(map).forEach(([id,raw])=>{
        if(!id)return;
        const entry=typeof raw==='string'?{deletedAt:raw}:raw;
        if(!entry||typeof entry!=='object')return;
        const deletedAt=String(entry.deletedAt||'');
        if(!isoTime(deletedAt))return;
        out[kind][id]={deletedAt,deviceId:String(entry.deviceId||'')};
      });
    });
    return out;
  }
  function tombstoneTimestamp(raw){
    if(!raw)return 0;
    return isoTime(typeof raw==='string'?raw:raw.deletedAt);
  }
  function mergeTombstones(a,b){
    const left=normalizeTombstones(a),right=normalizeTombstones(b),out=normalizeTombstones(left);
    KINDS.forEach(kind=>{
      Object.entries(right[kind]).forEach(([id,entry])=>{
        const old=out[kind][id];
        const nt=tombstoneTimestamp(entry),ot=tombstoneTimestamp(old);
        if(nt>ot||(nt===ot&&String(entry.deviceId||'')>String(old?.deviceId||'')))out[kind][id]={...entry};
      });
    });
    return out;
  }
  function markTombstone(source,kind,id,deletedAt,deviceId=''){
    const out=normalizeTombstones(source);
    if(!KINDS.includes(kind)||!id)return out;
    const entry={deletedAt:String(deletedAt||new Date().toISOString()),deviceId:String(deviceId||'')};
    const old=out[kind][id];
    const nt=tombstoneTimestamp(entry),ot=tombstoneTimestamp(old);
    if(nt>ot||(nt===ot&&entry.deviceId>String(old?.deviceId||'')))out[kind][id]=entry;
    return out;
  }
  function tieKey(x){
    return `${String(x?.updatedByDevice||'')}|${String(x?.id||'')}|${JSON.stringify(x||{})}`;
  }
  function chooseRecord(a,b){
    if(!a)return b;if(!b)return a;
    const at=itemTimestamp(a),bt=itemTimestamp(b);
    if(at!==bt)return at>bt?a:b;
    return tieKey(a)>=tieKey(b)?a:b;
  }
  function mergeById(local,remote,kind,tombstones){
    const merged=new Map();
    for(const x of [...(remote||[]),...(local||[])]){
      if(!x?.id)continue;
      merged.set(x.id,chooseRecord(merged.get(x.id),x));
    }
    const ts=normalizeTombstones(tombstones)[kind]||{};
    return [...merged.values()].filter(x=>tombstoneTimestamp(ts[x.id])<itemTimestamp(x));
  }
  function deletedStudentIds(students,tombstones){
    const live=new Map((students||[]).filter(x=>x?.id).map(x=>[x.id,x]));
    const ts=normalizeTombstones(tombstones).students;
    const out=new Set();
    Object.entries(ts).forEach(([id,entry])=>{
      const record=live.get(id);
      if(!record||tombstoneTimestamp(entry)>=itemTimestamp(record))out.add(id);
    });
    return out;
  }
  function filterDeletedChildren(items,deletedStudents){
    return (items||[]).filter(x=>!x?.studentId||!deletedStudents.has(x.studentId));
  }
  global.WLQSyncCore={KINDS,isoTime,itemTimestamp,normalizeTombstones,tombstoneTimestamp,mergeTombstones,markTombstone,mergeById,deletedStudentIds,filterDeletedChildren};
})(globalThis);
