'use strict';
/* Imam Academy v11.4.0 — Goals & Memorization Planning, Stage 1.
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
  function cleanGoal(raw){
    if(!raw||typeof raw!=='object')return null;
    const type=raw.targetType==='juz'?'juz':'surah';
    const start=/^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate||''))?String(raw.startDate):todayKey();
    const target=/^\d{4}-\d{2}-\d{2}$/.test(String(raw.targetDate||''))?String(raw.targetDate):'';
    const out={v:1,enabled:raw.enabled!==false,targetType:type,startDate:start,targetDate:target,sessionsPerWeek:clamp(raw.sessionsPerWeek||2,1,7),createdAt:String(raw.createdAt||''),updatedAt:String(raw.updatedAt||'')};
    if(type==='juz')out.juz=clamp(raw.juz||30,1,30);
    else{
      const list=surahs(),sid=clamp(raw.surahId||1,1,Math.max(1,list.length||114)),max=list[sid-1]?.a||286;
      out.surahId=sid;out.from=clamp(raw.from||1,1,max);out.to=clamp(raw.to||max,out.from,max);
    }
    return out;
  }
  function studentById(id){return students().find(x=>String(x.id)===String(id))||null;}
  function goalFor(studentId){return cleanGoal(studentById(studentId)?.memorizationGoal);}
  function dayNumber(k){const t=Date.parse(`${k}T12:00:00`);return Number.isFinite(t)?t:NaN;}
  function daysBetween(a,b){const aa=dayNumber(a),bb=dayNumber(b);return Number.isFinite(aa)&&Number.isFinite(bb)?Math.round((bb-aa)/DAY):0;}
  function formatDate(k){if(!k)return '—';const d=new Date(`${k}T12:00:00`);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'});}

  function cumulativeCounts(list){let acc=0;return list.map(s=>{const start=acc+1;acc+=Number(s.ayahCount||s.a||0);return{id:Number(s.id),name:String(s.name||s.n||''),count:Number(s.ayahCount||s.a||0),start,end:acc};});}
  function ordinalOf(rows,surahId,ayah){const s=rows.find(x=>x.id===Number(surahId));return s?s.start+Math.max(1,Number(ayah)||1)-1:0;}
  function verseFromOrdinal(rows,ord){const s=rows.find(x=>ord>=x.start&&ord<=x.end);return s?{surahId:s.id,surah:s.name,ayah:ord-s.start+1,ordinal:ord}:null;}

  function targetVerses(goal){
    goal=cleanGoal(goal);if(!goal||!goal.enabled)return[];
    const list=surahs();
    if(goal.targetType==='surah'){
      const s=list[goal.surahId-1];if(!s)return[];const out=[];for(let a=goal.from;a<=goal.to;a++)out.push({surahId:goal.surahId,surah:s.n,ayah:a});return out;
    }
    const rows=cumulativeCounts(list.map((s,i)=>({id:i+1,name:s.n,ayahCount:s.a}))),cur=JUZ_STARTS[goal.juz-1];if(!cur)return[];
    const next=JUZ_STARTS[goal.juz]||null,first=ordinalOf(rows,cur[0],cur[1]),last=next?ordinalOf(rows,next[0],next[1])-1:rows.at(-1)?.end||first;
    const out=[];for(let o=first;o<=last;o++){const v=verseFromOrdinal(rows,o);if(v)out.push(v);}return out;
  }
  function sectionVerses(sec){
    if(!sec||!sec.surah)return[];const list=surahs(),sid=Number(sec.surahId)||list.findIndex(x=>x.n===sec.surah)+1;if(!sid||!list[sid-1])return[];const max=list[sid-1].a,from=clamp(sec.from||1,1,max),to=clamp(sec.to||from,from,max),out=[];for(let a=from;a<=to;a++)out.push(`${sid}:${a}`);return out;
  }
  function completedKeys(studentId){
    const set=new Set();
    sessions().filter(s=>String(s.studentId)===String(studentId)&&s.status==='حضر').forEach(s=>{
      let sec=s.actualRecitation?.new||null;
      if(!sec){const assessed=!!(s.prevGrades?.new||s.assessmentScores?.new||s.new?.grade);if(assessed)sec=s.new||null;}
      sectionVerses(sec).forEach(k=>set.add(k));
    });
    return set;
  }
  function analyze(studentId,nowKey=todayKey()){
    const st=studentById(studentId),goal=goalFor(studentId);if(!st||!goal||!goal.enabled)return null;
    const target=targetVerses(goal);if(!target.length)return{student:st,goal,error:'TARGET_EMPTY'};
    const done=completedKeys(studentId),completed=target.filter(v=>done.has(`${v.surahId}:${v.ayah}`)),remaining=target.filter(v=>!done.has(`${v.surahId}:${v.ayah}`));
    const total=target.length,doneCount=completed.length,remainingCount=remaining.length,pct=total?Math.round(doneCount*100/total):0;
    const totalDays=Math.max(1,daysBetween(goal.startDate,goal.targetDate||nowKey)),elapsed=Math.max(0,Math.min(totalDays,daysBetween(goal.startDate,nowKey))),expectedPct=goal.targetDate?Math.round(elapsed*100/totalDays):0;
    const daysLeft=goal.targetDate?daysBetween(nowKey,goal.targetDate):0;
    const sessionsLeft=goal.targetDate?Math.max(1,Math.ceil(Math.max(0,daysLeft)/7*goal.sessionsPerWeek)):Math.max(1,Math.ceil(remainingCount/5));
    const recommended=remainingCount?Math.max(1,Math.ceil(remainingCount/sessionsLeft)):0;
    const diff=pct-expectedPct;let status='ontrack',statusLabel='على الخطة';
    if(pct>=100){status='complete';statusLabel='تم تحقيق الهدف';}
    else if(goal.targetDate&&daysLeft<0){status='overdue';statusLabel='تجاوز الموعد';}
    else if(diff>=5){status='ahead';statusLabel='متقدم عن الخطة';}
    else if(diff<=-5){status='behind';statusLabel='متأخر عن الخطة';}
    const first=remaining[0]||null;let next=null;
    if(first){let to=first.ayah,count=1;for(let i=1;i<remaining.length&&count<recommended;i++){const v=remaining[i];if(v.surahId!==first.surahId||v.ayah!==to+1)break;to=v.ayah;count++;}next={surahId:first.surahId,surah:first.surah,from:first.ayah,to,count};}
    const targetLabel=goal.targetType==='juz'?`الجزء ${goal.juz}`:`سورة ${target[0]?.surah||''}${goal.from===1&&goal.to===(surahs()[goal.surahId-1]?.a||goal.to)?' كاملة':` ${goal.from}–${goal.to}`}`;
    const milestones=[25,50,75,100].map(n=>({pct:n,done:pct>=n}));
    return{student:st,goal,target,total,doneCount,remainingCount,pct,expectedPct,diff,daysLeft,sessionsLeft,recommended,status,statusLabel,next,targetLabel,milestones};
  }
  function analyzeSyncPlaceholder(studentId){const st=studentById(studentId),goal=goalFor(studentId);return st&&goal?{student:st,goal}:null;}

  function ensureModalFields(){
    const modal=document.querySelector('#stModal .mo-box');if(!modal||document.getElementById('goalPlanFields'))return;
    const notes=document.getElementById('m-notes')?.closest('.fld');
    const wrap=document.createElement('section');wrap.id='goalPlanFields';wrap.className='goal-plan-editor';wrap.innerHTML=`
      <div class="goal-plan-editor-head"><div><b>🎯 هدف الحفظ طويل المدى</b><small>قسّم الهدف تلقائيًا على الحصص وتابع التقدم والموعد المتوقع</small></div><label class="goal-plan-switch"><input id="m-goal-enabled" type="checkbox"><span>مفعّل</span></label></div>
      <div id="m-goal-body" class="goal-plan-editor-body">
        <div class="frow"><div class="fld"><label>نوع الهدف</label><select id="m-goal-type"><option value="surah">سورة / نطاق آيات</option><option value="juz">جزء كامل</option></select></div><div class="fld"><label>عدد الحصص أسبوعيًا</label><input id="m-goal-sessions" type="number" min="1" max="7" value="2" inputmode="numeric"></div></div>
        <div id="m-goal-surah-wrap"><div class="fld"><label>السورة</label><select id="m-goal-surah"></select></div><div class="frow"><div class="fld"><label>من الآية</label><input id="m-goal-from" type="number" min="1" value="1" inputmode="numeric"></div><div class="fld"><label>إلى الآية</label><input id="m-goal-to" type="number" min="1" value="7" inputmode="numeric"></div></div></div>
        <div id="m-goal-juz-wrap" hidden><div class="fld"><label>الجزء المستهدف</label><select id="m-goal-juz">${Array.from({length:30},(_,i)=>`<option value="${i+1}">الجزء ${i+1}</option>`).join('')}</select></div></div>
        <div class="frow"><div class="fld"><label>بداية الخطة</label><input id="m-goal-start" type="date"></div><div class="fld"><label>موعد تحقيق الهدف</label><input id="m-goal-target" type="date"></div></div>
        <div id="m-goal-preview" class="goal-plan-editor-preview">فعّل الهدف وحدد الموعد لعرض التقسيم المقترح.</div>
      </div>`;
    if(notes)modal.insertBefore(wrap,notes);else modal.appendChild(wrap);
    const s=$('m-goal-surah');s.innerHTML=surahs().map((x,i)=>`<option value="${i+1}">${i+1}. سورة ${esc(x.n)}</option>`).join('');
    ['m-goal-enabled','m-goal-type','m-goal-surah','m-goal-from','m-goal-to','m-goal-juz','m-goal-start','m-goal-target','m-goal-sessions'].forEach(id=>$(id)?.addEventListener('change',()=>{syncGoalFields();previewEditor();}));
    $('m-goal-surah')?.addEventListener('change',()=>{const x=surahs()[Number($('m-goal-surah').value)-1];if(x){$('m-goal-from').value='1';$('m-goal-to').value=String(x.a);}syncGoalFields();previewEditor();});
  }
  function $(id){return document.getElementById(id);}
  function syncGoalFields(){const on=!!$('m-goal-enabled')?.checked,type=$('m-goal-type')?.value||'surah';$('m-goal-body')?.classList.toggle('disabled',!on);if($('m-goal-surah-wrap'))$('m-goal-surah-wrap').hidden=type!=='surah';if($('m-goal-juz-wrap'))$('m-goal-juz-wrap').hidden=type!=='juz';}
  function defaultTargetDate(){const d=new Date();d.setMonth(d.getMonth()+3);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function readEditorGoal(existing=null){
    if(!$('m-goal-enabled')?.checked)return null;const type=$('m-goal-type')?.value==='juz'?'juz':'surah',now=new Date().toISOString();
    const goal={v:1,enabled:true,targetType:type,startDate:$('m-goal-start')?.value||todayKey(),targetDate:$('m-goal-target')?.value||defaultTargetDate(),sessionsPerWeek:clamp($('m-goal-sessions')?.value||2,1,7),createdAt:existing?.createdAt||now,updatedAt:now};
    if(type==='juz')goal.juz=clamp($('m-goal-juz')?.value||30,1,30);else{const sid=clamp($('m-goal-surah')?.value||1,1,114),max=surahs()[sid-1]?.a||286;goal.surahId=sid;goal.from=clamp($('m-goal-from')?.value||1,1,max);goal.to=clamp($('m-goal-to')?.value||max,goal.from,max);}
    return cleanGoal(goal);
  }
  function fillEditor(st){
    ensureModalFields();const goal=cleanGoal(st?.memorizationGoal),enabled=!!goal?.enabled;$('m-goal-enabled').checked=enabled;$('m-goal-type').value=goal?.targetType||'surah';$('m-goal-sessions').value=String(goal?.sessionsPerWeek||Math.max(1,(st?.scheduleDays||[]).length||2));$('m-goal-start').value=goal?.startDate||todayKey();$('m-goal-target').value=goal?.targetDate||defaultTargetDate();
    if(goal?.targetType==='juz')$('m-goal-juz').value=String(goal.juz||30);else{const sid=goal?.surahId||1;$('m-goal-surah').value=String(sid);$('m-goal-from').value=String(goal?.from||1);$('m-goal-to').value=String(goal?.to||surahs()[sid-1]?.a||7);}syncGoalFields();previewEditor();
  }
  function previewEditor(){const box=$('m-goal-preview');if(!box)return;if(!$('m-goal-enabled')?.checked){box.textContent='الهدف غير مفعّل لهذا الطالب.';return;}const fake=readEditorGoal({createdAt:new Date().toISOString()});if(!fake){box.textContent='أكمل بيانات الهدف.';return;}box.textContent='جارٍ حساب الخطة…';const target=targetVerses(fake);const days=Math.max(1,daysBetween(fake.startDate,fake.targetDate)),sessionsCount=Math.max(1,Math.ceil(days/7*fake.sessionsPerWeek)),pace=Math.max(1,Math.ceil(target.length/sessionsCount));box.innerHTML=`<b>${target.length} آية</b> على نحو <b>${sessionsCount} حصة</b> · المتوسط المقترح <b>${pace} آية/حصة</b>`;}

  function ensureProfileCard(){
    if($('goalPlanningCard'))return $('goalPlanningCard');const anchor=$('profStop')||$('profTrack')||$('profHist');if(!anchor)return null;const card=document.createElement('div');card.id='goalPlanningCard';card.className='card goal-planning-card';anchor.parentNode.insertBefore(card,anchor);return card;
  }
  function renderProfile(studentId=currentStudentId()){
    const card=ensureProfileCard();if(!card)return;const st=studentById(studentId),goal=goalFor(studentId);if(!st||!goal||!goal.enabled){card.innerHTML=`<div class="goal-plan-empty"><div><b>🎯 خطة الحفظ الطويلة</b><small>لا يوجد هدف طويل المدى لهذا الطالب.</small></div><button type="button" onclick="goalPlanningEdit('${esc(studentId)}')">إضافة هدف</button></div>`;return;}
    card.innerHTML='<div class="goal-plan-loading">جارٍ حساب خطة الحفظ…</div>';const a=analyze(studentId);if(!a||a.error){card.innerHTML='<div class="goal-plan-empty">تعذر حساب الهدف الحالي.</div>';return;}
    const next=a.next?`سورة ${esc(a.next.surah)} ${a.next.from}${a.next.to>a.next.from?'–'+a.next.to:''}`:'تم استكمال الهدف';
    card.innerHTML=`<div class="goal-plan-head"><div><div class="ch" style="margin:0">🎯 خطة الحفظ</div><small>${esc(a.targetLabel)} · حتى ${esc(formatDate(a.goal.targetDate))}</small></div><span class="goal-plan-status ${a.status}">${esc(a.statusLabel)}</span></div>
      <div class="goal-plan-progress"><div><b>${a.pct}%</b><span>المتوقع الآن ${a.expectedPct}%</span></div><div class="goal-plan-track"><i style="width:${Math.min(100,a.pct)}%"></i><em style="right:${Math.min(100,a.expectedPct)}%"></em></div></div>
      <div class="goal-plan-kpis"><div><b>${a.doneCount}</b><span>تم حفظها</span></div><div><b>${a.remainingCount}</b><span>متبقية</span></div><div><b>${a.recommended}</b><span>آية/حصة مقترح</span></div><div><b>${a.sessionsLeft}</b><span>حصة تقريبًا</span></div></div>
      <div class="goal-plan-milestones">${a.milestones.map(m=>`<span class="${m.done?'done':''}">${m.done?'✓ ':''}${m.pct}%</span>`).join('')}</div>
      <div class="goal-plan-next"><span><small>اقتراح الحصة القادمة</small><b>${next}</b></span>${a.next?`<button type="button" onclick="goalPlanningApply('${esc(studentId)}')">استخدام في الحصة</button>`:''}</div>
      <div class="goal-plan-actions"><button type="button" onclick="goalPlanningEdit('${esc(studentId)}')">تعديل الهدف</button></div>`;
  }
  function editGoal(studentId){if(studentId&&typeof g.openProf==='function'&&currentStudentId()!==String(studentId))g.openProf(studentId);if(typeof g.editSt==='function')g.editSt();setTimeout(()=>{$('goalPlanFields')?.scrollIntoView({behavior:'smooth',block:'center'});$('m-goal-enabled')?.focus();},80);}
  async function applyNext(studentId){const a=analyze(studentId);if(!a?.next){try{g.toast?.('لا يوجد تكليف جديد داخل الهدف','info');}catch(_){}return;}if(typeof g.startFor==='function')g.startFor(studentId);else{try{g.goPage?.('session');const sel=$('sesSt');if(sel){sel.value=studentId;g.onSesSt?.();}}catch(_){}}
    setTimeout(()=>{try{const idx=surahs().findIndex(x=>x.n===a.next.surah);if(idx<0)throw new Error('SURAH');g.setSectionAutoValue?.('new',idx,a.next.from,a.next.to);g.scheduleDraftSave?.();g.setSessionStep?.('new');$('sessionCard-new')?.scrollIntoView({behavior:'smooth',block:'start'});g.toast?.(`تم تجهيز اقتراح الخطة: سورة ${a.next.surah} ${a.next.from}${a.next.to>a.next.from?'–'+a.next.to:''}`,'success');}catch(err){console.warn('[goal plan apply]',err);}},120);
  }
  function guardianData(studentId){const a=analyze(studentId);if(!a||a.error)return null;return{targetLabel:a.targetLabel,targetDate:a.goal.targetDate,progress:a.pct,expected:a.expectedPct,status:a.status,statusLabel:a.statusLabel,completed:a.doneCount,remaining:a.remainingCount,recommendedPerSession:a.recommended,sessionsLeft:a.sessionsLeft,next:a.next?{surah:a.next.surah,from:a.next.from,to:a.next.to,count:a.next.count}:null,milestones:a.milestones};}


  function installHooks(){
    ensureModalFields();const legacy=g.ImamApp?.Legacy;
    const baseAdd=g.openAddSt;if(typeof baseAdd==='function'){const wrapped=function(...args){const out=baseAdd.apply(this,args);setTimeout(()=>fillEditor(null),0);return out;};legacy?.override?legacy.override('openAddSt',wrapped,'v11.4-goal-plan1'):g.openAddSt=wrapped;}
    const baseEdit=g.editSt;if(typeof baseEdit==='function'){const wrapped=function(...args){const st=studentById(currentStudentId());const out=baseEdit.apply(this,args);setTimeout(()=>fillEditor(st),0);return out;};legacy?.override?legacy.override('editSt',wrapped,'v11.4-goal-plan1'):g.editSt=wrapped;}
    const baseSave=g.saveSt;if(typeof baseSave==='function'){const wrapped=function(...args){const editing=typeof editId!=='undefined'?editId:null,before=students().length,existing=editing?studentById(editing):null,goal=readEditorGoal(existing?.memorizationGoal);const out=baseSave.apply(this,args);if($('stModal')?.classList.contains('open'))return out;let st=editing?studentById(editing):(students().length>before?students().at(-1):null);if(st){if(goal)st.memorizationGoal=goal;else delete st.memorizationGoal;st.updatedAt=new Date().toISOString();g.save?.();setTimeout(()=>{renderProfile(st.id);try{g.ImamApp?.GuardianPortal?.refreshPhoneSnapshot?.(st.id);}catch(_){}},0);}return out;};legacy?.override?legacy.override('saveSt',wrapped,'v11.4-goal-plan1'):g.saveSt=wrapped;}
    const baseOpen=g.openProf;if(typeof baseOpen==='function'){const wrapped=function(id,...args){const out=baseOpen.call(this,id,...args);setTimeout(()=>renderProfile(id),0);return out;};legacy?.override?legacy.override('openProf',wrapped,'v11.4-goal-plan1'):g.openProf=wrapped;}
    const baseSession=g.saveSession;if(typeof baseSession==='function'){const wrapped=function(...args){const out=baseSession.apply(this,args);if(out?.studentId)setTimeout(()=>renderProfile(out.studentId),0);return out;};legacy?.override?legacy.override('saveSession',wrapped,'v11.4-goal-plan1'):g.saveSession=wrapped;}
    const baseSan=g.sanitizeBackupData;if(typeof baseSan==='function'){const wrapped=function(d,...args){const safe=baseSan.call(this,d,...args);safe.students.forEach((st,i)=>{const goal=cleanGoal(d.students?.[i]?.memorizationGoal);if(goal)st.memorizationGoal=goal;});return safe;};legacy?.override?legacy.override('sanitizeBackupData',wrapped,'v11.4-goal-plan1'):g.sanitizeBackupData=wrapped;}
  }

  g.goalPlanningApply=applyNext;g.goalPlanningEdit=editGoal;
  g.ImamApp=g.ImamApp||{};g.ImamApp.GoalPlanner={cleanGoal,goalFor,targetVerses,analyze,renderProfile,applyNext,buildGuardian:guardianData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installHooks();},{once:true});else installHooks();
})(globalThis);
