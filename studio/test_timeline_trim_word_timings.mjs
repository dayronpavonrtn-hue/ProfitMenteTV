import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteTimelineLeftTrimEngine:L}=require('./timeline-left-trim.js');
const {ProfitMenteTimelineRightTrimEngine:R}=require('./timeline-right-trim.js');

const words=[
  {word:'zero',start:1,end:2,duration:1},
  {word:'cross-left',start:2.5,end:3.5,duration:1},
  {word:'middle',start:4,end:5,duration:1},
  {word:'cross-right',start:5.5,end:6.5,duration:1},
  {word:'late',start:7,end:8,duration:1}
];

let trimmed=L.trimWordTimings(words,3,7);
assert.deepEqual(trimmed.map(x=>x.word),['cross-left','middle','cross-right']);
assert.deepEqual(trimmed.map(x=>[x.start,x.end,x.duration]),[[3,3.5,.5],[4,5,1],[5.5,6.5,1]]);
assert.deepEqual(words[1],{word:'cross-left',start:2.5,end:3.5,duration:1},'trim helper must not mutate the drag-session snapshot');

trimmed=R.trimWordTimings(words,1,6);
assert.deepEqual(trimmed.map(x=>x.word),['zero','cross-left','middle','cross-right']);
assert.deepEqual(trimmed.at(-1),{word:'cross-right',start:5.5,end:6,duration:.5});

const shrunk=L.trimWordTimings(words,4,7);
const expanded=L.trimWordTimings(words,2,7);
assert.equal(shrunk.some(x=>x.word==='cross-left'),false);
assert.equal(expanded.some(x=>x.word==='cross-left'),true,'re-expanding during the same drag must restore words from the original snapshot');
assert.equal(L.trimWordTimings(null,2,7),null);
assert.deepEqual(R.trimWordTimings(words,7,7),[]);
console.log('timeline trim word timing regression: ok');
