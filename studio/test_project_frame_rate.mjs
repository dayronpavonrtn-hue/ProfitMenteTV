import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Engine=require('./project-frame-rate-engine.js');

assert.equal(Engine.normalize(24),24);
assert.equal(Engine.normalize('30'),30);
assert.equal(Engine.normalize(60),60);
assert.equal(Engine.normalize(25),30);
assert.equal(Engine.normalize(undefined),30);
assert.equal(Engine.frameDuration(24),1/24);
assert.equal(Engine.frameCount(1,24),24);
assert.equal(Engine.frameCount(1,60),60);
assert.equal(Engine.frameCount(1.01,30),31);
const project={name:'FPS test'};
assert.equal(Engine.apply(project,60),60);
assert.equal(project.fps,60);
assert.equal(Engine.apply(project,48),60,'invalid change preserves supported project fallback');

const transport=fs.readFileSync(new URL('./transport-engine.js',import.meta.url),'utf8');
assert.match(transport,/1\/fps\(\)/,'transport must step by the project frame duration');
assert.doesNotMatch(transport,/const FPS=30/,'transport must not force 30 FPS');

const webm=fs.readFileSync(new URL('./webm-render-integration.js',import.meta.url),'utf8');
assert.match(webm,/framePlan\(renderProject\?\.duration,projectFps\(renderProject\)\)/,'WebM must use project FPS');
assert.match(webm,/captureStream\(plan\.fps\)/,'WebM capture stream must use the planned FPS');

const mp4=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');
assert.match(mp4,/fps=fps if fps in \(24,30,60\) else 30/,'MP4 must normalize supported FPS');
assert.match(mp4,/\'-r\',str\(fps\)/,'FFmpeg output must use project FPS');
assert.match(mp4,/actual_fps=rate_value/,'post-render QA must inspect output FPS');
assert.doesNotMatch(mp4,/fps=30'/,'visual filter must not force 30 FPS');

const bootstrap=fs.readFileSync(new URL('./feature-bootstrap.js',import.meta.url),'utf8');
assert.match(bootstrap,/project-frame-rate-engine\.js/);
assert.match(bootstrap,/project-frame-rate-integration\.js/);
console.log('project frame rate regression: ok');
