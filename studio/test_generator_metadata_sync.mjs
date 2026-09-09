import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteGeneratorAutoFill=require('./generator-autofill.js');

const narration={id:'n1',track:6,start:0,duration:40,asset:null};
const project={mode:'Automático',clips:[narration]};
const short={id:'short',type:'audio',name:'voice-short.wav'};
const long={id:'long',type:'audio',name:'voice-long.wav'};
let metadataFinished=false;
globalThis.ProfitMenteMediaMetadata={
  async enrichMany(list){
    await new Promise(resolve=>setTimeout(resolve,15));
    list[0].duration=2;
    list[1].duration=42;
    metadataFinished=true;
  }
};
const engine={
  assignNarration(target,assets){
    assert.equal(metadataFinished,true,'autofill must wait for metadata before assignment');
    const pick=assets.find(asset=>Number(asset.duration)>=30);
    if(!pick)return 0;
    target.clips.find(clip=>String(clip.track)==='6').asset=pick.id;
    return 1;
  },
  assignSoundtrack(){return 0},
  assignTransitionSfx(){return 0}
};
const helper=new ProfitMenteGeneratorAutoFill(engine);
const imported=[short,long];
const prepared=await helper.prepareImported(imported);
assert.equal(prepared,imported,'prepareImported should preserve canonical asset references');
const result=helper.fill(project,imported,prepared);
assert.equal(result.changed,true);
assert.equal(result.narration,1);
assert.equal(narration.asset,'long','metadata duration must prevent a short narration from being selected');

let fallbackCalls=0;
globalThis.ProfitMenteMediaMetadata={async enrichMany(){fallbackCalls++;throw new Error('probe failed')}};
const originalWarn=console.warn;console.warn=()=>{};
try{
  const fallback=[{id:'fallback',type:'audio'}];
  assert.equal(await helper.prepareImported(fallback),fallback,'metadata probe failure must not abort zero-cost automation');
  assert.equal(fallbackCalls,1);
}finally{console.warn=originalWarn;delete globalThis.ProfitMenteMediaMetadata}

assert.deepEqual(await helper.prepareImported(null),[],'invalid imported collection should normalize safely');
console.log('generator metadata sync regression: ok');
