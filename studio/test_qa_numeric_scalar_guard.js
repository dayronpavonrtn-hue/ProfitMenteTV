const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const Guard=require('./qa-numeric-scalar-guard.js');

Guard.install(ProfitMenteQAEngine);
const engine=new ProfitMenteQAEngine();
const asset={id:'video',name:'video.mp4',type:'video',duration:10,width:1080,height:1920};
const base={duration:10,format:'9:16',trackState:{},clips:[{id:'clip',name:'clip',track:0,start:0,duration:5,asset:'video',sourceOffset:0,speed:1}]};
const inspect=patch=>engine.inspect({...base,...patch},[asset]);

let result=inspect({duration:' 1e1 ',clips:[{...base.clips[0],start:'+0',duration:'5.0',sourceOffset:' 0 ',speed:'1e0'}]});
assert.equal(result.ok,true,'legacy numeric strings must remain compatible');

for(const value of [true,false,null,undefined,'', '   ',[],[10],{}, {valueOf(){return 10}},Number.NaN,Infinity]){
  result=inspect({duration:value});
  assert.equal(result.ok,false,`project duration must reject coerced value ${String(value)}`);
  assert.ok(result.issues.some(issue=>issue.startsWith('Duración de proyecto inválida:')));
}

for(const field of ['start','duration','sourceOffset','speed']){
  for(const value of [true,false,[],[1],{}, {valueOf(){return 1}},'', '   ',Number.NaN,Infinity]){
    const clip={...base.clips[0],[field]:value};
    result=inspect({clips:[clip]});
    assert.equal(result.ok,false,`${field} must reject coerced value ${String(value)}`);
    const prefix=field==='start'?'Inicio de clip inválido:':field==='duration'?'Duración de clip inválida:':field==='sourceOffset'?'Punto de entrada inválido:':'Velocidad fuera de rango';
    assert.ok(result.issues.some(issue=>issue.startsWith(prefix)),`${field} must report a strict numeric QA issue`);
  }
}

result=inspect({clips:[{...base.clips[0],start:'8',duration:'3'}]});
assert.equal(result.ok,false,'strict numeric strings still must obey project bounds');
assert.ok(result.issues.some(issue=>issue==='Clip fuera de rango: clip'));

result=inspect({clips:[{...base.clips[0],sourceOffset:'-0.1'}]});
assert.equal(result.ok,false);
assert.ok(result.issues.some(issue=>issue.startsWith('Punto de entrada inválido:')));

result=inspect({clips:[{...base.clips[0],speed:'4.01'}]});
assert.equal(result.ok,false);
assert.ok(result.issues.some(issue=>issue.startsWith('Velocidad fuera de rango')));

console.log('QA numeric scalar guard regression OK');
