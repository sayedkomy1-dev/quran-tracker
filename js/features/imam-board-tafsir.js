'use strict';
/* Optional, device-local scientific corpus. Quran itself remains sourced from the existing Quran engine.
   Records are NOT authenticated merely by importing a file: provenance is explicitly disclosed in UI. */
(function (g) {
  const root=g.ImamApp||(g.ImamApp={});
  const DB='imam-board-scientific-corpus-v1', STORE='entries', META='meta', LIMIT=24*1024*1024;
  const SOURCES=Object.freeze({
    verse:{title:'التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف',url:'https://qurancomplex.gov.sa/en/techquran/dev/'},
    word:{title:'الميسر في غريب القرآن الكريم — مجمع الملك فهد لطباعة المصحف الشريف',url:'https://qurancomplex.gov.sa/en/techquran/dev/'}
  });
  const diacritics=/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  const normalized=s=>String(s||'').normalize('NFC').replace(diacritics,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[^\u0621-\u064A]/g,'');
  const asInt=n=>Number.isInteger(Number(n))?Number(n):NaN;
  function suraIndex(name){const list=typeof S!=='undefined'?S:(g.S||[]);return list.findIndex(x=>normalized(x.n)===normalized(name))+1;}
  function safeText(raw){return String(raw??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,+n))).replace(/\s+/g,' ').trim();}
  function columns(data){if(Array.isArray(data))return data;
    if(data&&typeof data==='object')for(const key of ['data','rows','records','items','verses','tafsir','tafseer','words'])if(Array.isArray(data[key]))return data[key];
    // One record is allowed for a small test/sample import.
    if(data&&typeof data==='object'&&('aya_no' in data||'ayah' in data))return [data];
    throw Error('ملف غير مدعوم: يجب اختيار JSON/CSV لبيانات المجمع');
  }
  function parseCSV(s){s=s.replace(/^\ufeff/,'');const rows=[];let cells=[],value='',quote=false;
    for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){value+='"';i++;}else quote=!quote;}else if(c===','&&!quote){cells.push(value);value='';}else if((c==='\n'||c==='\r')&&!quote){cells.push(value);value='';if(cells.some(x=>x.trim()))rows.push(cells);cells=[];if(c==='\r'&&s[i+1]==='\n')i++;}else value+=c;}
    if(quote)throw Error('ملف CSV يحتوي اقتباسًا غير مغلق');cells.push(value);if(cells.some(x=>x.trim()))rows.push(cells);if(rows.length<2)throw Error('CSV بلا بيانات');const heads=rows.shift().map(x=>x.replace(/^\ufeff/,'').trim());return rows.map(row=>Object.fromEntries(heads.map((h,i)=>[h,row[i]||''])));
  }
  function canonical(row,kind){if(!row||typeof row!=='object')return null;
    const chapter=asInt(row.sura_no??row.surah_no??row.surah??row.chapter??row.sura_id??suraIndex(row.sura_name??row.sura_name_ar??row.surah_name));
    const ayah=asInt(row.aya_no??row.ayah_no??row.ayah??row.verse??row.aya);
    const suras=typeof S!=='undefined'?S:(g.S||[]);const max=Number(suras?.[chapter-1]?.a);
    if(!(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286)||(!Number.isInteger(max)||ayah>max))return null;
    const content=safeText(kind==='verse'?row.aya_tafseer??row.ayah_tafseer??row.tafseer??row.tafsir??row.explanation:row.explanation??row.meaning??row.tafseer);
    if(content.length<2||content.length>7500)return null;
    const word=kind==='word'?safeText(row.quranic_words??row.word??row.quranic_word):'';
    if(kind==='word'&&(!normalized(word)||word.length>100))return null;
    return{key:(kind==='verse'?'t:':'w:')+chapter+':'+ayah+(kind==='word'?':'+normalized(word):''),chapter,ayah,kind,word,content};
  }
  function dbOpen(){if(!g.indexedDB)return Promise.reject(Error('التخزين العلمي المحلي غير مدعوم في هذا المتصفح'));
    return new Promise((resolve,reject)=>{const request=g.indexedDB.open(DB,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'kind'});};request.onerror=()=>reject(request.error||Error('تعذر فتح قاعدة المحتوى'));request.onsuccess=()=>resolve(request.result);});}
  async function readEntry(key){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function getVerse(ch,ayah){return readEntry('t:'+asInt(ch)+':'+asInt(ayah));}
  async function getWord(ch,ayah,word){const n=normalized(word);return n?readEntry('w:'+asInt(ch)+':'+asInt(ayah)+':'+n):null;}
  async function status(){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(META,'readonly'),req=tx.objectStore(META).getAll();req.onsuccess=()=>resolve(Object.fromEntries((req.result||[]).map(x=>[x.kind,x])));req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};});}
  function convertFile(file,kind){if(!file||file.size>LIMIT)throw Error('الملف أكبر من الحد المسموح (24 ميجابايت)');if(!/\.(json|csv)$/i.test(file.name||''))throw Error('اختر ملف JSON أو CSV من حزمة المطورين');return file.text().then(s=>{const items=/\.csv$/i.test(file.name)?parseCSV(s):columns(JSON.parse(s));if(!Array.isArray(items)||items.length<1||items.length>16000)throw Error('عدد الصفوف غير متوقع');const valid=items.map(x=>canonical(x,kind)).filter(Boolean),unique=new Map(valid.map(x=>[x.key,x]));if(unique.size<1||unique.size<items.length*.95)throw Error('الملف غير مطابق لحقول النوع المحدد، لم يتم استيراده');return [...unique.values()];});}
  async function importFiles(files,kind,acknowledged){
    if(!SOURCES[kind])throw Error('نوع المادة غير معروف');
    if(!acknowledged)throw Error('يجب تأكيد أنك اخترت بيانات المجمع الرسمية');
    const list=Array.from(files||[]);if(!list.length||list.length>115)throw Error('اختر من ملف واحد إلى 115 ملفًا على الأكثر');
    const results=await Promise.all(list.map(file=>convertFile(file,kind)));
    const combined=new Map();for(const items of results)for(const x of items)combined.set(x.key,x);
    if(!combined.size||combined.size>16000)throw Error('عدد مدخلات المكتبة غير متوقع');
    const db=await dbOpen();return new Promise((resolve,reject)=>{
      const tx=db.transaction([STORE,META],'readwrite'),table=tx.objectStore(STORE),meta=tx.objectStore(META);
      for(const entry of combined.values())table.put(entry);
      const stats={kind,count:combined.size,importedAt:Date.now(),file:list.length===1?String(list[0].name||'').slice(0,140):`${list.length} ملفات`,sourceTitle:SOURCES[kind].title,sourceUrl:SOURCES[kind].url,verified:false};meta.put(stats);
      tx.oncomplete=()=>{db.close();resolve(stats);};tx.onerror=()=>{db.close();reject(tx.error||Error('فشل استيراد المحتوى'));};tx.onabort=()=>{db.close();reject(tx.error||Error('تعذر إكمال الاستيراد'));};
    });
  }
  const importFile=(file,kind,acknowledged)=>importFiles([file],kind,acknowledged);
  root.BoardTafsir=Object.freeze({SOURCES,normalized,safeText,canonical,parseCSV,getVerse,getWord,status,importFile,importFiles});
})(window);
