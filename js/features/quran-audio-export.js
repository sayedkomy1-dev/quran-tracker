'use strict';
/* Imam Academy v11.2.0 Stage 4 — assignment audio export/share utility.
   Builds one MP3 from EveryAyah verse-by-verse files without transcoding. */
(function quranAudioExport(g){
  const RECITERS={
    mishary:{folder:'Alafasy_128kbps',label:'الشيخ مشاري راشد العفاسي'},
    husary:{folder:'Husary_128kbps',label:'الشيخ محمود خليل الحصري'},
    muaiqly:{folder:'MaherAlMuaiqly128kbps',label:'الشيخ ماهر المعيقلي'}
  };
  const MAX_AYAHS=286,MAX_BYTES=48*1024*1024;
  function audioUrl(folder,chapter,ayah){return `https://everyayah.com/data/${encodeURIComponent(folder)}/${String(chapter).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;}
  function safeName(v){return String(v||'تكليف').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim().slice(0,80);}
  async function buildFile(input,onProgress){
    const chapter=Number(input?.chapter),from=Number(input?.from),to=Number(input?.to),count=to-from+1;
    const lib=g.ImamOfflineAudio;if(!lib)throw new Error('AUDIO_STORAGE_UNAVAILABLE');
    const reciter=RECITERS[input?.reciter]?input.reciter:'mishary';lib.key(reciter,chapter,from);lib.key(reciter,chapter,to);if(to<from)throw new Error('AUDIO_INVALID_VERSE');
    if(count>MAX_AYAHS)throw new Error('AUDIO_RANGE_TOO_LARGE');
    const rec=RECITERS[input?.reciter]||RECITERS.mishary,parts=[];let total=0;
    // A mid-surah assignment needs a standalone Basmala on every chapter except At-Tawbah.
    // Verse 1 is deliberately not prefixed: the source track can already contain it;
    // Al-Fatihah 1:1 is itself the Basmala. Never risk a duplicate opening.
    const needsBasmala=chapter!==9&&from>1;
    if(needsBasmala){
      try{
        onProgress?.({done:0,total:count+1,ayah:1,chapter:1,phase:'basmala'});
        const b=await lib.verse(reciter,1,1);const raw=new Uint8Array(await b.arrayBuffer());
        const clean=lib.audioPayload(raw);if(!lib.isMp3(raw)||!clean.length)throw new Error('EMPTY_AUDIO');
        total+=clean.byteLength;parts.push(clean);
      }catch(e){if(g.navigator?.onLine===false)throw new Error('AUDIO_BASMALA_MISSING');throw e;}
    }
    for(let ayah=from;ayah<=to;ayah++){
      onProgress?.({done:ayah-from+(needsBasmala?1:0),total:count+(needsBasmala?1:0),ayah,phase:'fetch'});
      const source=await lib.verse(reciter,chapter,ayah);const raw=new Uint8Array(await source.arrayBuffer()),clean=lib.audioPayload(raw);if(!lib.isMp3(raw)||!clean.length)throw new Error('EMPTY_AUDIO');
      total+=clean.byteLength;if(total>MAX_BYTES)throw new Error('AUDIO_FILE_TOO_LARGE');parts.push(clean);
    }
    onProgress?.({done:count+(needsBasmala?1:0),total:count+(needsBasmala?1:0),phase:'ready'});
    const blob=new Blob(parts,{type:'audio/mpeg'}),surah=safeName(input?.surah||`سورة-${chapter}`),label=safeName(rec.label.replace(/^الشيخ\s+/,''));
    return new File([blob],`تكليف-${surah}-${from}-${to}-${label}.mp3`,{type:'audio/mpeg',lastModified:Date.now()});
  }
  async function shareFile(file,{title='صوت التكليف',text='ملف صوتي للتكليف'}={}){
    if(!g.ImamTemporaryMedia)throw new Error('MEDIA_SHARE_UNAVAILABLE');return g.ImamTemporaryMedia.share([file],{title,text});
  }
  // Concatenation adds no intentional pause, but original MP3 recordings may
  // include their own encoder padding or trailing silence; true gapless output
  // requires decoding and re-encoding, not supported by this offline utility.
  g.ImamQuranAudioExport={RECITERS,audioUrl,buildFile,shareFile};
})(globalThis);
