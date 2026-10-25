'use strict';
/* Imam Academy — non-destructive, session-backed follow-up of recitation errors.
   Source of truth: historical sessions.recitationErrors and sessions.errorFollowups.
   No separate localStorage ledger, database table, or student-ID migration. */
(function attachErrorFollowup(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImamErrorFollowup=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  const DECISIONS=['mastered','stabilize','repeat'];
  const labels={mastered:'أتقن',stabilize:'يحتاج تثبيت',repeat:'أخطأ مرة أخرى'};
  const maxText=(value,max=160)=>String(value??'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,max);
  const esc=value=>maxText(value,250).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateKey=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||''))?String(s):'';
  function sessionDay(s){return dateKey(s?.sessionDate)||dateKey(String(s?.date||'').slice(0,10));}
  function errorKey(error){
    if(!error||typeof error!=='object'||!maxText(error.type,60))return '';
    const type=maxText(error.type,60).normalize('NFC');
    if(error.source==='quran-word'&&Number(error.surahId)>=1&&Number(error.ayah)>=1){
      const location=[Number(error.surahId),Number(error.ayah),Number(error.wordIndex)||0,
        error.targetLevel==='char'?Number(error.charIndex)||0:-1];
      return 'q|'+JSON.stringify([...location,type]);
    }
    return 'm|'+JSON.stringify([type,maxText(error.section,80),maxText(error.note,160)]);
  }
  function normalizeDecision(row){
    if(!row||typeof row!=='object'||!DECISIONS.includes(row.decision))return null;
    const key=maxText(row.key,700),at=maxText(row.at,40);
    if(!key||!['q|','m|'].some(prefix=>key.startsWith(prefix)))return null;
    return {key,decision:row.decision,at,sourceSessionId:maxText(row.sourceSessionId,160),sourceErrorId:maxText(row.sourceErrorId,160)};
  }
  function normalizeDecisions(rows){
    if(!Array.isArray(rows))return [];
    const output=new Map();
    for(const raw of rows.slice(-500)){
      const row=normalizeDecision(raw);
      if(row)output.set(row.key,row);
    }
    return [...output.values()].slice(-200);
  }
  function eventSessions(items,studentId,day,excludedId){
    // A future-dated or currently edited session must never close previous follow-ups.
    return (Array.isArray(items)?items:[]).filter(s=>s&&String(s.studentId)===String(studentId)&&
      s.status==='حضر'&&sessionDay(s)&&sessionDay(s)<day&&String(s.id)!==String(excludedId||''))
      .slice().sort((a,b)=>sessionDay(a).localeCompare(sessionDay(b))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id||'').localeCompare(String(b.id||'')));
  }
  function buildQueue(items,studentId,day,excludedId){
    if(!studentId||!dateKey(day))return [];
    const found=new Map();
    for(const session of eventSessions(items,studentId,day,excludedId)){
      for(const [index,error] of (Array.isArray(session.recitationErrors)?session.recitationErrors:[]).entries()){
        const key=errorKey(error);if(!key)continue;
        const entry=found.get(key)||{key,type:maxText(error.type,60),section:'',where:'',sourceSessionId:'',sourceErrorId:'',firstSeen:'',lastSeen:'',occurrences:0,closed:false,lastDecision:'',correctedInSession:false};
        entry.occurrences++;
        entry.closed=false; // a later recurrence reopens an earlier mastered item
        entry.type=maxText(error.type,60);
        entry.section=maxText(error.section||({new_read:'الحفظ الجديد',talaqqin:'التلقين',recitation:'التسميع',review:'المراجعة'}[error.mode])||'التسميع',80);
        entry.where=error.source==='quran-word'
          ?[error.surah?`سورة ${maxText(error.surah,80)}`:'',error.ayah?`آية ${maxText(error.ayah,8)}`:'',error.word?`«${maxText(error.word,100)}»`:'',error.targetLevel==='char'&&error.charText?`حرف ${maxText(error.charText,15)}`:''].filter(Boolean).join(' · ')
          :maxText(error.note,160);
        entry.sourceSessionId=maxText(session.id,160);
        entry.sourceErrorId=maxText(error.id,160)||`${session.id||''}:${index}`;
        entry.firstSeen||=sessionDay(session);
        entry.lastSeen=sessionDay(session);
        entry.correctedInSession=!!error.resolved;
        found.set(key,entry);
      }
      for(const followup of normalizeDecisions(session.errorFollowups)){
        const entry=found.get(followup.key);
        if(!entry)continue;
        entry.lastDecision=followup.decision;
        entry.closed=followup.decision==='mastered';
        entry.lastChecked=sessionDay(session);
        found.set(followup.key,entry);
      }
    }
    return [...found.values()].filter(x=>!x.closed)
      .sort((a,b)=>a.lastSeen.localeCompare(b.lastSeen)||a.key.localeCompare(b.key));
  }
  const state={decisions:[],context:null,listener:false};
  function reset(){state.decisions=[];state.context=null;}
  function load(rows){state.decisions=normalizeDecisions(rows);}
  function capture(){return state.decisions.map(x=>({...x}));}
  function paint(context){
    const host=typeof document==='object'?document.getElementById('ia27ErrorFollowup'):null;
    if(!host)return;
    state.context=context;
    const {studentId='',day='',sessionId='',sessions=[]}=context||{};
    if(!studentId){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    const queue=buildQueue(sessions,studentId,day,sessionId);
    const current=new Map(state.decisions.map(d=>[d.key,d]));
    const unfinished=queue.filter(x=>current.get(x.key)?.decision!=='mastered');
    host.innerHTML=`<div class="ia27-followup-heading"><div><b>🧭 متابعة أخطاء الطالب</b><small>اسأل الطالب في الأخطاء السابقة، ثم سجّل نتيجة الاختبار</small></div><span class="ia27-followup-count">${unfinished.length} للمتابعة</span></div>`+
      (queue.length?`<div class="ia27-followup-entries">${queue.map((x,i)=>{
        const choice=current.get(x.key)?.decision||'',info=[x.section,x.where||'موضع غير محدد — يُفضّل تحديده عند التسجيل'].filter(Boolean).join(' · ');
        return `<article class="ia27-followup-row ${choice==='mastered'?'ia27-followup-done':''}"><div class="ia27-followup-info"><strong>${esc(x.type)}</strong><small>${esc(info)}</small><small>آخر تسجيل: ${esc(x.lastSeen)} · عدد المرات: ${x.occurrences}${x.correctedInSession?' · صُحّح في الحصة السابقة':''}</small></div><div class="ia27-followup-actions" role="group" aria-label="نتيجة متابعة الخطأ">${DECISIONS.map(d=>`<button type="button" data-followup-index="${i}" data-followup-choice="${d}" class="${choice===d?'selected':''}" aria-pressed="${choice===d}">${labels[d]}</button>`).join('')}</div></article>`;
      }).join('')}</div>`:'<p class="ia27-followup-empty">لا توجد أخطاء سابقة مفتوحة لهذا الطالب.</p>')+
      '<p class="ia27-followup-save-hint">نتائج المتابعة تُحفظ مع الحصة عند الضغط على «حفظ الحصة». التصحيح داخل الحصة لا يغلق المتابعة حتى يؤكد الشيخ الإتقان.</p>';
    host.__ia27Queue=queue;
    if(!state.listener){
      host.addEventListener('click',event=>{
        const button=event.target.closest('button[data-followup-choice]');
        if(!button||!host.contains(button)||!state.context)return;
        const item=host.__ia27Queue?.[Number(button.dataset.followupIndex)];
        if(!item)return;
        const choice=button.dataset.followupChoice;
        if(!DECISIONS.includes(choice))return;
        const previous=state.decisions.find(x=>x.key===item.key);
        state.decisions=state.decisions.filter(x=>x.key!==item.key);
        if(previous?.decision!==choice)state.decisions.push({key:item.key,decision:choice,at:new Date().toISOString(),sourceSessionId:item.sourceSessionId,sourceErrorId:item.sourceErrorId});
        paint(state.context);
        if(typeof globalThis.scheduleDraftSave==='function')globalThis.scheduleDraftSave();
      });
      state.listener=true;
    }
  }
  return {errorKey,buildQueue,normalizeDecision,normalizeDecisions,reset,load,capture,paint};
});
