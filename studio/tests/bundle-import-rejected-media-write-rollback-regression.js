const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'bundle-import-integration.js'),
  'utf8'
);

const loopStart = source.indexOf('for(const asset of prepared.assetsToPersist)');
assert(loopStart >= 0, 'bundle media persistence loop must exist');

const loopEnd = source.indexOf('const library=', loopStart);
assert(loopEnd > loopStart, 'bundle media persistence loop boundary must exist');

const loop = source.slice(loopStart, loopEnd);
const trackIndex = loop.indexOf('persistedIds.push(asset.id)');
const writeIndex = loop.indexOf('await putAsset(asset)');

assert(trackIndex >= 0, 'bundle import must track media IDs for rollback');
assert(writeIndex >= 0, 'bundle import must persist media assets');
assert(
  trackIndex < writeIndex,
  'media ID must be tracked before putAsset can reject after a partial write'
);
assert(
  source.includes('await rollbackPersistedAssets(persistedIds)'),
  'bundle import failure path must rollback every tracked media ID'
);

console.log('Bundle import rejected media write rollback regression passed');
