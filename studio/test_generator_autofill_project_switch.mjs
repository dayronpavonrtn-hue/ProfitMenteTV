import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
let importListener=null;
globalThis.window=globalThis;
globalThis.document={
  addEventListener(type,listener){
    if(type==='profitmente:media-imported')importListener=listener;
  }
};

const media=(id)=>({
  id,
  type:'image',
  name:`${id}.png`,
  blob:{size:1,arrayBuffer:async()=>new ArrayBuffer(1)}
});
const automaticProject=()=>({
  mode:'Automático',
  clips:[{id:'scene-1',track:0,start:0,duration:4,asset:null}],
  trackState:{}
});

class StubGeneratorEngine {
  narrationScore(){return 1}
  assignAssets(project,usable){
    const empty=project.clips.find(clip=>String(clip.track)==='0'&&clip.asset==null);
    if(!empty||!usable.length)return {primary:0,broll:0,skipped:1};
    empty.asset=usable[0].id;
    return {primary:1,broll:0,skipped:0,narration:0,music:0,sfx:0};
  }
}
globalThis.ProfitMenteGeneratorEngine=StubGeneratorEngine;

let saveCount=0,statusCount=0;
globalThis.save=()=>{saveCount+=1};
globalThis.setStatus=()=>{statusCount+=1};

const projectA=automaticProject();
const assetA=media('shared');
globalThis.project=projectA;
globalThis.assets=[assetA];

let releaseMetadata;
globalThis.ProfitMenteMediaMetadata={
  enrichMany(){return new Promise(resolve=>{releaseMetadata=resolve})}
};

require('./generator-autofill.js');
assert.equal(typeof importListener,'function','generator autofill integration did not register');

const staleRun=importListener({detail:{assetIds:['shared']}});
await Promise.resolve();
assert.equal(typeof releaseMetadata,'function','metadata enrichment did not start');

const projectB=automaticProject();
const assetB=media('shared');
globalThis.project=projectB;
globalThis.assets=[assetB];
releaseMetadata();
await staleRun;

assert.equal(projectA.clips[0].asset,null,'stale autofill mutated the project that is no longer active');
assert.equal(projectB.clips[0].asset,null,'stale autofill leaked into the newly opened project');
assert.equal(saveCount,0,'stale autofill saved after the active project changed');
assert.equal(statusCount,0,'stale autofill reported success after the active project changed');

const projectC=automaticProject();
const assetC=media('control');
globalThis.project=projectC;
globalThis.assets=[assetC];
globalThis.ProfitMenteMediaMetadata={enrichMany:async()=>{}};

await importListener({detail:{assetIds:['control']}});
assert.equal(projectC.clips[0].asset,'control','normal autofill stopped working');
assert.equal(saveCount,1,'normal autofill should persist exactly once');
assert.equal(statusCount,1,'normal autofill should report completion exactly once');

console.log('generator autofill project-switch isolation: ok');
