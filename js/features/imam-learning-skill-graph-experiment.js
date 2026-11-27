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
if(typeof module==='object'&&module.exports)module.exports={projectSkillGraph,SKILLS};
