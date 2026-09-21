const assert=require('assert');

// Load the guard in isolation so this regression protects its strict timing rules
// without depending on browser bootstrap order.
const Guard=require('../qa-media-identity-guard.js');

const base={
  duration:12,
  clips:[{id:'clip',name:'clip',start:0,duration:4,asset:'video',sourceOffset:0,speed:1}]
};
const assets=[{id:'video',name:'video.mp4',type:'video',duration:12,width:1080,height:1920}];
const issuesFor=value=>Guard.timingIssues({...base,clips:[{...base.clips[0],speed:value}]});

for(const value of [true,false,[],[1],{},'', '   ',Number.NaN,Infinity]){
  const issues=issuesFor(value);
  assert.ok(issues.some(issue=>issue.startsWith('Velocidad de clip inválida:')),`malformed speed must be reported as invalid: ${String(value)}`);
  assert.ok(!issues.some(issue=>issue.startsWith('Velocidad de clip fuera de rango')),`malformed speed must not be mislabeled as out of range: ${String(value)}`);
}

for(const value of [0,0.249999,4.000001,10,-1]){
  const issues=issuesFor(value);
  assert.ok(issues.some(issue=>issue.startsWith('Velocidad de clip fuera de rango')),`finite speed outside 0.25x-4x must be rejected: ${value}`);
}

for(const value of [0.25,1,4,'0.25','4']){
  assert.deepEqual(issuesFor(value),[],`boundary/legacy numeric speed must remain valid: ${String(value)}`);
}

let sourceIssues=Guard.mediaBoundsIssues({...base,clips:[{...base.clips[0],sourceOffset:4,duration:4,speed:2}]},assets);
assert.deepEqual(sourceIssues,[],'exact source boundary must remain valid');
sourceIssues=Guard.mediaBoundsIssues({...base,clips:[{...base.clips[0],sourceOffset:4.00001,duration:4,speed:2}]},assets);
assert.ok(sourceIssues.some(issue=>issue.startsWith('Clip excede la duración del medio fuente:')),'speed-adjusted source overrun must be blocked');

console.log('QA media speed regression OK');
