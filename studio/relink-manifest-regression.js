const assert=require('assert');
const ProfitMenteRelinkEngine=require('./relink-engine.js');

const engine=new ProfitMenteRelinkEngine();
const project={clips:[{id:'c1',asset:'a1'},{id:'c2',asset:'a2'}]};
const assets=[
  {id:'a1',name:'Hook Final.mp4',type:'video',mime:'video/mp4',size:10485760,duration:7.5,width:1080,height:1920,lastModified:1720000000000,metadataVersion:2,sourceRelativePath:'Campaign A/Video/Hook Final.mp4',sourceFingerprint:'hook|10485760|video/mp4|1720000000000',sourceContentHash:'abc123',blob:{secret:true},thumbnail:'data:image/jpeg;base64,huge'},
  {id:'a2',name:'Voice.wav',type:'audio',mime:'audio/wav',size:2400000,duration:18.2,mediaReadable:true,blob:{secret:true}}
];

const manifest=engine.syncManifest(project,assets);
assert.strictEqual(manifest.length,2);
assert.strictEqual(project.assets[0].size,10485760);
assert.strictEqual(project.assets[0].duration,7.5);
assert.strictEqual(project.assets[0].width,1080);
assert.strictEqual(project.assets[0].height,1920);
assert.strictEqual(project.assets[0].lastModified,1720000000000);
assert.strictEqual(project.assets[0].sourceRelativePath,'Campaign A/Video/Hook Final.mp4');
assert.strictEqual(project.assets[0].sourceFingerprint,'hook|10485760|video/mp4|1720000000000');
assert.strictEqual(project.assets[0].sourceContentHash,'abc123');
assert.ok(!('blob' in project.assets[0]),'manifest must never embed media blobs');
assert.ok(!('thumbnail' in project.assets[0]),'manifest must never embed thumbnail data URLs');

const missing=engine.missing(project,[assets[1]]);
assert.deepStrictEqual(missing.map(x=>x.id),['a1']);
assert.strictEqual(missing[0].name,'Hook Final.mp4');
assert.strictEqual(missing[0].size,10485760);
assert.strictEqual(missing[0].sourceRelativePath,'Campaign A/Video/Hook Final.mp4');

const exact={name:'Hook Final.mp4',type:'video/mp4',size:10485760,lastModified:1720000000000,webkitRelativePath:'Campaign A/Video/Hook Final.mp4'};
const sameNameWrongFolder={name:'Hook Final.mp4',type:'video/mp4',size:10485760,lastModified:1720000000000,webkitRelativePath:'Archive/Old/Hook Final.mp4'};
const wrongType={name:'Hook Final.mp4',type:'audio/mp4',size:10485760,lastModified:1720000000000,webkitRelativePath:'Campaign A/Video/Hook Final.mp4'};
const unrelated={name:'Vacation.mp4',type:'video/mp4',size:10485760,lastModified:1720000000000,webkitRelativePath:'Campaign A/Video/Vacation.mp4'};
const samePathWrongFile={name:'Hook Final.mp4',type:'video/mp4',size:3145728,lastModified:1760000000000,webkitRelativePath:'Campaign A/Video/Hook Final.mp4'};
assert.ok(engine.score(missing[0],exact)>engine.score(missing[0],sameNameWrongFolder),'exact relative path must outrank duplicate filenames from another folder');
assert.ok(engine.score(missing[0],exact)>=65,'exact original should be a safe match');
assert.ok(engine.score(missing[0],wrongType)<0,'same filename with wrong media type must be rejected');
assert.ok(engine.score(missing[0],unrelated)<65,'size/type coincidence without filename relationship must not auto-relink');
assert.ok(engine.score(missing[0],samePathWrongFile)<0,'same path/name with a dramatic size mismatch must be rejected as unsafe');

let result=engine.match(project,[assets[1]],[sameNameWrongFolder,exact]);
assert.strictEqual(result.matches.length,1);
assert.strictEqual(result.matches[0].expected.id,'a1');
assert.strictEqual(result.matches[0].file,exact,'folder relink should select the original relative path when duplicate names exist');

result=engine.match(project,[assets[1]],[samePathWrongFile]);
assert.strictEqual(result.matches.length,0,'unsafe replacement footage must never auto-relink');
assert.deepStrictEqual(result.unmatchedMissing.map(x=>x.id),['a1']);
assert.strictEqual(result.unusedFiles[0],samePathWrongFile);

project.assets[0].fingerprint='sha256:legacy';
const strippedAssets=[{...assets[0],sourceRelativePath:'',sourceFingerprint:'',sourceContentHash:''},assets[1]];
engine.syncManifest(project,strippedAssets);
assert.strictEqual(project.assets[0].fingerprint,'sha256:legacy','existing fingerprints must survive manifest refresh until assets gain one');
assert.strictEqual(project.assets[0].sourceRelativePath,'Campaign A/Video/Hook Final.mp4','source path must survive a manifest refresh when the runtime asset temporarily lacks it');
assert.strictEqual(project.assets[0].sourceContentHash,'abc123','source hash must survive a manifest refresh when the runtime asset temporarily lacks it');

assert.strictEqual(engine.canonicalId(0),'n:0');
assert.strictEqual(engine.canonicalId('00'),'n:0');
assert.strictEqual(engine.canonicalId('7.0'),'n:7');
assert.ok(engine.sameId(7,'07'),'numeric legacy aliases must resolve to the same media identity');
assert.ok(!engine.sameId('',0),'blank ids must never alias media zero');

const legacyProject={
  clips:[{id:0,asset:0},{id:'01',asset:'07'},{id:'other',asset:'custom-id'}],
  assets:[
    {id:'00',name:'Zero.mp4',type:'video',mime:'video/mp4',size:1000,sourceRelativePath:'Legacy/Zero.mp4'},
    {id:7,name:'Seven.mp4',type:'video',mime:'video/mp4',size:2000,sourceRelativePath:'Legacy/Seven.mp4'},
    {id:'custom-id',name:'Custom.wav',type:'audio',mime:'audio/wav',size:3000}
  ]
};
const runtimeLegacy=[
  {id:'0.0',name:'Zero.mp4',type:'video',mime:'video/mp4',size:1000},
  {id:'007',name:'Seven.mp4',type:'video',mime:'video/mp4',size:2000}
];
assert.deepStrictEqual(engine.referenced(legacyProject),[0,'07','custom-id'],'referenced media must include asset 0 and deduplicate canonical aliases');
let legacyMissing=engine.missing(legacyProject,runtimeLegacy);
assert.deepStrictEqual(legacyMissing.map(x=>x.id),['custom-id'],'available numeric aliases must satisfy legacy project references');
assert.strictEqual(legacyMissing[0].name,'Custom.wav');

const zeroManifest=engine.manifest([{id:0,name:'Zero.mp4',type:'video'}]);
assert.strictEqual(zeroManifest.length,1,'manifest must preserve media id 0');
assert.strictEqual(zeroManifest[0].id,0);

const preserved={assets:[{id:'07',name:'Seven.mp4',sourceRelativePath:'Legacy/Seven.mp4',sourceContentHash:'keep-me'}]};
engine.syncManifest(preserved,[{id:7,name:'Seven.mp4',type:'video',mime:'video/mp4'}]);
assert.strictEqual(preserved.assets[0].sourceRelativePath,'Legacy/Seven.mp4','manifest metadata must survive canonical id aliases');
assert.strictEqual(preserved.assets[0].sourceContentHash,'keep-me');

console.log('ProfitMente Studio relink manifest regression: PASS');