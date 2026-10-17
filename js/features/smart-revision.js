'use strict';
/* Imam Academy v11.3.0 — Smart Revision Engine, Stage 1.
   Builds a persistent error notebook and deterministic spaced-review queue
   from existing Quran correction annotations. No destructive data migration. */
(function smartRevisionFeature(g){
  const DAY=86400000;
  const RESOLVED_INTERVALS=[3,7,14,30];
  const appState=()=>g.ImamApp?.State||{};
  const esc=v=>g.ImamApp?.Utils?.escapeHtml?g.ImamApp.Utils.escapeHtml(v??''):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const state={view:'today'};

  function dayKey(value){
    const d=value instanceof Date?new Date(value):new Date(value||Date.now());
    if(Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function dayStart(value){const k=dayKey(value),[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d,12,0,0,0);}
  function addDays(value,days){const d=dayStart(value);d.setDate(d.getDate()+Number(days||0));return d;}
  function dateValue(s){const t=Date.parse(s?.sessionDate||s?.date||s?.updatedAt||s?.createdAt||'');return Number.isFinite(t)?t:0;}
  function dateLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'});}
  function sessions(){const v=appState().sessions;return Array.isArray(v)?v:[];}
  function students(){const v=appState().students;return Array.isArray(v)?v:[];}
  function quranRows(s){return (Array.isArray(s?.recitationErrors)?s.recitationErrors:[]).filter(x=>x?.source==='quran-word'&&x?.word&&x?.ayah);}
  function locationKey(x){
    const sid=Number(x.surahId)||0,surah=String(x.surah||'').trim(),ayah=Math.max(1,Number(x.ayah)||1),wi=Math.max(0,Number(x.wordIndex)||0),char=x.targetLevel==='char'?Math.max(0,Number(x.charIndex)||0):-1;
    return `${sid}|${surah}|${ayah}|${wi}|${char}`;
  }
  function contextLabel(v){return ({new_read:'حفظ جديد',talaqqin:'تلقين',recitation:'تسميع',review:'مراجعة'})[v]||'تسميع';}
  // 11.9: include teacher-verified placement and review assessments without
  // counting students' declared prior memorization as academy achievements.
  function assessedRanges(studentId,nowValue=Date.now()){
    const latest=new Map();
    sessions().filter(s=>s.studentId===studentId&&s.status==='حضر').forEach(s=>{
      const d=dayKey(s.sessionDate||s.date||s.updatedAt||nowValue);
      const meta=s.teacher119||{},extras=Array.isArray(meta.extra)?meta.extra:[];
      for(const e of extras){
        if(!['placement','rec','far','exam'].includes(e.type)||!['mastered','stabilize','repeat'].includes(e.decision))continue;
        const id=`${e.surahId||e.surah}|${e.from}|${e.to}|${e.type}`;
        if(!latest.has(id)||d>=latest.get(id).day)latest.set(id,{...e,day:d});
      }
      for(const type of ['rec','far']){
        const decision=meta.decisions?.[type],range=s.actualRecitation?.[type]||s[type];
        if(!['mastered','stabilize','repeat'].includes(decision)||!range?.surah)continue;
        const id=`${range.surahId||range.surah}|${range.from}|${range.to}|${type}`;
        if(!latest.has(id)||d>=latest.get(id).day)latest.set(id,{...range,type,decision,day:d});
      }
    });
    // Only actual teacher-tested placement results enter the revision queue.
    // Declared prior memorization never creates a revision achievement.
    const st=students().find(x=>String(x.id)===String(studentId));
    const placementLatest=new Map();
    for(const attempt of (st?.placementAssessments||[])){
      if(!attempt?.unitKey||!['ممتاز','جيد جداً','جيد','ضعيف','إعادة'].includes(attempt.grade))continue;
      const old=placementLatest.get(attempt.unitKey);
      if(!old||String(attempt.at||'')>=String(old.at||''))placementLatest.set(attempt.unitKey,attempt);
    }
    for(const item of placementLatest.values()){
      for(const range of (item.ranges||[])){
        if(!range?.surah||!Number.isInteger(Number(range.from))||!Number.isInteger(Number(range.to)))continue;
        const decision=['ممتاز','جيد جداً','جيد'].includes(item.grade)?'mastered':item.grade==='ضعيف'?'stabilize':'repeat';
        const id=`placement-center|${item.unitKey}|${range.surahId}|${range.from}|${range.to}`;
        latest.set(id,{...range,type:'placement',decision,score:item.score,day:item.date||dayKey(item.at||nowValue)});
      }
    }
    const today=dayStart(nowValue);
    return [...latest.values()].map(x=>{
      const interval=x.decision==='mastered'?14:x.decision==='stabilize'?3:1;
      const due=addDays(x.day,interval),delta=Math.floor((due-today)/DAY);
      const label=delta<0?`متأخر ${Math.abs(delta)} يوم`:delta===0?'اليوم':delta===1?'غدًا':`بعد ${delta} أيام`;
      return {source:'teacher-assessment',key:`assessed|${x.surah}|${x.from}|${x.to}|${x.type}`,
        surahId:Number(x.surahId)||0,surah:String(x.surah||''),ayah:Number(x.from)||1,toAyah:Number(x.to)||Number(x.from)||1,
        word:`الآيات ${x.from}–${x.to}`,targetLevel:'range',types:[x.type==='placement'?'تحديد مستوى':'مراجعة'],
        events:[{date:x.day,resolved:x.decision==='mastered'}],groups:[],contexts:[],occurrences:1,lastDate:x.day,
        lastResolved:x.decision==='mastered',resolvedStreak:x.decision==='mastered'?1:0,
        dueDate:dayKey(due),daysUntil:delta,dueLabel:label,status:delta<0?'overdue':delta===0?'today':'scheduled',
        repeated:false,unresolved:x.decision!=='mastered',priority:(x.decision==='repeat'?65:x.decision==='stabilize'?35:10)+(delta<0?Math.min(25,Math.abs(delta)*3):0),
        context:x.type==='placement'?'اختبار تحديد مستوى':'تقييم المحفظ',decision:x.decision,score:x.score};
    });
  }
  function buildNotebook(studentId,nowValue=Date.now()){
    const rows=sessions().filter(s=>s.studentId===studentId&&s.status==='حضر'&&quranRows(s).length).slice().sort((a,b)=>dateValue(a)-dateValue(b));
    const map=new Map();
    rows.forEach(s=>{
      const date=dayKey(s.sessionDate||s.date||s.updatedAt||Date.now());
      const byLoc=new Map();
      quranRows(s).forEach(e=>{const k=locationKey(e);if(!byLoc.has(k))byLoc.set(k,[]);byLoc.get(k).push(e);});
      for(const [key,list] of byLoc){
        const sample=list[list.length-1]||{};
        let item=map.get(key);
        if(!item){item={key,surahId:Number(sample.surahId)||0,surah:String(sample.surah||''),ayah:Math.max(1,Number(sample.ayah)||1),word:String(sample.word||''),wordIndex:Math.max(0,Number(sample.wordIndex)||0),targetLevel:sample.targetLevel==='char'?'char':'word',charIndex:sample.targetLevel==='char'?Math.max(0,Number(sample.charIndex)||0):-1,char:sample.targetLevel==='char'?String(sample.charText||''):'',ayahText:String(sample.ayahText||''),events:[],types:new Set(),groups:new Set(),contexts:new Set()};map.set(key,item);}
        list.forEach(e=>{if(e.type)item.types.add(String(e.type));if(e.group)item.groups.add(String(e.group));if(e.mode)item.contexts.add(String(e.mode));if(e.ayahText)item.ayahText=String(e.ayahText);});
        item.events.push({date,resolved:list.every(e=>!!e.resolved),types:[...new Set(list.map(e=>String(e.type||'')).filter(Boolean))],context:String(sample.mode||'recitation')});
      }
    });
    const today=dayStart(nowValue);
    return [...map.values()].map(item=>{
      const ev=item.events.slice().sort((a,b)=>a.date.localeCompare(b.date));
      const latest=ev.at(-1);let streak=0;
      for(let i=ev.length-1;i>=0&&ev[i].resolved;i--)streak++;
      const dueAfter=latest?.resolved?RESOLVED_INTERVALS[Math.min(Math.max(streak,1)-1,RESOLVED_INTERVALS.length-1)]:1;
      const due=addDays(latest?.date||dayKey(nowValue),dueAfter);
      const delta=Math.floor((due-today)/DAY);
      const repeated=ev.length>=2;
      const unresolved=!latest?.resolved;
      const overdue=delta<0;
      const dueToday=delta===0;
      const priority=(unresolved?50:0)+(repeated?Math.min(25,ev.length*5):0)+(overdue?Math.min(25,Math.abs(delta)*4):dueToday?12:0);
      let dueLabel=overdue?`متأخر ${Math.abs(delta)} يوم`:dueToday?'اليوم':delta===1?'غدًا':`بعد ${delta} أيام`;
      let status=overdue?'overdue':dueToday?'today':unresolved?'pending':'scheduled';
      return {...item,events:ev,types:[...item.types],groups:[...item.groups],contexts:[...item.contexts],occurrences:ev.length,lastDate:latest?.date||'',lastResolved:!!latest?.resolved,resolvedStreak:streak,dueDate:dayKey(due),daysUntil:delta,dueLabel,status,repeated,unresolved,priority,context:contextLabel(latest?.context)};
    }).concat(assessedRanges(studentId,nowValue)).sort((a,b)=>b.priority-a.priority||a.daysUntil-b.daysUntil||b.occurrences-a.occurrences||a.surahId-b.surahId||a.ayah-b.ayah);
  }
  function summary(studentId,nowValue=Date.now()){
    const notebook=buildNotebook(studentId,nowValue),today=notebook.filter(x=>x.daysUntil<=0),upcoming=notebook.filter(x=>x.daysUntil>0),overdue=today.filter(x=>x.daysUntil<0),repeated=notebook.filter(x=>x.repeated),unresolved=notebook.filter(x=>x.unresolved);
    return {notebook,today,upcoming,overdue,repeated,unresolved,total:notebook.length,dueCount:today.length,overdueCount:overdue.length,repeatedCount:repeated.length,unresolvedCount:unresolved.length};
  }
  function guardianData(studentId){
    const s=summary(studentId),pack=x=>({key:x.key,surahId:x.surahId,surah:x.surah,ayah:x.ayah,word:x.word,char:x.char,type:x.types.slice(-3),occurrences:x.occurrences,dueDate:x.dueDate,dueLabel:x.dueLabel,status:x.status,unresolved:x.unresolved,lastResolved:x.lastResolved,context:x.context});
    return {generatedAt:new Date().toISOString(),dueCount:s.dueCount,overdueCount:s.overdueCount,repeatedCount:s.repeatedCount,unresolvedCount:s.unresolvedCount,today:s.today.slice(0,12).map(pack),upcoming:s.upcoming.slice(0,6).map(pack)};
  }
  function openItem(studentId,key){
    const item=buildNotebook(studentId).find(x=>x.key===key);if(!item)return;
    if(typeof g.openQuranRangeText==='function')g.openQuranRangeText({surah:item.surah,from:item.ayah,to:item.toAyah||item.ayah});
  }
  function ensureProfileCard(){
    if(document.getElementById('smartRevisionCard'))return document.getElementById('smartRevisionCard');
    const anchor=document.getElementById('profHist');if(!anchor)return null;
    const card=document.createElement('div');card.className='card smart-revision-card';card.id='smartRevisionCard';card.innerHTML=`<div class="smart-revision-head"><div><div class="ch" style="margin:0">🧠 المراجعة الذكية</div><small>جدول مراجعة مبني على أخطاء الطالب الفعلية</small></div><div class="smart-revision-tabs"><button type="button" data-sr-view="today" class="active">اليوم</button><button type="button" data-sr-view="notebook">دفتر الأخطاء</button></div></div><div id="smartRevisionProfile"></div>`;anchor.parentNode.insertBefore(card,anchor);card.querySelectorAll('[data-sr-view]').forEach(btn=>btn.addEventListener('click',()=>{state.view=btn.dataset.srView;card.querySelectorAll('[data-sr-view]').forEach(x=>x.classList.toggle('active',x===btn));renderProfile();}));return card;
  }
  function teacherRow(item,studentId){
    const types=item.types.slice(-3).map(t=>`<span>${esc(t)}</span>`).join('');
    return `<article class="smart-revision-row ${item.status}"><div class="smart-revision-place"><b>سورة ${esc(item.surah)} · الآية ${item.ayah}</b><strong>«${esc(item.word)}»${item.char?` · الحرف «${esc(item.char)}»`:''}</strong><small>${types||'موضع تصحيح'} · ${item.context}</small></div><div class="smart-revision-meta"><span>${item.occurrences>1?`تكرر ${item.occurrences}×`:'مرة واحدة'}</span><em>${esc(item.dueLabel)}</em><button type="button" onclick="smartRevisionOpen('${esc(studentId)}','${esc(item.key)}')">📖 النص</button></div></article>`;
  }
  function renderProfile(studentId=String(appState().curStId||'')){
    const card=ensureProfileCard(),out=document.getElementById('smartRevisionProfile');if(!card||!out)return;
    if(!studentId){card.style.display='none';return;}card.style.display='block';
    const s=summary(studentId);const rows=state.view==='notebook'?s.notebook:s.today;
    out.innerHTML=`<div class="smart-revision-stats"><div><b>${s.dueCount}</b><span>مستحق اليوم</span></div><div><b>${s.overdueCount}</b><span>متأخر</span></div><div><b>${s.repeatedCount}</b><span>متكرر</span></div><div><b>${s.unresolvedCount}</b><span>غير متقن</span></div></div>${rows.length?`<div class="smart-revision-list">${rows.slice(0,state.view==='notebook'?30:12).map(x=>teacherRow(x,studentId)).join('')}</div>`:`<div class="smart-revision-empty">${s.total?'لا توجد مواضع مستحقة اليوم. أقرب مراجعة ستظهر تلقائيًا في موعدها.':'لا توجد أخطاء قرآنية مسجلة لهذا الطالب حتى الآن.'}</div>`}${state.view==='today'&&s.upcoming.length?`<div class="smart-revision-next"><b>القادم:</b> ${s.upcoming.slice(0,3).map(x=>`${esc(x.surah)} ${x.ayah} (${esc(x.dueLabel)})`).join(' · ')}</div>`:''}`;
  }
  function ensureHomeCard(){
    if(document.getElementById('smartRevisionHome'))return document.getElementById('smartRevisionHome');
    const analysis=document.getElementById('homeAnalysis');if(!analysis)return null;const card=document.createElement('div');card.className='card smart-revision-home';card.id='smartRevisionHome';analysis.insertAdjacentElement('afterend',card);return card;
  }
  function renderHome(){
    const card=ensureHomeCard();if(!card)return;const rows=[];
    students().filter(x=>x?.active!==false).forEach(st=>{const s=summary(st.id);s.today.slice(0,2).forEach(item=>rows.push({st,item}));});
    rows.sort((a,b)=>b.item.priority-a.item.priority||a.item.daysUntil-b.item.daysUntil);
    const overdue=rows.filter(x=>x.item.daysUntil<0).length;
    card.innerHTML=`<div class="smart-revision-head"><div><div class="ch" style="margin:0">🧠 مراجعة اليوم</div><small>أولوية ذكية من أخطاء الطلاب المسجلة</small></div><div class="smart-revision-home-count"><b>${rows.length}</b><span>${overdue?`${overdue} متأخر`:'مستحق'}</span></div></div>${rows.length?`<div class="smart-revision-home-list">${rows.slice(0,8).map(({st,item})=>`<button type="button" onclick="openProf('${esc(st.id)}')"><span><b>${esc(st.name)}</b><small>سورة ${esc(item.surah)} · ${item.ayah} · «${esc(item.word)}»</small></span><em>${esc(item.dueLabel)}</em></button>`).join('')}</div>`:'<div class="smart-revision-empty">لا توجد مراجعات ذكية مستحقة اليوم.</div>'}`;
  }
  function installHooks(){
    const legacy=g.ImamApp?.Legacy;
    const baseOpen=g.openProf;
    if(typeof baseOpen==='function'){
      const wrapped=function(id,...args){const out=baseOpen.call(this,id,...args);setTimeout(()=>renderProfile(id),0);return out;};
      if(legacy?.override)legacy.override('openProf',wrapped,'v11.3-smart-revision1');else g.openProf=wrapped;
    }
    const baseHome=g.renderHome;
    if(typeof baseHome==='function'){
      const wrapped=function(...args){const out=baseHome.apply(this,args);setTimeout(renderHome,0);return out;};
      if(legacy?.override)legacy.override('renderHome',wrapped,'v11.3-smart-revision1');else g.renderHome=wrapped;
    }
    const baseSave=g.saveSession;
    if(typeof baseSave==='function'){
      const wrapped=function(...args){const out=baseSave.apply(this,args);setTimeout(()=>{renderHome();renderProfile();},0);return out;};
      if(legacy?.override)legacy.override('saveSession',wrapped,'v11.3-smart-revision1');else g.saveSession=wrapped;
    }
  }
  g.smartRevisionOpen=openItem;
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.SmartRevision={buildNotebook,assessedRanges,summary,buildGuardian:guardianData,renderProfile,renderHome,openItem};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installHooks();setTimeout(renderHome,0);},{once:true});else{installHooks();setTimeout(renderHome,0);}
})(globalThis);
