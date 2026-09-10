import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const guard=require('./bundle-import-identity-guard.js');

const restored={
  project:{clips:[{id:'clip-1',asset:90210},{id:'caption',track:3}],assets:[{id:90210,name:'video.mp4'}]},
  assets:[{id:90210,name:'video.mp4'}]
};
const normalized=guard.validateRestoredBundle(structuredClone(restored));
assert.equal(normalized.assets[0].id,'90210');
assert.equal(normalized.project.assets[0].id,'90210');
assert.equal(normalized.project.clips[0].asset,'90210');

for(const invalidId of [false,true,{},[],NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>guard.validateRestoredBundle({project:{clips:[],assets:[{id:invalidId,name:'bad.mp4'}]},assets:[{id:invalidId,name:'bad.mp4'}]}),/identificador válido/i);
}

assert.throws(()=>guard.validateRestoredBundle({project:{clips:[],assets:[{id:'7'},{id:7}]},assets:[{id:'7'},{id:8}]}),/duplicado en manifiesto/i);
assert.throws(()=>guard.validateRestoredBundle({project:{clips:[],assets:[{id:'missing'}]},assets:[{id:'other'}]}),/no restaurado/i);
assert.throws(()=>guard.validateRestoredBundle({project:{clips:[{id:'dangling',asset:'missing'}],assets:[{id:'present'}]},assets:[{id:'present'}]}),/no existe en paquete restaurado/i);
assert.throws(()=>guard.validateRestoredBundle({project:{clips:[{id:'bad',asset:{}}],assets:[{id:'present'}]},assets:[{id:'present'}]}),/Clip con identificador de medio inválido/i);
assert.throws(()=>guard.validateRestoredBundle({project:{clips:[],assets:[{id:'9'}]},assets:[{id:9},{id:'9'}]}),/duplicado al restaurar paquete/i);

const zero=guard.validateRestoredBundle({project:{clips:[{id:'zero',asset:-0}],assets:[{id:-0}]},assets:[{id:-0}]});
assert.equal(zero.assets[0].id,'0');
assert.equal(zero.project.clips[0].asset,'0');

class FakeBundleEngine{async parse(){return structuredClone(restored)}}
assert.equal(guard.install(FakeBundleEngine),true);
assert.equal(guard.install(FakeBundleEngine),false,'guard installation must be idempotent');
const wrapped=await new FakeBundleEngine().parse(new Blob());
assert.equal(wrapped.project.clips[0].asset,'90210');

console.log('Bundle import identity guard QA OK');
