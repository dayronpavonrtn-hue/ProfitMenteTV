import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document=undefined;

await import('./bundle-engine.js');

const engine=new globalThis.ProfitMenteBundleEngine();
const enc=new TextEncoder();
const projectBytes=enc.encode(JSON.stringify({name:'checksum test',clips:[],assets:[]}));
const pad=bytes=>new Uint8Array((512-bytes.length%512)%512);

const validBlob=new Blob([
  engine.header('project.json',projectBytes.length),
  projectBytes,
  pad(projectBytes),
  new Uint8Array(1024)
],{type:'application/x-tar'});

await assert.doesNotReject(
  ()=>engine.parse(validBlob),
  'standalone bundle core must accept valid ProfitMente TAR checksums'
);

const corruptedBytes=new Uint8Array(await validBlob.arrayBuffer());
corruptedBytes[0]='x'.charCodeAt(0);
const corruptedBlob=new Blob([corruptedBytes],{type:'application/x-tar'});

await assert.rejects(
  ()=>engine.parse(corruptedBlob),
  /Checksum TAR inválido/,
  'standalone bundle core must reject a TAR header modified without a matching checksum'
);

await import('./render-job-client.js');
await import('./bundle-render-job-integration.js');
const {assertUniqueTarEntries}=globalThis.ProfitMenteBundleRenderJobIntegration;

await assert.doesNotReject(
  ()=>assertUniqueTarEntries(engine,validBlob),
  'browser integration must accept valid ProfitMente TAR checksums'
);

await assert.rejects(
  ()=>assertUniqueTarEntries(engine,corruptedBlob),
  /Checksum TAR inválido/,
  'browser integration must also reject checksum-corrupted TAR headers'
);

console.log('Bundle TAR checksum rejection regression passed in core and browser integration');
