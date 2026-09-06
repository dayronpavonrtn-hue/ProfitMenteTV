import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
const source=fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'media-import-engine.js'});
const E=globalThis.ProfitMenteMediaImportEngine;
assert.ok(E,'media import engine must be exported');
assert.match(source,/findDuplicateInBatch\(assets,pendingNew,file,hashes\)/,'live importer must deduplicate against pending assets in the same batch');
assert.match(source,/migration\.changed&&!pendingNew\.includes\(duplicate\)/,'pending duplicates must never be scheduled as persisted identity migrations');

function media(name,bytes,lastModified=1){
  const blob=new Blob([bytes],{type:'video/mp4'});
  Object.defineProperty(blob,'name',{value:name});
  Object.defineProperty(blob,'lastModified',{value:lastModified});
  return blob;
}

const first=media('camera-a.mp4','same-video-bytes',10);
const renamed=media('renamed-copy.mp4','same-video-bytes',999);
const different=media('camera-b.mp4','different-video-bytes',11);
const firstHashes=await E.contentHashes(first);
const renamedHashes=await E.contentHashes(renamed);
const differentHashes=await E.contentHashes(different);

const pending=[{
  id:'pending-a',name:first.name,type:'video',mime:first.type,blob:first,
  sourceFingerprint:E.signature(first),sourceContentHash:firstHashes.current,
  sourceLegacyContentHash:firstHashes.legacy,sourceHashVersion:firstHashes.version,
  sourceLastModified:first.lastModified
}];
assert.equal(E.findDuplicateInBatch([],pending,renamed,renamedHashes)?.id,'pending-a','renamed copy in one import batch must be detected before persistence');
assert.equal(E.findDuplicateInBatch([],pending,different,differentHashes),null,'different bytes in the same batch must remain importable');

const existing={...pending[0],id:'stored-a'};
assert.equal(E.findDuplicateInBatch([existing],[],renamed,renamedHashes)?.id,'stored-a','existing library deduplication must remain intact');

const batch=[first,renamed,different];
const planned=[];let duplicates=0;
for(const file of batch){
  const hashes=await E.contentHashes(file);
  if(E.findDuplicateInBatch([],planned,file,hashes)){duplicates++;continue}
  planned.push({
    id:`pending-${planned.length}`,name:file.name,type:'video',mime:file.type,blob:file,
    sourceFingerprint:E.signature(file),sourceContentHash:hashes.current,
    sourceLegacyContentHash:hashes.legacy,sourceHashVersion:hashes.version,
    sourceLastModified:file.lastModified
  });
}
assert.equal(duplicates,1,'one same-content duplicate must be omitted from a single selector/drop batch');
assert.equal(planned.length,2,'batch planner must keep only unique media content');
assert.deepEqual(planned.map(asset=>asset.name),['camera-a.mp4','camera-b.mp4']);

const signatureOnly={name:'legacy.mp4',type:'video/mp4',size:123,lastModified:5};
const pendingSignature={id:'pending-signature',name:'legacy.mp4',mime:'video/mp4',blob:{size:123},sourceLastModified:5,sourceFingerprint:E.signature(signatureOnly)};
assert.equal(E.findDuplicateInBatch([], [pendingSignature], signatureOnly, {current:'',legacy:''})?.id,'pending-signature','signature fallback must also deduplicate within a batch when hashing is unavailable');

console.log('media import same-batch dedupe regression passed');