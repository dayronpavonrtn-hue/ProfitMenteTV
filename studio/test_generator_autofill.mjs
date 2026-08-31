import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const ProfitMenteGeneratorAutoFill=require('./generator-autofill.js');

const trackLocked=(project,track)=>!!(project?.trackState?.[track]?.locked??project?.trackState?.[String(track)]?.locked);
const fakeEngine={
  assignAssets(project,assets){let primary=0;for(const clip of project.clips.filter(c=>c.track===0&&!c.asset&&!c.locked&&!trackLocked(project,c.track))){const visual=assets.find(a=>a.type==='video'||a.type==='image');if(!visual)continue;clip.asset=visual.id;primary++}return {primary,broll:0,skipped:project.clips.filter(c=>c.track===0&&!c.asset&&!c.locked&&!trackLocked(project,c.track)).length}},
  assignNarration(project,assets){if(trackLocked(project,6))return 0;const voice=assets.find(a=>a.type==='audio'&&/voice|voz|narr/i.test(a.name||''));if(!voice)return 0;let count=0;for(const clip of project.clips.filter(c=>Number(c.track)===6&&!c.asset&&!c.locked)){clip.asset=voice.id;count++}return count},
  assignSoundtrack(){return 0},
  assignTransitionSfx(){return 0}
};
const helper=new ProfitMenteGeneratorAutoFill(fakeEngine);

const project={mode:'Automático',clips:[
  {id:'manual',track:0,asset:'manual-asset'},
  {id:'missing',track:0,asset:null},
  {id:'caption',track:3,asset:null}
]};
const visuals=[{id:'new-video',type:'video'}];
const result=helper.fill(project,visuals,visuals);
assert.equal(result.changed,true);
assert.equal(result.before,1);
assert.equal(result.after,0);
assert.equal(project.clips[0].asset,'manual-asset','must preserve manual/existing assignments');
assert.equal(project.clips[1].asset,'new-video','must fill only missing primary scene');

const manual={mode:'Manual',clips:[{track:0,asset:null},{track:6,asset:null}]};
const voice=[{id:'voice-final',type:'audio',name:'voice-final.wav'}];
assert.equal(helper.fill(manual,voice,voice).changed,false,'manual projects must never auto-fill');
assert.equal(manual.clips[0].asset,null);
assert.equal(manual.clips[1].asset,null);

const audioAfterGeneration={mode:'Automático',clips:[
  {id:'scene',track:0,asset:'visual-1'},
  {id:'voice',track:6,asset:null}
]};
const audioResult=helper.fill(audioAfterGeneration,voice,voice);
assert.equal(audioResult.changed,true,'audio imported after generation must complete pending automatic audio roles');
assert.equal(audioResult.narration,1);
assert.equal(audioAfterGeneration.clips[0].asset,'visual-1','audio import must never replace an existing visual');
assert.equal(audioAfterGeneration.clips[1].asset,'voice-final','pending narration must attach when a matching local voice is imported');

const unrelated=[{id:'ambient',type:'audio',name:'ambient.wav'}];
const noMatch={mode:'Automático',clips:[{track:0,asset:'visual-1'},{track:6,asset:null}]};
const noMatchResult=helper.fill(noMatch,unrelated,unrelated);
assert.equal(noMatchResult.changed,false,'unclassified audio must not create a false automation change');
assert.equal(noMatch.clips[1].asset,null);

const protectedOnly={mode:'Automático',clips:[
  {id:'locked-scene',track:0,asset:null,locked:true},
  {id:'locked-voice',track:6,asset:null,locked:true}
]};
const protectedResult=helper.fill(protectedOnly,[...visuals,...voice],[...visuals,...voice]);
assert.equal(protectedResult.changed,false,'locked placeholders must not be mutated by automatic fill');
assert.equal(protectedResult.before,0,'locked visual placeholders are not editable automation work');
assert.equal(protectedOnly.clips[0].asset,null,'locked primary clip must remain untouched');
assert.equal(protectedOnly.clips[1].asset,null,'locked narration clip must remain untouched');

const lockedTracks={mode:'Automático',trackState:{0:{locked:true},5:{locked:true},6:{locked:true}},clips:[
  {id:'track-scene',track:0,asset:null},
  {id:'track-voice',track:6,asset:null}
]};
const trackResult=helper.fill(lockedTracks,[...visuals,...voice],[...visuals,...voice]);
assert.equal(trackResult.changed,false,'locked tracks must suppress auto-fill triggers');
assert.equal(trackResult.before,0);
assert.equal(lockedTracks.clips[0].asset,null);
assert.equal(lockedTracks.clips[1].asset,null);

console.log('generator autofill tests passed');
