'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const player=fs.readFileSync('js/features/guardian-tahfeez.js','utf8');
const flow=fs.readFileSync('js/features/tahfeez-flow-rc14.js','utf8');
const elements=new Map(),storage=new Map();let plays=0;
function node(id){
 if(!elements.has(id)){
  const classes=new Set();elements.set(id,{id,value:'',hidden:false,checked:false,textContent:'',style:{},dataset:{},readyState:2,paused:true,
   classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),toggle:(s,on)=>{on?classes.add(s):classes.delete(s);return !!on;}},
   setAttribute(){},getAttribute(){return ''},querySelector(){return null},closest(){return{open:false}},
   addEventListener(){},removeEventListener(){},pause(){this.paused=true},play(){this.paused=false;plays++;return Promise.resolve()},
   removeAttribute(){},load(){},getBoundingClientRect(){return{top:0,bottom:20}}});
 }return elements.get(id);
}
for(const [id,value] of Object.entries({tahfeezSurah:'1',tahfeezFrom:'1',tahfeezTo:'7',tahfeezRepeat:'1',tahfeezReciter:'Husary_128kbps',tahfeezSpeed:'1',tahfeezVolume:'1',tahfeezTutorRepeat:'3',tahfeezTutorPause:'2',tahfeezSingle:'1',tahfeezGroupFrom:'1',tahfeezGroupTo:'7'}))node(id).value=value;
const ctx={document:{documentElement:{dataset:{}},readyState:'loading',addEventListener(){},getElementById:node,querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{onLine:true},setTimeout,clearTimeout,setInterval,clearInterval,URL,console,AbortController};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(flow,ctx);
vm.runInContext(player.replace('  g.ImamGuardianTahfeez={','  g.rc14Test={state,selectAyah,startPlayback,stop,finishPlayback,audioEnded,replayCurrentAyah,restartRange};\n  g.ImamGuardianTahfeez={'),ctx);
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
(async()=>{
 const t=ctx.rc14Test;
 t.selectAyah(4,true);await sleep(20);
 assert.equal(t.state.selectedAyah,4,'tap selects verse 4');
 assert.equal(t.state.sequenceIndex,3,'tap starts at verse 4 within 1..7 range');
 assert.equal(plays,1,'tap plays verse 4');
 t.audioEnded({currentTarget:node('tahfeezAudio')});await sleep(200);
 assert.equal(t.state.selectedAyah,5,'after verse 4, reader continues to verse 5');
 assert.equal(t.state.sequenceIndex,4);
 assert.equal(plays,2);
 t.selectAyah(6,true);await sleep(20);assert.equal(t.state.selectedAyah,6);assert.equal(t.state.sequenceIndex,5);
 t.replayCurrentAyah();await sleep(20);assert.equal(t.state.selectedAyah,6);assert.equal(t.state.sequenceIndex,5,'replay current keeps continuation point');
 t.restartRange();await sleep(20);assert.equal(t.state.selectedAyah,1);assert.equal(t.state.sequenceIndex,0,'restart only via explicit action');
 t.stop();console.log('RC14 runtime playback: tap 4 -> 5, jump 6, replay 6, deliberate restart 1 PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
