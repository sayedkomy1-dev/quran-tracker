'use strict';
/* beta.6: optional, rights-gated, offline multi-tafsir corpus.
   The app NEVER ships the third-party texts or rewrites the Quran engine.
   Licensing and scholarly authentication remain external human reviews. */
(function(g){
  const app=g.ImamApp||(g.ImamApp={});
  const BOOKS=Object.freeze(['التفسير الميسر','تفسير السعدي','تفسير ابن كثير','تفسير الطبري','تفسير القرطبي','تفسير البغوي','تفسير الجلالين','تفسير الوسيط']);
  const DB='imam-board-multi-tafsir-v1',ROWS='verses',META='metadata';
  const SOURCE=Object.freeze({name:'مجموعة تفاسير — تجميع غير محقق',url:'https://github.com/meibassam/mosahaf-tafseer',license:'غير مثبت؛ يتطلب إذنًا أو سندًا يجيز إعادة الاستخدام'});
  const limit=24*1024*1024;
  const norm=s=>String(s||'').normalize('NFC').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[^\u0621-\u064a]/g,'');
  const clean=s=>app.BoardTafsir?.safeText?.(s)||String(s??'').replace(/<[^>]+>/g,' ').trim();
  const surahs=()=>typeof S!=='undefined'?S:g.S||[];
  function parseChapter(data,book,reference){
    if(!BOOKS.includes(book))throw Error('تفسير غير مدعوم');
    const ch=Number(data?.number),length=Number(surahs()[ch-1]?.a);
    if(!Number.isInteger(ch)||ch<1||ch>114||!Number.isInteger(length)||!Array.isArray(data.ayahs))throw Error('رقم السورة أو بنية الآيات غير صحيحة');
    if(data.ayahs.length!==length)throw Error(`سورة ${ch}: العدد ${data.ayahs.length} لا يساوي عدد الآيات المعتمد ${length}`);
    if(data.surah&&norm(data.surah)!==norm(surahs()[ch-1].n))throw Error(`سورة ${ch}: الاسم لا يطابق رقم السورة`);
    const refs=reference?new Map(reference.map(x=>[Number(x.ayah),norm(x.text)])):null;
    if(refs&&refs.size!==length)throw Error(`سورة ${ch}: نسخة المصحف المرجعية غير مكتملة`);
    const used=new Set(),rows=[];let omitted=0,compared=0;
    for(const v of data.ayahs){
      const ay=Number(v?.ayah_number);
      if(!Number.isInteger(ay)||ay<1||ay>length||used.has(ay))throw Error(`سورة ${ch}: ترتيب أو ترقيم الآيات غير صحيح`);
      used.add(ay);
      const text=norm(v.text);
      if(text.length<3)throw Error(`سورة ${ch} آية ${ay}: نص المقارنة مفقود`);
      if(refs){if(!refs.has(ay)||refs.get(ay)!==text)throw Error(`سورة ${ch} آية ${ay}: اختلاف النص مع محرك المصحف — رفض الملف`);compared++;}
      if(!Array.isArray(v.tafsir))throw Error(`سورة ${ch} آية ${ay}: مصفوفة التفاسير مفقودة`);
      const matches=v.tafsir.filter(x=>x?.type===book||(book==='تفسير الوسيط'&&['تفسير الوسيط لطنطاوي','تفسير الوسيط للطنطاوي','التفسير الوسيط للطنطاوي'].includes(x?.type)));
      if(matches.length>1)throw Error(`سورة ${ch} آية ${ay}: مدخل تفسير مكرر`);
      const content=clean(matches[0]?.text);
      if(!content){omitted++;continue;}
      if(content.length>250000)throw Error(`سورة ${ch} آية ${ay}: حجم التفسير غير معقول`);
      rows.push({key:`m:${book}:${ch}:${ay}`,chapter:ch,ayah:ay,book,content,sourceName:SOURCE.name,sourceUrl:SOURCE.url,reviewed:false});
    }
    return{chapter:ch,verses:length,entries:rows,empty:omitted,referenceCompared:compared};
  }
  async function decode(file){
    if(!file||file.size>limit||file.size<4)throw Error('حجم الملف غير صالح أو أكبر من 24 ميجابايت');
    if(/\.json\.gz$/i.test(file.name||'')){
      if(!g.DecompressionStream)throw Error('المتصفح لا يدعم فك الضغط. استخدم ملفات JSON الأصلية');
      const text=await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
      if(text.length>45*1024*1024)throw Error('الملف بعد فك الضغط كبير جدًا');return JSON.parse(text);
    }
    if(!/\.json$/i.test(file.name||''))throw Error('اختر ملفات JSON أو JSON.GZ وليس ZIP');
    return JSON.parse(await file.text());
  }
  // One surah at a time; only the selected tafsir is kept in memory.
  async function inspect(files,{book=BOOKS[0],checkQuran=false}={}){
    const list=Array.from(files||[]);
    if(!list.length||list.length>114)throw Error('اختر من 1 إلى 114 ملف سورة');
    const seen=new Set(),entries=[],chapters=[],referenceFailures=[];
    for(const file of list){
      const payload=await decode(file),chapter=Number(payload?.number);
      const named=/^(\d{3})_.+\.json(?:\.gz)?$/i.exec(String(file.name||''));
      if(named&&Number(named[1])!==chapter)throw Error('اسم ملف السورة لا يطابق رقمها الداخلي');
      if(seen.has(chapter))throw Error(`تكرار ملف السورة ${chapter}`);
      let ref=null;
      if(checkQuran){
        if(typeof g.fetchQpcHafsChapter!=='function')throw Error('محرك المصحف المرجعي غير متاح');
        try{ref=await g.fetchQpcHafsChapter(chapter);}catch(_){throw Error(`سورة ${chapter}: تعذر تحميل نص المقارنة من محرك المصحف`);}
      }
      const result=parseChapter(payload,book,ref);
      seen.add(chapter);chapters.push({chapter,verses:result.verses,present:result.entries.length,empty:result.empty,referenceCompared:result.referenceCompared});
      entries.push(...result.entries);
    }
    chapters.sort((a,b)=>a.chapter-b.chapter);
    const estimatedBytes=entries.reduce((sum,x)=>sum+x.content.length*2,0);
    if(estimatedBytes>30*1024*1024)throw Error('التفسير المحدد كبير جدًا للاستيراد دفعة واحدة؛ قسمه إلى مجموعات سور لتجنب استهلاك ذاكرة الهاتف');
    const verses=chapters.reduce((n,c)=>n+c.verses,0),empty=chapters.reduce((n,c)=>n+c.empty,0);
    return {book,files:list.length,chapters,verses,entries,empty,covered:entries.length,complete:seen.size===114&&verses===6236,referenceCompared:chapters.reduce((n,c)=>n+c.referenceCompared,0),source:SOURCE};
  }
  function openDB(){return new Promise((resolve,reject)=>{if(!g.indexedDB)return reject(Error('التخزين المحلي غير مدعوم'));const req=g.indexedDB.open(DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(ROWS))db.createObjectStore(ROWS,{keyPath:'key'});if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'book'});};req.onerror=()=>reject(req.error||Error('تعذر فتح قاعدة التفاسير'));req.onsuccess=()=>resolve(req.result);});}
  async function get(chapter,ayah,book=BOOKS[0]){if(!BOOKS.includes(book)||!Number.isInteger(Number(chapter))||!Number.isInteger(Number(ayah)))return null;const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(ROWS,'readonly'),req=tx.objectStore(ROWS).get(`m:${book}:${chapter}:${ayah}`);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();reject(tx.error);};});}
  async function status(book=BOOKS[0]){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(META,'readonly'),req=tx.objectStore(META).get(book);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();reject(tx.error);};});}
  async function importFiles(files,{book=BOOKS[0],permissionConfirmed=false,checkQuran=false}={}){
    if(!permissionConfirmed)throw Error('تأكيد حق الاستخدام مطلوب قبل التخزين؛ وجود البيانات على GitHub لا يثبت الترخيص');
    const audit=await inspect(files,{book,checkQuran});
    const db=await openDB();
    // Replace ONLY the imported chapters. Other offline chapters, including
    // earlier partial batches for the same book, remain untouched.
    // All changes and the merged coverage summary share one IDB transaction.
    const report=await new Promise((resolve,reject)=>{
      const tx=db.transaction([ROWS,META],'readwrite'),store=tx.objectStore(ROWS),meta=tx.objectStore(META);
      const changed=new Set(audit.chapters.map(x=>x.chapter));
      const before=meta.get(book);
      let merged=null;
      before.onsuccess=()=>{
        const prior=Array.isArray(before.result?.chapters)?before.result.chapters:[];
        const chapters=[...prior.filter(x=>!changed.has(x.chapter)),...audit.chapters].sort((a,b)=>a.chapter-b.chapter);
        const verses=chapters.reduce((n,x)=>n+x.verses,0);
        merged={book,chapters,verses,covered:chapters.reduce((n,x)=>n+x.present,0),empty:chapters.reduce((n,x)=>n+x.empty,0),complete:chapters.length===114&&verses===6236,referenceCompared:chapters.reduce((n,x)=>n+x.referenceCompared||0,0)};
        const cursor=store.openCursor();
        cursor.onsuccess=()=>{
          const cur=cursor.result;
          if(cur){
            if(String(cur.key).startsWith(`m:${book}:`)&&changed.has(cur.value.chapter))cur.delete();
            cur.continue();
          }else{
            for(const x of audit.entries)store.put(x);
            meta.put({...merged,verseCount:merged.verses,importedAt:Date.now(),rightsDeclaredByOperator:true,automaticallyVerified:false,sourceName:SOURCE.name,sourceUrl:SOURCE.url,licenseStatus:SOURCE.license});
          }
        };
      };
      tx.oncomplete=()=>resolve({book,chapters:merged.chapters.length,verses:merged.verses,covered:merged.covered,empty:merged.empty,complete:merged.complete,referenceCompared:merged.referenceCompared,updatedChapters:audit.chapters.length});
      tx.onerror=()=>reject(tx.error||Error('فشل التخزين'));tx.onabort=()=>reject(tx.error||Error('فشل تحديث المكتبة السابقة'));
    }).finally(()=>db.close());
    return report;
  }
  app.BoardCorpus=Object.freeze({BOOKS,SOURCE,parseChapter,inspect,importFiles,get,status});
})(window);
