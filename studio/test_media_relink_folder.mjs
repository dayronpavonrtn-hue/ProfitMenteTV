import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Folder=require('./media-relink-folder-engine.js');

const fakeRelink={
  isOffline(asset){return !asset.blob&&!asset.url&&!asset.src&&!asset.objectUrl},
  bestMatch(assets,file){
    const matches=assets.filter(asset=>String(asset.name).toLowerCase()===String(file.name).toLowerCase());
    return matches.length===1?{asset:matches[0],score:60,ambiguous:false}:matches.length>1?{asset:null,score:60,ambiguous:true}:{asset:null,score:-1,ambiguous:false};
  }
};
const project={clips:[{id:'c1',asset:'online'},{id:'c2',asset:'offline'},{id:'c3',asset:'missing'},{id:'c4',asset:null}],assets:[{id:'missing',name:'missing.mp4',type:'video',mime:'video/mp4',size:1234}]};
const assets=[{id:'online',name:'online.mp4',type:'video',blob:{size:100}},{id:'offline',name:'offline.wav',type:'audio',size:50}];
const summary=Folder.summary(project,assets,fakeRelink);
assert.equal(summary.total,2,'only referenced offline/missing assets should need recovery');
assert.equal(summary.offline,1);
assert.equal(summary.missing,1);
assert.equal(summary.candidates.find(x=>x.asset.id==='missing').placeholder,true);
assert.equal(summary.candidates.some(x=>x.asset.id==='online'),false,'online media must never be a folder-relink candidate');

const used=new Set();
const offlineMatch=Folder.bestCandidate(summary.candidates,{name:'offline.wav'}, {},used,fakeRelink);
assert.equal(offlineMatch.candidate.asset.id,'offline');
used.add('offline');
assert.equal(Folder.bestCandidate(summary.candidates,{name:'offline.wav'}, {},used,fakeRelink).candidate,null,'one source file cannot relink the same asset twice');

const missing=summary.candidates.find(x=>x.asset.id==='missing');
const before=assets.length;
assert.equal(Folder.installRecoveredAsset(assets,missing).id,'missing');
assert.equal(assets.length,before+1,'missing project metadata should be reconstructed into the live library');
assert.equal(missing.placeholder,false);
Folder.installRecoveredAsset(assets,missing);
assert.equal(assets.length,before+1,'recovery install must be idempotent');

const noMeta={clips:[{asset:'ghost'}],assets:[]};
assert.equal(Folder.summary(noMeta,[],fakeRelink).total,0,'unknown references without metadata must not invent an identity');
console.log('media relink folder regression: ok');
