const assert=require('assert');
const ProfitMenteMediaInspector=require('../media-inspector.js');

(async()=>{
  const inspector=new ProfitMenteMediaInspector();
  let reads=0;
  inspector.inspectAudio=async blob=>{reads++;return {duration:blob.size}};

  const blob=new Blob(['fresh-media'],{type:'audio/wav'});
  const relinkLike={
    id:'voice-1',name:'voice.wav',type:'audio',mime:'audio/wav',blob,
    metadataVersion:inspector.version,
    duration:999,
    metadataBlobSize:blob.size,
    metadataBlobType:blob.type,
    metadataBlobLastModified:0
  };

  const refreshed=await inspector.inspect(relinkLike);
  assert.strictEqual(reads,1,'relinked media without a readability result must be inspected again');
  assert.strictEqual(refreshed.mediaReadable,true);
  assert.strictEqual(refreshed.duration,blob.size,'fresh metadata must replace stale duration');
  assert.strictEqual(inspector.metadataCurrent(refreshed),true,'freshly inspected metadata must be cacheable');

  const cached=await inspector.inspect(refreshed);
  assert.strictEqual(cached,refreshed,'unchanged media should reuse current metadata');
  assert.strictEqual(reads,1,'current metadata should avoid redundant decoding');

  const replacement=new Blob(['different-media-with-a-different-size'],{type:'audio/wav'});
  const staleReplacement={...refreshed,blob:replacement,size:replacement.size};
  assert.strictEqual(inspector.metadataCurrent(staleReplacement),false,'a changed blob must invalidate cached metadata');
  const rechecked=await inspector.inspect(staleReplacement);
  assert.strictEqual(reads,2,'changed media must be decoded again');
  assert.strictEqual(rechecked.duration,replacement.size);
  assert.strictEqual(rechecked.metadataBlobSize,replacement.size);

  const unreadable={...rechecked,mediaReadable:false,mediaError:'codec'};
  assert.strictEqual(inspector.metadataCurrent(unreadable),true,'validated unreadable media may also reuse its inspection result');

  console.log('media inspector stale metadata regression: ok');
})().catch(error=>{console.error(error);process.exit(1)});
