const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const Guard=require('./qa-numeric-scalar-guard.js');

Guard.install(ProfitMenteQAEngine);
const engine=new ProfitMenteQAEngine();
const asset={id:'video',name:'video.mp4',type:'video',duration:10,width:1080,height:1920};
const base={duration:10,format:'9:16',trackState:{},clips:[{id:'clip',name:'clip',track:0,start:0,duration:5,asset:'video',sourceOffset:0,speed:1}]};
const inspect=patch=>engine.inspect({...base,...patch},[asset]);

assert.equal(inspect({}).ok,true,'the guard must preserve a healthy project');
const legacy={...base,duration:' 1e1 ',clips:[{...base.clips[0],start:'+0',duration:'5.0',sourceOffset:' 0 ',speed:'1e0'}]};
assert.deepEqual(Guard.inspect(legacy),[],'the strict guard must preserve legacy numeric strings without relying on JavaScript coercion');

for(const value of [true,false,null,undefined,'', '   ',[],[10],{}, {valueOf(){return 10}},Number.NaN,Infinity]){
  const guarded=Guard.inspect({...base,duration:value});
  assert.ok(guarded.some(issue=>issue.startsWith('Duración de proyecto inválida:')),`project duration must reject coerced value ${String(value)}`);
}

for(const field of ['start','duration','sourceOffset','speed']){
  for(const value of [true,false,[],[1],{}, {valueOf(){return 1}},'', '   ',Number.NaN,Infinity]){
    const clip={...base.clips[0],[field]:value};
    const guarded=Guard.inspect({...base,clips:[clip]});
    const prefix=field==='start'?'Inicio de clip inválido:':field==='duration'?'Duración de clip inválida:':field==='sourceOffset'?'Punto de entrada inválido:':'Velocidad fuera de rango';
    assert.ok(guarded.some(issue=>issue.startsWith(prefix)),`${field} must reject coerced value ${String(value)}`);
    const result=inspect({clips:[clip]});
    assert.equal(result.ok,false,`${field} strict issue must propagate through ProfitMenteQAEngine`);
  }
}

let result=inspect({clips:[{...base.clips[0],start:'8',duration:'3'}]});
assert.equal(result.ok,false,'strict numeric strings still must obey project bounds');
assert.ok(result.issues.some(issue=>issue==='Clip fuera de rango: clip'));

result=inspect({clips:[{...base.clips[0],sourceOffset:'-0.1'}]});
assert.equal(result.ok,false);
assert.ok(result.issues.some(issue=>issue.startsWith('Punto de entrada inválido:')));

result=inspect({clips:[{...base.clips[0],speed:'4.01'}]});
assert.equal(result.ok,false);
assert.ok(result.issues.some(issue=>issue.startsWith('Velocidad fuera de rango')));

console.log('QA numeric scalar guard regression OK');
