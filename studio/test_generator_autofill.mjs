import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const ProfitMenteGeneratorAutoFill=require('./generator-autofill.js');

const fakeEngine={assignAssets(project,assets){let primary=0;for(const clip of project.clips.filter(c=>c.track===0&&!c.asset)){const visual=assets.find(a=>a.type==='video'||a.type==='image');if(!visual)continue;clip.asset=visual.id;primary++}return {primary,broll:0,skipped:project.clips.filter(c=>c.track===0&&!c.asset).length}}};
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

const manual={mode:'Manual',clips:[{track:0,asset:null}]};
assert.equal(helper.fill(manual,visuals,visuals).changed,false,'manual projects must never auto-fill');
assert.equal(manual.clips[0].asset,null);

const audioOnly={mode:'Automático',clips:[{track:0,asset:null}]};
assert.equal(helper.fill(audioOnly,[{id:'voice',type:'audio'}],[{id:'voice',type:'audio'}]).changed,false,'audio imports must not trigger visual assignment');
assert.equal(audioOnly.clips[0].asset,null);

console.log('generator autofill tests passed');
