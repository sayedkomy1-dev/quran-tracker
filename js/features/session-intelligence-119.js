'use strict';
/* Imam Academy 11.9.0 — additive teacher workspace. No schema migration.
 * All existing session/students arrays remain the sole source of truth. */
(function(g){
  const root=g.ImamApp||(g.ImamApp={});
  const app=()=>root.State||{};
  const by=id=>document.getElementById(id);
  const escape=v=>root.Utils?.escapeHtml?.(v)??String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TYPES={auto:'تلقائي حسب أنشطة الحصة',new:'حفظ جديد فقط',review:'مراجعة فقط',mixed:'حفظ جديد ومراجعة',placement:'اختبار تحديد مستوى',exam:'اختبار قرآني',followup:'متابعة دون تسميع'};
  const ACT={new:'الحفظ الجديد',rec:'المراجعة القريبة',far:'المراجعة البعيدة'};
  const ACTION_TYPES={new:'حفظ جديد',rec:'مراجعة قريبة',far:'مراجعة بعيدة',placement:'اختبار تحديد مستوى',exam:'اختبار قرآني'};
  const DECISIONS={mastered:'أتقن',stabilize:'يحتاج تثبيت',repeat:'أخطأ مرة أخرى'};
  const state={extra:[],skip:{},decisions:{},skipReason:'',kind:'auto',bypass:false,lastSessionKey:'',warning:false};
  // Audible warning uses Web Audio from a user-initiated click, not autoplay.
  // No external sound assets or permissions. Can be disabled in the session UI.
  const AUDIO_PREF='imam:teacher:guardian-send-audio:v1';
  function audioEnabled(){try{return localStorage.getItem(AUDIO_PREF)!=='off';}catch(_){return true;}}
  function playGuardianWarning(incomplete){
    if(!audioEnabled())return false;
    try{
      const Context=g.AudioContext||g.webkitAudioContext;
      if(!Context){g.navigator?.vibrate?.(incomplete?[100,70,150]:[90]);return false;}
      const ctx=new Context(),origin=ctx.currentTime;
      const tones=incomplete?[690,490,690]:[660,840];
      tones.forEach((freq,i)=>{
        const oscillator=ctx.createOscillator(),gain=ctx.createGain(),begin=origin+i*.19;
        oscillator.type='sine';oscillator.frequency.value=freq;
        gain.gain.setValueAtTime(.0001,begin);
        gain.gain.exponentialRampToValueAtTime(.17,begin+.022);
        gain.gain.exponentialRampToValueAtTime(.0001,begin+.145);
        oscillator.connect(gain).connect(ctx.destination);oscillator.start(begin);oscillator.stop(begin+.15);
      });
      setTimeout(()=>ctx.close().catch(()=>{}),tones.length*190+250);
      return true;
    }catch(_){try{g.navigator?.vibrate?.([90,40,110]);}catch(__){}return false;}
  }

  const options=(v,labels)=>Object.entries(labels).map(([key,title])=>`<option value="${escape(key)}" ${String(v)===key?'selected':''}>${escape(title)}</option>`).join('');
  const uniqueId=()=>root.Utils?.makeId?.('range119')||`range119-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const positive=n=>Number.isInteger(Number(n))&&Number(n)>0;
  function quran(){return Array.isArray(g.S)?g.S:(typeof S!=='undefined'?S:[]);}
  function rangeValid(item){const surah=quran().find(x=>x.n===item?.surah);return !!surah&&positive(item.from)&&positive(item.to)&&item.from<=item.to&&item.to<=surah.a;}
  function normalizedRange(item){return {id:String(item.id||uniqueId()),type:String(item.type||'rec'),surahId:quran().findIndex(x=>x.n===item.surah)+1,surah:item.surah,from:Number(item.from),to:Number(item.to),score:item.score!==null&&item.score!==undefined&&String(item.score).trim()!==''&&Number.isFinite(Number(item.score))?Math.max(0,Math.min(100,Number(item.score))):null,decision:String(item.decision||''),notes:String(item.notes||'').slice(0,500)};}
  function studentId(){return String(by('sesSt')?.value||'');}
  function sessionKey(){return `${studentId()}|${by('sesDate')?.value||''}`;}
  // Preference is device-local and separated by authenticated user and student.
  // Official session metadata and restored drafts always take precedence.
  function kindPrefKey(){
    const uid=String(g.WeLiveQuranAuth?.getAccess?.()?.user_id||g.WeLiveQuranAuth?.getProfile?.()?.user_id||'');
    const sid=studentId();return uid&&sid?`imam:session-kind:v1:${encodeURIComponent(uid)}:${encodeURIComponent(sid)}`:'';
  }
  function readKindPref(){try{const key=kindPrefKey();const value=key?localStorage.getItem(key):'';return TYPES[value]?value:'auto';}catch(_){return 'auto';}}
  function writeKindPref(kind){
    const key=kindPrefKey();if(!key||!TYPES[kind])return;
    try{localStorage.setItem(key,kind);}catch(_){g.toast?.('لم نستطع تذكر نوع الحصة على هذا الجهاز','info');}
  }

  function current(){
    const sid=studentId(),ses=(app().sessions||[]).find(x=>x.studentId===sid&&String(x.sessionDate||x.date||'').slice(0,10)===(by('sesDate')?.value||''));return ses||null;
  }
  function editor(){
    let data={};try{data=typeof g.buildSesData==='function'?g.buildSesData():{};}catch(_){data={};}
    const status=by('sb-a')?.classList.contains('sel-a')?'غاب':by('sb-v')?.classList.contains('sel-v')?'إجازة':'حضر';
    return {...data,studentId:studentId(),status,kind:state.kind,sessionType:state.kind,extraRecitations:state.extra.slice(),notPerformed:{...state.skip},reviewDecisions:{...state.decisions},skipReason:state.skipReason};
  }
  function requirement(id,label,done,severity='important',target=''){return{id,label,done:!!done,severity,target};}
  function evaluate(data){
    const d=data||{},kind=TYPES[d.kind||d.sessionType]?d.kind||d.sessionType:'auto';
    const checks=[requirement('student','تحديد الطالب',!!d.studentId,'critical','sesSt'),requirement('date','تاريخ الحصة',!!by('sesDate')?.value,'critical','sesDate')];
    if(d.status!=='حضر')return result(checks,kind);
    const skip=d.notPerformed||{},extras=Array.isArray(d.extraRecitations)?d.extraRecitations:[];
    const has=k=>!!d[k]?.surah||extras.some(x=>x.type===k&&rangeValid(x))||!!d.actualRecitation?.[k]?.surah;
    const hasReview=()=>has('rec')||has('far')||!!d.juz?.chips?.length||!!d.surahReview?.chips?.length;
    const hasNew=has('new');
    const previous=(app().sessions||[]).filter(x=>x.studentId===d.studentId&&x.status==='حضر'&&String(x.sessionDate||x.date||'').slice(0,10)<String(by('sesDate')?.value||'')).sort((a,b)=>String(a.sessionDate||a.date||'').localeCompare(String(b.sessionDate||b.date||''))).at(-1);
    const hasGrade=k=>!!d[k]?.grade||!!d.prevGrades?.[k]||!!d.reviewDecisions?.[k]||extras.some(x=>x.type===k&&(x.decision||x.score!==null&&x.score!==undefined));
    const add=k=>{
      if(skip[k])return;
      checks.push(requirement('range-'+k,`تحديد موضع ${ACT[k]}`,has(k),'important',k+'-s'));
      if(k!=='new')checks.push(requirement('grade-'+k,`تقييم ${ACT[k]}`,hasGrade(k),'important',k+'-s'));
    };
    if(kind==='new'||kind==='mixed'){add('new');if(!skip.new)checks.push(requirement('grade-new','تسجيل نتيجة تسميع الحفظ الجديد',hasGrade('new'),'important','new-s'));}
    if(kind==='review'||kind==='mixed'){
      if(kind==='review'&&has('far')&&!has('rec'))add('far');else add('rec');
    }
    if(kind==='auto'){
      for(const k of ['new','rec','far']){if(previous?.[k]&&!skip[k])checks.push(requirement('prior-grade-'+k,`تسجيل نتيجة ${ACT[k]} من تكليف الحصة السابقة`,hasGrade(k),'important',k+'-s'));}
      if(hasNew&&d.actualRecitation?.new&&!hasGrade('new')&&!skip.new)checks.push(requirement('grade-new','نتيجة موضع الحفظ الجديد الذي تم تسميعه',false,'important','new-s'));
      if(!hasNew&&!hasReview()&&!extras.length)checks.push(requirement('activities','تحديد نشاط الحصة أو تأكيد عدم تنفيذه',!!skip.new&&!!skip.rec,'important','im119Kind'));
      for(const k of ['rec','far'])if(has(k)&&!skip[k])checks.push(requirement('grade-'+k,`تقييم ${ACT[k]}`,hasGrade(k),'important',k+'-s'));
    }
    if(kind==='placement'||kind==='exam'){
      const target=kind==='placement'?'placement':'exam';
      const relevant=extras.filter(x=>x.type===target);
      checks.push(requirement('tested-range','إضافة موضع الاختبار',relevant.length>0,'important','im119AddRange'));
      if(relevant.length)checks.push(requirement('tested-score','تقييم جميع مواضع الاختبار',relevant.every(x=>rangeValid(x)&&x.score!==null&&!!x.decision),'important','im119ExtraList'));
    }
    if(previous&&['new','rec','far'].some(k=>!!previous[k]&&!!skip[k]))checks.push(requirement('skip-reason','توضيح سبب عدم تنفيذ التكليف المقرر',!!String(d.skipReason||'').trim(),'important','im119NoRecitation'));
    if(kind==='followup')checks.push(requirement('followup-note','تحديد سبب عدم إجراء التسميع',!!skip.new&&!!skip.rec&&!!String(d.skipReason||'').trim(),'important','im119NoRecitation'));
    if(d.recitationErrors?.length&&!(hasNew||hasReview()||extras.length))checks.push(requirement('error-range','ربط أخطاء التسميع بموضع قرآني',false,'important','im119AddRange'));
    for(const x of extras){if(!rangeValid(x))checks.push(requirement('invalid-'+x.id,'تصحيح نطاق آيات مضاف',false,'critical','im119ExtraList'));}
    return result(checks,kind);
  }
  function result(checks,kind){
    const required=checks.filter(x=>x.severity!=='optional');
    const outstanding=required.filter(x=>!x.done);
    return {kind,checks,outstanding,critical:outstanding.filter(x=>x.severity==='critical'),important:outstanding.filter(x=>x.severity==='important'),percent:required.length?Math.round(required.filter(x=>x.done).length/required.length*100):null};
  }
  function currentEvaluation(){return evaluate(editor());}
  function touchDraft(){try{g.scheduleDraftSave?.();}catch(_){}}
  function render(){
    const card=by('im119Completion');if(!card)return;const e=currentEvaluation();
    const value=by('im119Percent'),fill=by('im119Fill'),text=by('im119State'),items=by('im119Requirements');
    if(value)value.textContent=e.percent==null?'—':`${e.percent}٪`;
    if(fill)fill.style.width=`${e.percent??0}%`;
    if(text)text.textContent=e.critical.length?'نقص حرج':e.important.length?'توجد بيانات تحتاج استكمالًا':'البيانات المطلوبة مكتملة';
    if(items)items.innerHTML=e.checks.map(x=>`<button type="button" class="im119-item ${x.done?'done':x.severity}" data-target="${escape(x.target)}"><span>${x.done?'✓':'!'}</span>${escape(x.label)}</button>`).join('');
    card.dataset.status=e.critical.length?'critical':e.important.length?'important':'complete';
    const storage=by('im119SaveState');if(storage){const health=root.SaveHealth;const ses=current();const local=health?.ok===false?'فشل آخر حفظ محلي':health?.ok===true?'آخر حفظ محلي مؤكد':'لم يُتحقق من الحفظ بعد';const net=(typeof navigator!=='undefined'&&navigator.onLine===false)?'لا يوجد اتصال':'المزامنة: تُراجع بشكل مستقل';storage.textContent=`${ses?.completed?'حصة معتمدة':'حصة غير معتمدة'} · ${local} · ${net}`;}
    const count=by('im119ExtraCount');if(count)count.textContent=state.extra.length?`(${state.extra.length})`:'(لا يوجد)';
    const host=by('im119ExtraList');if(host)host.innerHTML=state.extra.map((x,i)=>`<div class="im119-extra"><div><b>${escape(ACTION_TYPES[x.type]||x.type)}</b> · سورة ${escape(x.surah)} (${x.from}–${x.to})${x.score!==null?` · ${x.score}٪`:''} ${escape(DECISIONS[x.decision]||'')}</div><div class="im119-extra-actions"><button type="button" data-view="${i}">📖 النص</button><button type="button" data-remove="${i}">حذف</button></div></div>`).join('');
  }
  function initSessionUi(){
    if(by('im119Completion')||!by('pg-session'))return;
    const head=by('pg-session');const target=by('sessionJourneyCard')||head.firstElementChild;
    target.insertAdjacentHTML('beforebegin',`<section class="card im119-card" id="im119Completion" dir="rtl" aria-label="مؤشر اكتمال الحصة"><div class="im119-top"><div><b>🛡️ فحص اكتمال الحصة</b><small id="im119State" role="status">جارٍ مراجعة البيانات</small></div><strong id="im119Percent">—</strong></div><div class="im119-track"><div id="im119Fill"></div></div><div id="im119SaveState" class="im119-save-state" role="status" aria-live="polite"></div><details><summary>عرض قائمة التحقق والنواقص</summary><div id="im119Requirements"></div></details><div class="im119-row"><label>نوع الحصة<select id="im119Kind">${options('auto',TYPES)}</select></label><details class="im119-range-disclosure"><summary>📖 مواضع تسميع إضافية <span id="im119ExtraCount" aria-live="polite"></span></summary><div class="im119-range-content"><button type="button" id="im119AddRange" class="btn btn-out btn-sm">+ إضافة موضع تسميع</button><div id="im119ExtraList"></div></div></details></div><div class="im119-row"><label><input type="checkbox" id="im119SkipNew"> لم يُنفذ حفظ جديد</label><label><input type="checkbox" id="im119SkipRec"> لم تُنفذ مراجعة</label></div><div class="im119-row"><label>تقييم المراجعة القريبة<select id="im119DecisionRec">${options('',{'':'لم يُحدد',...DECISIONS})}</select></label><label>تقييم المراجعة البعيدة<select id="im119DecisionFar">${options('',{'':'لم يُحدد',...DECISIONS})}</select></label></div><div class="im119-row"><label>سبب عدم تنفيذ الحفظ أو المراجعة (عند الحاجة)<input id="im119NoRecitation" type="text" maxlength="250" placeholder="مثل: مراجعة شفوية دون تكليف جديد"></label></div><label class="im119-audio-toggle"><input type="checkbox" id="im119AudioEnabled"> 🔔 تشغيل تنبيه صوتي قبل فتح رسالة ولي الأمر على واتساب</label><small class="im119-small">نسبة الاكتمال تخص بيانات الحصة، وليست نسبة إتقان الطالب. حالة الحفظ والمزامنة مستقلة عنها.</small></section>`);
    by('im119AudioEnabled').checked=audioEnabled();
    by('im119AudioEnabled').addEventListener('change',e=>{try{localStorage.setItem(AUDIO_PREF,e.target.checked?'on':'off');}catch(_){} });
    by('im119Kind').addEventListener('change',e=>{state.kind=e.target.value;writeKindPref(state.kind);touchDraft();render();});
    by('im119SkipNew').addEventListener('change',e=>{state.skip.new=e.target.checked;touchDraft();render();});
    by('im119SkipRec').addEventListener('change',e=>{state.skip.rec=e.target.checked;state.skip.far=e.target.checked;touchDraft();render();});
    by('im119DecisionRec').addEventListener('change',e=>{state.decisions.rec=e.target.value;touchDraft();render();});
    by('im119DecisionFar').addEventListener('change',e=>{state.decisions.far=e.target.value;touchDraft();render();});
    by('im119NoRecitation').addEventListener('input',e=>{state.skipReason=e.target.value;touchDraft();render();});
    by('im119AddRange').addEventListener('click',openRange);
    by('im119Requirements').addEventListener('click',e=>{const target=by(e.target.closest('button')?.dataset.target);if(target){target.scrollIntoView({block:'center',behavior:'smooth'});target.focus?.();}});
    by('im119ExtraList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.remove!==undefined){state.extra.splice(Number(b.dataset.remove),1);touchDraft();render();}if(b.dataset.view!==undefined){const x=state.extra[Number(b.dataset.view)];g.openQuranRangeText?.({surah:x.surah,from:x.from,to:x.to});}});
    head.addEventListener('input',e=>{if(e.target.closest('#im119Completion'))return;queueMicrotask(render);},true);
    head.addEventListener('change',()=>queueMicrotask(render),true);
    ['sesSt','sesDate'].forEach(id=>by(id)?.addEventListener('change',()=>setTimeout(loadSessionMetadata,0)));
    render();
  }
  function loadSessionMetadata(){
    const s=current();let meta=s?.teacher119||{};
    try{const key=typeof g.draftKey==='function'?g.draftKey():'';const draft=key?JSON.parse(localStorage.getItem(key)||'null'):null; if(draft?.teacher119&&(!s||Date.parse(draft.savedAt||'')>Date.parse(s.updatedAt||'')))meta=draft.teacher119;}catch(_){}

    state.kind=TYPES[meta.kind]?meta.kind:readKindPref();state.extra=Array.isArray(meta.extra)?meta.extra.filter(rangeValid).map(normalizedRange):[];state.skip={...(meta.notPerformed||{})};state.decisions={...(meta.decisions||{})};state.skipReason=String(meta.skipReason||'');
    if(by('im119NoRecitation'))by('im119NoRecitation').value=state.skipReason;
    if(by('im119Kind'))by('im119Kind').value=state.kind;
    if(by('im119SkipNew'))by('im119SkipNew').checked=!!state.skip.new;
    if(by('im119SkipRec'))by('im119SkipRec').checked=!!state.skip.rec;
    if(by('im119DecisionRec'))by('im119DecisionRec').value=state.decisions.rec||'';
    if(by('im119DecisionFar'))by('im119DecisionFar').value=state.decisions.far||'';
    render();
  }
  function ensureRangeModal(){if(by('im119RangeModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="mo im119-dialog" id="im119RangeModal"><div class="mo-box"><div class="mo-title"><b>📖 إضافة موضع أثناء التسميع</b><button type="button" class="mo-x" id="im119CloseRange">✕</button></div><div class="fld"><label>نوع الموضع</label><select id="im119RangeType">${options('rec',ACTION_TYPES)}</select></div><div class="fld"><label>السورة</label><select id="im119Surah"></select></div><div class="frow"><div class="fld"><label>من آية</label><input type="number" min="1" id="im119From" value="1"></div><div class="fld"><label>إلى آية</label><input type="number" min="1" id="im119To" value="1"></div></div><div class="frow"><div class="fld"><label>نسبة الإتقان (اختياري إلا في الاختبار)</label><input type="number" min="0" max="100" id="im119Score" placeholder="0 إلى 100"></div><div class="fld"><label>تقييم المحفظ</label><select id="im119RangeDecision">${options('',{'':'غير محدد',...DECISIONS})}</select></div></div><div class="fld"><label>ملاحظة</label><input id="im119RangeNotes" maxlength="500"></div><div class="im119-row"><button type="button" class="btn btn-out" id="im119Preview">معاينة النص</button><button type="button" class="btn btn-g" id="im119ConfirmRange">إضافة للحصة</button></div></div></div>`);
    by('im119CloseRange').onclick=()=>by('im119RangeModal').classList.remove('open');
    by('im119ConfirmRange').onclick=addRange;
    by('im119Preview').onclick=()=>{const r=getRange();if(!rangeValid(r)){g.toast?.('راجع السورة وأرقام الآيات','error');return;}by('im119RangeModal').classList.remove('open');state.resumeRangeModal=true;g.openQuranRangeText?.({surah:r.surah,from:r.from,to:r.to});};
    by('im119Surah').addEventListener('change',()=>{by('im119To').max=quran().find(x=>x.n===by('im119Surah').value)?.a||1;});
  }
  function getRange(){return{type:by('im119RangeType').value,surah:by('im119Surah').value,from:Number(by('im119From').value),to:Number(by('im119To').value),score:by('im119Score').value===''?null:Number(by('im119Score').value),decision:by('im119RangeDecision').value,notes:by('im119RangeNotes').value};}
  function openRange(){ensureRangeModal();by('im119Surah').innerHTML=quran().map(x=>`<option value="${escape(x.n)}">${escape(x.n)} — ${x.a} آية</option>`).join('');by('im119RangeType').value=state.kind==='placement'?'placement':state.kind==='exam'?'exam':'rec';by('im119RangeNotes').value='';by('im119Score').value='';by('im119RangeDecision').value='';by('im119RangeModal').classList.add('open');}
  function addRange(){const r=getRange();if(!rangeValid(r)){g.toast?.('نطاق السورة والآيات غير صحيح','error');return;}if(r.score!==null&&(r.score<0||r.score>100)){g.toast?.('النسبة يجب أن تكون من صفر إلى مئة','error');return;}
    const id=`${r.type}|${r.surah}|${r.from}|${r.to}`;if(state.extra.some(x=>`${x.type}|${x.surah}|${x.from}|${x.to}`===id)){g.toast?.('هذا الموضع مضاف بالفعل','info');return;}state.extra.push(normalizedRange(r));by('im119RangeModal').classList.remove('open');touchDraft();render();g.toast?.('تمت إضافة الموضع إلى الحصة الجارية. سيُحفظ مع الحصة','success');}
  function validateCurrent(){return currentEvaluation();}
  function addMetaToData(data){
    const actual={...(data.actualRecitation||{})};
    for(const type of ['new','rec','far']){const additional=state.extra.find(x=>x.type===type&&rangeValid(x));if(additional&&!actual[type])actual[type]={surahId:additional.surahId,surah:additional.surah,from:additional.from,to:additional.to,full:additional.from===1&&additional.to===quran()[additional.surahId-1]?.a};}
    data={...data,...(Object.keys(actual).length?{actualRecitation:actual}:null)};
    const has=state.extra.length||state.kind!=='auto'||Object.values(state.skip).some(Boolean)||Object.values(state.decisions).some(Boolean)||!!state.overrideReason;if(!has)return data;return {...data,teacher119:{kind:state.kind,extra:state.extra.map(normalizedRange),notPerformed:{...state.skip},decisions:{...state.decisions},skipReason:state.skipReason,...(state.overrideReason?{overrideReason:state.overrideReason,overrideAt:state.overrideAt,overrideIssues:state.overrideIssues}:null)}};}
  function showWarning(result,action){
    if(state.warning)return;state.warning=true;
    const prev=by('im119Warning');prev?.remove();const critical=result.critical.length>0;
    const auth=g.WeLiveQuranAuth;const canOverride=!!auth?.isActive?.()&&['owner','teacher'].includes(String(auth.getAccess?.()?.role||''));
    const box=document.createElement('div');box.id='im119Warning';box.className='mo open im119-dialog';
    box.innerHTML=`<div class="mo-box" role="alertdialog" aria-modal="true" aria-labelledby="im119WarningTitle"><h3 id="im119WarningTitle">⚠️ ${['send','short','detailed'].includes(action)?'تحذير: تقرير ولي الأمر غير مكتمل':'تنبيه مهم: بيانات الحصة غير مكتملة'}</h3><p>انتبه يا شيخنا، راجع النواقص التالية قبل المتابعة:</p><div class="im119-warning-list">${result.outstanding.map(x=>`<div>• ${escape(x.label)} ${x.severity==='critical'?'(نقص حرج)':''}</div>`).join('')}</div>${!critical?'<label>سبب اعتماد النواقص (مطلوب للتجاوز)<textarea id="im119OverrideReason" rows="2" maxlength="250"></textarea></label>':''}<div class="im119-actions"><button type="button" class="btn btn-g" data-action="review">استكمال البيانات</button><button type="button" class="btn btn-out" data-action="draft">حفظ كمسودة</button>${critical||!canOverride?'':`<button type="button" class="btn btn-wa" data-action="approve">${['send','short','detailed'].includes(action)?'متابعة بعد التأكيد':'اعتماد رغم التنبيه'}</button>`}<button type="button" class="btn btn-out" data-action="cancel">إلغاء</button></div></div>`;document.body.appendChild(box);
    function close(){box.remove();state.warning=false;}
    box.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>{
      const choice=btn.dataset.action,reason=by('im119OverrideReason')?.value.trim()||'';
      if(choice==='approve'&&!canOverride){g.toast?.('ليس لديك تصريح لتجاوز التنبيه','error');return;}
      if(choice==='approve'&&!reason){g.toast?.('اكتب سبب التجاوز أولًا','error');return;}
      if(choice==='draft'){
        const key=typeof g.draftKey==='function'?g.draftKey():'';
        if(!key){g.toast?.('اختر الطالب والتاريخ لحفظ المسودة','error');return;}
        try{
          g.saveDraftNow?.();
          const snapshot=JSON.parse(localStorage.getItem(key)||'null');
          if(!snapshot?.teacher119||snapshot.teacher119.kind!==state.kind)throw new Error('DRAFT_NOT_CONFIRMED');
          g.toast?.('تم حفظ المسودة في مساحة الحساب، دون اعتماد الحصة','success');close();
        }catch(err){g.toast?.('تعذر تأكيد حفظ المسودة، راجع مساحة التخزين','error');}
        return;
      }
      if(choice==='review'){const t=by(result.outstanding[0]?.target);close();t?.scrollIntoView?.({block:'center'});t?.focus?.();return;}
      if(choice==='cancel'){close();return;}
      if(choice==='approve'){state.overrideReason=reason;state.overrideAt=new Date().toISOString();state.overrideIssues=result.outstanding.map(x=>x.id);close();execute(action);}
    });
  }
  function execute(action){
    state.bypass=true;
    try{
      if(action==='send')g.saveAndSendWA?.();
      else if(action==='short'||action==='detailed')g.saveAndSendWAMode?.(action);
      else g.saveSession?.();
    }finally{state.bypass=false;state.overrideReason='';state.overrideIssues=[];}
  }
  function tryAction(action){
    const e=validateCurrent();
    // Play synchronously within the click gesture, even if the report is complete.
    // A stronger sequence alerts the teacher when the report is incomplete.
    if(['send','short','detailed'].includes(action))playGuardianWarning(e.outstanding.length>0);
    if(!e.outstanding.length)return execute(action);showWarning(e,action);
  }
  function installBridges(){
    const legacy=root.Legacy;if(!legacy)return;
    const closeQuran=g.closeQuranTextModal; if(typeof closeQuran==='function')legacy.override('closeQuranTextModal',function(...a){const out=closeQuran.apply(this,a);if(state.resumeRangeModal){state.resumeRangeModal=false;by('im119RangeModal')?.classList.add('open');}return out;},'v11.9-range-preview');
    const origDraft=g.captureDraft;
    if(typeof origDraft==='function')legacy.override('captureDraft',function(...a){const d=origDraft.apply(this,a);return {...d,teacher119:{kind:state.kind,extra:state.extra.map(normalizedRange),notPerformed:{...state.skip},decisions:{...state.decisions},skipReason:state.skipReason}};},'v11.9-session-intelligence');
    const origApply=g.applyDraft;
    if(typeof origApply==='function')legacy.override('applyDraft',function(...a){const out=origApply.apply(this,a);const meta=a[0]?.teacher119;if(meta){state.kind=TYPES[meta.kind]?meta.kind:'auto';state.extra=(meta.extra||[]).filter(rangeValid).map(normalizedRange);state.skip={...meta.notPerformed};state.decisions={...meta.decisions};state.skipReason=String(meta.skipReason||'');render();}return out;},'v11.9-session-intelligence');
    const origBuild=g.buildSesData;
    if(typeof origBuild==='function')legacy.override('buildSesData',function(...args){return addMetaToData(origBuild.apply(this,args));},'v11.9-session-intelligence');
    const extraLine=ses=>{
      const extras=ses?.teacher119?.extra||[];
      if(!extras.length)return '';
      const lines=extras.map(x=>`• ${ACTION_TYPES[x.type]||x.type}: سورة ${x.surah} (${x.from}–${x.to})${x.score!==null?` — ${x.score}٪`:''}${DECISIONS[x.decision]?` — ${DECISIONS[x.decision]}`:''}`);
      return `\n\n📖 *مواضع التسميع المسجلة أثناء الحصة:*\n${lines.join('\n')}`;
    };
    for(const name of ['buildWAMsg','buildWAMsgMode']){
      const base=g[name];if(typeof base==='function')legacy.override(name,function(st,ses,...rest){return String(base.call(this,st,ses,...rest)||'')+extraLine(ses);},'v11.9-extra-range-report');
    }
    const basicHtml=g.buildSumHTML;
    if(typeof basicHtml==='function')legacy.override('buildSumHTML',function(ses,...args){const base=basicHtml.call(this,ses,...args),extras=ses?.teacher119?.extra||[];return base+(extras.length?'<div class="im119-report-extras"><b>مواضع التسميع الإضافية:</b><br>'+extras.map(x=>`${escape(ACTION_TYPES[x.type]||x.type)}: سورة ${escape(x.surah)} (${Number(x.from)}–${Number(x.to)})${x.score!==null?' — '+Number(x.score)+'٪':''}`).join('<br>')+'</div>':'');},'v11.9-extra-range-report');
    const origSave=g.saveSession;
    if(typeof origSave==='function')legacy.override('saveSession',function(opts={}){
      if(!state.bypass&&!opts?.skipIntelligence){const r=validateCurrent();if(r.outstanding.length){showWarning(r,'save');return null;}}
      const saved=origSave.call(this,opts);
      if(saved){state.overrideReason='';render();}
      return saved;
    },'v11.9-session-intelligence');
    const doc=root.CorrectionDocument||g.ImamCorrectionDocument;
    if(doc&&typeof doc.reportHtml==='function'){
      const report=doc.reportHtml;
      doc.reportHtml=function(st,ses,...rest){
        let html=report.call(this,st,ses,...rest);
        const extras=ses?.teacher119?.extra||[];
        if(extras.length){const part='<section class="im119-report-extras" dir="rtl"><h3>مواضع التسميع الإضافية</h3>'+extras.map(x=>`<p>${escape(ACTION_TYPES[x.type]||x.type)} — سورة ${escape(x.surah)}، الآيات ${Number(x.from)}–${Number(x.to)}${x.score!==null?`، التقييم ${Number(x.score)}٪`:''} ${escape(DECISIONS[x.decision]||'')}</p>`).join('')+'</section>';html=html.includes('</body>')?html.replace('</body>',part+'</body>'):html+part;}
        return html;
      };
    }
    for(const [name,fn] of [['onSesSt',loadSessionMetadata],['onSesDateChange',loadSessionMetadata]]){
      const base=g[name];if(typeof base==='function')legacy.override(name,function(...args){const out=base.apply(this,args);setTimeout(fn,0);return out;},'v11.9-session-intelligence');
    }
  }
  function installStudentForm(){const input=by('m-level');if(!input||by('im119Prior'))return;
    input.closest('.fld').insertAdjacentHTML('afterend',`<section id="im119Prior" class="im119-prior"><label>هل سبق للطالب حفظ شيء من القرآن الكريم؟<select id="im119PriorStatus"><option value="unknown">لم يُحدد مستواه بعد</option><option value="beginner">يبدأ من الصفر</option><option value="previous">لديه محفوظات سابقة</option><option value="completed">أتم حفظ القرآن الكريم سابقًا</option></select></label><label>المحفوظات السابقة كما صرح بها الطالب (غير معتمدة)<textarea id="im119PriorNote" rows="2" maxlength="2000" placeholder="مثال: سور البقرة وآل عمران، وأجزاء عمّ وتبارك"></textarea></label><small>التصريح بالحفظ لا يُحسب إنجازًا داخل الأكاديمية حتى يتم اختباره.</small></section>`);
    const open=g.openAddSt,edit=g.editSt,saveSt=g.saveSt;
    if(typeof open==='function')root.Legacy.override('openAddSt',function(...a){const out=open.apply(this,a);by('im119PriorStatus').value='unknown';by('im119PriorNote').value='';return out;},'v11.9-prior');
    if(typeof edit==='function')root.Legacy.override('editSt',function(...a){const out=edit.apply(this,a);const st=(app().students||[]).find(s=>s.id===app().curStId);by('im119PriorStatus').value=st?.priorMemorization?.status||'unknown';by('im119PriorNote').value=st?.priorMemorization?.declared||'';return out;},'v11.9-prior');
    if(typeof saveSt==='function')root.Legacy.override('saveSt',function(...a){const prev=new Set((app().students||[]).map(x=>x.id));const selected=by('im119PriorStatus').value,declared=by('im119PriorNote').value.trim();const out=saveSt.apply(this,a);if(by('stModal')?.classList.contains('open'))return out;
      const st=(app().students||[]).find(x=>!prev.has(x.id))||(app().students||[]).find(x=>x.id===app().curStId);if(st){st.priorMemorization={...(st.priorMemorization||{}),status:selected,declared,updatedAt:new Date().toISOString()};if(g.save?.()===false)g.toast?.('تعذر تثبيت بيانات المحفوظات السابقة','error');}return out;},'v11.9-prior');
  }
  function installProfileAction(){const host=by('profileActions');if(!host||by('im119PlacementBtn'))return;const btn=document.createElement('button');btn.id='im119PlacementBtn';btn.type='button';btn.className='btn btn-out btn-sm';btn.textContent='📋 اختبار تحديد مستوى';btn.onclick=()=>{const sid=app().curStId;g.goPage?.('session');if(by('sesSt'))by('sesSt').value=sid;g.onSesSt?.();state.kind='placement';if(by('im119Kind'))by('im119Kind').value='placement';render();openRange();};host.appendChild(btn);}
  function installActions(){const page=by('pg-session');if(!page)return;
    page.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      let action='';if(b.id==='saveSessionBtn')action='save';else if(b.id==='saveSendSessionBtn')action='send';else if(b.closest('#sessionWaModes'))action=b.getAttribute('onclick')?.includes('short')?'short':'detailed';if(!action)return;
      e.preventDefault();e.stopImmediatePropagation();tryAction(action);
    },true);
  }
  function install(){g.addEventListener?.('online',render);g.addEventListener?.('offline',render);initSessionUi();installStudentForm();installProfileAction();installBridges();installActions();loadSessionMetadata();}
  root.SessionIntelligence={evaluate,rangeValid,normalizedRange,DECISIONS,TYPES,openRange,addRange,render,playGuardianWarning,getState:()=>state};
  if(typeof module!=='undefined'&&module.exports)module.exports={evaluate,rangeValid,normalizedRange,DECISIONS,TYPES};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,180),{once:true});else setTimeout(install,180);
  }
})(typeof globalThis!=='undefined'?globalThis:this);
