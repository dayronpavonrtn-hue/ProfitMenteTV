const assert=require('assert');

class StubQAEngine{
  inspect(project,assets){return {ok:true,score:100,issues:[],warnings:[],metrics:{clips:project?.clips?.length||0,assets:assets?.length||0}}}
}
globalThis.ProfitMenteQAEngine=StubQAEngine;
const guard=require('../qa-strict-project-guard.js');

const base={duration:10,clips:[{id:'cap-1',track:3,name:'Caption válido',start:0,duration:2}]};
assert.deepStrictEqual(guard.invalidProjectFields(base),[],'a valid caption must pass strict project validation');

for(const name of ['', '   ', '\n\t']){
  const project={...base,clips:[{...base.clips[0],name}]};
  const issues=guard.invalidProjectFields(project);
  assert(issues.includes('Caption vacío: cap-1'),`empty caption ${JSON.stringify(name)} must be rejected`);
  const result=new globalThis.ProfitMenteQAEngine().inspect(project,[]);
  assert.strictEqual(result.ok,false,'empty caption must block final QA');
  assert(result.issues.includes('Caption vacío: cap-1'),'QA result must expose the empty-caption issue');
}

const motion={duration:10,clips:[{id:'motion-1',track:2,name:'',start:0,duration:2}]};
assert(!guard.invalidProjectFields(motion).some(issue=>issue.startsWith('Caption vacío:')),'non-caption tracks must not trigger the caption guard');
console.log('qa-empty-caption-regression: ok');
