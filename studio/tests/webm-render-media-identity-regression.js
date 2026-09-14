const assert=require('assert');
const ProfitMenteWebMRenderEngine=require('../webm-render-engine.js');

const project={name:'Render identity regression',duration:5,fps:30,clips:[{id:'clip-1',asset:'media-1',track:0,start:0,duration:5}]};
const baseAsset={
  id:'media-1',name:'same-name.mp4',type:'video',mime:'video/mp4',size:4096,
  sourceLastModified:1700000000000,duration:5,width:1080,height:1920,mediaReadable:true,
  metadataVersion:3,metadataBlobSignature:'sample-A',metadataBlobSize:4096,
  metadataBlobType:'video/mp4',metadataBlobLastModified:1700000000000
};

const snapshot=ProfitMenteWebMRenderEngine.captureState(project,[baseAsset]);
assert.strictEqual(ProfitMenteWebMRenderEngine.assertState(snapshot,project,[{...baseAsset}]),true,'unchanged media must remain render-safe');

const sameExternalMetadataDifferentContent={...baseAsset,metadataBlobSignature:'sample-B'};
assert.throws(
  ()=>ProfitMenteWebMRenderEngine.assertState(snapshot,project,[sameExternalMetadataDifferentContent]),
  error=>error?.code==='WEBM_STATE_CHANGED',
  'sampled content signature changes must abort the active render even when name, size, MIME and timestamps match'
);

for(const [field,value] of [
  ['metadataBlobSize',8192],
  ['metadataBlobType','video/webm'],
  ['metadataBlobLastModified',1700000005000]
]){
  assert.throws(
    ()=>ProfitMenteWebMRenderEngine.assertState(snapshot,project,[{...baseAsset,[field]:value}]),
    error=>error?.code==='WEBM_STATE_CHANGED',
    `${field} changes must invalidate the render snapshot`
  );
}

const strongIdentity={...baseAsset,sourceContentHash:'sha256:one'};
const strongSnapshot=ProfitMenteWebMRenderEngine.captureState(project,[strongIdentity]);
assert.throws(
  ()=>ProfitMenteWebMRenderEngine.assertState(strongSnapshot,project,[{...strongIdentity,sourceContentHash:'sha256:two'}]),
  error=>error?.code==='WEBM_STATE_CHANGED',
  'strong content hash changes must continue to invalidate the render snapshot'
);

console.log('WebM render media identity regression: OK');
