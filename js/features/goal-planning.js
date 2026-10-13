'use strict';
/* Imam Academy v11.4.0 — Goals & Memorization Planning, Stage 1 + Stage 2.
   Per-student long-term Quran target with automatic pacing, milestones,
   ahead/behind calculation, next-session suggestion and guardian summary.
   Stored additively on the existing student object; Local Schema remains 12. */
(function goalPlanningFeature(g){
  const DAY=86400000;
  const JUZ_STARTS=Object.freeze([[1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],[9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]]);
  const appState=()=>g.ImamApp?.State||{};
  const esc=v=>g.ImamApp?.Utils?.escapeHtml?g.ImamApp.Utils.escapeHtml(v??''):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const surahs=()=>{try{return Array.isArray(S)?S:[]}catch(_){return[]}};
  const students=()=>{const v=appState().students;return Array.isArray(v)?v:[];};
  function currentStudentId(){const a=String(appState().curStId||'');if(a)return a;try{return String(typeof curStId!=='undefined'?curStId:'');}catch(_){return '';} }
  const sessions=()=>{const v=appState().sessions;return Array.isArray(v)?v:[];};
  const GOAL_TYPES=['surah','juz','juzRange','quran','custom'];
  const validDate=k=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(k||'')))return false;const d=new Date(`${k}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===k;};
  const isoDay=(k,offset=0)=>{const d=new Date(`${k}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
  const days=raw=>Array.isArray(raw)?[...new Set(raw.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort((a,b)=>a-b):[];
  const actualDays=goal=>goal.weekDays?.length?goal.weekDays:[];
  function cleanGoal(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const type=GOAL_TYPES.includes(raw.targetType)?raw.targetType:'surah';
    const start=validDate(raw.startDate)?raw.startDate:todayKey();
    const target=validDate(raw.targetDate)?raw.targetDate:'';
    const weekDays=days(raw.weekDays);
    const sessionsPerWeek=weekDays.length||clamp(raw.sessionsPerWeek||2,1,7);
    const out={v:2,enabled:raw.enabled!==false,targetType:type,startDate:start,targetDate:target,
      sessionsPerWeek,weekDays,ayahPerSession:clamp(raw.ayahPerSession||0,0,6236),
      createdAt:String(raw.createdAt||'').slice(0,45),updatedAt:String(raw.updatedAt||'').slice(0,45)};
    const list=surahs();
    if(type==='juz')out.juz=clamp(raw.juz||30,1,30);
    if(type==='juzRange'){out.juzFrom=clamp(raw.juzFrom||1,1,30);out.juzTo=clamp(raw.juzTo||30,out.juzFrom,30);}
    if(type==='surah'||type==='custom'){
      const sid=clamp(raw.surahId||1,1,Math.max(1,list.length||114)),max=list[sid-1]?.a||286;
      out.surahId=sid;out.from=clamp(raw.from||1,1,max);
      if(type==='surah')out.to=clamp(raw.to||max,out.from,max);
      else{
        out.endSurahId=clamp(raw.endSurahId||sid,sid,Math.max(sid,list.length||114));
        const limit=list[out.endSurahId-1]?.a||286;
        out.endAyah=clamp(raw.endAyah||limit,out.endSurahId===sid?out.from:1,limit);
      }
    }
    return out;
  }
  function studentById(id){return students().find(x=>String(x.id)===String(id))||null;}
  function goalFor(studentId){return cleanGoal(studentById(studentId)?.memorizationGoal);}
  function dayNumber(k){return validDate(k)?Date.parse(`${k}T12:00:00Z`):NaN;}
  function daysBetween(a,b){const aa=dayNumber(a),bb=dayNumber(b);return Number.isFinite(aa)&&Number.isFinite(bb)?Math.round((bb-aa)/DAY):0;}
  function formatDate(k){if(!validDate(k))return '—';const d=new Date(`${k}T12:00:00Z`);return d.toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
  function weekday(k){return new Date(`${k}T12:00:00Z`).getUTCDay();}
  function countScheduled(from,to,weekDays,frequency){
    if(!validDate(from)||!validDate(to)||from>to)return 0;
    const span=daysBetween(from,to)+1;
    if(weekDays.length){const weeks=Math.floor(span/7);let count=weeks*weekDays.length;for(let n=weeks*7;n<span;n++)if(weekDays.includes(weekday(isoDay(from,n))))count++;return count;}
    return Math.max(0,Math.ceil(span/7*frequency));
  }
  function projectedFinish(after,sessionCount,weekDays,frequency){
    if(!sessionCount)return after;
    if(weekDays.length){let d=after,remaining=sessionCount;const endLimit=Math.min(65000,sessionCount*7+14);for(let i=1;i<=endLimit;i++){d=isoDay(after,i);if(weekDays.includes(weekday(d))&&!--remaining)return d;}return d;}
    return isoDay(after,Math.ceil(sessionCount*7/Math.max(1,frequency)));
  }
  function cumulativeCounts(list){let acc=0;return list.map(s=>{const start=acc+1;acc+=Number(s.ayahCount||s.a||0);return{id:Number(s.id),name:String(s.name||s.n||''),count:Number(s.ayahCount||s.a||0),start,end:acc};});}
  function ordinalOf(rows,surahId,ayah){const s=rows.find(x=>x.id===Number(surahId));return s?s.start+Math.max(1,Number(ayah)||1)-1:0;}
  function verseFromOrdinal(rows,ord){const s=rows.find(x=>ord>=x.start&&ord<=x.end);return s?{surahId:s.id,surah:s.name,ayah:ord-s.start+1,ordinal:ord}:null;}

  function targetVerses(goal){
    goal=cleanGoal(goal);if(!goal||!goal.enabled)return[];
    const list=surahs(),rows=cumulativeCounts(list.map((x,i)=>({id:i+1,name:x.n,ayahCount:x.a})));
    if(!rows.length)return[];
    let from=0,to=0;
    if(goal.targetType==='surah'){
      from=ordinalOf(rows,goal.surahId,goal.from);to=ordinalOf(rows,goal.surahId,goal.to);
    }else if(goal.targetType==='custom'){
      from=ordinalOf(rows,goal.surahId,goal.from);to=ordinalOf(rows,goal.endSurahId,goal.endAyah);
    }else if(goal.targetType==='quran'){
      from=1;to=rows.at(-1).end;
    }else{
      const jf=goal.targetType==='juzRange'?goal.juzFrom:goal.juz;
      const jt=goal.targetType==='juzRange'?goal.juzTo:goal.juz;
      from=ordinalOf(rows,...JUZ_STARTS[jf-1]);
      to=jt===30?rows.at(-1).end:ordinalOf(rows,...JUZ_STARTS[jt])-1;
    }
    if(!from||to<from||to>rows.at(-1).end)return[];
    const out=[];for(let n=from;n<=to;n++){const v=verseFromOrdinal(rows,n);if(v)out.push(v);}return out;
  }
  function sectionVerses(sec){
    if(!sec||!sec.surah)return[];const list=surahs(),sid=Number(sec.surahId)||list.findIndex(x=>x.n===sec.surah)+1;if(!sid||!list[sid-1])return[];const max=list[sid-1].a,from=clamp(sec.from||1,1,max),to=clamp(sec.to||from,from,max),out=[];for(let a=from;a<=to;a++)out.push(`${sid}:${a}`);return out;
  }
  const PASSING_GRADES=new Set(['ممتاز','جيد جداً','جيد جدا','جيد']);
  function completedKeys(studentId){
    const set=new Set();
    // Sort first: pre-v11.2 sessions graded the *previous* attended session's
    // new assignment. Newer sessions record the precise actualRecitation.new.
    const ordered=sessions().filter(s=>String(s.studentId)===String(studentId)&&s.status==='حضر')
      .slice().sort((a,b)=>String(a.sessionDate||a.date||a.createdAt||'').localeCompare(String(b.sessionDate||b.date||b.createdAt||'')));
    ordered.forEach((s,i)=>{
      const actual=s.actualRecitation?.new;
      const grade=String(s.prevGrades?.new||s.assessmentScores?.new||'').trim();
      if(actual){
        // The actual range, not the new assignment for this visit, is authoritative.
        if(PASSING_GRADES.has(grade))sectionVerses(actual).forEach(k=>set.add(k));
        return;
      }
      // Legacy v5: the grade was attached to the same assigned section.
      if(s.new&&PASSING_GRADES.has(String(s.new.grade||'')))sectionVerses(s.new).forEach(k=>set.add(k));
      // Legacy v6: prevGrades.new belongs to the previous session's task.
      // Never treat an ungraded assignment as completed.
      if(PASSING_GRADES.has(String(s.prevGrades?.new||''))){
        for(let j=i-1;j>=0;j--){
          if(ordered[j].new?.surah){sectionVerses(ordered[j].new).forEach(k=>set.add(k));break;}
        }
      }
    });
    return set;
  }
  function analyze(studentId,nowKey=todayKey()){
    const st=studentById(studentId),goal=goalFor(studentId);if(!st||!goal||!goal.enabled)return null;
    const target=targetVerses(goal);if(!target.length)return{student:st,goal,error:'TARGET_EMPTY'};
    const done=completedKeys(studentId),remaining=target.filter(v=>!done.has(`${v.surahId}:${v.ayah}`));
    const total=target.length,doneCount=total-remaining.length,remainingCount=remaining.length;
    const pct=total?Math.floor(doneCount*100/total):0;
    const plannedDays=actualDays(goal),frequency=plannedDays.length||goal.sessionsPerWeek;
    const start=goal.startDate||todayKey(),deadline=goal.targetDate||'';
    const plannedSessions=deadline?countScheduled(start,deadline,plannedDays,frequency):0;
    const elapsedSessions=deadline?countScheduled(start,nowKey<deadline?nowKey:deadline,plannedDays,frequency):0;
    const expectedPct=deadline&&plannedSessions?Math.min(100,Math.round(elapsedSessions*100/plannedSessions)):0;
    const daysLeft=deadline?daysBetween(nowKey,deadline):0;
    const recordedToday=sessions().some(x=>String(x.studentId)===String(studentId)&&(x.sessionDate||String(x.date||'').slice(0,10))===nowKey&&['حضر','غاب','إجازة'].includes(x.status));
    const nextAvailable=recordedToday?isoDay(nowKey,1):nowKey;
    const upcomingStart=nextAvailable>start?nextAvailable:start;
    const sessionsUntilDeadline=deadline?countScheduled(upcomingStart,deadline,plannedDays,frequency):0;
    const preferred=goal.ayahPerSession||0;
    const recommended=remainingCount?Math.max(1,Math.ceil(remainingCount/Math.max(1,sessionsUntilDeadline))):0;
    const nextPace=preferred||recommended;
    const sessionsLeft=remainingCount?Math.ceil(remainingCount/Math.max(1,nextPace)):0;
    const projectionAnchor=isoDay(upcomingStart,-1);
    const expectedFinish=remainingCount?projectedFinish(projectionAnchor,sessionsLeft,plannedDays,frequency):nowKey;
    const diff=pct-expectedPct;let status='ontrack',statusLabel='على الخطة';
    if(pct>=100){status='complete';statusLabel='تم تحقيق الهدف';}
    else if(deadline&&daysLeft<0){status='overdue';statusLabel='تجاوز الموعد';}
    else if(diff>=5){status='ahead';statusLabel='متقدم عن الخطة';}
    else if(diff<=-5||(deadline&&sessionsLeft>sessionsUntilDeadline)){status='behind';statusLabel='متأخر عن الخطة';}
    const first=remaining[0]||null;let next=null;
    if(first){let to=first.ayah,count=1;for(let i=1;i<remaining.length&&count<nextPace;i++){
      const v=remaining[i];if(v.surahId!==first.surahId||v.ayah!==to+1)break;to=v.ayah;count++;
    }next={surahId:first.surahId,surah:first.surah,from:first.ayah,to,count};}
    let targetLabel='';
    if(goal.targetType==='quran')targetLabel='القرآن الكريم كاملًا';
    else if(goal.targetType==='juz')targetLabel=`الجزء ${goal.juz}`;
    else if(goal.targetType==='juzRange')targetLabel=goal.juzFrom===goal.juzTo?`الجزء ${goal.juzFrom}`:`الأجزاء من ${goal.juzFrom} إلى ${goal.juzTo}`;
    else if(goal.targetType==='custom')targetLabel=`من ${target[0].surah} ${goal.from} إلى ${target.at(-1).surah} ${goal.endAyah}`;
    else targetLabel=`سورة ${target[0].surah}${goal.from===1&&goal.to===(surahs()[goal.surahId-1]?.a||goal.to)?' كاملة':` ${goal.from}–${goal.to}`}`;
    // A rounded progress label must never award a milestone early (e.g. 24.9% -> 25%).
    const milestones=[25,50,75,100].map(n=>({pct:n,done:doneCount*100>=total*n}));
    const unlocked=milestones.filter(m=>m.done).map(m=>m.pct);
    const latestMilestone=unlocked.length?unlocked[unlocked.length-1]:0;
    const remainingToNext=latestMilestone===100?0:Math.max(0,Math.ceil(total*(latestMilestone+25)/100)-doneCount);
    const delayed=['behind','overdue'].includes(status);
    const delayMessage=delayed?(status==='overdue'
      ?`انتهى الموعد المستهدف، وما زال ${remainingCount} آية تحتاج إلى تسميع ناجح. راجع الخطة مع الطالب.`
      :`التقدم أقل من المتوقع بمقدار ${Math.max(0,expectedPct-pct)} نقطة مئوية. راجع وتيرة الحفظ أو تاريخ الهدف.`):'';
    return{student:st,goal,target,total,doneCount,remainingCount,pct,expectedPct,diff,daysLeft,
      latestMilestone,remainingToNext,delayMessage,
      sessionsLeft,sessionsUntilDeadline,plannedSessions,recommended,preferred,nextPace,expectedFinish,
      status,statusLabel,next,targetLabel,milestones};
  }
  function analyzeSyncPlaceholder(studentId){const st=studentById(studentId),goal=goalFor(studentId);return st&&goal?{student:st,goal}:null;}

  function $(id){return document.getElementById(id);}
  const DAY_LABELS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  function ensureModalFields(){
    const modal=document.querySelector('#stModal .mo-box');if(!modal||$('goalPlanFields'))return;
    const notes=$('m-notes')?.closest('.fld');
    const wrap=document.createElement('section');wrap.id='goalPlanFields';wrap.className='goal-plan-editor';wrap.innerHTML=`
      <div class="goal-plan-editor-head"><div><b>🎯 خطة الحفظ</b><small>التقدم يُحسب من الحفظ الذي تم تسميعه واجتازه الطالب فعليًا</small></div><label class="goal-plan-switch"><input id="m-goal-enabled" type="checkbox"><span>مفعّل</span></label></div>
      <div id="m-goal-body" class="goal-plan-editor-body">
        <div class="fld"><label for="m-goal-type">هدف الحفظ</label><select id="m-goal-type"><option value="surah">سورة أو نطاق آيات</option><option value="juz">جزء واحد</option><option value="juzRange">عدة أجزاء متتالية</option><option value="quran">القرآن الكريم كاملًا</option><option value="custom">هدف مخصص بين سورتين</option></select></div>
        <div id="m-goal-surah-wrap"><div class="fld"><label for="m-goal-surah">السورة</label><select id="m-goal-surah"></select></div><div class="frow"><div class="fld"><label for="m-goal-from">من الآية</label><input id="m-goal-from" type="number" min="1" value="1" inputmode="numeric"></div><div class="fld" id="m-goal-to-wrap"><label for="m-goal-to">إلى الآية</label><input id="m-goal-to" type="number" min="1" value="7" inputmode="numeric"></div></div></div>
        <div id="m-goal-custom-end" hidden><div class="fld"><label for="m-goal-end-surah">حتى سورة</label><select id="m-goal-end-surah"></select></div><div class="fld"><label for="m-goal-end-ayah">وحتى الآية</label><input id="m-goal-end-ayah" type="number" min="1" value="7" inputmode="numeric"></div></div>
        <div id="m-goal-juz-wrap" hidden><div class="fld"><label for="m-goal-juz">الجزء المستهدف</label><select id="m-goal-juz">${Array.from({length:30},(_,i)=>`<option value="${i+1}">الجزء ${i+1}</option>`).join('')}</select></div></div>
        <div id="m-goal-juz-range" hidden><div class="frow"><div class="fld"><label for="m-goal-juz-from">من جزء</label><select id="m-goal-juz-from"></select></div><div class="fld"><label for="m-goal-juz-to">إلى جزء</label><select id="m-goal-juz-to"></select></div></div></div>
        <div class="frow"><div class="fld"><label for="m-goal-start">بداية الخطة</label><input id="m-goal-start" type="date"></div><div class="fld"><label for="m-goal-target">التاريخ المستهدف للانتهاء</label><input id="m-goal-target" type="date"></div></div>
        <div class="frow"><div class="fld"><label for="m-goal-sessions">حصص أسبوعيًا</label><input id="m-goal-sessions" type="number" min="1" max="7" value="2" inputmode="numeric"></div><div class="fld"><label for="m-goal-pace">آيات لكل حصة (اختياري)</label><input id="m-goal-pace" type="number" min="0" max="6236" value="0" placeholder="تلقائي" inputmode="numeric"></div></div>
        <fieldset class="goal-plan-days"><legend>أيام الحصص المقترحة (اختياري)</legend><div class="goal-plan-days-options">${DAY_LABELS.map((day,i)=>`<label><input class="m-goal-day" type="checkbox" value="${i}"><span>${day}</span></label>`).join('')}</div><small>إذا حددت أيامًا، يعتمد الحساب على عددها الفعلي؛ لا يغير هذا جدول الطالب الأساسي.</small></fieldset>
        <div id="m-goal-preview" class="goal-plan-editor-preview" aria-live="polite"></div>
      </div>`;
    if(notes)modal.insertBefore(wrap,notes);else modal.appendChild(wrap);
    const s=surahs().map((x,i)=>`<option value="${i+1}">${i+1}. سورة ${esc(x.n)}</option>`).join('');
    $('m-goal-surah').innerHTML=s;$('m-goal-end-surah').innerHTML=s;
    const juz=Array.from({length:30},(_,i)=>`<option value="${i+1}">الجزء ${i+1}</option>`).join('');
    $('m-goal-juz-from').innerHTML=juz;$('m-goal-juz-to').innerHTML=juz;
    wrap.addEventListener('change',e=>{
      if(e.target.id==='m-goal-surah'){
        const meta=surahs()[Number(e.target.value)-1];if(meta){$('m-goal-from').value=1;$('m-goal-to').value=meta.a;}
        if($('m-goal-type').value==='custom'){$('m-goal-end-surah').value=e.target.value;$('m-goal-end-ayah').value=meta.a;}
      }
      if(e.target.id==='m-goal-end-surah')$('m-goal-end-ayah').value=surahs()[Number(e.target.value)-1]?.a||1;
      if(e.target.id==='m-goal-juz-from'&&Number($('m-goal-juz-to').value)<Number(e.target.value))$('m-goal-juz-to').value=e.target.value;
      if(e.target.classList.contains('m-goal-day')){const n=wrap.querySelectorAll('.m-goal-day:checked').length;if(n)$('m-goal-sessions').value=n;}
      syncGoalFields();previewEditor();
    });
    wrap.addEventListener('input',e=>{if(e.target.matches('input[type=number],input[type=date]'))previewEditor();});
  }
  function syncGoalFields(){
    const on=!!$('m-goal-enabled')?.checked,type=$('m-goal-type')?.value||'surah';
    $('m-goal-body')?.classList.toggle('disabled',!on);
    $('m-goal-surah-wrap').hidden=!['surah','custom'].includes(type);
    $('m-goal-to-wrap').hidden=type!=='surah';$('m-goal-custom-end').hidden=type!=='custom';
    $('m-goal-juz-wrap').hidden=type!=='juz';$('m-goal-juz-range').hidden=type!=='juzRange';
    $('m-goal-sessions').disabled=!!document.querySelector('.m-goal-day:checked');
  }
  function defaultTargetDate(){const d=new Date();d.setMonth(d.getMonth()+3);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function readEditorGoal(existing=null){
    if(!$('m-goal-enabled')?.checked)return null;
    const type=$('m-goal-type')?.value||'surah',now=new Date().toISOString();
    const weekDays=[...document.querySelectorAll('.m-goal-day:checked')].map(x=>Number(x.value));
    const goal={v:2,enabled:true,targetType:type,startDate:$('m-goal-start')?.value||todayKey(),targetDate:$('m-goal-target')?.value||defaultTargetDate(),
      sessionsPerWeek:weekDays.length||clamp($('m-goal-sessions')?.value||2,1,7),weekDays,
      ayahPerSession:clamp($('m-goal-pace')?.value||0,0,6236),createdAt:existing?.createdAt||now,updatedAt:now};
    if(type==='juz')goal.juz=Number($('m-goal-juz').value);
    else if(type==='juzRange'){goal.juzFrom=Number($('m-goal-juz-from').value);goal.juzTo=Number($('m-goal-juz-to').value);}
    else if(type==='surah'||type==='custom'){
      goal.surahId=Number($('m-goal-surah').value);goal.from=Number($('m-goal-from').value);
      if(type==='surah')goal.to=Number($('m-goal-to').value);
      else{goal.endSurahId=Number($('m-goal-end-surah').value);goal.endAyah=Number($('m-goal-end-ayah').value);}
    }
    return cleanGoal(goal);
  }
  function fillEditor(st){
    ensureModalFields();const goal=cleanGoal(st?.memorizationGoal);$('m-goal-enabled').checked=!!goal?.enabled;
    $('m-goal-type').value=goal?.targetType||'surah';$('m-goal-sessions').value=goal?.sessionsPerWeek||Math.max(1,days(st?.scheduleDays).length||2);
    $('m-goal-pace').value=goal?.ayahPerSession||0;$('m-goal-start').value=goal?.startDate||todayKey();$('m-goal-target').value=goal?.targetDate||defaultTargetDate();
    $('m-goal-surah').value=goal?.surahId||1;$('m-goal-from').value=goal?.from||1;$('m-goal-to').value=goal?.to||surahs()[Number($('m-goal-surah').value)-1]?.a||7;
    $('m-goal-end-surah').value=goal?.endSurahId||goal?.surahId||1;
    $('m-goal-end-ayah').value=goal?.endAyah||surahs()[Number($('m-goal-end-surah').value)-1]?.a||7;
    $('m-goal-juz').value=goal?.juz||30;$('m-goal-juz-from').value=goal?.juzFrom||1;$('m-goal-juz-to').value=goal?.juzTo||30;
    // Existing students inherit class days as a starting suggestion, without modifying their schedule.
    const chosen=goal?goal.weekDays:days(st?.scheduleDays);
    document.querySelectorAll('.m-goal-day').forEach(input=>input.checked=chosen.includes(Number(input.value)));
    syncGoalFields();previewEditor();
  }
  function validateEditor(){
    if(!$('m-goal-enabled')?.checked)return true;
    const a=$('m-goal-start')?.value,b=$('m-goal-target')?.value;
    if(!validDate(a)||!validDate(b)||daysBetween(a,b)<0){g.toast?.('تأكد من تاريخ بداية الخطة وموعد انتهائها؛ النهاية لا تسبق البداية','error');return false;}
    const type=$('m-goal-type').value;
    if((type==='juzRange'&&Number($('m-goal-juz-from').value)>Number($('m-goal-juz-to').value))||
       (type==='surah'&&Number($('m-goal-from').value)>Number($('m-goal-to').value))||
       (type==='custom'&&(Number($('m-goal-end-surah').value)<Number($('m-goal-surah').value)||
         (Number($('m-goal-end-surah').value)===Number($('m-goal-surah').value)&&Number($('m-goal-end-ayah').value)<Number($('m-goal-from').value))))){
      g.toast?.('نهاية الحفظ يجب أن تكون بعد البداية','error');return false;
    }
    return true;
  }
  function previewEditor(){
    const box=$('m-goal-preview');if(!box)return;
    if(!$('m-goal-enabled')?.checked){box.textContent='فعّل الخطة لإنشاء هدف الحفظ.';return;}
    const fake=readEditorGoal({createdAt:new Date().toISOString()});
    if(!fake||!validDate(fake.targetDate)||fake.targetDate<fake.startDate){box.textContent='حدد تاريخ بداية ونهاية صحيحين.';return;}
    const target=targetVerses(fake),schedule=actualDays(fake);
    const amount=countScheduled(fake.startDate,fake.targetDate,schedule,schedule.length||fake.sessionsPerWeek);
    const minimum=Math.ceil(target.length/Math.max(1,amount));
    box.innerHTML=`<b>${target.length} آية</b> · <b>${amount} حصة مخططة</b> · المطلوب للحاق بالموعد <b>${minimum} آية/حصة</b>${fake.ayahPerSession?` · المقدار الذي حددته: <b>${fake.ayahPerSession} آية/حصة</b>`:''}`;
  }
  function milestoneMarkup(a,context='teacher'){
    const levels=a.milestones||[];
    return `<div class="goal-plan-milestones" aria-label="مراحل الإنجاز">${levels.map(m=>`<span class="${m.done?'done':''}" title="${m.done?'تم اجتياز':'لم يكتمل بعد'} ${m.pct}%">${m.done?'✓ ':'○ '}${m.pct}%</span>`).join('')}</div>
      <div class="goal-plan-milestone-detail">${a.latestMilestone===100?'<b>🏆 اكتمل هدف الحفظ!</b>':a.latestMilestone?`<b>🏅 تم تحقيق إنجاز ${a.latestMilestone}%</b><small>تبقّت ${a.remainingToNext} آية للوصول للمرحلة التالية</small>`:`<small>تبقّت ${a.remainingToNext} آية للوصول لأول إنجاز (25%)</small>`}
      ${a.latestMilestone?`<button type="button" data-goal-celebrate="${a.latestMilestone}" data-goal-context="${esc(context)}">🎉 عرض التهنئة</button>`:''}</div>`;
  }
  function celebrateMilestone(name,level){
    if(![25,50,75,100].includes(Number(level))||!document?.body)return;
    document.getElementById('goalMilestoneModal')?.remove();
    const overlay=document.createElement('div');overlay.id='goalMilestoneModal';overlay.className='goal-milestone-overlay';overlay.setAttribute('role','presentation');
    overlay.innerHTML=`<section class="goal-milestone-dialog" role="dialog" aria-modal="true" aria-labelledby="goalMilestoneTitle" dir="rtl"><div class="goal-milestone-sparkles" aria-hidden="true">✦ ✧ ✦</div><div class="goal-milestone-medal" aria-hidden="true">${Number(level)===100?'🏆':'🏅'}</div><h2 id="goalMilestoneTitle">ما شاء الله، إنجاز رائع!</h2><p>${esc(name||'الطالب')} أتمّ ${Number(level)}% من خطة الحفظ الموثّقة بالتسميع الناجح.</p><strong>${Number(level)}%</strong><small>نسأل الله أن يبارك في حفظه ويعينه على الإتقان والتثبيت.</small><button type="button" data-goal-close>متابعة الرحلة القرآنية</button></section>`;
    const close=()=>{document.removeEventListener('keydown',onKey);overlay.remove();};
    const onKey=e=>{if(e.key==='Escape')close();};
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-goal-close]'))close();});
    document.body.appendChild(overlay);document.addEventListener('keydown',onKey);
    overlay.querySelector('[data-goal-close]')?.focus();
  }
  function goalPlanningCelebrate(studentId,level){
    const a=analyze(studentId);if(!a||a.error||!a.milestones.some(m=>m.pct===Number(level)&&m.done))return false;
    celebrateMilestone(a.student.name,level);return true;
  }
  function goalPlanningNotice(a){
    if(!a.delayMessage)return '';
    return `<div class="goal-plan-warning" role="status"><b>⏳ ${a.status==='overdue'?'الموعد المستهدف انتهى':'الخطة تحتاج متابعة'}</b><small>${esc(a.delayMessage)}</small><small>تنبيه إرشادي للمحفظ؛ لا يتم تغيير التكليف أو الجدول تلقائيًا.</small></div>`;
  }
  function ensureProfileCard(){
    if($('goalPlanningCard'))return $('goalPlanningCard');const anchor=$('profStop')||$('profTrack')||$('profHist');if(!anchor)return null;const card=document.createElement('div');card.id='goalPlanningCard';card.className='card goal-planning-card';anchor.parentNode.insertBefore(card,anchor);return card;
  }
  function renderProfile(studentId=currentStudentId()){
    const card=ensureProfileCard();if(!card)return;const st=studentById(studentId),goal=goalFor(studentId);
    if(!st||!goal||!goal.enabled){card.innerHTML=`<div class="goal-plan-empty"><div><b>🎯 خطة الحفظ</b><small>لم يتم إنشاء خطة حفظ لهذا الطالب.</small></div><button type="button" onclick="goalPlanningEdit('${esc(studentId)}')">إنشاء خطة</button></div>`;return;}
    const a=analyze(studentId);if(!a||a.error){card.innerHTML='<div class="goal-plan-empty">تعذر حساب الهدف الحالي.</div>';return;}
    const next=a.next?`سورة ${esc(a.next.surah)} ${a.next.from}${a.next.to>a.next.from?'–'+a.next.to:''}`:'تم استكمال الهدف';
    const pace=a.preferred?`المحدد ${a.preferred} · اللازم للموعد ${a.recommended}`:`${a.recommended} مقترحة`;
    card.innerHTML=`<div class="goal-plan-head"><div><div class="ch" style="margin:0">🎯 خطة الحفظ</div><small>${esc(a.targetLabel)} · المستهدف ${esc(formatDate(a.goal.targetDate))}</small></div><span class="goal-plan-status ${a.status}">${esc(a.statusLabel)}</span></div>
      <div class="goal-plan-progress"><div><b>${a.pct}%</b><span>المتوقع حتى اليوم ${a.expectedPct}%</span></div><div class="goal-plan-track"><i style="width:${Math.min(100,a.pct)}%"></i><em style="right:${Math.min(100,a.expectedPct)}%"></em></div></div>
      <div class="goal-plan-kpis"><div><b>${a.total}</b><span>إجمالي الآيات</span></div><div><b>${a.doneCount}</b><span>تم تسميعها بنجاح</span></div><div><b>${a.remainingCount}</b><span>المتبقي</span></div><div><b>${a.sessionsLeft}</b><span>حصة متوقعة</span></div></div>
      <div class="goal-plan-pacing"><div><small>المقدار لكل حصة</small><strong>${esc(pace)}</strong></div><div><small>تاريخ الإتمام المتوقع</small><strong>${esc(formatDate(a.expectedFinish))}</strong></div></div>
      ${goalPlanningNotice(a)}
      ${milestoneMarkup(a)}
      <div class="goal-plan-next"><span><small>اقتراح الحفظ للحصة القادمة — لا يُطبق تلقائيًا</small><b>${next}</b></span>${a.next?`<button type="button" onclick="goalPlanningApply('${esc(studentId)}')">موافقة واستخدام</button>`:''}</div>
      <div class="goal-plan-actions"><button type="button" onclick="goalPlanningEdit('${esc(studentId)}')">تعديل الخطة</button></div>`;
    card.querySelectorAll('[data-goal-celebrate]').forEach(btn=>btn.addEventListener('click',()=>goalPlanningCelebrate(studentId,Number(btn.dataset.goalCelebrate))));
  }
  function ensureHomeCard(){
    let node=$('goalPlanningHome');if(node)return node;
    const anchor=$('homeAnalysis');if(!anchor)return null;
    node=document.createElement('div');node.id='goalPlanningHome';node.className='card goal-planning-home';
    anchor.insertAdjacentElement('afterend',node);return node;
  }
  function renderHome(){
    const box=ensureHomeCard();if(!box)return;
    const stats=students().map(st=>analyze(st.id)).filter(x=>x&&!x.error);
    if(!stats.length){box.innerHTML='<div class="goal-plan-home-head"><b>🎯 خطط الحفظ</b><small>ابدأ من ملف الطالب لإنشاء أول خطة.</small></div>';return;}
    const completed=stats.filter(x=>x.status==='complete').length,behind=stats.filter(x=>['behind','overdue'].includes(x.status)).length;
    const ranked=stats.filter(x=>x.status!=='complete').sort((a,b)=>({overdue:0,behind:1,ontrack:2,ahead:3}[a.status]??4)-({overdue:0,behind:1,ontrack:2,ahead:3}[b.status]??4)).slice(0,4);
    box.innerHTML=`<div class="goal-plan-home-head"><div><b>🎯 خطط الحفظ</b><small>${stats.length} طالب لديهم خطة · ${completed} مكتملة · ${behind} تحتاج متابعة</small></div>${behind?`<span class="goal-plan-home-alert" role="status">⏳ ${behind} خطة تحتاج متابعة</span>`:''}</div>
      <div class="goal-plan-home-list">${ranked.map(a=>`<button type="button" class="goal-plan-home-row" data-goal-student="${esc(a.student.id)}"><span><b>${esc(a.student.name)}</b><small>${esc(a.targetLabel)}</small></span><strong>${a.pct}%</strong><em class="goal-plan-status ${a.status}">${esc(a.statusLabel)}</em></button>`).join('')||'<small>كل الخطط الحالية مكتملة ✓</small>'}</div>`;
    box.querySelectorAll('[data-goal-student]').forEach(btn=>btn.addEventListener('click',()=>g.openProf?.(btn.dataset.goalStudent)));
  }
  function editGoal(studentId){if(studentId&&typeof g.openProf==='function'&&currentStudentId()!==String(studentId))g.openProf(studentId);if(typeof g.editSt==='function')g.editSt();setTimeout(()=>{$('goalPlanFields')?.scrollIntoView({behavior:'smooth',block:'center'});$('m-goal-enabled')?.focus();},80);}
  async function applyNext(studentId){
    const a=analyze(studentId);if(!a?.next){g.toast?.('لا يوجد حفظ جديد ضمن الهدف','info');return false;}
    const label=`سورة ${a.next.surah} من ${a.next.from} إلى ${a.next.to}`;
    // Explicit teacher approval, before navigating or touching an existing draft.
    if(typeof g.confirm==='function'&&!g.confirm(`استخدام اقتراح الخطة في الحصة للطالب ${a.student.name}؟\n${label}\n\nقد يستبدل هذا حقل الحفظ الجديد في مسودة الحصة. لن يتم حفظ الحصة أو إرسالها تلقائيًا.`))return false;
    if(typeof g.setSectionAutoValue!=='function'){g.toast?.('تعذر تحميل أداة الحصة','error');return false;}
    if(typeof g.startFor==='function')g.startFor(studentId);
    else{g.goPage?.('session');const el=$('sesSt');if(el){el.value=studentId;g.onSesSt?.();}}
    setTimeout(()=>{
      try{g.setSectionAutoValue('new',a.next.surahId-1,a.next.from,a.next.to);g.scheduleDraftSave?.();g.setSessionStep?.('new');$('sessionCard-new')?.scrollIntoView({behavior:'smooth',block:'start'});g.toast?.(`تم وضع الاقتراح في مسودة الحصة: ${label} — راجعه ثم احفظه بنفسك`,'success');}
      catch(err){console.warn('[goal plan apply]',err);g.toast?.('تعذر تطبيق الاقتراح','error');}
    },120);return true;
  }
  function guardianData(studentId){const a=analyze(studentId);if(!a||a.error)return null;return{targetLabel:a.targetLabel,targetDate:a.goal.targetDate,progress:a.pct,expected:a.expectedPct,status:a.status,statusLabel:a.statusLabel,completed:a.doneCount,total:a.total,remaining:a.remainingCount,recommendedPerSession:a.recommended,sessionsLeft:a.sessionsLeft,expectedFinish:a.expectedFinish,delayMessage:a.delayMessage,latestMilestone:a.latestMilestone,remainingToNext:a.remainingToNext,next:a.next?{surah:a.next.surah,from:a.next.from,to:a.next.to,count:a.next.count}:null,milestones:a.milestones};}


  function installHooks(){
    ensureModalFields();const legacy=g.ImamApp?.Legacy;
    const baseAdd=g.openAddSt;if(typeof baseAdd==='function'){const wrapped=function(...args){const out=baseAdd.apply(this,args);setTimeout(()=>fillEditor(null),0);return out;};legacy?.override?legacy.override('openAddSt',wrapped,'v11.4-goal-plan1'):g.openAddSt=wrapped;}
    const baseEdit=g.editSt;if(typeof baseEdit==='function'){const wrapped=function(...args){const st=studentById(currentStudentId());const out=baseEdit.apply(this,args);setTimeout(()=>fillEditor(st),0);return out;};legacy?.override?legacy.override('editSt',wrapped,'v11.4-goal-plan1'):g.editSt=wrapped;}
    const baseSave=g.saveSt;if(typeof baseSave==='function'){const wrapped=function(...args){const editing=typeof editId!=='undefined'?editId:null,before=students().length,existing=editing?studentById(editing):null,goal=readEditorGoal(existing?.memorizationGoal);if(!validateEditor())return;const out=baseSave.apply(this,args);if($('stModal')?.classList.contains('open'))return out;let st=editing?studentById(editing):(students().length>before?students().at(-1):null);if(st){if(goal)st.memorizationGoal=goal;else delete st.memorizationGoal;st.updatedAt=new Date().toISOString();g.save?.();setTimeout(()=>{renderProfile(st.id);renderHome();try{g.ImamApp?.GuardianPortal?.refreshPhoneSnapshot?.(st.id);}catch(_){}},0);}return out;};legacy?.override?legacy.override('saveSt',wrapped,'v11.4-goal-plan1'):g.saveSt=wrapped;}
    const baseOpen=g.openProf;if(typeof baseOpen==='function'){const wrapped=function(id,...args){const out=baseOpen.call(this,id,...args);setTimeout(()=>renderProfile(id),0);return out;};legacy?.override?legacy.override('openProf',wrapped,'v11.4-goal-plan1'):g.openProf=wrapped;}
    const baseSession=g.saveSession;if(typeof baseSession==='function'){const wrapped=function(...args){
      const sid=String($('sesSt')?.value||currentStudentId()||'');
      const before=sid?analyze(sid):null;
      const out=baseSession.apply(this,args);
      if(out?.studentId)setTimeout(()=>{
        const after=analyze(out.studentId);renderProfile(out.studentId);renderHome();
        if(before&&after&&!after.error&&String(before.student?.id)===String(after.student?.id)&&after.latestMilestone>before.latestMilestone){
          g.toast?.(`🏅 مبروك! ${after.student.name} وصل إلى ${after.latestMilestone}% من خطة الحفظ`,'success');
          // Congratulations do not generate certificates or alter student records.
        }
      },0);
      return out;};legacy?.override?legacy.override('saveSession',wrapped,'v11.4-goal-plan1'):g.saveSession=wrapped;}
    const baseHome=g.renderHome;if(typeof baseHome==='function'){const wrapped=function(...args){const out=baseHome.apply(this,args);renderHome();return out;};legacy?.override?legacy.override('renderHome',wrapped,'v11.4-goal-plan1'):g.renderHome=wrapped;}
    const baseSan=g.sanitizeBackupData;if(typeof baseSan==='function'){const wrapped=function(d,...args){const safe=baseSan.call(this,d,...args);safe.students.forEach((st,i)=>{const goal=cleanGoal(d.students?.[i]?.memorizationGoal);if(goal)st.memorizationGoal=goal;});return safe;};legacy?.override?legacy.override('sanitizeBackupData',wrapped,'v11.4-goal-plan1'):g.sanitizeBackupData=wrapped;}
  }

  g.goalPlanningApply=applyNext;g.goalPlanningEdit=editGoal;g.goalPlanningCelebrate=goalPlanningCelebrate;
  g.ImamApp=g.ImamApp||{};g.ImamApp.GoalPlanner={cleanGoal,goalFor,targetVerses,completedKeys,analyze,renderProfile,renderHome,applyNext,buildGuardian:guardianData,celebrateMilestone,goalPlanningCelebrate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installHooks();},{once:true});else installHooks();
})(globalThis);
