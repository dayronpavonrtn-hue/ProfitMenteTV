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

const rolloutFile={name:'rollout.mp4',type:'video/mp4',size:6000000,lastModified:42};
const rolloutFingerprint=ProfitMenteMediaImportEngine.signature(rolloutFile);
const legacyOffline={id:'legacy',name:'rollout.mp4',type:'video',size:6000000,sourceFingerprint:rolloutFingerprint,sourceContentHash:'edge-hash'};
const upgradedHashes={current:'sample-v2-hash',legacy:'edge-hash',version:'sample-v2'};
const legacyIdentity=Engine.identity(legacyOffline,rolloutFile,upgradedHashes);
assert.equal(legacyIdentity.ok,true,'a pre-sample-v2 asset must relink using its legacy hash plus fingerprint');
assert.equal(legacyIdentity.reason,'legacy-content-hash-match');
const upgraded={...legacyOffline};
const upgradedResult=Engine.apply(upgraded,rolloutFile,upgradedHashes);
assert.equal(upgradedResult.ok,true);
assert.equal(upgraded.sourceContentHash,'sample-v2-hash','successful legacy relink must migrate to the collision-resistant hash');
assert.equal(upgraded.sourceLegacyContentHash,'edge-hash','successful relink must retain the legacy hash for compatibility');
assert.equal(upgraded.sourceHashVersion,'sample-v2','successful relink must record the hash algorithm version');

const rolloutMetadataOnly={id:'rollout-modern',name:'rollout.mp4',type:'video',size:6000000,sourceContentHash:'sample-v2-hash'};
assert.equal(Engine.identity(rolloutMetadataOnly,rolloutFile,upgradedHashes).ok,true,'modern hash metadata must remain usable even if sourceHashVersion was lost');

const collidingModern={id:'modern',name:'rollout.mp4',type:'video',size:6000000,sourceFingerprint:rolloutFingerprint,sourceContentHash:'different-modern',sourceLegacyContentHash:'edge-hash',sourceHashVersion:'sample-v2'};
const collision=Engine.identity(collidingModern,rolloutFile,upgradedHashes);
assert.equal(collision.ok,false,'legacy edge-hash collision must never override a modern content-hash mismatch');
assert.equal(collision.reason,'content-hash-mismatch');

const unsafeLegacy={...legacyOffline,sourceFingerprint:'other.mp4|6000000|video/mp4|42'};
const unsafeIdentity=Engine.identity(unsafeLegacy,rolloutFile,upgradedHashes);
assert.equal(unsafeIdentity.ok,false,'legacy hash collision without a matching fingerprint must stay unmatched');
assert.equal(unsafeIdentity.reason,'legacy-hash-unverified');
assert.equal(Engine.bestMatch([unsafeLegacy],rolloutFile,upgradedHashes).asset,null,'unsafe legacy hash must not fall back to filename/size auto relink');

const project={clips:[{id:'c1',asset:'v1',duration:4,speed:2,sourceOffset:3},{id:'c2',asset:'a1',duration:1,speed:1,sourceOffset:0}]};
assert.equal(Engine.sourceWindowIssues(project,assets).length,1,'source overrun must be reported after relink');

const legacyIdAssets=[
  {id:'7',name:'legacy.mp4',type:'video',duration:3},
  {id:0,name:'zero.wav',type:'audio',duration:1}
];
const legacyIdProject={clips:[
  {id:'legacy-number',asset:7,duration:2,speed:2,sourceOffset:0},
  {id:'legacy-spaces',asset:' 7 ',duration:2,speed:2,sourceOffset:0},
  {id:'legacy-zero',asset:'0',duration:2,speed:1,sourceOffset:0},
  {id:'empty-id',asset:'   ',duration:20,speed:4,sourceOffset:0}
]};
const legacyIdIssues=Engine.sourceWindowIssues(legacyIdProject,legacyIdAssets);
assert.deepEqual(legacyIdIssues.map(issue=>issue.clipId),['legacy-number','legacy-spaces','legacy-zero'],'relink validation must normalize numeric/string/whitespace media ids and preserve id 0');
assert.equal(legacyIdIssues[0].assetId,'7','reported issue must retain the canonical asset record id');
assert.equal(legacyIdIssues[2].assetId,0,'reported issue must preserve a valid numeric zero asset id');

console.log('Media relink regression: OK');
