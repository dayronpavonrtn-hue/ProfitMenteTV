import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./render-quality-engine.js');

assert.equal(Engine.normalize('draft'),'draft');
assert.equal(Engine.normalize('STANDARD'),'standard');
assert.equal(Engine.normalize('unknown'),'high');
assert.deepEqual(Engine.resolve('high'),{id:'high',label:'Alta',description:'Calidad final',preset:'medium',crf:18,audioBitrate:'192k'});
const project={name:'QA'};
const preset=Engine.apply(project,'draft');
assert.equal(project.renderQuality,'draft');
assert.equal(preset.preset,'veryfast');
assert.equal(preset.audioBitrate,'128k');
assert.equal(Engine.apply(project,'bad').id,'high');
assert.equal(project.renderQuality,'high');
console.log('Render quality engine regression OK');
