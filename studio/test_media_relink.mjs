import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./media-relink-engine.js');
globalThis.ProfitMenteMediaImportEngine={
  kind:file=>String(file.type||'').split('/')[0]||null,
  signature:file=>`${String(file.name||'').toLowerCase()}|${Number(file.size||0)}|${String(file.type||'').toLowerCase()}|${Number(file.lastModified||0)}`
};
const assets=[
  {id:'v1',name:'clip.mp4',type:'video',mime:'video/mp4',size:1000,duration:10,sourceFingerprint:'clip.mp4|1000|video/mp4|1',sourceContentHash:'hash-video'},
  {id:'a1',name:'voice.wav',type:'audio',mime:'audio/wav',size:500,duration:5}
];
const exact={name:'new-name.mp4',type:'video/mp4',size:999,lastModified:2};
assert.equal(Engine.score(assets[0],exact,'hash-video'),100,'content hash must be strongest match');
const byName={name:'voice.wav',type:'audio/wav',size:500,lastModified:3};
assert.equal(Engine.bestMatch(assets,byName,'').asset.id,'a1','name+size should relink uniquely');
const wrong={name:'clip.mp4',type:'audio/wav',size:1000};
assert.equal(Engine.bestMatch(assets,wrong,'').asset,null,'incompatible media type must not relink');
const target={...assets[0]};
const applied=Engine.apply(target,exact,'hash-video-2');
assert.equal(applied.ok,true);assert.equal(target.id,'v1','relink must preserve asset id');assert.equal(target.name,'new-name.mp4');assert.equal(target.sourceContentHash,'hash-video-2');
const duplicated=[{id:'x1',name:'same.mp4',type:'video',size:20},{id:'x2',name:'same.mp4',type:'video',size:20}];
const ambiguous=Engine.bestMatch(duplicated,{name:'same.mp4',type:'video/mp4',size:20},'');
assert.equal(ambiguous.ambiguous,true);assert.equal(ambiguous.asset,null,'ambiguous matches must never relink automatically');
const project={clips:[{id:'c1',asset:'v1',duration:4,speed:2,sourceOffset:3},{id:'c2',asset:'a1',duration:1,speed:1,sourceOffset:0}]};
assert.equal(Engine.sourceWindowIssues(project,assets).length,1,'source overrun must be reported after relink');
console.log('Media relink regression: OK');
