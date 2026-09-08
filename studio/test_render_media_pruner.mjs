import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Pruner=require('./render-media-pruner.js');

const a={id:'a',name:'used-a.mp4'},b={id:'b',name:'unused-b.mp4'},c={id:3,name:'used-c.wav'};
const project={clips:[
  {id:'v1',asset:'a'},
  {id:'caption',asset:null},
  {id:'a1',asset:'3'},
  {id:'v2',asset:'a'}
]};
assert.deepEqual(Pruner.referencedIds(project),['a','3'],'references should be unique and preserve timeline encounter order');
assert.deepEqual(Pruner.select(project,[b,c,a]),[a,c],'render should include only referenced media in reference order');
assert.deepEqual(Pruner.select({clips:[{id:'title',asset:null}]},[a,b]),[],'projects without media should render without bundling unrelated library files');

await assert.rejects(async()=>Pruner.select({clips:[{id:'broken',asset:false}]},[a]),/Clip con identificador de medio inválido: broken/);
await assert.rejects(async()=>Pruner.select({clips:[{id:'missing',asset:'x'}]},[a,b]),/Medio requerido por clip no disponible para render: x/);
await assert.rejects(async()=>Pruner.select({clips:[{id:'legacy',asset:3}]},[c,{...c,id:'3'}]),/Identificador de medio ambiguo para render: 3/);
assert.deepEqual(Pruner.select({clips:[{id:'zero',asset:-0}]},[{id:'0',name:'zero.mp4'}]).map(x=>x.name),['zero.mp4'],'numeric zero aliases must resolve canonically');

class FakeBundle{
  async renderLocal(project,assets,onStatus){this.received=assets;onStatus('original');return assets.length}
}
assert.equal(Pruner.install(FakeBundle),true,'install should patch an eligible bundle engine once');
assert.equal(Pruner.install(FakeBundle),false,'install must be idempotent');
const fake=new FakeBundle(),statuses=[];
const count=await fake.renderLocal(project,[a,b,c],x=>statuses.push(x));
assert.equal(count,2);
assert.deepEqual(fake.received,[a,c]);
assert.match(statuses[0],/2 de 3 medios necesarios/);
assert.equal(statuses.at(-1),'original');

console.log('Render media pruner QA OK');