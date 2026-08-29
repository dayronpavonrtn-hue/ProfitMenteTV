import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./render-error-engine.js');

const cases=[
  ['FFmpeg not found','ffmpeg_missing'],
  ['No space left on device','disk_full'],
  ['Missing media file clip-01.mp4','missing_media'],
  ['moov atom not found','media_decode'],
  ['Error while processing filter graph: Conversion failed','filter_graph'],
  ['Failed to fetch render status','local_connection'],
  ['El servidor terminó el MP4 sin superar el control de calidad post-render.','post_render_qa']
];
for(const [message,code] of cases){
  const d=Engine.diagnose(new Error(message));
  assert.equal(d.code,code,message);
  assert.ok(d.title.length>4);
  assert.ok(d.action.length>12);
}
assert.equal(Engine.diagnose(new Error('Failed to fetch')).retryable,true);
assert.equal(Engine.diagnose(new Error('Unknown failure')).retryable,false);
assert.match(Engine.format(new Error('No space left on device')),/espacio/i);
console.log('Render error diagnostics QA passed');
