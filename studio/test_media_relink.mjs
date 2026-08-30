import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./media-relink-engine.js');
globalThis.ProfitMenteMediaImportEngine={
  kind:file=>String(file.type||'').split('/')[0]||null,
  signature:file=>`${String(file.name||'').toLowerCase()}|${Number(file.size||0)}|${String(file.type||'').toLowerCase()}|${Number(file.lastModified||0)}`
};
const assets=[
  {id:'v1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1000,duration:10,width:1920,height:1080,thumbnail:'data:image/jpeg;base64,old',metadataVersion:1,sourceFingerprint:'clip.mp4|1000|video/mp4|1',sourceContentHash:'hash-video'},
  {id:'a1',name:'voice.wav',type:'audio',mime:'audio/wav',size:500,duration:5,metadataVersion:1}
];
const exact={name:'new-name.mp4',type:'video/mp4',size:999,lastModified:2};
assert.equal(Engine.score(assets[0],exact,'hash-video'),100,'content hash must be strongest match');
const hashMismatchSameMetadata={name:'clip.mp4',type:'video/mp4',size:1000,lastModified:1};
assert.equal(Engine.score(assets[0],hashMismatchSameMetadata,'different-content'),-1,'known content hash mismatch must never fall back to name/size');
assert.equal(Engine.bestMatch(assets,hashMismatchSameMetadata,'different-content').asset,null,'wrong file with matching filename must not relink');
const rejectedTarget={...assets[0]};
const rejected=Engine.apply(rejectedTarget,hashMismatchSameMetadata,'different-content');
assert.equal(rejected.ok,false);assert.equal(rejected.reason,'content-hash-mismatch');assert.equal(rejectedTarget.duration,10,'rejected relink must leave asset untouched');
const byName={name:'voice.wav',type:'audio/wav',size:500,lastModified:3};
assert.equal(Engine.bestMatch(assets,byName,'').asset.id,'a1','legacy asset without hash should still relink by name+size');
const wrong={name:'clip.mp4',type:'audio/wav',size:1000};
assert.equal(Engine.bestMatch(assets,wrong,'').asset,null,'incompatible media type must not relink');
const target={...assets[0]};
const applied=Engine.apply(target,exact,'hash-video');
assert.equal(applied.ok,true);assert.equal(target.id,'v1','relink must preserve asset id');assert.equal(target.name,'new-name.mp4');assert.equal(target.sourceContentHash,'hash-video');
assert.equal(target.relinkConfidence,'strong','hash-verified relink should record strong confidence');
assert.equal(target.metadataVersion,undefined,'relink must force metadata inspection of the replacement file');
assert.equal(target.duration,undefined,'old duration must not survive a relink');
assert.equal(target.width,undefined,'old width must not survive a relink');
assert.equal(target.height,undefined,'old height must not survive a relink');
assert.equal(target.thumbnail,undefined,'old thumbnail must not survive a relink');
assert.equal(applied.before.duration,10,'previous metadata should remain available in the relink result for diagnostics');
const legacyTarget={...assets[1]};
const legacyApplied=Engine.apply(legacyTarget,byName,'');
assert.equal(legacyApplied.ok,true);assert.equal(legacyTarget.relinkConfidence,'legacy','legacy fallback must be explicitly marked as lower confidence');
const duplicated=[{id:'x1',name:'same.mp4',type:'video',size:20},{id:'x2',name:'same.mp4',type:'video',size:20}];
const ambiguous=Engine.bestMatch(duplicated,{name:'same.mp4',type:'video/mp4',size:20},'');
assert.equal(ambiguous.ambiguous,true);assert.equal(ambiguous.asset,null,'ambiguous matches must never relink automatically');
const project={clips:[{id:'c1',asset:'v1',duration:4,speed:2,sourceOffset:3},{id:'c2',asset:'a1',duration:1,speed:1,sourceOffset:0}]};
assert.equal(Engine.sourceWindowIssues(project,assets).length,1,'source overrun must be reported after relink');
console.log('Media relink regression: OK');
