'use strict';
/* Imam Academy v11.2.0 Stage 4 — assignment audio export/share utility.
   Builds one MP3 from EveryAyah verse-by-verse files without transcoding. */
(function quranAudioExport(g){
  const RECITERS={
    mishary:{folder:'Alafasy_128kbps',label:'الشيخ مشاري راشد العفاسي'},
    husary:{folder:'Husary_128kbps',label:'الشيخ محمود خليل الحصري'},
    muaiqly:{folder:'MaherAlMuaiqly128kbps',label:'الشيخ ماهر المعيقلي'}
  };
  const MAX_AYAHS=60,MAX_BYTES=48*1024*1024;
  function audioUrl(folder,chapter,ayah){return `https://everyayah.com/data/${encodeURIComponent(folder)}/${String(chapter).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;}
  function stripId3(bytes){
    if(bytes.length<10||bytes[0]!==0x49||bytes[1]!==0x44||bytes[2]!==0x33)return bytes;
    const size=((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f),footer=(bytes[5]&0x10)?10:0,offset=Math.min(bytes.length,10+size+footer);
    return bytes.subarray(offset);
  }
  function safeName(v){return String(v||'تكليف').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim().slice(0,80);}
  async function buildFile(input,onProgress){
    const chapter=Math.max(1,Math.min(114,Number(input?.chapter)||1)),from=Math.max(1,Number(input?.from)||1),to=Math.max(from,Number(input?.to)||from),count=to-from+1;
    if(count>MAX_AYAHS)throw new Error('AUDIO_RANGE_TOO_LARGE');
    const rec=RECITERS[input?.reciter]||RECITERS.mishary,parts=[];let total=0;
    for(let ayah=from;ayah<=to;ayah++){
      onProgress?.({done:ayah-from,total:count,ayah,phase:'fetch'});
      const res=await fetch(audioUrl(rec.folder,chapter,ayah),{mode:'cors',cache:'no-store'});if(!res.ok)throw new Error(`AUDIO_HTTP_${res.status}`);
      const raw=new Uint8Array(await res.arrayBuffer()),clean=stripId3(raw);if(!clean.length)throw new Error('EMPTY_AUDIO');
      total+=clean.byteLength;if(total>MAX_BYTES)throw new Error('AUDIO_FILE_TOO_LARGE');parts.push(clean);
    }
    onProgress?.({done:count,total:count,phase:'ready'});
    const blob=new Blob(parts,{type:'audio/mpeg'}),surah=safeName(input?.surah||`سورة-${chapter}`),label=safeName(rec.label.replace(/^الشيخ\s+/,''));
    return new File([blob],`تكليف-${surah}-${from}-${to}-${label}.mp3`,{type:'audio/mpeg',lastModified:Date.now()});
  }
  async function shareFile(file,{title='صوت التكليف',text='ملف صوتي للتكليف'}={}){
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title,text,files:[file]});return{shared:true,downloaded:false};}
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);return{shared:false,downloaded:true};
  }
  g.ImamQuranAudioExport={RECITERS,audioUrl,buildFile,shareFile};
})(globalThis);
