import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectImportEngine}=require('./project-import-engine.js');

const engine=new ProfitMenteProjectImportEngine();
const base={name:'Importado',mode:'Manual',duration:12,format:'9:16',clips:[{id:'c1',track:0,start:0,duration:2}]};

assert.equal(engine.normalize({...base,fps:'24'}).fps,24,'numeric-string fps must canonicalize to number');
assert.equal(engine.normalize({...base,fps:60}).fps,60,'supported current fps must be preserved');
assert.equal(engine.normalize({...base,frameRate:'30'}).fps,30,'legacy frameRate must migrate to fps');
assert.equal('frameRate' in engine.normalize({...base,frameRate:24}),false,'legacy frameRate alias must be removed');
assert.equal(engine.normalize({...base,fps:25}).fps,30,'unsupported fps must fall back to renderer default');
assert.equal(engine.normalize({...base,fps:'not-a-rate'}).fps,30,'malformed fps must fall back safely');
assert.equal(engine.normalize({...base,fps:undefined,frameRate:60}).fps,60,'legacy frameRate must be used when fps is absent');
assert.equal(engine.normalize(base).fps,30,'projects without frame-rate metadata must use canonical default');

console.log('Project import FPS normalization regression OK');
