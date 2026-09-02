import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const api=require('./track-lock-placement-guard.js');
assert.equal(api.trackLocked({trackState:{0:{locked:true}}},0),true);
assert.equal(api.trackLocked({trackState:{'3':{locked:true}}},3),true);
assert.equal(api.trackLocked({trackStates:{5:{locked:true}}},5),true);
assert.equal(api.canCreate({trackState:{1:{locked:false}}},1),true);
assert.equal(api.canCreate({},6),true);

const mixedLegacyLock={trackState:{1:{locked:false}},trackStates:{1:{locked:true}}};
assert.equal(api.trackLocked(mixedLegacyLock,1),true,'legacy lock must remain authoritative when current map says unlocked');
assert.equal(api.canCreate(mixedLegacyLock,1),false,'mixed state must never permit creation into a legacy-locked track');
assert.equal(api.state(mixedLegacyLock,1).locked,true,'merged state must expose the effective conservative lock');
const mixedCurrentLock={trackState:{2:{locked:true}},trackStates:{2:{locked:false}}};
assert.equal(api.trackLocked(mixedCurrentLock,2),true,'current lock must remain authoritative when legacy map says unlocked');
assert.equal(api.state(mixedCurrentLock,2).locked,true);

const source=fs.readFileSync(new URL('./track-lock-placement-guard.js',import.meta.url),'utf8');
let calls=0,lastStatus='';
const context={
  console,
  document:{},
  project:{trackState:{3:{locked:true},1:{locked:false}},trackStates:{1:{locked:true}}},
  setStatus:t=>{lastStatus=t},
  addClip:(track,name)=>{calls++;return {track,name}}
};
context.window=context;context.globalThis=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'track-lock-placement-guard.js'});

assert.equal(context.ProfitMenteTrackLockPlacementGuard.installed,true);
assert.equal(context.addClip(3,'caption'),null);
assert.equal(calls,0,'locked track must not call original addClip');
assert.match(lastStatus,/bloqueada/i);
assert.equal(context.addClip(1,'legacy-blocked-b-roll'),null,'installed guard must enforce legacy lock even when current state says unlocked');
assert.equal(calls,0);

context.project.trackStates[1].locked=false;
const created=context.addClip(1,'b-roll');
assert.equal(calls,1);
assert.equal(created.track,1);

context.project.trackState[1].locked=true;
assert.equal(context.addClip(1,'blocked-after-lock'),null,'guard must read current track state, not cached state');
assert.equal(calls,1);
console.log('Track lock placement guard regression passed');
