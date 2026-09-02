import assert from 'node:assert/strict';
import mod from './offline-media-engine.js';
const {ProfitMenteOfflineMediaEngine:E}=mod;

const project={duration:20,trackState:{1:{hidden:true},5:{muted:true}},clips:[
  {id:'ok',track:0,name:'Principal',asset:'a1',start:0,duration:5},
  {id:'missing-active',track:0,name:'Plano perdido',asset:'missing1',start:5,duration:5},
  {id:'missing-hidden',track:1,name:'B-roll oculto',asset:'missing2',start:0,duration:5},
  {id:'bad-audio',track:6,name:'Voz dañada',asset:'a2',start:0,duration:10},
  {id:'muted-missing',track:5,name:'Música silenciada',asset:'missing3',start:0,duration:10},
  {id:'caption',track:3,name:'Texto',start:0,duration:3}
]};
const assets=[{id:'a1',name:'ok.mp4',type:'video',mediaReadable:true},{id:'a2',name:'bad.wav',type:'audio',mediaReadable:false}];
const report=E.audit(project,assets);
assert.equal(report.ok,false);
assert.equal(report.counts.offline,4);
assert.equal(report.counts.blocking,2);
assert.deepEqual(new Set(report.blockingClipIds),new Set(['missing-active','bad-audio']));
assert.deepEqual(new Set(report.missingAssetIds),new Set(['missing1','missing2','a2','missing3']));
assert.equal(report.offline.find(x=>x.clipId==='missing-hidden').active,false);
assert.equal(report.offline.find(x=>x.clipId==='muted-missing').active,false);
assert.equal(report.offline.find(x=>x.clipId==='bad-audio').reason,'unreadable');
assert.equal(E.label('missing'),'medio faltante');
assert.equal(E.label('unreadable'),'medio no decodificable');

const healthy=E.audit({clips:[{id:'x',track:0,asset:'a1'}]},assets);
assert.equal(healthy.ok,true);
assert.equal(healthy.counts.offline,0);

// Legacy/current state conflicts must resolve conservatively. A hidden or muted flag in either
// schema keeps offline clips non-blocking instead of resurrecting them during migration.
const legacyConflict=E.audit({
  trackState:{1:{hidden:false},5:{muted:false}},
  trackStates:{1:{hidden:true},5:{muted:true}},
  clips:[{id:'legacy-hidden',track:1,asset:'missing-v'},{id:'legacy-muted',track:5,asset:'missing-a'}]
},[]);
assert.equal(legacyConflict.counts.offline,2);
assert.equal(legacyConflict.counts.blocking,0);
assert.equal(E.trackState({trackState:{1:{hidden:false}},trackStates:{1:{hidden:true}}},1).hidden,true);

// Solo is semantic: once one visual/audio track is Solo, offline media on sibling tracks is inactive
// and must not falsely block export/relink QA. Legacy Solo remains authoritative as well.
const solo=E.audit({
  trackState:{0:{solo:true},4:{solo:false}},
  trackStates:{4:{solo:true}},
  clips:[
    {id:'visual-solo',track:0,asset:'missing-v0'},
    {id:'visual-nonsolo',track:1,asset:'missing-v1'},
    {id:'audio-solo',track:4,asset:'missing-a4'},
    {id:'audio-nonsolo',track:6,asset:'missing-a6'}
  ]
},[]);
assert.deepEqual(new Set(solo.blockingClipIds),new Set(['visual-solo','audio-solo']));
assert.equal(solo.offline.find(x=>x.clipId==='visual-nonsolo').active,false);
assert.equal(solo.offline.find(x=>x.clipId==='audio-nonsolo').active,false);
assert.equal(E.trackState({trackState:{4:{solo:false}},trackStates:{4:{solo:true}}},4).solo,true);

console.log('offline media regression ok',{base:report.counts,legacy:legacyConflict.counts,solo:solo.counts});
