import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');
await import('./render-job-client.js');
await import('./bundle-render-job-integration.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const {assertUniqueTarEntries}=globalThis.ProfitMenteBundleRenderJobIntegration;
const enc=new TextEncoder();
const projectBytes=enc.encode(JSON.stringify({name:'framing test',clips:[],assets:[]}));
const pad=bytes=>new Uint8Array((512-bytes.length%512)%512);

const validBlob=new Blob([
  engine.header('project.json',projectBytes.length),
  projectBytes,
  pad(projectBytes),
  new Uint8Array(1024)
],{type:'application/x-tar'});

await assert.doesNotReject(
  ()=>assertUniqueTarEntries(engine,validBlob),
  'a complete TAR with two terminating zero blocks must be accepted'
);

const validBytes=new Uint8Array(await validBlob.arrayBuffer());
const truncatedTerminator=new Blob([validBytes.slice(0,validBytes.length-1)],{type:'application/x-tar'});
await assert.rejects(
  ()=>assertUniqueTarEntries(engine,truncatedTerminator),
  /truncado|terminador/i,
  'a TAR missing part of its terminating zero blocks must be rejected'
);

const trailingGarbage=new Blob([validBytes,new Uint8Array([1])],{type:'application/x-tar'});
await assert.rejects(
  ()=>assertUniqueTarEntries(engine,trailingGarbage),
  /después del terminador/i,
  'non-zero bytes after the TAR terminator must be rejected'
);

const badSecondTerminator=validBytes.slice();
badSecondTerminator[badSecondTerminator.length-512]=1;
const badSecondTerminatorBlob=new Blob([badSecondTerminator],{type:'application/x-tar'});
await assert.rejects(
  ()=>assertUniqueTarEntries(engine,badSecondTerminatorBlob),
  /terminador inválido/i,
  'the second TAR terminating block must also be zero-filled'
);

await assert.rejects(
  ()=>engine.parse(trailingGarbage),
  /después del terminador/i,
  'browser bundle import must reject TARs with trailing non-zero data before restoration'
);

console.log('Bundle TAR framing rejection regression passed');
