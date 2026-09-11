const assert=require('assert');
const ProfitMenteRelinkEngine=require('./relink-engine.js');

const engine=new ProfitMenteRelinkEngine();

function projectFor(meta){
  return {clips:[{id:'clip-1',asset:'missing-1'}],assets:[{id:'missing-1',...meta}]};
}

const common={name:'Hook Final.mp4',type:'video',mime:'video/mp4',size:10_000_000};
const copyA={name:'Hook Final.mp4',type:'video/mp4',size:10_000_000,lastModified:1700000000000,webkitRelativePath:'Archive A/Hook Final.mp4'};
const copyB={name:'Hook Final.mp4',type:'video/mp4',size:10_000_000,lastModified:1700000005000,webkitRelativePath:'Archive B/Hook Final.mp4'};

let result=engine.match(projectFor(common),[],[copyA,copyB]);
assert.strictEqual(result.matches.length,0,'equally plausible legacy files must not be auto-relinked');
assert.strictEqual(result.ambiguous.length,1,'ambiguous candidates must be surfaced');
assert.strictEqual(result.unmatchedMissing.length,1,'ambiguous media must remain missing');
assert.strictEqual(result.unusedFiles.length,2,'ambiguous candidates must remain unused');

const pathProject=projectFor({...common,sourceRelativePath:'Archive B/Hook Final.mp4'});
result=engine.match(pathProject,[],[copyA,copyB]);
assert.strictEqual(result.matches.length,1,'an exact stored relative path should resolve ambiguity');
assert.strictEqual(result.matches[0].file,copyB,'exact relative path must win over same-name copies');
assert.strictEqual(result.ambiguous.length,0);

const fingerprintProject=projectFor({...common,sourceFingerprint:engine.fileFingerprint(copyA)});
result=engine.match(fingerprintProject,[],[copyB,copyA]);
assert.strictEqual(result.matches.length,1,'an exact source fingerprint should resolve ambiguity');
assert.strictEqual(result.matches[0].file,copyA,'fingerprint match must win regardless of input order');
assert.strictEqual(result.ambiguous.length,0);
assert.ok(engine.score(fingerprintProject.assets[0],copyA)>engine.score(fingerprintProject.assets[0],copyB),'exact fingerprint must materially outrank a near duplicate');

const nearA={name:'Voice.wav',type:'audio/wav',size:2_000_000,lastModified:0};
const nearB={name:'Voice.wav',type:'audio/wav',size:2_000_100,lastModified:0};
const audioProject=projectFor({name:'Voice.wav',type:'audio',mime:'audio/wav',size:2_000_050});
result=engine.match(audioProject,[],[nearA,nearB]);
assert.strictEqual(result.matches.length,0,'small score differences without strong identity must stay unresolved');
assert.strictEqual(result.ambiguous.length,1);

(async()=>{
  const verified=await engine.matchVerified(projectFor(common),[],[copyA,copyB]);
  assert.strictEqual(verified.matches.length,0,'verified relink must also reject ambiguity when no content hash exists');
  assert.strictEqual(verified.ambiguous.length,1);
  console.log('ProfitMente Studio relink ambiguity regression: PASS');
})().catch(err=>{console.error(err);process.exit(1)});
