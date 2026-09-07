import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

globalThis.window={addEventListener(){}};
const require=createRequire(import.meta.url);
const {ProfitMenteBundleEngine}=require('./bundle-engine.js');
globalThis.ProfitMenteBundleEngine=ProfitMenteBundleEngine;
globalThis.ProfitMenteRenderJobClient=class {};
require('./bundle-render-job-integration.js');

const bundler=new ProfitMenteBundleEngine();
const enc=new TextEncoder();
const mediaBytes=enc.encode('bundle-import-integrity-media');

function tarEntry(name,bytes){
  const body=bytes instanceof Uint8Array?bytes:enc.encode(String(bytes));
  return [bundler.header(name,body.length),body,new Uint8Array((512-body.length%512)%512)];
}
function makeTar(project,entries=[]){
  const json=enc.encode(JSON.stringify(project));
  return new Blob([
    ...tarEntry('project.json',json),
    ...entries.flatMap(([name,bytes])=>tarEntry(name,bytes)),
    new Uint8Array(1024)
  ],{type:'application/x-tar'});
}

const asset={id:'asset-1',name:'media.mp4',type:'video',mime:'video/mp4',blob:new Blob([mediaBytes],{type:'video/mp4'}),duration:2};
const project={name:'Valid import',duration:2,clips:[{id:'clip-1',track:0,start:0,duration:2,asset:'asset-1'}],assets:[]};
const valid=await bundler.parse(await bundler.build(project,[asset]));
assert.equal(valid.assets[0].id,'asset-1');
assert.equal(valid.project.clips[0].asset,'asset-1');

const builtBytes=new Uint8Array(await (await bundler.build(project,[asset])).arrayBuffer());
const firstSize=parseInt(bundler.readString(builtBytes.slice(0,512),124,12),8);
const firstEnd=512+Math.ceil(firstSize/512)*512;
const duplicatedProject=new Blob([
  builtBytes.slice(0,firstEnd),
  builtBytes.slice(0,firstEnd),
  builtBytes.slice(firstEnd)
],{type:'application/x-tar'});
await assert.rejects(
  ()=>bundler.parse(duplicatedProject),
  /Entrada TAR duplicada: project\.json/,
  'duplicate TAR paths must be rejected before the parser can overwrite them in its Map'
);

const storedName='asset-1-media.mp4';
const danglingProject={
  name:'Dangling imported clip',
  clips:[{id:'clip-missing',track:0,start:0,duration:1,asset:'missing-media'}],
  assets:[{id:'asset-1',name:storedName,type:'video',mime:'video/mp4'}]
};
await assert.rejects(
  ()=>bundler.parse(makeTar(danglingProject,[[`assets/${storedName}`,mediaBytes]])),
  /Medio requerido por clip no restaurado: missing-media/,
  'import must reject clips that reference media absent from the restored library'
);

const duplicateIdentityProject={
  name:'Duplicate imported IDs',
  clips:[],
  assets:[
    {id:90210,name:'90210-a.mp4',type:'video',mime:'video/mp4'},
    {id:'90210',name:'90210-b.mp4',type:'video',mime:'video/mp4'}
  ]
};
await assert.rejects(
  ()=>bundler.parse(makeTar(duplicateIdentityProject,[['assets/90210-a.mp4',mediaBytes],['assets/90210-b.mp4',mediaBytes]])),
  /Identificador de medio duplicado al importar: 90210/,
  'numeric/string aliases must not create two restored media entries with the same canonical identity'
);

const numericProject={
  name:'Legacy numeric import',
  clips:[{id:'legacy-clip',track:0,start:0,duration:1,asset:90210}],
  assets:[{id:90210,name:'90210-legacy.mp4',type:'video',mime:'video/mp4'}]
};
const numeric=await bundler.parse(makeTar(numericProject,[['assets/90210-legacy.mp4',mediaBytes]]));
assert.equal(numeric.assets[0].id,'90210','legacy numeric media IDs should canonicalize during import');
assert.equal(numeric.project.assets[0].id,'90210','manifest media IDs should canonicalize during import');
assert.equal(numeric.project.clips[0].asset,'90210','clip media references should canonicalize during import');

console.log('Bundle import integrity QA OK');