const assert=require('assert');
const dedupe=require('./media-upload-dedupe.js');

function asset(overrides={}){
  return {
    metadataBlobSignature:'abc123',
    metadataBlobSize:1024,
    metadataBlobType:'video/mp4',
    ...overrides
  };
}

assert.strictEqual(dedupe.identity(asset()),'abc123|1024|video/mp4');
assert.strictEqual(dedupe.equivalent(asset(),asset({name:'renamed.mp4'})),true,'same inspected bytes must dedupe even when renamed');
assert.strictEqual(dedupe.equivalent(asset(),asset({metadataBlobSignature:'different'})),false,'different content must not dedupe');
assert.strictEqual(dedupe.equivalent(asset(),asset({metadataBlobSize:2048})),false,'different size must not dedupe');
assert.strictEqual(dedupe.equivalent(asset(),asset({metadataBlobType:'audio/mp4'})),false,'different media type must not dedupe');
assert.strictEqual(dedupe.equivalent(asset({metadataBlobType:'VIDEO/MP4'}),asset()),true,'mime comparison must be case insensitive');
assert.strictEqual(dedupe.equivalent(asset({metadataBlobSignature:''}),asset()),false,'missing signature must never create a false duplicate');
assert.strictEqual(dedupe.equivalent(asset({metadataBlobSignature:'   '}),asset()),false,'blank signature must never create a false duplicate');
assert.strictEqual(dedupe.identity(asset({metadataBlobSize:'1024'})),'abc123|1024|video/mp4','serialized numeric size remains compatible');
for(const badSize of [0,-1,1.5,NaN,Infinity,true,false,'','not-a-size']){
  assert.strictEqual(dedupe.identity(asset({metadataBlobSize:badSize})),'',`invalid size ${String(badSize)} must not create a dedupe identity`);
}
assert.strictEqual(dedupe.identity(asset({metadataBlobType:''})),'','missing MIME must not create a dedupe identity');
assert.strictEqual(dedupe.equivalent(asset({metadataBlobSize:0}),asset({metadataBlobSize:0})),false,'empty files must never collapse into one upload');
assert.strictEqual(dedupe.equivalent(asset({metadataBlobSize:NaN}),asset({metadataBlobSize:NaN})),false,'corrupt metadata must never collapse distinct uploads');

(async()=>{
  const removedPersisted=[];
  const removedVisible=[];
  const committed=[{id:'first'},{id:'second'},{id:'third'}];
  const failures=await dedupe.rollbackImported(
    committed,
    async id=>removedPersisted.push(id),
    id=>removedVisible.push(id)
  );
  assert.deepStrictEqual(failures,[],'successful rollback must not report failures');
  assert.deepStrictEqual(removedPersisted,['third','second','first'],'rollback must unwind persisted media in reverse commit order');
  assert.deepStrictEqual(removedVisible,['third','second','first'],'rollback must unwind visible media in reverse commit order');

  const partial=await dedupe.rollbackImported(
    [{id:'kept-clean'},{id:'delete-fails'}],
    async id=>{if(id==='delete-fails')throw new Error('storage unavailable')},
    ()=>{}
  );
  assert.strictEqual(partial.length,1,'rollback persistence failures must be surfaced instead of hidden');
  assert.strictEqual(partial[0].id,'delete-fails');
  console.log('media upload dedupe + transactional rollback regression: ok');
})().catch(error=>{console.error(error);process.exitCode=1});
