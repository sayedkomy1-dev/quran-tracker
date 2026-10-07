'use strict';
/* We Live Quran v10.10.0 — read-only guardian/student portal renderer. */
(function guardianPortalView(g){
  const $=id=>document.getElementById(id);
  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function decodePayload(){
    const raw=new URLSearchParams((location.hash||'').replace(/^#/,'')).get('data');if(!raw)return null;
    let b64=raw.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
    const binary=atob(b64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(!data||data.v!==1||!data.student||!data.metrics)return null;
    return data;
  }
  function pct(v){return Number.isFinite(Number(v))?`${Math.round(Number(v))}%`:'—';}
  function statusClass(s){return s==='حضر'?'present':s==='غاب'?'absent':'vacation';}
  function render(data){
    $('portalAcademy').textContent=data.academy?.name||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    $('portalFooterAcademy').textContent=data.academy?.name||'';$('portalTeacher').textContent=data.academy?.teacher||'';
    $('portalPeriod').textContent=data.period||'آخر 30 يومًا';$('portalStudent').textContent=data.student?.name||'طالب';
    const meta=[data.student?.guardian?`ولي الأمر: ${data.student.guardian}`:'',data.student?.group?`الحلقة: ${data.student.group}`:'',data.student?.level?`المستوى: ${data.student.level}`:''].filter(Boolean).join(' · ');
    $('portalMeta').textContent=meta||'متابعة الطالب';
    const gen=new Date(data.generatedAt);$('portalUpdated').textContent=Number.isNaN(gen.getTime())?'—':gen.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'});
    $('portalMastery').textContent=pct(data.metrics.mastery);$('portalAttendance').textContent=pct(data.metrics.attendance);$('portalNewAyat').textContent=String(Math.max(0,Number(data.metrics.newAyat)||0));$('portalRepeats').textContent=String(Math.max(0,Number(data.metrics.repeats)||0));$('portalTrend').textContent=data.metrics.trend||'—';
    const qp=Number(data.metrics.quranProgress);if(Number.isFinite(qp)){$('portalQuranCard').hidden=false;$('portalQuranProgress').textContent=pct(qp);$('portalQuranBar').style.width=`${Math.max(0,Math.min(100,qp))}%`;}
    $('portalAssignmentDate').textContent=data.assignment?.date&&data.assignment.date!=='—'?`من حصة ${data.assignment.date}`:'لا توجد حصة حضور بعد';
    const items=Array.isArray(data.assignment?.items)?data.assignment.items:[];$('portalAssignment').innerHTML=items.length?items.map(x=>`<article class="portal-assignment-item"><b>${esc(x.icon||'')} ${esc(x.label||'')}</b><p>${esc(x.text||'')}</p></article>`).join(''):'<div class="portal-empty">لا يوجد تكليف مسجل حاليًا.</div>';
    const attention=Array.isArray(data.attention)?data.attention:[];$('portalAttention').innerHTML=attention.length?attention.map(x=>`<div class="portal-attention-item"><b>${esc(x.label)}</b><span>${x.score!==null&&x.score!==undefined?`${esc(x.score)}%`:esc(x.grade||'يحتاج متابعة')}</span></div>`).join(''):'<div class="portal-good">✅ لا توجد إشارات حديثة تستدعي التثبيت.</div>';
    const recent=Array.isArray(data.recent)?data.recent:[];$('portalRecent').innerHTML=recent.length?recent.map(x=>`<article class="portal-session ${statusClass(x.status)}"><div class="portal-session-head"><b>${esc(x.status||'—')} · ${esc(x.date||'—')}</b><span class="portal-session-score">${x.score===null||x.score===undefined?'':`${esc(x.score)}%`}</span></div>${Array.isArray(x.recitation)&&x.recitation.length?`<ul>${x.recitation.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</article>`).join(''):'<div class="portal-empty">لا توجد حصص مسجلة بعد.</div>';
    $('portalContent').hidden=false;
  }
  function showError(){const e=$('portalError');if(e)e.hidden=false;const c=$('portalContent');if(c)c.hidden=true;}
  function toast(msg){const t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);}
  async function share(){
    const title=`بوابة متابعة ${$('portalStudent')?.textContent||'الطالب'}`;
    if(navigator.share){try{await navigator.share({title,text:'متابعة الطالب من أكاديمية الإمام',url:location.href});return;}catch(err){if(err?.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(location.href);toast('تم نسخ رابط البوابة');}catch(_){toast('انسخ الرابط من شريط العنوان');}
  }
  function printPage(){window.print();}
  g.portalShare=share;g.portalPrint=printPage;
  try{const data=decodePayload();if(data)render(data);else showError();}catch(err){console.error('[portal decode]',err);showError();}
})(globalThis);
