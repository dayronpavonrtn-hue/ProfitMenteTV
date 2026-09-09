import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSubtitleImportEngine:Engine}=require('./subtitle-import-engine.js');

const srt=`1\n00:00:01,000 --> 00:00:03,250\nHola mundo\n\n2\n00:00:04.000 --> 00:00:05.500\nSegunda línea`;
const a=Engine.parse(srt);
assert.equal(a.length,2);assert.equal(a[0].start,1);assert.equal(a[0].duration,2.25);assert.equal(a[1].text,'Segunda línea');

const vtt=`WEBVTT\n\nNOTE prueba\nignorar\n\ncue-a\n00:00:07.000 --> 00:00:08.500 align:start\n<b>Texto</b> VTT`;
const b=Engine.parse(vtt);assert.equal(b.length,1);assert.equal(b[0].start,7);assert.equal(b[0].text,'Texto VTT');

const bad=`1\n00:00:05,000 --> 00:00:04,000\nmal\n\n2\n99:99:99 --> 99:99:100\npeor`;
assert.equal(Engine.parse(bad).length,0);

const unordered=`2\n00:00:10,000 --> 00:00:11,000\nB\n\n1\n00:00:02,000 --> 00:00:03,000\nA`;
const c=Engine.clips(unordered);assert.deepEqual(c.map(x=>x.name),['A','B']);assert.ok(c.every(x=>x.track===3&&x.importedSubtitle===true&&x.duration>0));
console.log('subtitle import regression: ok');
