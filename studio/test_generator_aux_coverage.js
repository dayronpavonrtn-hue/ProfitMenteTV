const assert=require('assert');
const ManualTools=require('./generator-manual-tools.js');

class EngineStub{
  canonicalTrack(value){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null}
  trackLocked(){return false}
  mediaKey(value){if(value==null||typeof value==='boolean')return null;const text=String(value).trim();return text?`k:${text}`:null}
  captionWords(text,start,duration){const words=String(text).trim().split(/\s+/);const step=duration/words.length;return words.map((word,index)=>({word,start:start+index*step,duration:step,end:start+(index+1)*step}))}
  scoreAsset(){return 1}
  sourceOffset(){return 0}
  hash(){return 1}
}

const tools=new ManualTools(new EngineStub());
const scene=overrides=>({id:'scene',track:0,start:0,duration:10,sceneText:'Texto completo de la escena',asset:'primary',...overrides});

{
  const project={clips:[scene(),{id:'partial-caption',track:3,start:0,duration:1,name:'Intro'}]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,1,'un caption corto no debe marcar toda la escena como subtitulada');
}

{
  const project={clips:[scene(),
    {id:'caption-a',track:3,start:0,duration:3,name:'Parte A'},
    {id:'caption-b',track:3,start:3,duration:3,name:'Parte B'}
  ]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,0,'varios captions válidos deben sumar cobertura sin contar solapamiento dos veces');
}

{
  const project={clips:[scene(),
    {id:'caption-a',track:3,start:0,duration:4,name:'Parte A'},
    {id:'caption-b',track:3,start:2,duration:3,name:'Parte B'}
  ]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,1,'captions que se solapan no deben inflar artificialmente la cobertura acumulada');
}

{
  const assets=[{id:'alt',type:'video',name:'alt.mp4',duration:20}];
  const project={clips:[scene(),{id:'micro-broll',track:1,start:1,duration:.08,asset:'alt'}]};
  const result=tools.addBroll(project,assets);
  assert.equal(result.added,1,'un B-roll válido pero casi vacío no debe impedir completar la escena');
}

{
  const assets=[{id:'alt',type:'video',name:'alt.mp4',duration:20}];
  const project={clips:[scene(),
    {id:'broll-a',track:1,start:1,duration:.3,asset:'alt'},
    {id:'broll-b',track:1,start:1.3,duration:.25,asset:'alt'}
  ]};
  const result=tools.addBroll(project,assets);
  assert.equal(result.added,0,'varios B-roll cortos deben poder sumar una cobertura útil de la escena');
}

console.log('Generator auxiliary coverage regression: OK');
