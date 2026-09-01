import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(fs.readFileSync(new URL('./media-import-engine.js',import.meta.url),'utf8'),{filename:'media-import-engine.js'});
const E=globalThis.ProfitMenteMediaImportEngine;
assert.ok(E,'media import engine must be exported');
assert.equal(E.kind({name:'clip.MP4',type:''}),'video');
assert.equal(E.kind({name:'voice.bin',type:'audio/ogg'}),'audio');
assert.equal(E.kind({name:'cover.webp',type:''}),'image');
assert.equal(E.kind({name:'notes.txt',type:'text/plain'}),null);
const file={name:'Take 01.mp4',type:'video/mp4',size:12345,lastModified:42};
const signature=E.signature(file);
assert.equal(signature,'take 01.mp4|12345|video/mp4|42');
assert.equal(E.compatible([file,{name:'readme.txt',type:'text/plain'}]).length,1);
assert.equal(E.findDuplicate([{id:'a',name:'Take 01.mp4',mime:'video/mp4',blob:{size:12345},sourceLastModified:42}],file)?.id,'a');
assert.equal(E.findDuplicate([{id:'b',sourceFingerprint:signature}],file)?.id,'b');
assert.equal(E.findDuplicate([{id:'c',name:'Take 02.mp4',mime:'video/mp4',blob:{size:12345},sourceLastModified:42}],file),null);
assert.equal(E.relativePath({name:'clip.mp4',webkitRelativePath:'Shoot\\Day 1\\clip.mp4'}),'Shoot/Day 1/clip.mp4');

const original=new Blob([new TextEncoder().encode('profitmente-media-content')],{type:'video/mp4'});
Object.defineProperty(original,'name',{value:'original.mp4'});Object.defineProperty(original,'lastModified',{value:1});
const renamed=new Blob([new TextEncoder().encode('profitmente-media-content')],{type:'video/mp4'});
Object.defineProperty(renamed,'name',{value:'renamed-copy.mp4'});Object.defineProperty(renamed,'lastModified',{value:999});
const different=new Blob([new TextEncoder().encode('profitmente-media-different')],{type:'video/mp4'});
Object.defineProperty(different,'name',{value:'different.mp4'});
const hashA=await E.contentHash(original),hashB=await E.contentHash(renamed),hashC=await E.contentHash(different);
assert.ok(hashA&&hashA.length===64,'content hash must be SHA-256 hex');
assert.equal(hashA,hashB,'renamed copies with identical bytes must share a content hash');
assert.notEqual(hashA,hashC,'different media bytes must not collide in regression fixture');
assert.equal(E.findDuplicateHash([{id:'same',sourceContentHash:hashA}],hashB)?.id,'same');
assert.equal(E.findDuplicateHash([{id:'other',sourceContentHash:hashC}],hashB),null);
assert.equal(E.findDuplicateForImport([{id:'same',sourceContentHash:hashA}],renamed,hashB)?.id,'same','content-identical renamed files must deduplicate');
const sameMetadataDifferentContent={id:'metadata-only',name:'same.mp4',mime:'video/mp4',blob:{size:22},sourceLastModified:77,sourceFingerprint:'same.mp4|22|video/mp4|77',sourceContentHash:hashA};
const sameMetadataFile={name:'same.mp4',type:'video/mp4',size:22,lastModified:77};
assert.equal(E.findDuplicate([sameMetadataDifferentContent],sameMetadataFile)?.id,'metadata-only','fixture must collide by metadata signature');
assert.equal(E.findDuplicateForImport([sameMetadataDifferentContent],sameMetadataFile,hashC),null,'different content must not be dropped just because folder metadata collides');
assert.equal(E.findDuplicateForImport([sameMetadataDifferentContent],sameMetadataFile,'')?.id,'metadata-only','signature remains fallback when hashing is unavailable');

const MB=1024*1024,largeSize=6*MB;
function largeMedia(name,middleByte,lastModified=123){
  const bytes=new Uint8Array(largeSize);bytes.fill(11);bytes[Math.floor(largeSize/2)]=middleByte;
  const blob=new Blob([bytes],{type:'video/mp4'});Object.defineProperty(blob,'name',{value:name});Object.defineProperty(blob,'lastModified',{value:lastModified});return blob;
}
const largeA=largeMedia('large-a.mp4',21),largeB=largeMedia('large-b.mp4',99);
const legacyA=await E.contentHashLegacy(largeA),legacyB=await E.contentHashLegacy(largeB),modernA=await E.contentHash(largeA),modernB=await E.contentHash(largeB);
assert.equal(legacyA,legacyB,'legacy edge-only hash fixture must reproduce the historical collision');
assert.notEqual(modernA,modernB,'sample-v2 hash must distinguish media that differs in the middle');
const hashesA=await E.contentHashes(largeA),hashesB=await E.contentHashes(largeB);
assert.equal(hashesA.version,'sample-v2');
assert.equal(hashesA.current,modernA);assert.equal(hashesA.legacy,legacyA);
const modernAsset={id:'modern-a',name:'large-a.mp4',mime:'video/mp4',blob:{size:largeSize},sourceLastModified:123,sourceFingerprint:E.signature(largeA),sourceContentHash:modernA,sourceLegacyContentHash:legacyA,sourceHashVersion:'sample-v2'};
assert.equal(E.findDuplicateForHashes([modernAsset],largeB,hashesB),null,'two modern assets with colliding legacy edges must remain distinct');
assert.equal(E.findDuplicateForHashes([modernAsset],largeA,hashesA)?.id,'modern-a','identical modern content must still deduplicate');
const legacyAsset={id:'legacy-a',name:'large-a.mp4',mime:'video/mp4',blob:{size:largeSize},sourceLastModified:123,sourceFingerprint:E.signature(largeA),sourceContentHash:legacyA};
assert.equal(E.findDuplicateForHashes([legacyAsset],largeA,hashesA)?.id,'legacy-a','same legacy asset with matching metadata must remain deduplicated after hash upgrade');
assert.equal(E.findDuplicateForHashes([legacyAsset],largeB,hashesB),null,'ambiguous legacy hash collision with different metadata must import safely instead of dropping media');

function mediaBlob(name,type='video/mp4',bytes=name){const blob=new Blob([bytes],{type});Object.defineProperty(blob,'name',{value:name});Object.defineProperty(blob,'lastModified',{value:77});return blob}
function fileEntry(path,file){return {isFile:true,isDirectory:false,fullPath:path,file(resolve){resolve(file)}}}
function dirEntry(children){return {isFile:false,isDirectory:true,createReader(){let sent=false;return {readEntries(resolve){if(sent)resolve([]);else{sent=true;resolve(children)}}}}}}
const clipA=mediaBlob('a.mp4'),clipB=mediaBlob('b.wav','audio/wav'),ignored=mediaBlob('notes.txt','text/plain');
const nested=dirEntry([
  fileEntry('/Campaign/video/a.mp4',clipA),
  dirEntry([fileEntry('/Campaign/audio/b.wav',clipB),fileEntry('/Campaign/docs/notes.txt',ignored)])
]);
const folderFiles=await E.filesFromDataTransfer({items:[{webkitGetAsEntry:()=>nested}],files:[]});
assert.equal(folderFiles.length,3,'recursive folder drop must enumerate nested files');
assert.equal(E.relativePath(folderFiles[0]),'Campaign/video/a.mp4');
assert.equal(E.relativePath(folderFiles[1]),'Campaign/audio/b.wav');
assert.deepEqual(E.compatible(folderFiles).map(x=>x.name),['a.mp4','b.wav'],'unsupported files in folders must remain filterable');
const fallback=[mediaBlob('fallback.mp4')];
assert.equal((await E.filesFromDataTransfer({items:[],files:fallback}))[0],fallback[0],'plain file drops must keep working without directory entries');
console.log('media import engine regression passed');
