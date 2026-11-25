"use strict";
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const box={};box.globalThis=box;vm.createContext(box);vm.runInContext(read('js/features/tahfeez-flow-rc14.js'),box);
const flow=box.ImamTahfeezFlow;assert(flow,'planner is exposed');
let x=flow.plan({from:5,to:12,selected:9,mode:'range'});assert.strictEqual(x.start,9);assert.strictEqual(x.index,4);assert.strictEqual(x.sequence[x.index+1],10);assert.strictEqual(x.sequence.at(-1),12);
x=flow.plan({from:1,to:30,selected:9,mode:'group',groupFrom:7,groupTo:14});assert.strictEqual(x.start,9);assert.strictEqual(x.sequence[x.index+1],10);assert.strictEqual(x.sequence.at(-1),14);
x=flow.plan({from:5,to:12,selected:9,mode:'single',single:9});assert.deepStrictEqual(Array.from(x.sequence),[9]);
assert.strictEqual(flow.showOpeningBasmala(2,1),true);assert.strictEqual(flow.showOpeningBasmala(9,1),false);assert.strictEqual(flow.showOpeningBasmala(1,1),false);assert.strictEqual(flow.showOpeningBasmala(2,5),true);assert.strictEqual(flow.showOpeningBasmala(1,2),true);assert.strictEqual(flow.showOpeningIstiadhah(9,1),true);
const js=read('js/features/guardian-tahfeez.js');assert(js.includes('selectAyah(Number(node.dataset.ayah),true)'),'tap must start audio');assert(js.includes('state.completed=false;')&&js.includes('if(play)startPlayback();'),'manual verse selection must override completion state');assert(js.includes('g.tahfeezReplayCurrentAyah=replayCurrentAyah'));assert(js.includes("if(state.repeatMode==='single'){setRepeatMode('range')"),'replay-then-continue cannot remain in single mode');assert(js.includes('if(play)startPlayback();'),'selected verse continues in configured range');
for(const f of ['maqraa.html','guest-practice.html','guardian-portal.html']){const s=read(f);for(const name of ['tahfeezBasmala','tahfeezReplayCurrentAyah','tahfeezRestartRange','tahfeez-flow-rc14.js','rc14-tahfeez-flow.css'])assert(s.includes(name),`${f}: ${name} missing`);}
const guest=read('js/features/guest-practice.js');assert(guest.includes('startAyah:x.ayah'),'bookmark continuation target missing');
const sw=read('sw.js');assert(sw.includes('rc14-tahfeez-continuation')&&sw.includes("'./js/features/tahfeez-flow-rc14.js?v=beta28-rc14'"),'worker missing new generation');
console.log('RC14 Tahfeez continuation and RC17 Basmala-before-passage tests passed');
