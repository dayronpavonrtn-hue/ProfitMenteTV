import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteMediaIdentityEngine:Identity}=require('./media-identity-engine.js');
const Pruner=require('./render-media-pruner.js');
const Guard=require('./qa-source-window-guard.js');

assert.equal(Identity.key(1),'n:1');
assert.equal(Identity.key('1'),'n:1');
assert.equal(Identity.key(-0),'n:0');
assert.equal(Identity.key('  asset-a  '),'s:asset-a');
assert.equal(Identity.key('01'),'s:01','leading-zero string IDs remain distinct from numeric IDs');
for(const invalid of [true,false,null,undefined,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,''])assert.equal(Identity.key(invalid),null);
assert.equal(Identity.same(7,'7'),true);
assert.equal(Identity.same('07',7),false);

const ambiguous=Identity.uniqueIndex([{id:1,name:'numeric'},{id:'1',name:'string'}]);
assert.equal(ambiguous.map.size,0);
assert.equal(ambiguous.ambiguous.has('n:1'),true);

const project={clips:[{id:'clip-1',name:'Clip 1',track:0,asset:'1',start:0,duration:1}]};
const oneAsset=[{id:1,name:'Video',type:'video',duration:5}];
assert.deepEqual(Guard.inspect(project,oneAsset),[],'QA accepts the same numeric/string identity that render accepts');
assert.deepEqual(Pruner.select(project,oneAsset),oneAsset,'render selects the exact asset approved by QA');

const duplicateAssets=[{id:1,name:'A',type:'video',duration:5},{id:'1',name:'B',type:'video',duration:5}];
assert.deepEqual(Guard.inspect(project,duplicateAssets),['Referencia de medio ambigua: Clip 1']);
assert.throws(()=>Pruner.select(project,duplicateAssets),/ambiguo/i,'render must reject the same ambiguous identity rejected by QA');

const invalidProject={clips:[{id:'clip-bad',name:'Bad',track:0,asset:true,start:0,duration:1}]};
assert.deepEqual(Guard.inspect(invalidProject,oneAsset),['Referencia de medio inválida: Bad']);
assert.throws(()=>Pruner.select(invalidProject,oneAsset),/identificador de medio inválido/i);

const leadingZeroProject={clips:[{id:'clip-01',name:'Leading zero',track:0,asset:'01',start:0,duration:1}]};
const leadingZeroAssets=[{id:1,name:'Numeric',type:'video',duration:5},{id:'01',name:'String',type:'video',duration:5}];
assert.deepEqual(Guard.inspect(leadingZeroProject,leadingZeroAssets),[]);
assert.equal(Pruner.select(leadingZeroProject,leadingZeroAssets)[0].name,'String');

console.log('Shared media identity parity across QA and render OK');
