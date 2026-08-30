import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const Engine=require('./preview-format-engine.js');

assert.deepEqual(Engine.dimensions('9:16','full'),{width:540,height:960,format:'9:16',quality:'full',aspect:540/960});
assert.deepEqual(Engine.dimensions('16:9','full'),{width:960,height:540,format:'16:9',quality:'full',aspect:960/540});
assert.deepEqual(Engine.dimensions('1:1','full'),{width:720,height:720,format:'1:1',quality:'full',aspect:1});
assert.equal(Engine.dimensions('16:9','draft').width,480);
assert.equal(Engine.dimensions('16:9','balanced').height,360);
assert.equal(Engine.dimensions('bad-format','full').format,'9:16');
assert.equal(Engine.dimensions('1:1','bad-quality').quality,'full');

const canvas={width:540,height:960,dataset:{}};
let r=Engine.apply(canvas,'16:9','balanced');
assert.equal(r.changed,true);
assert.equal(canvas.width,640);
assert.equal(canvas.height,360);
assert.equal(canvas.dataset.projectFormat,'16:9');
assert.equal(canvas.dataset.previewQuality,'balanced');
r=Engine.apply(canvas,'16:9','balanced');
assert.equal(r.changed,false);

assert.deepEqual(Engine.exportDimensions('9:16'),{width:1080,height:1920});
assert.deepEqual(Engine.exportDimensions('16:9'),{width:1920,height:1080});
assert.deepEqual(Engine.exportDimensions('1:1'),{width:1080,height:1080});

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(bootstrap,/preview-format-engine\.js/);
assert.match(bootstrap,/preview-format-integration\.js/);
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
assert.match(app,/canvas\.captureStream\(30\)/,'WebM must capture the format-aware canvas');
const integration=fs.readFileSync(new URL('./preview-format-integration.js',import.meta.url),'utf8');
assert.match(integration,/ProfitMentePreviewFormatEngine\.apply\(canvas,currentFormat\(\),'full'\)/,'WebM must force full monitor resolution during capture');
assert.match(integration,/profitmente-preview-quality/);
console.log('preview format regression: ok');
