
'use strict';
/* RC14: pure planning for Quran continuation and separate Basmala display. */
(function (g) {
  function whole(v, fallback) {
    const n=Number(v); return Number.isInteger(n)?n:fallback;
  }
  function plan(opts) {
    const from=Math.max(1,whole(opts?.from,1));
    const to=Math.max(from,whole(opts?.to,from));
    let lo=from,hi=to;
    const mode=opts?.mode||'range';
    if(mode==='single') {lo=hi=Math.max(from,Math.min(to,whole(opts?.single,from)));}
    else if(mode==='group') {
      lo=Math.max(from,Math.min(to,whole(opts?.groupFrom,from)));
      hi=Math.max(lo,Math.min(to,whole(opts?.groupTo,to)));
    }
    const sequence=Array.from({length:hi-lo+1},(_,i)=>lo+i);
    const preferred=whole(opts?.selected,lo);
    const index=sequence.indexOf(preferred);
    return {sequence,index:index>=0?index:0,start:index>=0?preferred:lo,from:lo,to:hi};
  }
  function showOpeningBasmala(chapter,from) {
    const ch=whole(chapter,0),f=whole(from,0);
    // Add the Basmala before every selected passage except At-Tawbah.
    // Al-Fatihah 1:1 already is the Basmala, so do not duplicate it.
    return ch>=1&&ch<=114&&ch!==9&&!(ch===1&&f===1);
  }
  function showOpeningIstiadhah(chapter,from){const ch=whole(chapter,0),f=whole(from,0);return ch>=1&&ch<=114&&f>=1;}
  function openingGuide(chapter,from){return{istiadhah:showOpeningIstiadhah(chapter,from),basmala:showOpeningBasmala(chapter,from)};}
  g.ImamTahfeezFlow=Object.freeze({plan,showOpeningBasmala,showOpeningIstiadhah,openingGuide});
})(globalThis);
