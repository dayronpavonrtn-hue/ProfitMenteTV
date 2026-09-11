const assert=require('assert');
const engine=require('../timeline-ripple-engine.js');
const clip=(id,track,start,duration,extra={})=>({id,track,start,duration,...extra});

{
  const project={clips:[clip('a',0,0,4),clip('b',0,4,3),clip('c',0,7,2)]};
  const result=engine.rippleDelete(project,'b');
  assert.equal(result.changed,true);assert.equal(result.shifted,1);assert.equal(result.delta,3);
  assert.deepEqual(project.clips.map(c=>[c.id,c.start]),[['a',0],['c',4]],'debe cerrar exactamente el hueco del clip eliminado');
}

{
  const project={clips:[clip('a',0,0,2),clip('b',0,5,2),clip('c',0,9,2)]};
  engine.rippleDelete(project,'b');
  assert.equal(project.clips.find(c=>c.id==='c').start,7,'debe conservar huecos que ya existían después del clip');
}

{
  const project={trackState:{0:{locked:true}},clips:[clip('a',0,0,3),clip('b',0,3,2)]};
  const before=JSON.stringify(project);const result=engine.rippleDelete(project,'a');
  assert.equal(result.changed,false);assert.equal(result.reason,'locked-track');assert.equal(JSON.stringify(project),before,'pista bloqueada no debe mutarse');
}

{
  const project={clips:[clip('a',0,0,3),clip('b',0,3,2),clip('overlay',1,3,2)]};
  engine.rippleDelete(project,'a');
  assert.equal(project.clips.find(c=>c.id==='b').start,0,'misma pista debe desplazarse');
  assert.equal(project.clips.find(c=>c.id==='overlay').start,3,'otras pistas no deben desplazarse en scope track');
}

{
  const project={clips:[clip('007','0','0','2'),clip('8',0,2,2)]};
  const result=engine.rippleDelete(project,7);
  assert(result.changed,'ids numéricos legacy equivalentes deben funcionar');
  assert.equal(project.clips[0].start,0);
}

{
  const corrupt={id:'bad',track:0,start:{valueOf:()=>0},duration:2};
  const project={clips:[corrupt,clip('ok',0,3,1)]};const before=JSON.stringify(project);
  const result=engine.rippleDelete(project,'bad');
  assert.equal(result.changed,false);assert.equal(result.reason,'invalid-clip');assert.equal(JSON.stringify(project),before,'datos coercibles corruptos no deben mutar proyecto');
}

{
  const project={trackState:{1:{locked:true}},clips:[clip('a',0,0,2),clip('v',0,2,1),clip('locked',1,2,1)]};
  const result=engine.rippleDelete(project,'a',{scope:'all'});
  assert.equal(result.changed,true);assert.equal(project.clips.find(c=>c.id==='v').start,0);
  assert.equal(project.clips.find(c=>c.id==='locked').start,2,'scope all debe respetar pistas bloqueadas');
}

console.log('Timeline ripple regression: OK');
