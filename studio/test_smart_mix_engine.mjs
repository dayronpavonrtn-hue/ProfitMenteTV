import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Engine=require('./smart-mix-engine.js');

const project={duration:20,trackState:{},clips:[
  {id:'m1',name:'Music 1',track:5,asset:'music',start:0,duration:10,volume:.5,duckVolume:.5,ducking:false},
  {id:'v1',name:'Voice 1',track:6,asset:'voice',start:2,duration:4},
  {id:'v2',name:'Voice overlap',track:6,asset:'voice2',start:4,duration:4},
  {id:'m2',name:'Music 2',track:5,asset:'music2',start:12,duration:5,volume:.4,duckVolume:.3}
]};

let report=Engine.inspect(project);
assert.equal(report.music,2);
assert.equal(report.voice,2);
assert.equal(report.overlapping,1);
assert.equal(report.needsDucking,1);
assert.equal(report.rows[0].overlap,6,'overlapping voice clips must be merged, not double counted');
assert.equal(report.rows[0].coverage,.6);

const applied=Engine.apply(project,{duckRatio:.4});
assert.equal(applied.changed,1);
assert.equal(project.clips[0].ducking,true);
assert.equal(project.clips[0].duckVolume,.2);
assert.equal(project.clips[3].duckVolume,.3,'music without voice overlap must stay untouched');
assert.equal(Engine.inspect(project).needsDucking,0);

const muted=structuredClone(project);
muted.trackState={'6':{muted:true}};
muted.clips[0].duckVolume=.5;
assert.equal(Engine.inspect(muted).voice,0);
assert.equal(Engine.inspect(muted).overlapping,0);
assert.equal(Engine.apply(muted).changed,0);

const legacyMuted=structuredClone(project);
legacyMuted.trackState={};
legacyMuted.trackStates={'06':{muted:true}};
legacyMuted.clips[0].duckVolume=.5;
assert.equal(Engine.inspect(legacyMuted).voice,0,'legacy aliased voice mute must be respected');
assert.equal(Engine.apply(legacyMuted).changed,0);

const conservativeMute=structuredClone(project);
conservativeMute.trackState={'6':{muted:false}};
conservativeMute.trackStates={'+06.0':{muted:true}};
assert.equal(Engine.inspect(conservativeMute).voice,0,'a legacy mute must not be canceled by a newer false value');

const soloMusic=structuredClone(project);
soloMusic.trackState={'05':{solo:true}};
assert.equal(Engine.inspect(soloMusic).music,2);
assert.equal(Engine.inspect(soloMusic).voice,0,'audio solo must exclude non-solo voice from Smart Mix analysis');
assert.equal(Engine.apply(soloMusic).changed,0);

const soloVoice=structuredClone(project);
soloVoice.trackStates={'+06.0':{solo:true}};
assert.equal(Engine.inspect(soloVoice).music,0,'legacy voice solo must exclude music from Smart Mix analysis');
assert.equal(Engine.inspect(soloVoice).voice,2);
assert.equal(Engine.apply(soloVoice).changed,0);

const idZero=structuredClone(project);
idZero.clips[0].asset=0;
idZero.clips[1].asset=0;
idZero.clips[0].ducking=false;
idZero.clips[0].duckVolume=.5;
report=Engine.inspect(idZero);
assert.equal(report.music,2,'numeric media id 0 must remain a valid music asset');
assert.equal(report.voice,2,'numeric media id 0 must remain a valid voice asset');
assert.equal(report.overlapping,1);
assert.equal(Engine.apply(idZero).changed,1);

const invalidIdentity=structuredClone(project);
invalidIdentity.clips.push({id:'bad-bool-track',track:false,asset:'bad',start:0,duration:10});
invalidIdentity.clips.push({id:'bad-empty-track',track:'',asset:'bad',start:0,duration:10});
invalidIdentity.clips.push({id:'bad-object-asset',track:5,asset:{id:'music'},start:0,duration:10});
invalidIdentity.clips.push({id:'bad-bool-asset',track:6,asset:false,start:0,duration:10});
report=Engine.inspect(invalidIdentity);
assert.equal(report.music,2,'invalid track/media identities must not create extra music rows');
assert.equal(report.voice,2,'invalid track/media identities must not create extra voice rows');
assert.equal(Engine.canonicalTrack(false),null);
assert.equal(Engine.canonicalTrack(''),null);
assert.equal(Engine.canonicalTrack('05'),5);
assert.equal(Engine.canonicalTrack('+06.0'),6);
assert.equal(Engine.canonicalTrack('-0'),0);
assert.equal(Engine.canonicalTrack('5.5'),null);
assert.equal(Engine.canonicalTrack(7),null);
assert.equal(Engine.hasAsset(0),true);
assert.equal(Engine.hasAsset(false),false);
assert.equal(Engine.hasAsset({id:'x'}),false);

const disabled=structuredClone(project);
disabled.clips[0].ducking=false;
disabled.clips[0].duckVolume=.05;
assert.equal(Engine.inspect(disabled).needsDucking,1,'disabled ducking must be reported even when stored duck volume is low');
assert.equal(Engine.safeDuckVolume({volume:1},.05),.15,'ratio has a safe lower bound');
assert.equal(Engine.safeDuckVolume({volume:1},.9),.75,'ratio has a safe upper bound');
assert.equal(Engine.safeDuckVolume({volume:.2},.4),.08);

const invalidStoredDuck=structuredClone(project);
invalidStoredDuck.clips[0].ducking=false;
invalidStoredDuck.clips[0].duckVolume='not-a-number';
const invalidApplied=Engine.apply(invalidStoredDuck,{duckRatio:.4});
assert.equal(invalidApplied.changed,1);
assert.equal(invalidStoredDuck.clips[0].duckVolume,.2,'invalid stored duck volume must be repaired to a finite value');
assert.equal(Number.isFinite(invalidApplied.clips[0].from),true);

console.log('smart mix regression ok');
