const assert=require('assert');
const ManualTools=require('../generator-manual-tools.js');

class EngineStub{
  canonicalTrack(value){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null}
  trackLocked(project,track){const key=this.canonicalTrack(track);return !!Object.entries(project.trackState||{}).find(([k,s])=>this.canonicalTrack(k)===key&&s?.locked)}
  mediaKey(value){if(value==null||typeof value==='boolean'||(typeof value!=='string'&&typeof value!=='number'))return null;const text=String(value).trim();return text?`k:${text}`:null}
  captionWords(text,start,duration){const words=String(text).trim().split(/\s+/);const step=duration/words.length;return words.map((word,index)=>({word,index,start:start+index*step,duration:step,end:start+(index+1)*step}))}
  scoreAsset(asset){return asset.type==='video'?2:1}
  sourceOffset(asset,clip){return asset.type==='video'?Math.max(0,Math.min(1,(Number(asset.duration)||0)-clip.duration)):0}
  hash(){return 7}
}

const tools=new ManualTools(new EngineStub());
const scene=(overrides={})=>({id:'scene',track:0,start:0,duration:10,sceneText:'Texto real para subtítulos',keywords:['dinero'],asset:'primary',...overrides});

{
  const project={duration:10,clips:[scene()]};
  const first=tools.addMissingCaptions(project);
  assert.equal(first.added,1,'debe crear caption faltante');
  const caption=project.clips.find(c=>String(c.track)==='3');
  assert(caption,'debe insertar clip en pista 3');
  assert.equal(caption.name,'Texto real para subtítulos');
  assert(caption.wordTimings.length===4,'debe crear timings por palabra');
  assert(caption.wordTimings.every(w=>w.start>=caption.start-1e-6&&w.end<=caption.start+caption.duration+1e-6),'los timings deben quedar dentro del caption');
  assert.equal(tools.addMissingCaptions(project).added,0,'segunda ejecución no debe duplicar captions');
}

{
  const project={trackState:{3:{locked:true}},clips:[scene()]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.locked,true);assert.equal(project.clips.length,1,'pista bloqueada no debe mutar el proyecto');
}

{
  const project={format:'9:16',name:'Prueba',clips:[scene()]};
  const assets=[
    {id:'primary',type:'video',name:'principal.mp4',duration:20},
    {id:'alt',type:'video',name:'dinero broll.mp4',duration:2},
    {id:'audio',type:'audio',name:'music.mp3',duration:30}
  ];
  const result=tools.addBroll(project,assets,{maxClips:4});
  assert.equal(result.added,1,'debe añadir B-roll real');
  const broll=project.clips.find(c=>String(c.track)==='1');
  assert(broll,'debe insertar clip en pista 1');
  assert.equal(broll.asset,'alt','debe preferir un visual distinto al primario cuando exista');
  assert(broll.duration<=2+1e-6,'no debe exceder la duración conocida de la fuente');
  assert(broll.start>=0&&broll.start+broll.duration<=10+1e-6,'B-roll debe quedar dentro de la escena');
  assert(broll.sourceOffset+broll.duration<=2+1e-6,'ventana de fuente debe ser válida');
  assert.equal(tools.addBroll(project,assets).added,0,'segunda ejecución no debe superponer B-roll duplicado');
}

{
  const project={trackState:{1:{locked:true}},clips:[scene()]};
  const result=tools.addBroll(project,[{id:'v',type:'video',name:'v.mp4',duration:5}]);
  assert.equal(result.locked,true);assert.equal(project.clips.length,1,'pista B-roll bloqueada no debe mutar el proyecto');
}

{
  const project={clips:[scene({duration:1})]};
  const result=tools.addBroll(project,[{id:'audio',type:'audio',name:'x.mp3',duration:20}]);
  assert.equal(result.available,0,'audio no debe tratarse como B-roll visual');
  assert.equal(result.added,0);
}

{
  const project={clips:[scene({start:{valueOf:()=>7},duration:{valueOf:()=>8}})]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,0,'objetos coercibles no deben crear captions con tiempos falsos');
  assert.equal(project.clips.length,1,'tiempos corruptos no deben mutar el proyecto');
}

{
  const project={clips:[scene({start:'1.5',duration:'4'})]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,1,'strings numéricos legacy deben seguir siendo válidos');
  const caption=project.clips.find(c=>String(c.track)==='3');
  assert(caption.start>=1.5&&caption.start+caption.duration<=5.5+1e-6,'caption legacy debe respetar el rango de escena');
}

{
  const project={format:'9:16',clips:[scene({duration:6})]};
  const assets=[{id:'alt',type:'video',name:'alt.mp4',duration:{valueOf:()=>50}}];
  const result=tools.addBroll(project,assets);
  assert.equal(result.added,1,'duración de asset corrupta no debe impedir usar el medio como B-roll');
  const broll=project.clips.find(c=>String(c.track)==='1');
  assert(broll.duration<=3+1e-6,'objeto coercible no debe inflar la duración conocida de la fuente');
  assert.equal(broll.sourceOffset,0,'offset corrupto o sin duración conocida debe quedar seguro');
}

{
  const project={clips:[scene({sceneText:{toString:()=> 'caption falso'},script:['texto falso']})]};
  const result=tools.addMissingCaptions(project);
  assert.equal(result.added,0,'metadata textual corrupta no debe producir captions sintéticos');
  assert.equal(project.clips.length,1,'caption corrupto no debe mutar el proyecto');
}

{
  class BadCaptionEngine extends EngineStub{captionWords(){return {not:'an array'}}}
  const localTools=new ManualTools(new BadCaptionEngine());
  const project={clips:[scene()]};
  assert.equal(localTools.addMissingCaptions(project).added,1);
  const caption=project.clips.find(c=>String(c.track)==='3');
  assert.deepEqual(caption.wordTimings,[],'timings inválidos deben degradar a lista vacía segura');
}

{
  class StrictMetadataEngine extends EngineStub{
    hash(value){assert.equal(typeof value,'string');return 11}
    scoreAsset(asset,keywords,format){
      assert(keywords.every(value=>typeof value==='string'),'keywords enviados al motor deben ser texto');
      assert.equal(format,'9:16','formato corrupto debe volver al default seguro');
      return {valueOf:()=>999};
    }
  }
  const localTools=new ManualTools(new StrictMetadataEngine());
  const project={format:{toString:()=> '16:9'},name:{toString:()=> 'nombre falso'},clips:[scene({duration:4,keywords:['dinero',{toString:()=> 'falso'},'',null]})]};
  const result=localTools.addBroll(project,[{id:'alt',type:'video',name:{toString:()=> 'nombre corrupto'},duration:8}]);
  assert.equal(result.added,1,'metadata corrupta no debe romper la inserción de B-roll');
  const broll=project.clips.find(c=>String(c.track)==='1');
  assert.equal(broll.name,'B-roll · medio','nombre corrupto debe usar etiqueta segura');
}

console.log('Generator manual tools regression: OK');
