import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteProjectDuration=require('../project-duration.js');

const normal={duration:45,clips:[{start:10,duration:5}]};
assert.equal(ProfitMenteProjectDuration.contentEnd(normal),15);
assert.equal(ProfitMenteProjectDuration.outside(normal).length,0);

const beyondProject={duration:45,clips:[{start:44,duration:3}]};
assert.equal(ProfitMenteProjectDuration.contentEnd(beyondProject),47);
assert.equal(ProfitMenteProjectDuration.outside(beyondProject).length,1);

// Regression: overflow beyond the one-hour local render ceiling must remain
// visible to validation. The previous implementation clamped safeEnd() to
// 3600 and therefore incorrectly reported this clip as inside the project.
const beyondRenderLimit={duration:3600,clips:[{start:3600,duration:10}]};
assert.equal(ProfitMenteProjectDuration.contentEnd(beyondRenderLimit),3610);
assert.equal(ProfitMenteProjectDuration.outside(beyondRenderLimit).length,1);
assert.equal(ProfitMenteProjectDuration.fit(beyondRenderLimit),3600);
assert.equal(ProfitMenteProjectDuration.outside(beyondRenderLimit).length,1);

const corrupt={duration:Infinity,clips:[{start:Symbol('bad'),duration:5},{start:20,duration:-4}]};
assert.doesNotThrow(()=>ProfitMenteProjectDuration.contentEnd(corrupt));
assert.equal(ProfitMenteProjectDuration.sanitize(corrupt),45);

console.log('project-duration-overflow-regression: ok');
