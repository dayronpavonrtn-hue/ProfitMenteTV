import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteSubtitleImportEngine:Engine}=require('./subtitle-import-engine.js');

const srt=`1\n00:00:01,000 --> 00:00:03,250\nHola mundo\n\n2\n00:00:04.000 --> 00:00:05.500\nSegunda línea`;
const a=Engine.parse(srt);
assert.equal(a.length,2);assert.equal(a[0].start,1);assert.equal(a[0].duration,2.25);assert.equal(a[1].text,'Segunda línea');

const vtt=`WEBVTT\n\nNOTE prueba\nignorar\n\nSTYLE\n::cue { color: lime; }\n\ncue-a\n00:00:07.000 --> 00:00:08.500 align:start\n<b>Texto</b> &amp; VTT`;
const b=Engine.parse(vtt);assert.equal(b.length,1);assert.equal(b[0].start,7);assert.equal(b[0].text,'Texto & VTT');

const bad=`1\n00:00:05,000 --> 00:00:04,000\nmal\n\n2\n99:99:99 --> 99:99:100\npeor\n\n3\n-1:00:00 --> 00:00:02,000\nnegativo`;
assert.equal(Engine.parse(bad).length,0);
assert.ok(Number.isNaN(Engine.time('-1:00:00')));
assert.ok(Number.isNaN(Engine.time('00:60:00')));
assert.equal(Engine.time('01:02.345'),62.345);
assert.equal(Engine.time('01:02:03,004'),3723.004);

const unordered=`2\n00:00:10,000 --> 00:00:11,000\nB\n\n1\n00:00:02,000 --> 00:00:03,000\nA`;
const c=Engine.clips(unordered);
assert.deepEqual(c.map(x=>x.name),['A','B']);
assert.ok(c.every(x=>x.track===3&&x.importedSubtitle===true&&x.duration>0));
assert.ok(c.every(x=>x.style==='dynamic'&&x.animation==='word-pulse'));
assert.ok(c.every(x=>!('wordTimings' in x)));

const customized=Engine.clips(srt,{style:'hook-pop',animation:'pop',track:99});
assert.ok(customized.every(x=>x.style==='hook-pop'&&x.animation==='pop'&&x.track===3));

const integration=fs.readFileSync(new URL('./subtitle-import-integration.js',import.meta.url),'utf8');
assert.ok(integration.includes("typeof persist==='function'"),'subtitle import must use Studio persist path');
assert.ok(integration.includes("typeof drawTimeline==='function'"),'subtitle import must refresh the real timeline');
assert.ok(integration.includes("typeof renderAt==='function'"),'subtitle import must refresh the real preview');
assert.ok(integration.includes('project.duration=Number(importedEnd.toFixed(3))'),'subtitle import must extend project duration when needed');
assert.ok(integration.includes('ProfitMenteEditLockGuard'),'subtitle import must honor caption-track locking');
assert.ok(!integration.includes('saveProject?.('),'stale undefined saveProject path must not return');
assert.ok(!integration.includes('renderTimeline?.('),'stale undefined renderTimeline path must not return');
console.log('subtitle import regression: ok');
