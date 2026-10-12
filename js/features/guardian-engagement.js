'use strict';
/* Imam Academy v11.2.0 Stage 4.1 — guardian engagement telemetry.
   Privacy-preserving counters only: no phone/PIN/message/audio/IP/browser fingerprint. */
(function guardianEngagement(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const QUEUE_KEY='wlq_guardian_engagement_queue_v1';
  let sessionToken='',studentRef='',studentName='';
  let flushing=false;
  const opened=new Set();

  function validUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));}
  function validRef(v){return /^[0-9a-f]{64}$/.test(String(v||''));}
  function safeContext(input){
    const out={};
    if(!input||typeof input!=='object')return out;
    for(const [k,v] of Object.entries(input)){
      if(Object.keys(out).length>=10)break;
      if(typeof v==='string')out[String(k).slice(0,40)]=v.slice(0,120);
      else if(typeof v==='number'&&Number.isFinite(v))out[String(k).slice(0,40)]=v;
      else if(typeof v==='boolean')out[String(k).slice(0,40)]=v;
    }
    return out;
  }
  function readQueue(){try{const x=JSON.parse(sessionStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(x)?x.slice(-80):[];}catch(_){return[];}}
  function writeQueue(rows){try{sessionStorage.setItem(QUEUE_KEY,JSON.stringify((rows||[]).slice(-80)));}catch(_){} }
  async function rpc(event){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/guardian_portal_activity_log`,{
      method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
      body:JSON.stringify({p_session:event.session,p_student_ref:event.studentRef,p_event_type:event.type,p_event_count:event.count,p_context:event.context||{}})
    });
    if(!res.ok)throw new Error(`ENGAGEMENT_HTTP_${res.status}`);
    return res.json();
  }
  function enqueue(type,count=1,context={}){
    if(!validUuid(sessionToken)||!validRef(studentRef))return false;
    const event={session:sessionToken,studentRef,type:String(type||''),count:Math.max(1,Math.min(30,Number(count)||1)),context:safeContext(context),at:Date.now()};
    const q=readQueue();q.push(event);writeQueue(q);flush();return true;
  }
  async function flush(){
    if(flushing||navigator.onLine===false)return false;
    flushing=true;
    try{
      const q=readQueue();if(!q.length)return true;
      const remain=[];
      for(let i=0;i<q.length;i++){
        const ev=q[i];if(!validUuid(ev.session)||!validRef(ev.studentRef))continue;
        try{await rpc(ev);}catch(err){remain.push(ev);if(/401|403|404/.test(String(err?.message||''))){remain.push(...q.slice(i+1));break;}}
      }
      writeQueue(remain);return remain.length===0;
    }finally{flushing=false;}
  }
  function setContext(input={}){
    const nextSession=validUuid(input.sessionToken)?String(input.sessionToken):'';
    const nextRef=validRef(input.studentRef)?String(input.studentRef):'';
    const changed=nextSession!==sessionToken||nextRef!==studentRef;
    sessionToken=nextSession;studentRef=nextRef;studentName=String(input.studentName||'').slice(0,100);
    if(changed&&sessionToken&&studentRef){
      const key=`${sessionToken}:${studentRef}`;
      if(!opened.has(key)){opened.add(key);enqueue('student_view',1,{student:studentName?1:0});}
    }
    flush();
  }
  function log(type,count=1,context={}){return enqueue(type,count,context);}
  function logPortalOpen(){
    if(!sessionToken||!studentRef)return false;
    const key=`portal:${sessionToken}:${studentRef}`;
    if(opened.has(key))return true;opened.add(key);return enqueue('portal_open');
  }
  function current(){return{sessionToken,studentRef,studentName};}
  g.ImamGuardianEngagement={setContext,log,logPortalOpen,flush,current};
  g.addEventListener?.('online',flush);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',flush,{once:true});else flush();
})(globalThis);
