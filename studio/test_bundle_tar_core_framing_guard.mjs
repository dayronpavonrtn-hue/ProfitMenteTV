import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');
await import('./bundle-tar-safety-guard.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const enc=new TextEncoder();
const projectBytes=enc.encode(JSON.stringify({name:'core framing test',clips:[],assets:[]}));
const pad=bytes=>new Uint8Array((512-bytes.length%512)%512);
const validBlob=new Blob([
  engine.header('project.json',projectBytes.length),
  projectBytes,
  pad(projectBytes),
  new Uint8Array(1024)
],{type:'application/x-tar'});

await assert.doesNotReject(
  ()=>engine.parse(validBlob),
  'bundle core with safety guard must accept a complete TAR'
);

const bytes=new Uint8Array(await validBlob.arrayBuffer());
const truncated=new Blob([bytes.slice(0,bytes.length-1)],{type:'application/x-tar'});
await assert.rejects(
  ()=>engine.parse(truncated),
  /truncado|terminador/i,
  'bundle core must reject a truncated TAR terminator without browser integration'
);

const garbage=new Blob([bytes,new Uint8Array([7])],{type:'application/x-tar'});
await assert.rejects(
  ()=>engine.parse(garbage),
  /después del terminador/i,
  'bundle core must reject trailing non-zero data without browser integration'
);

const badSecond=bytes.slice();
badSecond[badSecond.length-512]=1;
await assert.rejects(
  ()=>engine.parse(new Blob([badSecond],{type:'application/x-tar'})),
  /terminador inválido/i,
  'bundle core must require both TAR terminator blocks'
);

console.log('Bundle TAR core framing guard regression passed');
