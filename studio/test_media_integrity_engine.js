const assert=require('assert');
const Engine=require('./media-integrity-engine');
const valid=[
  {id:0,type:'video',duration:'12.5',src:'local://video.mp4',size:100},
  {id:'voice',type:'audio',duration:8,src:'local://voice.wav'},
  {id:'cover',type:'image',src:'local://cover.png'}
];
let report=Engine.validateLibrary(valid);
assert.equal(report.ok,true);assert.equal(report.valid,3);
assert.equal(Engine.auditProject({clips:[{asset:0},{assetId:'voice'}]},valid).ok,true);
report=Engine.validateLibrary([...valid,{id:'voice',type:'audio',duration:1,src:'x'}]);
assert.equal(report.ok,false);assert.deepEqual(report.duplicates,['voice']);
for(const asset of [
  {id:'x',type:'video',duration:0,src:'x'},
  {id:'x',type:'audio',duration:NaN,src:'x'},
  {id:'x',type:'video',duration:1,src:''},
  {id:'x',type:'exe',duration:1,src:'x'},
  {id:true,type:'video',duration:1,src:'x'},
  {id:'x',type:'video',duration:1,src:'x',size:-1}
])assert.equal(Engine.validateAsset(asset).ok,false,JSON.stringify(asset));
const audit=Engine.auditProject({clips:[{asset:0},{asset:'missing'}]},valid);
assert.equal(audit.ok,false);assert.deepEqual(audit.missingAssets,['missing']);
assert.equal(Engine.validateLibrary(null).ok,false);
console.log('media integrity regression: OK');
