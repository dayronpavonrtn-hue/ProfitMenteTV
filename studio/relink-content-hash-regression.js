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

  // Regression: media-import-engine now stores sample-v2 hashes for large files.
  // The former relink engine still calculated only first+last-MB hashes, which
  // rejected the correct original whenever sourceHashVersion was sample-v2.
  const size=8*1024*1024,base=Buffer.alloc(size,0x41),changed=Buffer.from(base);
  changed.fill(0x42,3*1024*1024,4*1024*1024);
  const largeOriginal=mediaFile(base,{name:'LONG.mp4',path:'Campaign/Video/LONG.mp4'});
  const largeWrong=mediaFile(changed,{name:'LONG.mp4',path:'Campaign/Video/LONG.mp4'});
  const modernHash=await engine.contentHash(largeOriginal),modernWrongHash=await engine.contentHash(largeWrong);
  const legacyHash=await engine.contentHashLegacy(largeOriginal),legacyWrongHash=await engine.contentHashLegacy(largeWrong);
  assert.strictEqual(legacyHash,legacyWrongHash,'legacy edge sampling fixture must collide');
  assert.notStrictEqual(modernHash,modernWrongHash,'sample-v2 must distinguish the changed middle region');

  const modernProject={clips:[{id:'clip-modern',asset:'modern'}],assets:[{
    id:'modern',name:'LONG.mp4',type:'video',mime:'video/mp4',size:largeOriginal.size,lastModified:1760000000000,
    sourceRelativePath:'Campaign/Video/LONG.mp4',sourceContentHash:modernHash,sourceLegacyContentHash:legacyHash,sourceHashVersion:'sample-v2'
  }]};
  result=await engine.matchVerified(modernProject,[],[largeWrong,largeOriginal]);
  assert.strictEqual(result.matches.length,1,'sample-v2 project should reconnect the verified original');
  assert.strictEqual(result.matches[0].file,largeOriginal,'sample-v2 must reject a legacy-hash collision');
  assert.strictEqual(result.matches[0].hash,modernHash,'relink must verify against the modern hash');
  assert.strictEqual(result.matches[0].hashes.legacy,legacyHash,'relink should retain the legacy compatibility hash');
  assert.ok(result.hashRejected.some(x=>x.file===largeWrong),'colliding wrong media must be recorded as rejected');

  const manifestProject={clips:[],assets:[]};
  engine.syncManifest(manifestProject,[{
    id:'modern',name:'LONG.mp4',type:'video',mime:'video/mp4',size:largeOriginal.size,
    sourceContentHash:modernHash,sourceLegacyContentHash:legacyHash,sourceHashVersion:'sample-v2'
  }]);
  assert.strictEqual(manifestProject.assets[0].sourceHashVersion,'sample-v2','manifest must persist the hash algorithm version');
  assert.strictEqual(manifestProject.assets[0].sourceLegacyContentHash,legacyHash,'manifest must persist the legacy compatibility hash');

  console.log('ProfitMente Studio content-hash relink regression: PASS');
})().catch(err=>{console.error(err);process.exit(1)});
