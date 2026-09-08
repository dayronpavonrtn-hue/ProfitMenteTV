import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./render-progress-engine.js');
const Bridge=require('./render-progress-bridge.js');

assert.equal(Engine.normalize({stage:'rendering',progress:42.5,elapsed:8}).progress,42.5);
assert.equal(Engine.normalize({stage:'rendering',progress:true}).progress,null);
assert.equal(Engine.normalize({stage:'rendering',progress:[50]}).progress,null);
assert.equal(Engine.normalize({stage:'rendering',progress:'250'}).progress,100);
assert.equal(Math.round(Engine.normalize({stage:'rendering',progress:25,elapsed:10}).eta),30);

let state=Bridge.fromStatus('Render en cola · 12%');
assert.equal(state.stage,'queued');
assert.equal(state.progress,12);
state=Bridge.fromStatus('Renderizando MP4 · 37.5% · 8.2s');
assert.equal(state.stage,'rendering');
assert.equal(state.progress,37.5);
assert.equal(state.elapsed,8.2);
assert.equal(Bridge.fromStatus('QA post-render 100/100 · 1080×1920').stage,'qa');
assert.equal(Bridge.fromStatus('MP4 terminado. Preparando descarga…').stage,'downloading');
assert.equal(Bridge.fromStatus('Cancelando render local…').stage,'cancelled');
assert.equal(Bridge.fromStatus('No se pudo renderizar MP4').stage,'error');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
for(const file of ['render-progress-engine.js','render-progress-integration.js','render-progress-bridge.js']){
  assert.ok(bootstrap.includes(file),`${file} debe cargarse desde feature-bootstrap.js`);
}

console.log('render progress QA: ok');
