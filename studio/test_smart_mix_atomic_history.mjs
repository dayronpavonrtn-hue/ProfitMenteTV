import assert from 'node:assert/strict';
import fs from 'node:fs';

const smart=fs.readFileSync(new URL('./smart-mix-integration.js',import.meta.url),'utf8');
const normalize=fs.readFileSync(new URL('./audio-normalize-integration.js',import.meta.url),'utf8');

assert.match(smart,/normalizeAll\(\{deferPersist:true,quiet:true\}\)/,'smart mix must defer normalization persistence');
assert.match(smart,/normalized\?\.reason==='busy'/,'smart mix must abort if another normalization is active');
assert.equal((smart.match(/\brefresh\(\);/g)||[]).length,1,'smart mix must persist/redraw exactly once after the combined edit');

assert.match(normalize,/const \{deferPersist=false,quiet=false\}/,'normalization API must support deferred persistence');
assert.match(normalize,/if\(changed&&!deferPersist\)refresh\(\)/,'deferred normalization must not create an intermediate history entry');
assert.match(normalize,/return \{ok:true,changed,skipped,locked,deferred:!!deferPersist\}/,'normalization must report deferred completion together with locked-clip accounting');
assert.match(normalize,/reason:'busy'/,'normalization must expose the busy state to callers');

console.log('smart mix atomic history contract ok');
