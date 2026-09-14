const assert=require('assert');
const ProfitMenteMediaInspector=require('../media-inspector.js');

(async()=>{
  const inspector=new ProfitMenteMediaInspector();
  let reads=0;
  inspector.inspectAudio=async blob=>{reads++;return {duration:blob.__duration||blob.size}};

  const blob=new Blob(['fresh-media'],{type:'audio/wav'});
  blob.__duration=11;
  const relinkLike={
    id:'voice-1',name:'voice.wav',type:'audio',mime:'audio/wav',blob,
    metadataVersion:inspector.version,
    duration:999,
    mediaReadable:true,
    metadataBlobSize:blob.size,
    metadataBlobType:blob.type,
    metadataBlobLastModified:0
  };

  const refreshed=await inspector.inspect(relinkLike);
  assert.strictEqual(reads,1,'legacy media without a content signature must be inspected again');
  assert.strictEqual(refreshed.mediaReadable,true);
  assert.strictEqual(refreshed.duration,11,'fresh metadata must replace stale duration');
  assert.ok(refreshed.metadataBlobSignature,'fresh inspection must persist a content signature');
  assert.strictEqual(inspector.metadataCurrent(refreshed),true,'freshly inspected metadata must be cacheable');

  const cached=await inspector.inspect(refreshed);
  assert.strictEqual(cached,refreshed,'unchanged media should reuse current metadata');
  assert.strictEqual(reads,1,'current metadata should avoid redundant decoding');

  const replacement=new Blob(['different-media-with-a-different-size'],{type:'audio/wav'});
  replacement.__duration=22;
  const staleReplacement={...refreshed,blob:replacement,size:replacement.size};
  assert.strictEqual(inspector.metadataCurrent(staleReplacement),false,'a changed blob stamp must invalidate cached metadata');
  const rechecked=await inspector.inspect(staleReplacement);
  assert.strictEqual(reads,2,'changed media must be decoded again');
  assert.strictEqual(rechecked.duration,22);
  assert.strictEqual(rechecked.metadataBlobSize,replacement.size);

  const sameSizeOriginal=new Blob(['AAAA-BBBB-CCCC-DDDD'],{type:'audio/wav'});
  sameSizeOriginal.__duration=31;
  const originalChecked=await inspector.inspect({id:'collision',name:'same.wav',type:'audio',mime:'audio/wav',blob:sameSizeOriginal,lastModified:123});
  assert.strictEqual(reads,3);
  const sameSizeReplacement=new Blob(['ZZZZ-YYYY-XXXX-WWWW'],{type:'audio/wav'});
  sameSizeReplacement.__duration=44;
  assert.strictEqual(sameSizeReplacement.size,sameSizeOriginal.size,'collision fixture must keep the exact same size');
  const collisionRelink={...originalChecked,blob:sameSizeReplacement,lastModified:123,metadataBlobLastModified:123};
  assert.strictEqual(inspector.metadataCurrent(collisionRelink),true,'cheap metadata alone intentionally cannot distinguish this relink');
  const collisionRefreshed=await inspector.inspect(collisionRelink);
  assert.strictEqual(reads,4,'different content with identical size/type/mtime must still be decoded again');
  assert.strictEqual(collisionRefreshed.duration,44,'same-metadata relink must not retain stale duration');
  assert.notStrictEqual(collisionRefreshed.metadataBlobSignature,originalChecked.metadataBlobSignature,'content signature must change when sampled bytes change');

  const collisionCached=await inspector.inspect(collisionRefreshed);
  assert.strictEqual(collisionCached,collisionRefreshed,'same replacement content must become cacheable after inspection');
  assert.strictEqual(reads,4,'content-aware cache must still avoid redundant decodes');

  const unreadable={...collisionRefreshed,mediaReadable:false,mediaError:'codec'};
  assert.strictEqual(inspector.metadataCurrent(unreadable),true,'validated unreadable media may also reuse its inspection result');

  console.log('media inspector stale metadata regression: ok');
})().catch(error=>{console.error(error);process.exit(1)});