import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('./offline-media-integration.js',import.meta.url),'utf8');
assert.match(src,/function clearOfflineDecoration\(el\)/,'offline integration must centralize cleanup');
assert.match(src,/el\.style\.outline=''/,'relinked clips must clear offline outline');
assert.match(src,/el\.style\.outlineOffset=''/,'relinked clips must clear offline outline offset');
assert.match(src,/profitmenteOfflineTitle!==undefined/,'original clip title must be restored even when empty');
assert.match(src,/window\.CSS&&typeof window\.CSS\.escape==='function'/,'selector escaping should tolerate browsers without CSS.escape');
console.log('offline media integration regression ok');
