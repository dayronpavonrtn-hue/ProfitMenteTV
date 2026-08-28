import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {ProfitMenteColorGrade:g}=require('./color-grade-engine.js');
assert.deepEqual(g.normalize({brightness:999,contrast:-999,saturation:999,hue:-999}),{brightness:100,contrast:-90,saturation:200,hue:-180});
const clip={};g.applyPreset(clip,'vivid');assert.equal(clip.contrast,14);assert.equal(clip.saturation,28);
assert.match(g.cssFilter({brightness:10,contrast:20,saturation:-50,hue:15}),/brightness\(1.1\).*contrast\(1.2\).*saturate\(0.5\).*hue-rotate\(15deg\)/);
assert.equal(g.ffmpegFilter({brightness:-20,contrast:10,saturation:30,hue:-12}),'eq=brightness=-0.200:contrast=1.100:saturation=1.300,hue=h=-12.00');
console.log('Color grading engine OK');