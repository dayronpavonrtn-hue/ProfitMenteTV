import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Guard=require('./qa-source-window-guard.js');

const baseProject=(clipOverrides={},projectOverrides={})=>({
  duration:12,
  tracks:[{id:0},{id:1},{id:4}],
  trackState:{},
  clips:[{id:'clip-1',asset:1,track:0,start:0,duration:3,sourceOffset:0,speed:1,...clipOverrides}],
  ...projectOverrides
});

{
  const issues=Guard.inspect(baseProject({asset:0}),[{id:0,type:'video',duration:2}]);
  assert.equal(issues.length,1);
  assert.match(issues[0],/Recorte supera el final/);
}

{
  const issues=Guard.inspect(baseProject({asset:'1'}),[{id:1,type:'video',duration:2}]);
  assert.equal(issues.length,1);
  assert.match(issues[0],/Recorte supera el final/);
}

{
  const issues=Guard.inspect(baseProject({asset:'1'}),[{id:1,type:'video',duration:4}]);
  assert.deepEqual(issues,[]);
}

// Inactive tracks skip source-window overflow checks, but the referenced media
// must still resolve exactly because the render packager validates it first.
{
  const p=baseProject({asset:'1',track:'0'},{tracks:[{id:0}],trackState:{0:{hidden:true}}});
  const issues=Guard.inspect(p,[{id:1,type:'video',duration:1}]);
  assert.deepEqual(issues,[]);
}

{
  const p=baseProject({asset:'1',track:'4'},{tracks:[{id:4}],trackState:{4:{muted:true}}});
  const issues=Guard.inspect(p,[{id:1,type:'audio',duration:1}]);
  assert.deepEqual(issues,[]);
}

{
  const p=baseProject({asset:'1',track:'0'},{tracks:[{id:0}],trackState:{0:{hidden:true}}});
  const issues=Guard.inspect(p,[
    {id:1,type:'video',duration:2},
    {id:'1',type:'video',duration:20}
  ]);
  assert.deepEqual(issues,['Referencia de medio ambigua: clip-1']);
}

{
  const p=baseProject({asset:'1',track:'4'},{tracks:[{id:4}],trackState:{4:{muted:true}}});
  const issues=Guard.inspect(p,[
    {id:1,type:'audio',duration:2},
    {id:'1',type:'audio',duration:20}
  ]);
  assert.deepEqual(issues,['Referencia de medio ambigua: clip-1']);
}

{
  const p=baseProject({asset:'missing',track:'0'},{tracks:[{id:0}],trackState:{0:{hidden:true}}});
  const issues=Guard.inspect(p,[{id:'other',type:'video',duration:20}]);
  assert.deepEqual(issues,['Medio faltante: clip-1']);
}

{
  const p=baseProject({asset:true,track:'4'},{tracks:[{id:4}],trackState:{4:{muted:true}}});
  const issues=Guard.inspect(p,[{id:1,type:'audio',duration:20}]);
  assert.deepEqual(issues,['Referencia de medio inválida: clip-1']);
}

{
  const issues=Guard.inspect(baseProject({asset:true}),[{id:1,type:'video',duration:2}]);
  assert.deepEqual(issues,['Referencia de medio inválida: clip-1']);
}

{
  const issues=Guard.inspect(baseProject({asset:1}),[
    {id:1,type:'video',duration:2},
    {id:'1',type:'video',duration:20}
  ]);
  assert.deepEqual(issues,['Referencia de medio ambigua: clip-1']);
}

{
  const issues=Guard.inspect(baseProject({asset:'0',duration:1}),[{id:-0,type:'video',duration:5}]);
  assert.deepEqual(issues,[]);
}

{
  const issues=Guard.inspect(baseProject({asset:'source',duration:2,sourceOffset:1,speed:2}),[{id:'source',type:'video',duration:4}]);
  assert.equal(issues.length,1);
  assert.match(issues[0],/requiere 5\.00s de 4\.00s/);
}

console.log('QA source window guard regression: OK');
