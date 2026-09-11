const assert=require('assert');
const Engine=require('./source-window-engine.js');
const close=(a,b)=>Math.abs(a-b)<1e-9;

let r=Engine.normalize({duration:8,speed:2,sourceOffset:1},{duration:10},{projectRemaining:20,edited:'speed'});
assert(close(r.duration,4.5),'speed increase must shorten timeline duration to available source');
assert(close(r.sourceOffset,1));
assert(close(r.sourceEnd,10));
assert(r.limitedBySource);

r=Engine.normalize({duration:6,speed:1,sourceOffset:8},{duration:10},{projectRemaining:20,edited:'sourceOffset'});
assert(close(r.sourceOffset,4),'slip must clamp so the full clip still fits');
assert(close(r.duration,6));
assert(close(r.sourceEnd,10));

r=Engine.normalize({duration:20,speed:.5,sourceOffset:2},{duration:8},{projectRemaining:30,edited:'duration'});
assert(close(r.duration,12),'duration edit must stop at end of source at current speed');
assert(close(r.sourceEnd,8));

r=Engine.normalize({duration:8,speed:1,sourceOffset:0},{duration:60},{projectRemaining:5,edited:'duration'});
assert(close(r.duration,5),'project boundary must still be enforced');
assert(!r.limitedBySource);

r=Engine.normalize({duration:3,speed:'99',sourceOffset:-5},{duration:20},{projectRemaining:10,edited:'speed'});
assert(close(r.speed,4));
assert(close(r.sourceOffset,0));
assert(close(r.duration,3));

r=Engine.normalize({duration:2,speed:1,sourceOffset:0},{},{projectRemaining:1.25,edited:'duration'});
assert(close(r.duration,1.25),'unknown asset duration must not invent a source boundary');

console.log('Source window safety regression: OK');
