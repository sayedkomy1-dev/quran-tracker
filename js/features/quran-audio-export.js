'use strict';
/* Imam Academy v11.2.0 Stage 4 — assignment audio export/share utility.
   Builds one MP3 from EveryAyah verse-by-verse files without transcoding. */
(function quranAudioExport(g){
  const RECITERS=Object.freeze(Object.fromEntries((g.ImamQuranReciters?.list||[]).map(x=>[x.id,{folder:x.folder,label:x.label}]).concat(g.ImamQuranReciters?.list?.length?[]:[
    ['mishary',{folder:'Alafasy_128kbps',label:'الشيخ مشاري راشد العفاسي'}],['husary',{folder:'Husary_128kbps',label:'الشيخ محمود خليل الحصري — مرتل'}],['husaryTeacher',{folder:'Husary_Muallim_128kbps',label:'الشيخ محمود خليل الحصري — معلم'}],['minshawy',{folder:'Minshawy_Murattal_128kbps',label:'الشيخ محمد صديق المنشاوي — مرتل'}],['minshawyTeacher',{folder:'Minshawy_Teacher_128kbps',label:'الشيخ محمد صديق المنشاوي — معلم'}],['muaiqly',{folder:'MaherAlMuaiqly128kbps',label:'الشيخ ماهر المعيقلي'}]
 ])));
  const MAX_AYAHS=286,MAX_BYTES=48*1024*1024;
  function audioUrl(folder,chapter,ayah){return `https://everyayah.com/data/${encodeURIComponent(folder)}/${String(chapter).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;}
  function safeName(v){return String(v||'تكليف').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim().slice(0,80);}
  async function buildFile(input,onProgress){
    const chapter=Number(input?.chapter),from=Number(input?.from),to=Number(input?.to),count=to-from+1;
    const lib=g.ImamOfflineAudio;if(!lib)throw new Error('AUDIO_STORAGE_UNAVAILABLE');
    const reciter=RECITERS[input?.reciter]?input.reciter:'mishary';lib.key(reciter,chapter,from);lib.key(reciter,chapter,to);if(to<from)throw new Error('AUDIO_INVALID_VERSE');
    if(count>MAX_AYAHS)throw new Error('AUDIO_RANGE_TOO_LARGE');
    const rec=RECITERS[input?.reciter]||RECITERS.mishary,parts=[];let total=0,done=0;
    // Every selected passage begins with the Basmala except At-Tawbah.
    // Al-Fatihah 1:1 is the Basmala itself, so it is not duplicated when the range starts there.
    const needsBasmala=chapter!==9&&!(chapter===1&&from===1);
    if(needsBasmala){
      onProgress?.({done:0,total:count+1,phase:'basmala'});
      const opening=await lib.verse(reciter,1,1),raw=new Uint8Array(await opening.arrayBuffer()),clean=lib.audioPayload(raw);
      if(!lib.isMp3(raw)||!clean.length)throw new Error('EMPTY_BASMALA_AUDIO');
      total+=clean.byteLength;if(total>MAX_BYTES)throw new Error('AUDIO_FILE_TOO_LARGE');parts.push(clean);done++;
    }
    for(let ayah=from;ayah<=to;ayah++){
      onProgress?.({done,total:count+(needsBasmala?1:0),ayah,phase:'fetch'});
      const source=await lib.verse(reciter,chapter,ayah);const raw=new Uint8Array(await source.arrayBuffer()),clean=lib.audioPayload(raw);if(!lib.isMp3(raw)||!clean.length)throw new Error('EMPTY_AUDIO');
      total+=clean.byteLength;if(total>MAX_BYTES)throw new Error('AUDIO_FILE_TOO_LARGE');parts.push(clean);done++;
    }
    onProgress?.({done,total:count+(needsBasmala?1:0),phase:'ready'});
    const blob=new Blob(parts,{type:'audio/mpeg'}),surah=safeName(input?.surah||`سورة-${chapter}`),label=safeName(rec.label.replace(/^الشيخ\s+/,''));
    return new File([blob],`تكليف-${surah}-${from}-${to}-${label}.mp3`,{type:'audio/mpeg',lastModified:Date.now()});
  }
  async function shareFile(file,{title='صوت التكليف',text='ملف صوتي للتكليف'}={}){
    if(!(file instanceof File)||file.type!=='audio/mpeg'||!file.size)throw new Error('AUDIO_EXPORT_INVALID_FILE');
    if(!g.ImamTemporaryMedia)throw new Error('MEDIA_SHARE_UNAVAILABLE');return g.ImamTemporaryMedia.share([file],{title,text});
  }
  // Concatenation adds no intentional pause, but original MP3 recordings may
  // include their own encoder padding or trailing silence; true gapless output
  // requires decoding and re-encoding, not supported by this offline utility.
  g.ImamQuranAudioExport={RECITERS,audioUrl,buildFile,shareFile};
})(globalThis);
