const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');

const engine=new ProfitMenteQAEngine();
const asset={id:7,name:'clip.mp4',type:'video',width:1080,height:1920,duration:5};
const base={duration:5,format:'9:16',trackState:{},clips:[]};

const inspect=clip=>engine.inspect({...base,clips:[{id:'clip',name:'clip',start:0,duration:5,asset:7,...clip}]},[asset]);

let result=inspect({track:'01'});
assert.equal(result.ok,true,'legacy numeric string track aliases must remain supported');
assert.equal(result.metrics.visualCoverage,100);

for(const track of [true,false,{},[],1.5,'1x','']){
  result=inspect({track});
  assert.equal(result.ok,false,`invalid track identity must fail QA: ${String(track)}`);
  assert.ok(result.issues.some(issue=>issue.startsWith('Pista inválida:')));
  assert.equal(result.metrics.visualCoverage,0,'invalid tracks must not count toward visual coverage');
}

for(const assetId of [true,false,{},[],Number.NaN,Number.POSITIVE_INFINITY,Number.MAX_SAFE_INTEGER+1]){
  result=inspect({track:0,asset:assetId});
  assert.equal(result.ok,false,`invalid media identity must fail QA: ${String(assetId)}`);
  assert.ok(result.issues.some(issue=>issue.startsWith('Identidad de medio inválida:')));
}

result=engine.inspect({...base,trackState:{'01':{hidden:true}},clips:[{id:'legacy',name:'legacy',track:1,start:0,duration:5,asset:7}]},[asset]);
assert.equal(result.ok,true,'legacy track-state aliases should remain readable');
assert.equal(result.metrics.visualCoverage,0,'hidden legacy track-state alias must suppress visual coverage');

console.log('QA strict identity regression OK');
