import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const preview=fs.readFileSync(new URL('./preview-engine.js',import.meta.url),'utf8');
const render=fs.readFileSync(new URL('./render_mp4.py',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('./transition-duration.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

assert.match(preview,/function transitionDuration\(c,duration\)/,'preview must expose transition duration normalization');
assert.match(preview,/td=transitionDuration\(c,duration\)/,'preview must use editable transition duration');
assert.match(render,/def transition_duration\(clip,d\):/,'renderer must normalize editable transition duration');
assert.match(render,/clip\.get\('transitionDuration'\) is not None else fallback/,'renderer must fall back when automatic duration is unset');
assert.match(render,/td=transition_duration\(clip,d\)/,'renderer visual chain must use editable duration');
assert.match(render,/td=transition_duration\(c,d\)/,'slide overlay must use editable duration');
assert.match(ui,/Rápida 0\.15s/);assert.match(ui,/Suave 0\.45s/);assert.match(ui,/Automática/);
assert.match(ui,/transitionDurationAuto/,'automatic transition mode must remain distinguishable from manual values');
assert.match(ui,/let added=0/,'QA extension must only penalize newly-added transition errors');
assert.match(html,/transition-duration\.js/,'Studio must load transition duration controls');

const context={project:{clips:[]},document:{querySelector:()=>null},console};
context.window=context;
context.__profitmenteFeatureBootstrap=true;
vm.runInContext(ui,vm.createContext(context));
const core=context.ProfitMenteTransitionDuration;
assert.ok(core,'transition timing core must be available without rendering the properties UI');

assert.equal(core.automaticValue({duration:2}),0.24,'2s clip should resolve to 12% automatic transition');
assert.equal(core.automaticValue({duration:5}),0.28,'automatic transition must respect the 0.28s ceiling');
assert.equal(core.automaticValue({duration:.2}),0.08,'short clips should use the automatic 0.08s floor when possible');
assert.equal(core.normalize({duration:2}),0.24,'missing duration must use automatic timing, not Number(undefined)');
assert.equal(core.normalize({duration:2,transitionDuration:null}),0.24,'null duration must stay automatic');
assert.equal(core.normalize({duration:2,transitionDuration:'   '}),0.24,'blank legacy duration must stay automatic');
assert.equal(core.normalize({duration:2,transitionDuration:.45}),0.45,'explicit manual duration must be preserved');
assert.equal(core.normalize({duration:2,transitionDuration:.45,transitionDurationAuto:true}),0.24,'auto flag must override stale persisted numeric timing');

const auto={track:0,transition:'fade',duration:2};
assert.equal(core.syncAutomatic(auto),true);
assert.equal(auto.transitionDurationAuto,true);
assert.equal(auto.transitionDuration,0.24,'automatic timing must be materialized so preview and renderer receive the same value');
auto.duration=1;
assert.equal(core.syncAutomatic(auto),true);
assert.equal(auto.transitionDuration,0.12,'automatic timing must adapt after a trim/duration change');
const manual={track:1,transition:'slide',duration:2,transitionDuration:.4,transitionDurationAuto:false};
assert.equal(core.syncAutomatic(manual),false,'manual transition timing must never be overwritten');
assert.equal(manual.transitionDuration,.4);

console.log('Transition duration integration + automatic parity OK');
