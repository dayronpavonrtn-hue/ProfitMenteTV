const assert = require('node:assert/strict');

// Minimal browser harness for timeline-magnet.js.
global.window = global;
global.assets = [];
global.names = ['Visual 1', 'Visual 2', 'Visual 3', 'Captions', 'Voice', 'Music', 'SFX'];
global.ProfitMenteGroupDragEngine = function ProfitMenteGroupDragEngine() {};
global.document = {
  querySelector(selector) {
    if (selector === '#playhead') return { value: '0' };
    return null;
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  elementFromPoint() { return null; },
  createElement() { return {}; },
  head: { appendChild() {} }
};

global.project = {
  duration: 20,
  clips: [],
  trackState: {},
  trackStates: {},
  markers: []
};

require('../timeline-magnet.js');
const api = global.ProfitMenteTimelineMagnet;
assert.ok(api, 'timeline magnet API must be exposed');

function reset() {
  global.project.duration = 20;
  global.project.clips = [];
  global.project.trackState = {};
  global.project.trackStates = {};
  global.project.markers = [];
}

// Imported string/number values must never behave like boolean locks.
for (const value of ['false', 'true', 0, 1, null, undefined]) {
  reset();
  const clip = { id: `clip-${String(value)}`, start: 1, duration: 2, track: 0, locked: value };
  global.project.clips = [clip];
  assert.equal(api.clipLocked(clip), false, `clip locked=${String(value)} must not lock`);
  const result = api.applySingleMove(clip, 4, 1);
  assert.equal(result.blocked, false, `clip locked=${String(value)} must remain editable`);
  assert.equal(clip.start, 4);
  assert.equal(clip.track, 1);
}

// Both modern and legacy track-state containers use strict booleans.
for (const container of ['trackState', 'trackStates']) {
  for (const value of ['false', 'true', 0, 1, null]) {
    reset();
    global.project[container] = { 0: { locked: value } };
    const clip = { id: `${container}-${String(value)}`, start: 1, duration: 2, track: 0 };
    global.project.clips = [clip];
    assert.equal(api.trackLocked(0), false, `${container}.locked=${String(value)} must not lock`);
    assert.equal(api.applySingleMove(clip, 5).blocked, false);
  }
}

// Actual boolean true remains protective.
reset();
let clip = { id: 'clip-true', start: 1, duration: 2, track: 0, locked: true };
global.project.clips = [clip];
assert.equal(api.clipLocked(clip), true);
assert.equal(api.applySingleMove(clip, 6).blocked, true);
assert.equal(clip.start, 1);

reset();
clip = { id: 'track-true', start: 1, duration: 2, track: 0 };
global.project.clips = [clip];
global.project.trackState = { 0: { locked: true } };
assert.equal(api.trackLocked(0), true);
assert.equal(api.applySingleMove(clip, 6).blocked, true);
assert.equal(clip.start, 1);

// A locked destination track blocks only the track change, not horizontal movement.
reset();
clip = { id: 'destination-lock', start: 1, duration: 2, track: 0, locked: 'false' };
global.project.clips = [clip];
global.project.trackStates = { 1: { locked: true } };
const moved = api.applySingleMove(clip, 7, 1);
assert.equal(moved.blocked, false);
assert.equal(clip.start, 7);
assert.equal(clip.track, 0);

console.log('timeline lock strict-flags regression: ok');
