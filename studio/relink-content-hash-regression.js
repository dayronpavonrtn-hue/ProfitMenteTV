const assert=require('assert');
const {webcrypto}=require('crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ProfitMenteRelinkEngine=require('./relink-engine.js');

function mediaFile(bytes,{name='C0001.mp4',type='video/mp4',lastModified=1760000000000,path='Campaign/Video/C0001.mp4'}={}){
  const file=new Blob([bytes],{type});
  Object.defineProperty(file,'name',{value:name});
  Object.defineProperty(file,'lastModified',{value:lastModified});
  Object.defineProperty(file,'webkitRelativePath',{value:path});
  return file;
}

(async()=>{
  const engine=new ProfitMenteRelinkEngine();
  const original=mediaFile(Buffer.from('ORIGINAL-CONTENT-0001'));
  const wrong=mediaFile(Buffer.from('DIFFERENT-CONTENT-001'));
  assert.strictEqual(original.size,wrong.size,'fixture must keep metadata size identical');

  const originalHash=await engine.contentHash(original);
  const wrongHash=await engine.contentHash(wrong);
  assert.ok(originalHash&&wrongHash&&originalHash!==wrongHash,'fixture content hashes must differ');

  const project={
    clips:[{id:'clip-1',asset:'asset-1'}],
    assets:[{
      id:'asset-1',name:'C0001.mp4',type:'video',mime:'video/mp4',size:original.size,
      lastModified:1760000000000,sourceRelativePath:'Campaign/Video/C0001.mp4',sourceContentHash:originalHash
    }]
  };

  assert.ok(engine.score(project.assets[0],wrong)>=65,'wrong fixture must look safe to metadata-only relinking');
  let result=await engine.matchVerified(project,[],[wrong]);
  assert.strictEqual(result.matches.length,0,'hash mismatch must block automatic relink');
  assert.strictEqual(result.hashRejected.length,1,'hash mismatch should be reported as rejected');
  assert.strictEqual(result.hashRejected[0].reason,'content-hash-mismatch');
  assert.deepStrictEqual(result.unmatchedMissing.map(x=>x.id),['asset-1']);

  const correct=mediaFile(Buffer.from('ORIGINAL-CONTENT-0001'));
  result=await engine.matchVerified(project,[],[wrong,correct]);
  assert.strictEqual(result.matches.length,1,'verified original should still be found after a stronger-looking wrong candidate');
  assert.strictEqual(result.matches[0].file,correct,'content hash must select the actual original');
  assert.strictEqual(result.matches[0].hash,originalHash,'verified hash should be reusable by persisted asset metadata');

  const legacyProject={clips:[{id:'clip-2',asset:'legacy'}],assets:[{id:'legacy',name:'C0001.mp4',type:'video',mime:'video/mp4',size:wrong.size,lastModified:1760000000000,sourceRelativePath:'Campaign/Video/C0001.mp4'}]};
  result=await engine.matchVerified(legacyProject,[],[wrong]);
  assert.strictEqual(result.matches.length,1,'legacy projects without hashes must retain metadata relinking');

  console.log('ProfitMente Studio content-hash relink regression: PASS');
})().catch(err=>{console.error(err);process.exit(1)});