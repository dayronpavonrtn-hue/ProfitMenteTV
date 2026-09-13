import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

class MockBundleEngine{
  constructor(){this.buildCalls=[]}
  async build(project,assets){this.buildCalls.push(assets.slice());return {project,assets}}
  async download(project,assets){return this.build(project,assets)}
  async renderLocal(project,assets,onStatus=()=>{}){onStatus('base render');return this.build(project,assets)}
}

globalThis.ProfitMenteBundleEngine=MockBundleEngine;
delete globalThis.ProfitMenteRenderMediaPruner;
require('./render-media-pruner.js');

const project={clips:[
  {id:'v1',asset:'used-video'},
  {id:'a1',asset:'used-audio'},
  {id:'overlay',asset:'used-video'},
  {id:'caption',asset:null}
]};
const usedVideo={id:'used-video',name:'video.mp4'};
const usedAudio={id:'used-audio',name:'voice.wav'};
const unused={id:'unused-library-item',name:'unused.mov'};
const all=[unused,usedAudio,usedVideo];

const engine=new MockBundleEngine();
const downloaded=await engine.download(project,all);
assert.deepEqual(downloaded.assets.map(x=>x.id),['used-video','used-audio'],'project bundle must include only timeline-referenced media in first-reference order');
assert.deepEqual(engine.buildCalls.at(-1).map(x=>x.id),['used-video','used-audio']);

const statuses=[];
const rendered=await engine.renderLocal(project,all,s=>statuses.push(s));
assert.deepEqual(rendered.assets.map(x=>x.id),['used-video','used-audio'],'render path must keep the same referenced-media set');
assert.ok(statuses.some(x=>x.includes('2 de 3 medios necesarios')),'render should report media pruning to the user');

const empty=await engine.download({clips:[{id:'caption',asset:null}]},all);
assert.deepEqual(empty.assets,[],'projects without referenced media must not package unrelated library files');

await assert.rejects(()=>engine.download({clips:[{id:'missing',asset:'not-in-library'}]},all),/Medio requerido por clip no disponible/);
await assert.rejects(()=>engine.download({clips:[{id:'ambiguous',asset:'used-video'}]},[usedVideo,{...usedVideo,name:'duplicate.mp4'}]),/Identificador de medio ambiguo/);

console.log('ProfitMente render media pruner bundle regression: OK');