import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteBeatSyncEngine=require('./beat-sync-engine.js');
const engine=new ProfitMenteBeatSyncEngine();

const project={duration:10,markers:[
  {time:1,label:'Manual'},
  {time:3.7,label:'Beat 1'},
  {time:6.35,label:'Beat 2'},
  {time:9.9,label:'Beat 3'}
],clips:[
  {id:'s1',track:0,name:'HOOK',sceneText:'Hook text',start:0,duration:3.33},
  {id:'s2',track:0,name:'PROBLEMA',sceneText:'Problem text',start:3.33,duration:3.33},
  {id:'s3',track:0,name:'SOLUCIÓN',sceneText:'Solution text',start:6.66,duration:3.34},
  {id:'c1',track:3,name:'Hook text',start:.15,duration:3.03,wordTimings:[{word:'Hola',start:.15,end:1,duration:.85}]},
  {id:'c2',track:3,name:'Problem text',start:3.48,duration:3.03,wordTimings:[{word:'Problema',start:3.48,end:4.2,duration:.72}]},
  {id:'b1',track:1,name:'B-roll · PROBLEMA',start:4.4,duration:1.2},
  {id:'manual',track:0,name:'Manual clip',start:8,duration:1,locked:true}
]};

const result=engine.sync(project,{maxShift:1});
assert.equal(result.boundaries,2);
assert.equal(project.clips.find(c=>c.id==='s1').duration,3.7);
assert.equal(project.clips.find(c=>c.id==='s2').start,3.7);
assert.equal(project.clips.find(c=>c.id==='s2').duration,2.65);
assert.equal(project.clips.find(c=>c.id==='s3').start,6.35);
assert.equal(project.clips.find(c=>c.id==='s3').start+project.clips.find(c=>c.id==='s3').duration,10);
assert.deepEqual(project.clips.find(c=>c.id==='manual'),{id:'manual',track:0,name:'Manual clip',start:8,duration:1,locked:true});
const cap=project.clips.find(c=>c.id==='c2');
assert.ok(cap.start>=3.7&&cap.start<3.9);
assert.ok(cap.start+cap.duration<=6.35+.001);
assert.ok(cap.wordTimings[0].start>=cap.start-.001);
assert.ok(cap.wordTimings[0].end<=cap.start+cap.duration+.001);
const broll=project.clips.find(c=>c.id==='b1');
assert.ok(broll.start>=3.7);
assert.ok(broll.start+broll.duration<=6.35+.001);

const noBeats={duration:8,markers:[{time:4,label:'Nota'}],clips:[{track:0,sceneText:'A',start:0,duration:4},{track:0,sceneText:'B',start:4,duration:4}]};
assert.equal(engine.sync(noBeats).reason,'no-beats');

const constrained={duration:5,markers:[{time:.4,label:'Beat 1'},{time:4.8,label:'Beat 2'}],clips:[{track:0,sceneText:'A',start:0,duration:2.5},{track:0,sceneText:'B',start:2.5,duration:2.5}]};
const constrainedResult=engine.sync(constrained,{minScene:1.5,maxShift:3});
assert.equal(constrainedResult.boundaries,0);
assert.ok(constrained.clips[0].duration>=1.5);
assert.ok(constrained.clips[1].duration>=1.5);

function protectedProject(){return {duration:8,markers:[{time:3.6,label:'Beat 1'}],clips:[
  {id:'pa',track:0,name:'HOOK',sceneId:'a',sceneText:'A',start:0,duration:4},
  {id:'pb',track:0,name:'SOLUCIÓN',sceneId:'b',sceneText:'B',start:4,duration:4},
  {id:'pc',track:3,sceneId:'a',name:'A',start:.1,duration:3.8,wordTimings:[{word:'A',start:.1,end:1}]},
  {id:'pr',track:1,sceneId:'b',name:'B-roll · SOLUCIÓN',start:4.5,duration:1.2}
]}}

for(const mutate of [
  p=>{p.clips.find(c=>c.id==='pb').locked=true},
  p=>{p.trackState={'0':{locked:true}}},
  p=>{p.trackStates={0:{locked:true}}},
  p=>{p.clips.find(c=>c.id==='pc').locked=true},
  p=>{p.trackStates={'3':{locked:true}}},
  p=>{p.clips.find(c=>c.id==='pr').locked=true},
  p=>{p.trackState={1:{locked:true}}}
]){
  const locked=protectedProject();mutate(locked);const before=structuredClone(locked);
  const lockedResult=engine.sync(locked,{maxShift:1});
  assert.equal(lockedResult.reason,'locked-edit');
  assert.equal(lockedResult.changed,0);
  assert.equal(lockedResult.boundaries,0);
  assert.ok(lockedResult.locked>=1);
  assert.deepEqual(locked,before,'beat sync must be atomic when a linked manual edit is protected');
}

assert.equal(engine.canonicalTrack('00'),0);
assert.equal(engine.canonicalTrack('+0.0'),0);
assert.equal(engine.canonicalTrack('-0'),0);
assert.equal(engine.canonicalTrack('03'),3);
for(const invalid of [false,true,'', '   ',1.5,-1,7,Infinity,'visual'])assert.equal(engine.canonicalTrack(invalid),null);

const legacyTracks={duration:8,markers:[{time:3.5,label:'Beat 1'}],clips:[
  {id:'la',track:'00',name:'HOOK',sceneText:'A',start:0,duration:4},
  {id:'lb',track:'+0.0',name:'SOLUCIÓN',sceneText:'B',start:4,duration:4},
  {id:'lc',track:'03',name:'A',start:.1,duration:3.8},
  {id:'lr',track:'01',name:'B-roll · SOLUCIÓN',start:4.5,duration:1.2}
]};
const legacyResult=engine.sync(legacyTracks,{maxShift:1});
assert.equal(legacyResult.boundaries,1);
assert.equal(legacyTracks.clips.find(c=>c.id==='lb').start,3.5);
assert.ok(legacyTracks.clips.find(c=>c.id==='lc').duration<3.8,'legacy caption track alias should follow scene retime');
assert.ok(legacyTracks.clips.find(c=>c.id==='lr').start>=3.5,'legacy b-roll track alias should follow scene retime');

for(const lockMap of [
  {trackState:{'00':{locked:true}}},
  {trackStates:{'+0.0':{locked:true}}},
  {trackState:{'03':{locked:true}}},
  {trackStates:{'01':{locked:true}}}
]){
  const p=protectedProject();Object.assign(p,lockMap);const before=structuredClone(p);
  const r=engine.sync(p,{maxShift:1});
  assert.equal(r.reason,'locked-edit');
  assert.deepEqual(p,before,'canonical legacy track locks must block beat sync atomically');
}

const invalidTrackProject={duration:8,markers:[{time:3.5,label:'Beat 1'}],clips:[
  {id:'bad-a',track:false,sceneText:'A',start:0,duration:4},
  {id:'bad-b',track:'',sceneText:'B',start:4,duration:4}
]};
assert.equal(engine.sync(invalidTrackProject).reason,'not-enough-scenes');

console.log('beat sync regression ok');
