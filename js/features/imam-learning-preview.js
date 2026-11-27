'use strict';
/* Generated from research modules. No network, writes or access expansion. */
(function(root){
'use strict';
/* Experimental, read-only, local learning memory. Not loaded by production. */
function buildLearningMemory(sessions, studentId, asOf) {
  const validDay = value => {
    const s = String(value ?? '').slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    const d = new Date(s+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===s ? s : '';
  };
  const clean = (value,max=80) => String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
  const empty = () => ({status:'insufficient-evidence',sessions:0,patterns:[],limitations:['No mastery or causal diagnosis can be inferred from missing error annotations.']});
  const cutoff=validDay(asOf);
  if(!clean(studentId,160)||!cutoff||!Array.isArray(sessions)) return empty();
  const bySession=new Map(),conflicts=new Set();
  for(const s of sessions){
    if(!s||String(s.studentId)!==String(studentId)||s.status!=='حضر') continue;
    const id=clean(s.id,160), day=validDay(s.sessionDate||s.date);
    if(!id||!day||day>cutoff||conflicts.has(id)) continue;
    if(bySession.has(id)){bySession.delete(id);conflicts.add(id);continue;}
    bySession.set(id,{s,day});
  }
  const buckets=new Map();
  for(const [sessionId,{s,day}] of bySession){
    for(const e of Array.isArray(s.recitationErrors)?s.recitationErrors:[]){
      if(!e||e.source!=='quran-word')continue;
      const surah=Number(e.surahId),ayah=Number(e.ayah),word=Number(e.wordIndex),type=clean(e.type);
      const level=e.targetLevel==='ayah'?'ayah':e.targetLevel==='char'?'char':'word';
      if(!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>286||!Number.isInteger(word)||(level==='ayah'?word!==-1:word<0)||e.wordIndex==null||!type)continue;
      const char=Number(e.charIndex);
      if(level==='char'&&(!Number.isInteger(char)||char<0||e.charIndex==null))continue;
      const letter=e.targetLevel==='char'&&Number.isInteger(char)&&char>=0&&e.charIndex!=null?clean(e.charText,10).replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,''):'';
      const key=JSON.stringify([type,/^[ء-ي]$/.test(letter)?letter:'']);
      const loc=JSON.stringify([surah,ayah,word,e.targetLevel==='char'&&Number.isInteger(char)&&char>=0&&e.charIndex!=null?char:-1]);
      const b=buckets.get(key)||{type,letter:/^[ء-ي]$/.test(letter)?letter:null,days:new Set(),locations:new Set(),records:new Map()};
      const ref=JSON.stringify([sessionId,loc]);
      if(b.records.has(ref)) continue;
      b.days.add(day);b.locations.add(loc);
      b.records.set(ref,{sessionId,day,surah,ayah,wordIndex:word,targetLevel:level,charIndex:JSON.parse(loc)[3],errorId:clean(e.id,160)||null});
      buckets.set(key,b);
    }
  }
  const patterns=[...buckets.values()].filter(b=>b.days.size>=2&&b.locations.size>=2).map(b=>{
    const evidence=[...b.records.values()].sort((a,c)=>a.day.localeCompare(c.day)||a.sessionId.localeCompare(c.sessionId)||a.surah-c.surah||a.ayah-c.ayah||a.wordIndex-c.wordIndex||a.charIndex-c.charIndex);
    return {kind:'observed-cross-location-pattern',type:b.type,letter:b.letter,distinctDays:b.days.size,distinctLocations:b.locations.size,observations:evidence.length,firstSeen:evidence[0].day,lastSeen:evidence[evidence.length-1].day,evidence:evidence.slice(-20),evidenceTruncated:evidence.length>20,requiresTeacherReview:true,suggestedAction:'recheck-in-new-context'};
  }).sort((a,b)=>b.distinctDays-a.distinctDays||b.distinctLocations-a.distinctLocations||a.type.localeCompare(b.type)||String(a.letter).localeCompare(String(b.letter)));
  return {status:patterns.length?'review-required':'insufficient-evidence',sessions:bySession.size,patterns,limitations:['Historical annotations only; a recurring pattern is not a diagnosis or proof of a current weakness.','Missing observations are not evidence of mastery.','Duplicate session IDs are excluded pending reconciliation.']};
}


;
'use strict';
/* Research-only graph. Links are unreviewed and cannot be used for causal inference. */
const SKILLS=[
  [
    "letter-identity",
    "تمييز الحروف",
    1,
    [
      "إبدال حرف",
      "حذف حرف",
      "زيادة حرف"
    ],
    []
  ],
  [
    "articulation",
    "نطق الحروف ومخارجها",
    1,
    [
      "نطق حرف",
      "مخرج حرف"
    ],
    [
      "letter-identity"
    ]
  ],
  [
    "short-vowels",
    "الحركات والتشكيل",
    2,
    [
      "تشكيل / حركة"
    ],
    [
      "letter-identity"
    ]
  ],
  [
    "word-accuracy",
    "ضبط الكلمات وترتيبها",
    null,
    [
      "كلمة خاطئة",
      "حذف كلمة",
      "زيادة كلمة",
      "تقديم / تأخير كلمة"
    ],
    []
  ],
  [
    "recall",
    "استدعاء المحفوظ",
    null,
    [
      "نسيان",
      "تردد",
      "تلقين"
    ],
    []
  ],
  [
    "noon-rules",
    "أحكام الإظهار والإدغام والإخفاء والإقلاب",
    8,
    [
      "إظهار",
      "إدغام بغنة",
      "إدغام بغير غنة",
      "إخفاء",
      "إقلاب"
    ],
    []
  ],
  [
    "ghunnah",
    "الغنة",
    6,
    [
      "غنة"
    ],
    []
  ],
  [
    "natural-madd",
    "المد الطبيعي",
    3,
    [
      "مد طبيعي"
    ],
    [
      "short-vowels"
    ]
  ],
  [
    "derived-madd",
    "المدود الفرعية",
    3,
    [
      "مد متصل",
      "مد منفصل",
      "مد لازم"
    ],
    [
      "natural-madd"
    ]
  ],
  [
    "qalqalah",
    "القلقلة",
    4,
    [
      "قلقلة"
    ],
    [
      "articulation"
    ]
  ],
  [
    "emphasis",
    "التفخيم والترقيق",
    8,
    [
      "تفخيم",
      "ترقيق"
    ],
    [
      "articulation"
    ]
  ],
  [
    "stopping",
    "الوقف والابتداء",
    null,
    [
      "وقف/ابتداء",
      "وقف وابتداء"
    ],
    []
  ],
  [
    "other-tajweed",
    "حكم تجويدي يحتاج تحديدًا",
    null,
    [
      "حكم تجويدي آخر"
    ],
    []
  ]
];
function projectSkillGraph(memory, catalog) {
  const normalized=v=>String(v??'').normalize('NFC').trim();
  const map=new Map();
  for(const node of catalog)for(const label of node[3]){
    if(map.has(label))throw Error('Ambiguous annotation mapping');
    map.set(label,node[0]);
  }
  const byId=new Map(catalog.map(n=>[n[0],n]));
  if(byId.size!==catalog.length)throw Error('Duplicate skill ID');
  const visit=(id,path=new Set())=>{
    if(path.has(id)||!byId.has(id))throw Error('Invalid candidate link');
    const p=new Set(path);p.add(id);
    for(const parent of byId.get(id)[4])visit(parent,p);
  };
  for(const id of byId.keys())visit(id);
  const observations=new Map(),unmapped=[];
  for(const pattern of Array.isArray(memory?.patterns)?memory.patterns:[]){
    if(pattern?.kind!=='observed-cross-location-pattern'||pattern.requiresTeacherReview!==true)continue;
    const id=map.get(normalized(pattern.type));
    const row={type:normalized(pattern.type),letter:pattern.letter??null,distinctDays:pattern.distinctDays,distinctLocations:pattern.distinctLocations,firstSeen:pattern.firstSeen,lastSeen:pattern.lastSeen,evidence:Array.isArray(pattern.evidence)?pattern.evidence.map(e=>({...e})):[],evidenceTruncated:!!pattern.evidenceTruncated};
    if(!id){unmapped.push(row);continue;}
    if(!observations.has(id))observations.set(id,[]);
    observations.get(id).push(row);
  }
  return {version:'research-0.2',status:'teacher-review-required',nodes:catalog.map(([id,title,foundationLevel,labels,parents])=>({
    id,title,foundationLevel,annotationLabels:[...labels],status:observations.has(id)?'historical-pattern':'unknown',patterns:observations.get(id)||[],
    candidateChecks:observations.has(id)?parents.map(p=>({skillId:p,label:byId.get(p)[1],reason:'proposed-prerequisite-check',reviewStatus:'unreviewed',requiresTeacherReview:true})):[],
    mastery:null
  })),edges:catalog.flatMap(([id,title,level,labels,parents])=>parents.map(p=>({from:p,to:id,kind:'proposed-prerequisite',reviewStatus:'unreviewed',causalInferenceAllowed:false}))),unmapped,limitations:['No mastery from missing errors.','No inferred cause, no automatic assignment, no published findings.','Mapping and prerequisite links are draft teaching suggestions, not approved religious or pedagogical content.']};
}


;
'use strict';
/* Research projection only. No changes to existing Smart Revision or official assignments. */
function buildPersonalPlan(input,catalog){
 const {ownerId,studentId,asOf,graph,skillEvidence,similarPairs,resolveVerse,methodObservations}=input||{};
 const day=x=>{if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x))return '';const d=new Date(x+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x?x:'';};
 const id=x=>typeof x==='string'&&x.length>0&&x.length<=160&&x.trim()===x;
 const invalid={status:'invalid-scope',activities:[],methodHistory:[]};
 if(!id(ownerId)||!id(studentId)||!day(asOf)||!Array.isArray(catalog)||!Array.isArray(graph?.nodes)||!Array.isArray(skillEvidence?.skills))return invalid;
 // Input graph/evidence must have been calculated under the same authorized scope.
 const known=new Map(catalog.map(n=>[n[0],n[1]])),activities=[];
 for(const [skillId,title] of known){
   const g=graph.nodes.find(x=>x.id===skillId),e=skillEvidence.skills.find(x=>x.skillId===skillId);
   const patterns=(g?.patterns||[]).filter(p=>p.distinctDays>=2&&p.distinctLocations>=2&&day(p.lastSeen)&&p.lastSeen<=asOf);
   const current=e&&day(e.latestDay)&&e.latestDay<=asOf?e.state:'unknown';
   if(!patterns.length&&current!=='needs-practice'&&current!=='inconclusive')continue;
   const evidence=patterns.flatMap(p=>Array.isArray(p.evidence)?p.evidence.map(x=>({sessionId:x.sessionId,day:x.day,surah:x.surah,ayah:x.ayah,wordIndex:x.wordIndex,charIndex:x.charIndex})):[]).filter(x=>id(x.sessionId)&&day(x.day)&&x.day<=asOf);
   const score=current==='needs-practice'?3:current==='inconclusive'?2:1;
   const checks=(g?.candidateChecks||[]).filter(x=>known.has(x.skillId)).map(x=>({skillId:x.skillId,label:known.get(x.skillId),reviewStatus:'unreviewed'}));
   activities.push({kind:'teacher-skill-check',skillId,title,priority:score,reason:current==='needs-practice'?'teacher-observed-need':current==='inconclusive'?'inconclusive-assessment':'historical-error-pattern',currentEvidence:current,evidence:evidence.slice(-20),assessmentEvidence:(e?.evidence||[]).slice(-5),candidateChecks:checks,requiresTeacherReview:true});
 }
 // Suggested similar-verse pairs are only shown when one reference is actually
 // present in an observed memory/word-accuracy pattern. Neither pair nor error proves confusion.
 const locationSet=new Set(activities.filter(a=>['recall','word-accuracy'].includes(a.skillId)).flatMap(a=>a.evidence.map(x=>`${x.surah}:${x.ayah}`)));
 const similar=[],seen=new Set();
 if(typeof resolveVerse==='function')for(const p of Array.isArray(similarPairs)?similarPairs:[]){
   if(!p||!Number.isInteger(p.surahId)||!Number.isInteger(p.ayahNumber)||!Number.isInteger(p.similarSurahId)||!Number.isInteger(p.similarAyahNumber))continue;
   const a=`${p.surahId}:${p.ayahNumber}`,b=`${p.similarSurahId}:${p.similarAyahNumber}`,k=[a,b].sort().join('|');
   if(a===b||seen.has(k)||(!locationSet.has(a)&&!locationSet.has(b)))continue;
   let av,bv;try{av=resolveVerse(p.surahId,p.ayahNumber);bv=resolveVerse(p.similarSurahId,p.similarAyahNumber);}catch{continue;}
   if(!av||!bv)continue;
   seen.add(k);similar.push({kind:'possible-similarity-check',pair:[a,b],reviewStatus:'unreviewed',requiresTeacherReview:true,confusionEstablished:false});
 }
 const methods=[];
 const groups=new Map(),rows=Array.isArray(methodObservations)?methodObservations:[];
 const scoped=rows.filter(x=>x?.ownerId===ownerId&&x.studentId===studentId),counts=new Map();
 for(const x of scoped)if(id(x.id))counts.set(x.id,(counts.get(x.id)||0)+1);
 for(const x of scoped){
   if(!id(x.id)||counts.get(x.id)!==1||!id(x.teacherId)||!known.has(x.skillId)||!id(x.methodId)||!day(x.day)||x.day>asOf||x.reviewStatus!=='approved'||x.source!=='teacher-observation'||!['demonstrated','needs-practice','inconclusive'].includes(x.outcome))continue;
   const key=JSON.stringify([x.skillId,x.methodId]),m=groups.get(key)||{skillId:x.skillId,methodId:x.methodId,observations:[],causalEffect:null};
   m.observations.push({id:x.id,day:x.day,outcome:x.outcome});groups.set(key,m);
 }
 for(const m of groups.values())methods.push({...m,observations:m.observations.sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id)).slice(-20),interpretation:'observations-following-method-not-causal-effect'});
 return {status:'teacher-review-required',activities:activities.sort((a,b)=>b.priority-a.priority||a.skillId.localeCompare(b.skillId)).slice(0,5),similarVerseChecks:similar.slice(0,5),methodHistory:methods,automaticAssignment:false,automaticMastery:false};
}


function buildVisibleProfiles(records,visibleRows,asOf,deps){
 const seen=new Set(),students=[];
 for(const row of Array.isArray(visibleRows)?visibleRows:[]){
  const st=row?.st||row,id=String(st?.id??'');
  if(!id||seen.has(id)||(st.studentStatus&&st.studentStatus!=='active'))continue;
  seen.add(id);students.push({id});
 }
 const byStudent=new Map();
 for(const s of Array.isArray(records)?records:[]){
  const id=String(s?.studentId??'');
  if(!seen.has(id))continue;
  if(!byStudent.has(id))byStudent.set(id,[]);
  byStudent.get(id).push(s);
 }
 const out=new Map();
 for(const st of students){
  const memory=deps.buildLearningMemory(byStudent.get(st.id)||[],st.id,asOf);
  const graph=deps.projectSkillGraph(memory,deps.SKILLS);
  const plan=deps.buildPersonalPlan({ownerId:'local-visible-scope',studentId:st.id,asOf,graph,skillEvidence:{skills:[]}},deps.SKILLS);
  out.set(st.id,{patterns:memory.patterns,activities:plan.activities});
 }
 return out;
}
function renderStudentProfile(profile){
 if(!profile?.patterns?.length)return '';
 const esc=v=>String(v??'').slice(0,200).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const patterns=profile.patterns.slice(0,5).map(p=>`<li><strong>${esc(p.type)}${p.letter?' — '+esc(p.letter):''}</strong><small> · ${p.distinctDays} أيام مختلفة · ${p.distinctLocations} مواضع</small><small> · آخر تسجيل ${esc(p.lastSeen)}</small></li>`).join('');
 const activities=profile.activities.slice(0,3).map(p=>`<li>${esc(p.title)} — اختبار متابعة مقترح</li>`).join('');
 return `<details class="iti-next imam-learning-patterns"><summary><b>الذاكرة التعليمية — أنماط تاريخية (${profile.patterns.length})</b></summary><ul>${patterns}</ul>${activities?`<b>اقتراح للحصة القادمة</b><ul>${activities}</ul>`:''}<small>سجل تاريخي من الحصص المحلية، وليس حكمًا على الإتقان أو سبب الخطأ. القرار للمحفظ. لا تحليل صوتي آلي هنا.</small></details>`;
}
const deps={buildLearningMemory,projectSkillGraph,SKILLS,buildPersonalPlan};
const api=Object.freeze({build:(records,visible,day)=>buildVisibleProfiles(records,visible,day,deps),renderStudentProfile});
if(typeof module==='object'&&module.exports)module.exports=api;else root.ImamLearningPreview=api;
})(globalThis);
