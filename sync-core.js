/* We Live Quran — safe multi-device sync core v10.4.1
 * Pure helpers only: deterministic record merge + durable tombstones.
 */
'use strict';
(function(global){
  const KINDS=['students','sessions','tasks'];
  const CLOCK_SKEW_TOLERANCE_MS=5*60*1000; // review future-dated records; client time is not authoritative
  function isoTime(value){
    const t=new Date(value||0).getTime();
    return Number.isFinite(t)?t:0;
  }
  function itemTimestamp(x){return isoTime(x?.updatedAt||x?.createdAt||x?.date||0);}
  function safeTimestamp(t,now=Date.now()){
    // A phone with clock set in the future must not permanently dominate a
    // valid newer copy. This is a mitigation, NOT server revision ordering.
    return t>now+CLOCK_SKEW_TOLERANCE_MS?0:t;
  }
  function clockSkewReview(collections,now=Date.now()){
    const out=[];
    for(const [kind,rows] of Object.entries(collections||{})){
      for(const x of Array.isArray(rows)?rows:[]){
        const at=itemTimestamp(x);
        if(at>now+CLOCK_SKEW_TOLERANCE_MS)out.push({kind,id:String(x?.id||''),at:new Date(at).toISOString()});
      }
    }
    return out.slice(0,100);
  }
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
    const at=safeTimestamp(itemTimestamp(a)),bt=safeTimestamp(itemTimestamp(b));
    if(at!==bt)return at>bt?a:b;
    return tieKey(a)>=tieKey(b)?a:b;
  }
  // Finance merge is independent of the student profile timestamp. A later change
  // to a name or attendance must NEVER overwrite a payment entered offline.
  function paymentKey(p){return String(p?.id||'');}
  function stableString(x){return JSON.stringify(x??null);}
  function reconcilePayment(a,b){
    if(!a)return b;if(!b)return a;
    // The payment id is immutable. Use a deterministic tie-break on conflicts;
    // a cancellation is append-only and must not be undone by an old replica.
    const chosen=stableString(a)>=stableString(b)?a:b;
    const canceled=[a,b].filter(x=>x?.voidedAt);
    if(!canceled.length)return {...chosen};
    const voidWinner=canceled.reduce((x,y)=>String(x.voidedAt||'')>=String(y.voidedAt||'')?x:y);
    return {...chosen,voidedAt:voidWinner.voidedAt,voidReason:String(voidWinner.voidReason||'')};
  }
  function mergeFinance(a,b,preferred){
    if(!a||typeof a!=='object')return b&&typeof b==='object'?JSON.parse(JSON.stringify(b)):null;
    if(!b||typeof b!=='object')return JSON.parse(JSON.stringify(a));
    const selected=preferred===b?b:a;
    const result=JSON.parse(JSON.stringify(selected));
    const left=a.months&&typeof a.months==='object'?a.months:{};
    const right=b.months&&typeof b.months==='object'?b.months:{};
    result.months={};
    for(const month of [...new Set([...Object.keys(left),...Object.keys(right)])].sort()){
      const l=left[month],r=right[month];
      if(!l||typeof l!=='object'){result.months[month]=JSON.parse(JSON.stringify(r));continue;}
      if(!r||typeof r!=='object'){result.months[month]=JSON.parse(JSON.stringify(l));continue;}
      const preferredMonth=(selected===b?r:l);
      // Closed accounting snapshots stay immutable even if an open replica is newer.
      const canonical=(l.closedAt&&!r.closedAt)?l:(!l.closedAt&&r.closedAt)?r:preferredMonth;
      const out=JSON.parse(JSON.stringify(canonical));
      const payments=new Map();
      for(const p of [...(l.payments||[]),...(r.payments||[])]){
        if(!paymentKey(p))continue;
        payments.set(paymentKey(p),reconcilePayment(payments.get(paymentKey(p)),p));
      }
      out.payments=[...payments.values()].sort((x,y)=>paymentKey(x).localeCompare(paymentKey(y)));
      result.months[month]=out;
    }
    return result;
  }
  function mergeStudent(a,b){
    const chosen=chooseRecord(a,b);
    if(!a||!b)return chosen;
    if(!a.studentFinance&&!b.studentFinance)return chosen;
    const finance=mergeFinance(a.studentFinance,b.studentFinance,chosen.studentFinance);
    return {...chosen,studentFinance:finance};
  }
  function financeReview(students){
    const results=[];
    for(const st of students||[]){
      for(const [month,row] of Object.entries(st?.studentFinance?.months||{})){
        if(!row?.closedAt||!row.closedSnapshot)continue;
        const active=(row.payments||[]).filter(x=>!x?.voidedAt)
          .reduce((sum,p)=>sum+(Number(p?.amountCents)||0),0);
        const frozen=Number(row.closedSnapshot.paidCents)||0;
        if(active!==frozen)results.push({studentId:String(st.id),month,paidCents:active,closedPaidCents:frozen});
      }
    }
    return results;
  }
  function mergeById(local,remote,kind,tombstones){
    const merged=new Map();
    for(const x of [...(remote||[]),...(local||[])]){
      if(!x?.id)continue;
      merged.set(x.id,kind==='students'?mergeStudent(merged.get(x.id),x):chooseRecord(merged.get(x.id),x));
    }
    const ts=normalizeTombstones(tombstones)[kind]||{};
    return [...merged.values()].filter(x=>{
      const deletion=safeTimestamp(tombstoneTimestamp(ts[x.id]));
      const updated=safeTimestamp(itemTimestamp(x));
      // An untrusted future timestamp is NOT a deletion instruction. Preserve
      // both uncertain records for explicit review instead of silently erasing.
      return !deletion||!updated||deletion<updated;
    });
  }
  function deletedStudentIds(students,tombstones){
    const live=new Map((students||[]).filter(x=>x?.id).map(x=>[x.id,x]));
    const ts=normalizeTombstones(tombstones).students;
    const out=new Set();
    Object.entries(ts).forEach(([id,entry])=>{
      const record=live.get(id);
      const deletion=safeTimestamp(tombstoneTimestamp(entry));
      if(!deletion) return; // future-dated tombstones cannot cascade-delete children
      const updated=record?safeTimestamp(itemTimestamp(record)):0;
      if(!record||(updated&&deletion>=updated))out.add(id);
    });
    return out;
  }
  function filterDeletedChildren(items,deletedStudents){
    return (items||[]).filter(x=>!x?.studentId||!deletedStudents.has(x.studentId));
  }
  global.WLQSyncCore={KINDS,isoTime,itemTimestamp,safeTimestamp,clockSkewReview,normalizeTombstones,tombstoneTimestamp,mergeTombstones,markTombstone,mergeById,mergeFinance,financeReview,deletedStudentIds,filterDeletedChildren};
})(globalThis);
