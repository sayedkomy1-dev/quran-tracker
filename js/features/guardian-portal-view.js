'use strict';
/* We Live Quran v11.2.0 Stage 4.1 — guardian/student portal renderer + Tahfeez Center context.
   Supports: Stage 1 #data= snapshot, Stage 2 #p= live link,
   and Stage 3 #s= phone/PIN authenticated short-lived session. */
(function guardianPortalView(g){
  const SUPABASE_URL='https://svtcntalwfmexthcnvqe.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
  const SESSION_KEY='wlq_guardian_portal_session_v1';
  const $=id=>document.getElementById(id);
  let liveToken='';
  let sessionToken='';
  let portalMode='snapshot';
  let sessionRows=[];

  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function hashParams(){return new URLSearchParams((location.hash||'').replace(/^#/,''));}
  function uuid(value){const token=String(value||'').trim().toLowerCase();return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token)?token:'';}
  function decodePayload(){
    const raw=hashParams().get('data');if(!raw)return null;
    let b64=raw.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
    const binary=atob(b64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const data=JSON.parse(new TextDecoder().decode(bytes));
    return validSnapshot(data)?data:null;
  }
  function tokenFromHash(key){return uuid(hashParams().get(key));}
  function validSnapshot(data){return !!(data&&data.v===1&&data.student&&data.metrics&&data.academy);}
  function pct(v){return Number.isFinite(Number(v))?`${Math.round(Number(v))}%`:'—';}
  function statusClass(s){return s==='حضر'?'present':s==='غاب'?'absent':'vacation';}
  function safeDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
  function formatDateTime(value){const d=safeDate(value);return d?d.toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';}
  function setLiveState(kind,text){const el=$('portalLiveState');if(!el)return;el.hidden=!text;el.className=`portal-live-state ${kind||''}`;el.textContent=text||'';}
  function setModeActions(mode){
    portalMode=mode;
    const refresh=$('portalRefreshBtn'),share=$('portalShareBtn'),logout=$('portalLogoutBtn');
    if(refresh)refresh.hidden=!(mode==='live'||mode==='session');
    if(share)share.hidden=mode==='session';
    if(logout)logout.hidden=mode!=='session';
  }
  function setNote(mode){
    const title=$('portalNoteTitle'),text=$('portalNoteText');setModeActions(mode);
    if(mode==='session'){
      if(title)title.textContent='دخول آمن برقم الهاتف + PIN';
      if(text)text.textContent='هذه جلسة قراءة فقط بعد التحقق من رقم الهاتف ورمز الدخول. رمز PIN نفسه يظل صالحًا حتى يغيّره المحفظ، بينما قد يحتاج تسجيل الدخول على هذا الجهاز إلى تجديد دوري.';
    }else if(mode==='live'){
      if(title)title.textContent='رابط قراءة فقط قابل للتحديث';
      if(text)text.textContent='يعرض هذا الرابط آخر نسخة نشرها المحفظ. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، ويمكن للمحفظ إيقاف الرابط في أي وقت.';
    }else{
      if(title)title.textContent='نسخة قراءة فقط';
      if(text)text.textContent='هذه لقطة ثابتة من بيانات الطالب وقت إنشاء الرابط. لا يمكن تعديل بيانات الأكاديمية من هذه الصفحة، وأي شخص يملك الرابط يستطيع الاطلاع على اللقطة.';
    }
  }
  function correctionModeLabel(v){return v==='new_read'?'الحفظ الجديد':v==='talaqqin'?'التلقين':v==='review'?'المراجعة':'التسميع';}
  function correctionClass(c){if(c?.resolved)return 'resolved';if(c?.group==='tajweed')return 'tajweed';if(c?.group==='memory')return 'memory';if(c?.group==='custom')return 'custom';return 'pronunciation';}
  function renderVerseWithMarks(group){
    const text=String(group?.text||'').trim();if(!text)return `<div class="portal-correction-verse-text"><mark>${esc(group?.rows?.[0]?.word||'موضع التصحيح')}</mark></div>`;
    const words=text.split(/\s+/).filter(Boolean),by=new Map();for(const c of group.rows||[]){const i=Math.max(0,Number(c.wordIndex)||0);if(!by.has(i))by.set(i,[]);by.get(i).push(c);}
    return `<div class="portal-correction-verse-text">${words.map((w,i)=>{const rows=by.get(i)||[];if(!rows.length)return esc(w);const cls=correctionClass(rows.find(x=>!x.resolved)||rows[0]);const chars=[...new Set(rows.filter(x=>x.char).map(x=>x.char))];return `<mark class="${cls}" title="${esc(rows.map(x=>x.type).join('، '))}">${esc(w)}${chars.length?`<small>${esc(chars.join('، '))}</small>`:''}</mark>`;}).join(' ')}</div>`;
  }
  function correctionGroups(rows){const map=new Map();for(const c of rows||[]){const key=`${c.surah||''}:${c.ayah||0}`;if(!map.has(key))map.set(key,{surah:c.surah||'',ayah:Number(c.ayah)||1,text:c.ayahText||'',rows:[]});const g=map.get(key);if(!g.text&&c.ayahText)g.text=c.ayahText;g.rows.push(c);}return [...map.values()];}
  function practiceCorrectionRange(surah,from,to){try{g.ImamGuardianTahfeez?.openCorrectionRange?.({surah,from,to,practiceMode:'stabilize'});}catch(err){console.warn('[guardian correction practice]',err);}}
  function revisionPractice(surah,from,to){
    try{g.ImamGuardianEngagement?.log?.('correction_practice_open',1,{origin:'smart_revision',surah:String(surah||'').slice(0,80),from:Number(from)||1,to:Number(to)||Number(from)||1});}catch(_){}
    try{g.ImamGuardianTahfeez?.openCorrectionRange?.({surah,from,to,practiceMode:'stabilize'});}catch(err){console.warn('[guardian smart revision]',err);}
  }
  function renderSmartRevision(data){
    const box=$('portalSmartRevision'),body=$('portalSmartRevisionBody'),count=$('portalSmartRevisionCount');if(!box||!body||!count)return;
    const rev=data?.smartRevision||null,rows=Array.isArray(rev?.today)?rev.today:[],upcoming=Array.isArray(rev?.upcoming)?rev.upcoming:[];
    if(!rev||(!rows.length&&!upcoming.length)){box.hidden=true;body.innerHTML='';count.textContent='0';return;}
    box.hidden=false;count.textContent=rows.length?`${rows.length} اليوم`:'القادم';
    const source=rows.length?rows:upcoming.slice(0,3),groups=new Map();
    for(const x of source){const surah=String(x.surah||'').trim()||'—',ayah=Math.max(1,Number(x.ayah)||1);if(!groups.has(surah))groups.set(surah,{from:ayah,to:ayah,rows:[]});const gr=groups.get(surah);gr.from=Math.min(gr.from,ayah);gr.to=Math.max(gr.to,ayah);gr.rows.push(x);}
    body.innerHTML=`<div class="portal-revision-stats"><div><b>${Math.max(0,Number(rev.dueCount)||0)}</b><span>مستحق الآن</span></div><div><b>${Math.max(0,Number(rev.overdueCount)||0)}</b><span>متأخر</span></div><div><b>${Math.max(0,Number(rev.repeatedCount)||0)}</b><span>خطأ متكرر</span></div></div>${rows.length?'':'<div class="portal-good" style="margin-bottom:8px">✓ لا توجد مراجعات مستحقة اليوم — هذه أقرب مواضع قادمة.</div>'}<div class="portal-revision-list">${[...groups.entries()].map(([surah,gr])=>`<article class="portal-revision-group"><div class="portal-revision-group-head"><b>سورة ${esc(surah)} · ${gr.from}${gr.to>gr.from?'–'+gr.to:''}</b><button type="button" data-revision-surah="${esc(surah)}" data-revision-from="${gr.from}" data-revision-to="${gr.to}">▶ تدريب</button></div>${gr.rows.map(x=>`<div class="portal-revision-item"><span><strong>«${esc(x.word||'—')}»${x.char?` · الحرف «${esc(x.char)}»`:''}</strong><small>${esc((x.type||[]).join('، ')||'موضع تصحيح')} · ${x.occurrences>1?`تكرر ${x.occurrences}×`:'مرة واحدة'}</small></span><em>${esc(x.dueLabel||'')}</em></div>`).join('')}</article>`).join('')}</div>`;
    body.querySelectorAll('[data-revision-surah]').forEach(btn=>btn.addEventListener('click',()=>revisionPractice(btn.dataset.revisionSurah,Number(btn.dataset.revisionFrom),Number(btn.dataset.revisionTo))));
  }
  function portalGoalDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return 'غير محدد';
    const date=new Date(value+'T12:00:00Z');
    return Number.isNaN(date.getTime())?'غير محدد':date.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  }
  function portalGoalCelebrate(name,level){
    const n=Number(level);if(![25,50,75,100].includes(n))return;
    $('portalGoalMilestoneDialog')?.remove();
    const overlay=document.createElement('div');overlay.id='portalGoalMilestoneDialog';overlay.className='goal-milestone-overlay';
    overlay.innerHTML=`<section class="goal-milestone-dialog" role="dialog" aria-modal="true" aria-labelledby="portalGoalCongratsTitle" dir="rtl"><div class="goal-milestone-sparkles" aria-hidden="true">✦ ✧ ✦</div><div class="goal-milestone-medal" aria-hidden="true">${n===100?'🏆':'🏅'}</div><h2 id="portalGoalCongratsTitle">ما شاء الله، تقدم مبارك!</h2><p>أتمّ ${esc(name)} نسبة ${n}% من خطة الحفظ بتسميع ناجح.</p><strong>${n}%</strong><small>بارك الله في الحفظ والمراجعة والثبات.</small><button type="button" data-goal-close>أكمل المتابعة</button></section>`;
    const close=()=>{document.removeEventListener('keydown',onKey);overlay.remove();};
    const onKey=e=>{if(e.key==='Escape')close();};
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-goal-close]'))close();});
    document.body.appendChild(overlay);document.addEventListener('keydown',onKey);
    overlay.querySelector('[data-goal-close]')?.focus();
  }
  function renderGoalPlan(data){
    const box=$('portalGoalCard'),plan=data?.memorizationPlan||null;if(!box)return;
    if(!plan){box.hidden=true;return;}box.hidden=false;
    const progress=Math.max(0,Math.min(100,Number(plan.progress)||0)),expected=Math.max(0,Math.min(100,Number(plan.expected)||0));
    $('portalGoalTarget').textContent=`${plan.targetLabel||'هدف الحفظ'} · المستهدف ${portalGoalDate(plan.targetDate)}`;
    const status=$('portalGoalStatus');status.textContent=plan.statusLabel||'على الخطة';status.className=`portal-goal-status ${plan.status||'ontrack'}`;
    $('portalGoalProgress').textContent=`${Math.round(progress)}%`;$('portalGoalExpected').textContent=`المتوقع الآن ${Math.round(expected)}%`;$('portalGoalBar').style.width=`${progress}%`;$('portalGoalExpectedMark').style.right=`${expected}%`;
    $('portalGoalDone').textContent=String(Math.max(0,Number(plan.completed)||0));$('portalGoalRemaining').textContent=String(Math.max(0,Number(plan.remaining)||0));$('portalGoalPace').textContent=String(Math.max(0,Number(plan.recommendedPerSession)||0));
    // Stage 2: clear read-only milestones and realistic completion projection.
    const finish=$('portalGoalFinish');if(finish)finish.textContent=progress>=100?'الهدف مكتمل':portalGoalDate(plan.expectedFinish);
    const warning=$('portalGoalDelay');if(warning){
      const late=['behind','overdue'].includes(plan.status);
      warning.hidden=!late;
      warning.textContent=late?(plan.status==='overdue'?'⏳ انتهى الموعد المستهدف؛ يُرجى التواصل مع المحفظ لتحديث الخطة.':'⏳ التقدم أقل من المخطط؛ يمكن مراجعة وتيرة الحفظ مع المحفظ.') :'';
    }
    const total=Math.max(0,Number(plan.total)||0),completed=Math.max(0,Number(plan.completed)||0);
    const levels=[25,50,75,100].map(n=>({pct:n,done:total>0?completed*100>=total*n:progress>=n}));
    const milestones=$('portalGoalMilestones');if(milestones)milestones.innerHTML=levels.map(m=>`<span class="${m.done?'done':''}" title="${m.done?'تم':'قادم'} ${m.pct}%">${m.done?'✓':'○'} ${m.pct}%</span>`).join('');
    const latest=levels.filter(m=>m.done).map(m=>m.pct).pop()||0;
    const achievement=$('portalGoalAchievement');if(achievement){
      achievement.hidden=!latest;
      if(latest){achievement.innerHTML=`<span><b>🏅 ${latest===100?'أُنجز الهدف كاملًا!':`وصل إلى ${latest}% من الهدف`}</b><small>إنجاز مبني على التسميع الناجح الموثّق.</small></span><button type="button" id="portalGoalCelebrate">🎉 تهنئة</button>`;
        $('portalGoalCelebrate')?.addEventListener('click',()=>portalGoalCelebrate(data?.student?.name||'الطالب',latest));
      }else achievement.innerHTML='';
    }
    const next=$('portalGoalNext');if(plan.next?.surah){next.hidden=false;next.innerHTML=`<span><small>مقترح المذاكرة القادمة</small><b>سورة ${esc(plan.next.surah)} ${Number(plan.next.from)||1}${Number(plan.next.to)>Number(plan.next.from)?'–'+Number(plan.next.to):''}</b></span><button type="button" id="portalGoalPractice">ابدأ الآن</button>`;$('portalGoalPractice')?.addEventListener('click',()=>{try{g.ImamGuardianTahfeez?.openCorrectionRange?.({surah:plan.next.surah,from:Number(plan.next.from)||1,to:Number(plan.next.to)||Number(plan.next.from)||1,practiceMode:'tutor'});g.ImamGuardianEngagement?.log?.('goal_practice_open',1,{surah:plan.next.surah,from:Number(plan.next.from)||1,to:Number(plan.next.to)||Number(plan.next.from)||1});}catch(err){console.warn('[guardian goal practice]',err);}});}else{next.hidden=false;next.innerHTML='<span><b>✓ تم تحقيق الهدف الحالي</b><small>بارك الله في الطالب ووفقه لما بعده.</small></span>';}
  }
  function renderCorrectionFocus(recent){
    const latest=(recent||[]).find(x=>Array.isArray(x.corrections)&&x.corrections.length),box=$('portalCorrectionFocus'),body=$('portalCorrectionFocusBody');if(!box||!body)return;
    if(!latest){box.hidden=true;body.innerHTML='';return;}const rows=latest.corrections||[],open=rows.filter(x=>!x.resolved).length,done=rows.length-open,groups=correctionGroups(rows);
    box.hidden=false;$('portalCorrectionFocusDate').textContent=`من حصة ${latest.date||'الأخيرة'} · ${done} تم تصحيحها · ${open} تحتاج متابعة`;$('portalCorrectionFocusCount').textContent=open?`${open} للمراجعة`:'✓ مكتملة';
    const ranges=new Map();for(const c of rows.filter(x=>!x.resolved)){const key=c.surah||'';if(!key)continue;const a=Number(c.ayah)||1;if(!ranges.has(key))ranges.set(key,{from:a,to:a});else{const r=ranges.get(key);r.from=Math.min(r.from,a);r.to=Math.max(r.to,a);}}
    const verseHtml=groups.map((gr,gi)=>`<article class="portal-correction-verse ${gi>=3?'portal-correction-extra':''}" ${gi>=3?'hidden':''}><div class="portal-correction-verse-head"><b>سورة ${esc(gr.surah||'—')} · آية ${esc(gr.ayah)}</b><span>${gr.rows.every(x=>x.resolved)?'✓ تم التصحيح':`${gr.rows.filter(x=>!x.resolved).length} للمراجعة`}</span></div>${renderVerseWithMarks(gr)}<div class="portal-correction-tags">${gr.rows.map((c,ci)=>`<span class="${correctionClass(c)}">${c.resolved?'✓ ':''}${c.char?`الحرف «${esc(c.char)}» · `:''}${esc(c.type)} <small>${esc(correctionModeLabel(c.mode))}</small></span><button type="button" class="portal-pronounce-btn" data-pronounce-row="${gi}:${ci}" aria-label="نطق ${esc(c.word||'الكلمة')} بصوت مشاري">🔊 نطق «${esc(c.word||'الكلمة')}»</button>`).join('')}</div></article>`).join('');
    body.innerHTML=`<div class="portal-correction-summary"><span><b>${rows.length}</b> علامة</span><span><b>${open}</b> تحتاج مراجعة</span><span><b>${done}</b> تم تصحيحها</span></div><div class="portal-correction-verses">${verseHtml}</div>${groups.length>3?`<button type="button" class="portal-show-corrections" id="portalShowCorrections">عرض كل مواضع التصحيح (${groups.length})</button>`:''}${ranges.size?`<div class="portal-correction-practice"><b>المراجعة المنزلية</b><small>ابدأ بمواضع الأخطاء ثم كررها في وضع التثبيت.</small>${[...ranges.entries()].map(([surah,r])=>`<button type="button" data-correction-surah="${esc(surah)}" data-correction-from="${r.from}" data-correction-to="${r.to}">▶ سورة ${esc(surah)} ${r.from}${r.to>r.from?'–'+r.to:''}</button>`).join('')}</div>`:'<div class="portal-correction-complete">✓ تم تصحيح كل المواضع المسجلة في هذه الحصة.</div>'}`;
    body.querySelectorAll('[data-correction-surah]').forEach(btn=>btn.addEventListener('click',()=>practiceCorrectionRange(btn.dataset.correctionSurah,Number(btn.dataset.correctionFrom),Number(btn.dataset.correctionTo))));
    body.querySelectorAll('[data-pronounce-row]').forEach(btn=>btn.addEventListener('click',()=>{const [gi,ci]=btn.dataset.pronounceRow.split(':').map(Number),c=groups[gi]?.rows?.[ci];if(c)g.ImamGuardianAudio?.pronounce?.({surah:c.surah,ayah:c.ayah,word:c.word,wordIndex:c.wordIndex});}));
    $('portalShowCorrections')?.addEventListener('click',e=>{const extra=[...body.querySelectorAll('.portal-correction-extra')],showing=extra.some(x=>x.hidden);extra.forEach(x=>x.hidden=!showing);e.currentTarget.textContent=showing?'إخفاء التفاصيل':`عرض كل مواضع التصحيح (${groups.length})`;});
  }
  function render(data,meta={}){
    $('portalAcademy').textContent=data.academy?.name||'أكاديمية الإمام لتحفيظ القرآن الكريم';
    $('portalFooterAcademy').textContent=data.academy?.name||'';$('portalTeacher').textContent=data.academy?.teacher||'';
    $('portalPeriod').textContent=data.period||'آخر 30 يومًا';$('portalStudent').textContent=data.student?.name||'طالب';
    const studentMeta=[data.student?.guardian?`ولي الأمر: ${data.student.guardian}`:'',data.student?.group?`الحلقة: ${data.student.group}`:'',data.student?.level?`المستوى: ${data.student.level}`:''].filter(Boolean).join(' · ');
    $('portalMeta').textContent=studentMeta||'متابعة الطالب';
    $('portalUpdated').textContent=formatDateTime(meta.updatedAt||data.generatedAt);
    $('portalUpdatedLabel').textContent=meta.session?'آخر نشر من المحفظ':meta.live?'آخر نشر من المحفظ':'وقت إنشاء اللقطة';
    $('portalMastery').textContent=pct(data.metrics.mastery);$('portalAttendance').textContent=pct(data.metrics.attendance);$('portalNewAyat').textContent=String(Math.max(0,Number(data.metrics.newAyat)||0));$('portalRepeats').textContent=String(Math.max(0,Number(data.metrics.repeats)||0));$('portalTrend').textContent=data.metrics.trend||'—';
    const qp=Number(data.metrics.quranProgress);if(Number.isFinite(qp)){$('portalQuranCard').hidden=false;$('portalQuranProgress').textContent=pct(qp);$('portalQuranBar').style.width=`${Math.max(0,Math.min(100,qp))}%`;}else $('portalQuranCard').hidden=true;
    $('portalAssignmentDate').textContent=data.assignment?.date&&data.assignment.date!=='—'?`من حصة ${data.assignment.date}`:'لا توجد حصة حضور بعد';
    const items=Array.isArray(data.assignment?.items)?data.assignment.items:[];$('portalAssignment').innerHTML=items.length?items.map(x=>`<article class="portal-assignment-item"><b>${esc(x.icon||'')} ${esc(x.label||'')}</b><p>${esc(x.text||'')}</p></article>`).join(''):'<div class="portal-empty">لا يوجد تكليف مسجل حاليًا.</div>';
    const attention=Array.isArray(data.attention)?data.attention:[];$('portalAttention').innerHTML=attention.length?attention.map(x=>`<div class="portal-attention-item"><b>${esc(x.label)}</b><span>${x.score!==null&&x.score!==undefined?`${esc(x.score)}%`:esc(x.grade||'يحتاج متابعة')}</span></div>`).join(''):'<div class="portal-good">✅ لا توجد إشارات حديثة تستدعي التثبيت.</div>';
    const recent=Array.isArray(data.recent)?data.recent:[];$('portalRecent').innerHTML=recent.length?recent.map(x=>{const corrections=Array.isArray(x.corrections)?x.corrections:[];return `<article class="portal-session ${statusClass(x.status)}"><div class="portal-session-head"><b>${esc(x.status||'—')} · ${esc(x.date||'—')}</b><span class="portal-session-score">${x.score===null||x.score===undefined?'':`${esc(x.score)}%`}</span></div>${Array.isArray(x.recitation)&&x.recitation.length?`<ul>${x.recitation.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}${corrections.length?`<div class="portal-corrections"><b>مواضع التصحيح</b>${corrections.map(c=>`<div class="portal-correction ${c.resolved?'resolved':''}"><span>${c.resolved?'✓':'•'} ${esc(c.surah?`سورة ${c.surah} · آية ${c.ayah}`:`آية ${c.ayah}`)}</span><strong>«${esc(c.word||'—')}»${c.char?` · الحرف «${esc(c.char)}»`:''}</strong><em>${esc(c.type||'')}</em></div>`).join('')}</div>`:''}</article>`;}).join(''):'<div class="portal-empty">لا توجد حصص مسجلة بعد.</div>';
    renderGoalPlan(data);
    renderSmartRevision(data);
    renderCorrectionFocus(recent);
    setNote(meta.session?'session':meta.live?'live':'snapshot');
    try{g.ImamGuardianTahfeez?.setContext?.(data);}catch(err){console.warn('[guardian tahfeez context]',err);}
    try{g.ImamGuardianAudio?.setContext?.(data);}catch(err){console.warn('[guardian audio context]',err);}
    $('portalContent').hidden=false;$('portalError').hidden=true;
  }
  async function publicRpc(name,args){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},body:JSON.stringify(args||{})});
    if(!res.ok)throw new Error(`PORTAL_HTTP_${res.status}`);
    return res.json();
  }
  async function fetchLive(token){const payload=await publicRpc('guardian_portal_read',{p_token:token});return payload&&validSnapshot(payload.snapshot)?payload:null;}
  async function loadLive(token,{manual=false}={}){
    liveToken=token;sessionToken='';sessionRows=[];setNote('live');setStudentSwitcher([]);setLiveState('loading',manual?'جارٍ تحديث البيانات…':'جارٍ تحميل آخر بيانات منشورة…');
    try{
      const payload=await fetchLive(token);
      if(!payload){showError('تم إيقاف هذا الرابط أو لم يعد متاحًا','اطلب من المحفظ إرسال رابط جديد.');return false;}
      render(payload.snapshot,{live:true,updatedAt:payload.updated_at});setLiveState('online','✅ تم تحميل أحدث نسخة منشورة');return true;
    }catch(err){console.warn('[guardian live portal]',err);showError('تعذر تحميل الرابط الحي الآن','هذا النوع من الروابط يحتاج اتصالًا بالإنترنت. اطلب من المحفظ رابط لقطة ثابتة إذا احتجت نسخة تعمل Offline.');return false;}
  }
  function setStudentSwitcher(rows,selected=0){
    const wrap=$('portalStudentSwitcher'),choices=$('portalStudentChoices');if(!wrap||!choices)return;
    const valid=Array.isArray(rows)?rows.filter(x=>validSnapshot(x?.snapshot)):[];
    if(valid.length<=1){wrap.hidden=true;choices.innerHTML='';return;}
    wrap.hidden=false;
    choices.innerHTML=valid.map((row,i)=>{
      const name=esc(row.snapshot.student?.name||`طالب ${i+1}`);
      const academy=row.snapshot.academy?.name?`<small>${esc(row.snapshot.academy.name)}</small>`:'';
      return `<button type="button" class="portal-student-choice ${i===selected?'active':''}" data-student-index="${i}" aria-pressed="${i===selected?'true':'false'}"><span>${name}</span>${academy}</button>`;
    }).join('');
    choices.querySelectorAll('[data-student-index]').forEach(btn=>{
      btn.addEventListener('click',()=>selectSessionStudent(btn.dataset.studentIndex));
    });
  }
  function selectSessionStudent(value){
    const i=Math.max(0,Math.min(sessionRows.length-1,Number(value)||0)),row=sessionRows[i];if(!row||!validSnapshot(row.snapshot))return;
    try{g.ImamGuardianEngagement?.setContext?.({sessionToken,studentRef:row.student_ref,studentName:row.snapshot?.student?.name||''});}catch(err){console.warn('[guardian engagement context]',err);}
    render(row.snapshot,{session:true,updatedAt:row.updated_at});setStudentSwitcher(sessionRows,i);setLiveState('online','🔒 جلسة ولي الأمر موثّقة — قراءة فقط');
    try{g.ImamGuardianEngagement?.logPortalOpen?.();}catch(_){}
  }
  async function fetchSession(token){const payload=await publicRpc('guardian_portal_session_read',{p_session:token});return payload&&Array.isArray(payload.students)?payload:null;}
  function rememberSession(token){
    try{sessionStorage.setItem(SESSION_KEY,token);history.replaceState(null,'',`${location.pathname}${location.search}#guardian`);}catch(_){/* fragment remains if storage is unavailable */}
  }
  function storedSession(){try{return uuid(sessionStorage.getItem(SESSION_KEY));}catch(_){return '';}}
  function forgetSession(){try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}sessionToken='';sessionRows=[];try{g.ImamGuardianEngagement?.setContext?.({});}catch(_){} }
  async function loadSession(token,{manual=false}={}){
    sessionToken=token;liveToken='';setNote('session');setLiveState('loading',manual?'جارٍ تحديث بيانات الطلاب…':'جارٍ تحميل صفحة الطالب…');
    try{
      const payload=await fetchSession(token);
      const rows=(payload?.students||[]).filter(x=>validSnapshot(x?.snapshot));
      if(!payload||!rows.length){forgetSession();showError('انتهت الجلسة أو لم تعد هناك بيانات متاحة','سجّل الدخول مرة أخرى برقم الهاتف ورمز PIN.',true);return false;}
      sessionRows=rows;rememberSession(token);selectSessionStudent(0);return true;
    }catch(err){console.warn('[guardian session]',err);showError('تعذر تحميل صفحة الطالب الآن','تسجيل الدخول برقم الهاتف يحتاج اتصالًا بالإنترنت. حاول مرة أخرى عند توفر الاتصال.',true);return false;}
  }
  function showError(title='الرابط غير صالح أو غير مكتمل',message='اطلب من المحفظ إنشاء رابط جديد من ملف الطالب داخل التطبيق.',loginAgain=false){
    const e=$('portalError');if(e){e.hidden=false;$('portalErrorTitle').textContent=title;$('portalErrorText').textContent=message;const back=$('portalLoginAgain');if(back)back.hidden=!loginAgain;}
    const c=$('portalContent');if(c)c.hidden=true;setLiveState('','');setStudentSwitcher([]);
  }
  function toast(msg){const t=document.createElement('div');t.className='portal-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);}
  async function share(){
    if(portalMode==='session'){toast('جلسة الدخول خاصة ولا يمكن مشاركتها');return;}
    const title=`بوابة متابعة ${$('portalStudent')?.textContent||'الطالب'}`;
    if(navigator.share){try{await navigator.share({title,text:'متابعة الطالب من أكاديمية الإمام',url:location.href});return;}catch(err){if(err?.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(location.href);toast('تم نسخ رابط البوابة');}catch(_){toast('انسخ الرابط من شريط العنوان');}
  }
  async function refresh(){if(portalMode==='session'&&sessionToken)await loadSession(sessionToken,{manual:true});else if(portalMode==='live'&&liveToken)await loadLive(liveToken,{manual:true});else location.reload();}
  async function logout(){
    if(!sessionToken){location.replace('guardian-login.html');return;}
    const token=sessionToken;forgetSession();
    try{await publicRpc('guardian_portal_session_logout',{p_session:token});}catch(err){console.warn('[guardian logout]',err);}
    location.replace('guardian-login.html');
  }
  function printPage(){window.print();}
  g.portalShare=share;g.portalPrint=printPage;g.portalRefresh=refresh;g.portalLogout=logout;g.portalSelectStudent=selectSessionStudent;g.portalToast=toast;

  (async()=>{
    try{
      const sToken=tokenFromHash('s');
      if(sToken){rememberSession(sToken);await loadSession(sToken);return;}
      const pToken=tokenFromHash('p');if(pToken){await loadLive(pToken);return;}
      const data=decodePayload();if(data){render(data,{live:false,session:false});setStudentSwitcher([]);return;}
      const remembered=storedSession();if(remembered){await loadSession(remembered);return;}
      showError();
    }catch(err){console.error('[portal init]',err);showError();}
  })();
})(globalThis);
