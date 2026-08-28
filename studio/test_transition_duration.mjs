import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

assert.match(preview,/function transitionDuration\(c,duration\)/,'preview must expose transition duration normalization');
assert.match(preview,/td=transitionDuration\(c,duration\)/,'preview must use editable transition duration');
assert.match(render,/def transition_duration\(clip,d\):/,'renderer must normalize editable transition duration');
assert.match(render,/td=transition_duration\(clip,d\)/,'renderer visual chain must use editable duration');
assert.match(render,/td=transition_duration\(c,d\)/,'slide overlay must use editable duration');
assert.match(ui,/Rápida 0\.15s/);assert.match(ui,/Suave 0\.45s/);assert.match(ui,/Automática/);
assert.match(ui,/let added=0/,'QA extension must only penalize newly-added transition errors');
assert.match(html,/transition-duration\.js/,'Studio must load transition duration controls');
console.log('Transition duration integration OK');
