import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.assets=[];
globalThis.names=[];
globalThis.ProfitMenteGroupDragEngine=function ProfitMenteGroupDragEngine(){};
globalThis.project={
  duration:30,
  markers:[{id:'m1',time:7.25,label:'Beat'}],
  clips:[
    {id:'a',track:0,start:2,duration:2,asset:null},
    {id:'moving',track:0,start:10,duration:2,asset:null}
  ]
};
let playheadValue='5.5';
globalThis.document={
  querySelector(sel){return sel==='#playhead'?{value:playheadValue}:null},
  querySelectorAll(){return []},
  addEventListener(){},
  elementFromPoint(){return null}
};

vm.runInThisContext(fs.readFileSync(new URL('./timeline-magnet.js',import.meta.url),'utf8'),{filename:'timeline-magnet.js'});
const magnet=globalThis.ProfitMenteTimelineMagnet;
assert.ok(magnet,'timeline magnet must load');
assert.deepEqual(magnet.guideTimes(),[5.5,7.25]);
assert.ok(magnet.boundaries('moving').includes(5.5),'playhead must be a snap boundary');
assert.ok(magnet.boundaries('moving').includes(7.25),'marker must be a snap boundary');
assert.equal(magnet.snapTime(7.19,'moving').time,7.25,'trim should snap to nearby marker');
assert.equal(magnet.snapStart(5.44,project.clips[1]).start,5.5,'clip start should snap to playhead');
assert.equal(magnet.snapStart(5.30,project.clips[1]).start,5.3,'outside threshold should stay on grid');
playheadValue='100';
assert.ok(magnet.guideTimes().includes(30),'playhead guide must clamp to project duration');
project.markers.push({id:'bad',time:'not-a-number'});
assert.equal(magnet.guideTimes().some(Number.isNaN),false,'invalid markers must be ignored');
console.log('timeline magnet guide regression OK');
