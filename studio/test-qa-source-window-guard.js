const assert=require('assert');
const {ProfitMenteQAEngine}=require('./qa-engine.js');
const Guard=require('./qa-source-window-guard.js');
Guard.install(ProfitMenteQAEngine);

function inspect(clip,asset={id:'a1',type:'video',duration:10,width:1080,height:1920,blob:null}){
  const project={duration:20,format:'9:16',clips:[{id:'c1',name:'Clip 1',track:0,start:0,duration:4,asset:'a1',...clip}],trackState:{}};
  return new ProfitMenteQAEngine().inspect(project,[asset]);
}

let r=inspect({sourceOffset:2,speed:1});
assert(!r.issues.some(x=>x.includes('archivo fuente')),'valid source window should pass');

r=inspect({sourceOffset:-0.1,speed:1});
assert(r.issues.some(x=>x.includes('Punto de entrada inválido')),'negative sourceOffset must block export');

r=inspect({sourceOffset:0,speed:8});
assert(r.issues.some(x=>x.includes('Velocidad fuera de rango')),'invalid speed must block export');

r=inspect({sourceOffset:8,speed:1});
assert(r.issues.some(x=>x.includes('Recorte supera el final')),'source overrun must be promoted to an issue');
assert(!r.warnings.some(x=>x.includes('Recorte supera el final')),'source overrun must not remain only a warning');

r=inspect({sourceOffset:8,speed:1},{id:'a1',type:'video',duration:0,width:1080,height:1920,blob:null});
assert(!r.issues.some(x=>x.includes('Recorte supera el final')),'unknown source duration must not create a false block');

r=new ProfitMenteQAEngine().inspect({duration:20,format:'9:16',clips:[{id:'c1',name:'Muted audio',track:5,start:0,duration:4,asset:'a1',sourceOffset:-1}],trackState:{5:{muted:true}}},[{id:'a1',type:'audio',duration:10,blob:null}]);
assert(!r.issues.some(x=>x.includes('Punto de entrada inválido')),'muted tracks should not block render source validation');

console.log('ProfitMente Studio source-window browser QA regression passed');
