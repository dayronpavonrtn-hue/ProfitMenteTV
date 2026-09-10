const assert=require('assert');
const Engine=require('./audio-qc-engine.js');
const rows=[
 {clip:{id:'voice',track:6,start:0,duration:4,volume:1},effectivePeak:.72,dbfs:Engine.dbfs(.72),status:'ok'},
 {clip:{id:'music',track:5,start:1,duration:2,volume:.22},effectivePeak:.42,dbfs:Engine.dbfs(.42),status:'ok'},
 {clip:{id:'sfx',track:4,start:5,duration:1,volume:1},effectivePeak:.3,dbfs:Engine.dbfs(.3),status:'ok'}
];
const mix=Engine.inspectMixOverlaps(rows);
assert.equal(mix.clipping,1,'voice + music must be flagged as a clipping mix segment');
assert.equal(mix.hot,0);
assert.ok(mix.worst);
assert.equal(mix.worst.start,1);
assert.equal(mix.worst.end,3);
assert.deepEqual(new Set(mix.worst.clipIds),new Set(['voice','music']));
assert.ok(mix.worst.effectivePeak>1);
const plan=Engine.planHeadroomFix({clips:rows.map(row=>row.clip)},rows,mix);
assert.equal(plan.ok,true);
assert.equal(plan.needed,true);
assert.ok(plan.gain<1&&plan.gain>0);
assert.ok(Math.abs((mix.worst.effectivePeak*plan.gain)-Math.pow(10,-1/20))<1e-9,'planned gain must land at -1 dBFS');
const project={clips:rows.map(row=>({...row.clip}))};
const mutableRows=rows.map((row,index)=>({...row,clip:project.clips[index]}));
const applied=Engine.applyHeadroomFix(project,mutableRows,mix);
assert.equal(applied.ok,true);
assert.equal(applied.changed,3);
assert.ok(Math.abs(project.clips[0].volume-plan.gain)<1e-9);
assert.ok(Math.abs(project.clips[1].volume-(.22*plan.gain))<1e-9);
const safe=Engine.inspectMixOverlaps([
 {clip:{id:'a',track:6,start:0,duration:2},effectivePeak:.2},
 {clip:{id:'b',track:5,start:1,duration:2},effectivePeak:.2}
]);
assert.equal(safe.clipping,0);
assert.equal(safe.hot,0);
const safePlan=Engine.planHeadroomFix({},[
 {clip:{id:'a',track:6,start:0,duration:2},effectivePeak:.2},
 {clip:{id:'b',track:5,start:1,duration:2},effectivePeak:.2}
],safe);
assert.equal(safePlan.needed,false);
assert.equal(safePlan.gain,1);
const lockedRows=[
 {clip:{id:'locked',track:6,start:0,duration:2,volume:1,locked:true},effectivePeak:.8},
 {clip:{id:'other',track:5,start:0,duration:2,volume:.5},effectivePeak:.5}
];
const lockedMix=Engine.inspectMixOverlaps(lockedRows);
const lockedProject={clips:lockedRows.map(row=>row.clip)};
const blocked=Engine.applyHeadroomFix(lockedProject,lockedRows,lockedMix);
assert.equal(blocked.ok,false,'risky locked clips must block destructive auto-fix');
assert.equal(blocked.changed,0);
assert.deepEqual(blocked.lockedClipIds,['locked']);
assert.equal(lockedRows[0].clip.volume,1);
assert.equal(lockedRows[1].clip.volume,.5);
const touching=Engine.inspectMixOverlaps([
 {clip:{id:'a',track:6,start:0,duration:1},effectivePeak:.9},
 {clip:{id:'b',track:5,start:1,duration:1},effectivePeak:.9}
]);
assert.equal(touching.segments.length,0,'touching clips must not be treated as overlapping');
console.log('Audio QC overlap mix + auto headroom regression OK');
