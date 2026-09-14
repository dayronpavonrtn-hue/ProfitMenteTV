import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');
await import('./bundle-tar-safety-guard.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const enc=new TextEncoder();
const pad=bytes=>new Uint8Array((512-bytes.length%512)%512);

function entry(name,bytes){
  return [engine.header(name,bytes.length),bytes,pad(bytes)];
}

function makeBundle(project,media={}){
  const json=enc.encode(JSON.stringify(project));
  const parts=[...entry('project.json',json)];
  for(const [name,value] of Object.entries(media)){
    const bytes=value instanceof Uint8Array?value:enc.encode(String(value));
    parts.push(...entry(`assets/${name}`,bytes));
  }
  parts.push(new Uint8Array(1024));
  return new Blob(parts,{type:'application/x-tar'});
}

const valid=makeBundle({
  name:'manifest integrity',
  clips:[{id:'clip-1',track:0,start:0,duration:1,asset:'media-1'}],
  assets:[{id:'media-1',name:'a.bin',type:'video',mime:'video/mp4'}]
},{'a.bin':'A'});
await assert.doesNotReject(()=>engine.parse(valid),'valid manifest must remain importable');

const duplicateIds=makeBundle({
  name:'duplicate media ids',
  clips:[],
  assets:[
    {id:1,name:'a.bin',type:'video',mime:'video/mp4'},
    {id:'1',name:'b.bin',type:'video',mime:'video/mp4'}
  ]
},{'a.bin':'A','b.bin':'B'});
await assert.rejects(
  ()=>engine.parse(duplicateIds),
  /identificador de medio duplicado/i,
  'canonical duplicate media ids must be rejected before a project becomes active'
);

const missingReference=makeBundle({
  name:'missing media reference',
  clips:[{id:'clip-missing',track:0,start:0,duration:1,asset:'media-2'}],
  assets:[{id:'media-1',name:'a.bin',type:'video',mime:'video/mp4'}]
},{'a.bin':'A'});
await assert.rejects(
  ()=>engine.parse(missingReference),
  /medio inexistente/i,
  'clips must not survive bundle import with dangling media references'
);

const invalidMediaId=makeBundle({
  name:'invalid media id',
  clips:[],
  assets:[{id:'   ',name:'a.bin',type:'video',mime:'video/mp4'}]
},{'a.bin':'A'});
await assert.rejects(
  ()=>engine.parse(invalidMediaId),
  /medio sin identificador válido/i,
  'manifest assets must have a canonical non-empty media id'
);

console.log('Bundle manifest integrity guard regression passed');