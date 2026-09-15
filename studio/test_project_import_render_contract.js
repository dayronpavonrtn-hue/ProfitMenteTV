const assert=require('assert');
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');
const engine=new ProfitMenteProjectImportEngine();
const base={version:'1.3',name:'Import test',mode:'Manual',duration:30,format:'9:16',fps:30,renderQuality:'high',clips:[]};
function project(clip){return {...base,clips:[{id:'clip-1',track:0,start:0,duration:5,...clip}]}}
function rejects(clip,pattern){assert.throws(()=>engine.normalize(project(clip)),pattern)}
const valid=engine.normalize(project({asset:'media-1',muted:false,flipX:true}));
assert.equal(valid.clips[0].asset,'media-1');
assert.equal(valid.clips[0].flipX,true);
rejects({asset:'   '},/Referencia de medio inválida/);
rejects({asset:'x'.repeat(129)},/Referencia de medio inválida/);
rejects({muted:'false'},/muted inválido/);
rejects({flipY:1},/flipY inválido/);
rejects({track:2,textStyle:'unknown'},/Estilo de texto Motion inválido/);
rejects({track:2,textAnimation:'spin'},/Animación de texto Motion inválida/);
rejects({track:2,fontSize:120},/Tamaño de texto inválido/);
rejects({track:2,textColor:'#fff'},/Color Motion inválido/);
assert.throws(()=>engine.normalize(project({id:'x'.repeat(129)})),/ID de clip inválido/);
console.log('project import render contract: ok');
