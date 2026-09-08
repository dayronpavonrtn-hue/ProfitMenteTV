const assert=require('assert');
global.window=globalThis;
require('./marker-engine.js');

function make(project={duration:10,frameRate:30,markers:[]}){
  let persists=0,lastTime=null;
  const engine=new ProfitMenteMarkerEngine({
    getProject:()=>project,
    persist:()=>{persists++},
    getTime:()=>lastTime??0,
    setTime:t=>{lastTime=t}
  });
  return {engine,project,get persists(){return persists},get lastTime(){return lastTime}};
}

{
  const x=make();
  const m=x.engine.add(1.017,'Hook');
  assert(m,'marker should be created');
  assert.strictEqual(m.time,31/30,'marker must snap to project frame grid');
  assert.strictEqual(x.persists,1);
  assert.strictEqual(x.engine.move(m.id,2.019),true);
  assert.strictEqual(x.engine.find(m.id).time,61/30,'drag/move must remain frame aligned');
  assert.strictEqual(x.engine.rename(m.id,'  CTA  '),true);
  assert.strictEqual(x.engine.find(m.id).label,'CTA');
  assert.strictEqual(x.engine.setKind(m.id,'chapter'),true);
  assert.strictEqual(x.engine.find(m.id).kind,'chapter');
}

{
  const x=make();
  assert.strictEqual(x.engine.add([], 'bad'),null,'arrays must not coerce into time');
  assert.strictEqual(x.engine.add(true,'bad'),null,'booleans must not coerce into time');
  assert.strictEqual(x.engine.move({},1),false,'objects must not coerce into marker identity');
  assert.strictEqual(x.engine.rename([], 'bad'),false,'arrays must not coerce into marker identity');
  assert.strictEqual(x.engine.setKind('missing','invalid'),false,'invalid marker kinds must be rejected');
  assert.strictEqual(x.persists,0,'invalid operations must not persist');
}

{
  const x=make({duration:6,fps:'24',markers:[
    {id:7,time:'1.01',label:'A'},
    {id:'007',time:2,label:'B'},
    {id:'safe',time:99,label:'End'}
  ]});
  const list=x.engine.markers();
  assert.strictEqual(list.length,3);
  assert.strictEqual(new Set(list.map(m=>x.engine.idKey(m.id))).size,3,'canonical duplicate identities must be repaired');
  assert.strictEqual(list[2].time,6,'legacy marker times must clamp to project duration');
  assert(list.every(m=>Math.abs(m.time*24-Math.round(m.time*24))<1e-9),'legacy times must normalize to frame grid');
}

{
  const project={duration:5,markers:[]};
  let first;
  const engine=new ProfitMenteMarkerEngine({getProject:()=>project,persist:()=>{throw new Error('disk')},getTime:()=>0,setTime:()=>{}});
  try{first=engine.add(1,'Will rollback');assert.fail('persist failure must throw');}catch(error){assert.strictEqual(error.message,'disk');}
  assert.deepStrictEqual(project.markers,[],'failed persistence must roll back marker mutation atomically');
  assert.strictEqual(first,undefined);
}

{
  const x=make({duration:10,markers:[{id:'a',time:1,label:'A'},{id:'b',time:5,label:'B'}]});
  x.engine.next(1);assert.strictEqual(x.lastTime,1);
  x.engine.next(-1);assert.strictEqual(x.lastTime,5,'navigation wraps at project boundaries');
}

console.log('Marker engine strict/frame-aligned regressions OK');
