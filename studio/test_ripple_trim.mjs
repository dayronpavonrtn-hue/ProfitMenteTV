import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync(new URL('./ripple-trim-engine.js',import.meta.url),'utf8'));
const E=new globalThis.ProfitMenteRippleTrimEngine();
const close=(a,b,m='')=>assert.ok(Math.abs(a-b)<1e-9,m||`${a} != ${b}`);

// Shorten an edit from the right and close only the selected track's resulting gap.
const p={duration:12,clips:[
  {id:'a',track:0,start:1,duration:4},
  {id:'b',track:0,start:5,duration:2},
  {id:'c',track:1,start:5,duration:2}
]};
let r=E.trimRight(p,'a',3);assert.equal(r.ok,true);assert.equal(r.side,'right');close(r.shift,2);assert.equal(r.moved,1);close(p.clips[0].duration,2);close(p.clips[1].start,3);close(p.clips[2].start,5);close(p.duration,12,'explicit sequence padding must be preserved');

// Ripple trim from the left advances source media, keeps the edit anchored, and closes downstream time only on that track.
const left={duration:7,clips:[
  {id:'a',track:0,start:1,duration:4,sourceOffset:2,speed:1.5},
  {id:'b',track:0,start:5,duration:2},
  {id:'c',track:1,start:5,duration:2}
]};
r=E.trimLeft(left,'a',3);assert.equal(r.ok,true);assert.equal(r.side,'left');close(r.shift,2);close(left.clips[0].start,1);close(left.clips[0].duration,2);close(left.clips[0].sourceOffset,5);close(left.clips[1].start,3);close(left.clips[2].start,5);close(left.duration,7,'content on other tracks must preserve the global sequence end');

// Missing sourceOffset/speed use safe editor defaults.
const defaults={duration:6,clips:[{id:'a',track:0,start:0,duration:4},{id:'b',track:0,start:4,duration:2}]};
r=E.trimLeft(defaults,'a',1);assert.equal(r.ok,true);close(defaults.clips[0].sourceOffset,1);close(defaults.clips[0].duration,3);close(defaults.clips[1].start,3);close(defaults.duration,5);

// If project duration follows content, ripple trim shrinks the sequence to the new max end.
const edge={duration:7,clips:[{id:'a',track:0,start:1,duration:4},{id:'b',track:0,start:5,duration:2}]};
r=E.trimRight(edge,'a',3);assert.equal(r.ok,true);close(edge.clips[1].start,3);close(edge.duration,5);

// Absolute word timings remain synchronized for both right trim and followers.
const words={duration:8,clips:[
  {id:'cap1',track:3,start:0,duration:4,wordTimings:[{word:'uno',start:.2,end:1},{word:'dos',start:2.5,end:3.8}]},
  {id:'cap2',track:3,start:4,duration:2,wordTimings:[{word:'tres',start:4.2,end:4.8,duration:.6}]}
]};
r=E.trimRight(words,'cap1',3);assert.equal(r.ok,true);assert.equal(words.clips[0].wordTimings.length,2);close(words.clips[0].wordTimings[1].end,3);close(words.clips[1].start,3);close(words.clips[1].wordTimings[0].start,3.2);close(words.clips[1].wordTimings[0].end,3.8);close(words.clips[1].wordTimings[0].duration,.6);

// Left trim removes elapsed words and shifts surviving absolute caption timing with the edit.
const leftWords={duration:6,clips:[
  {id:'cap1',track:3,start:0,duration:4,wordTimings:[{word:'uno',start:.2,end:1},{word:'dos',start:2.5,end:3.8}]},
  {id:'cap2',track:3,start:4,duration:2,wordTimings:[{word:'tres',start:4.2,end:4.8,duration:.6}]}
]};
r=E.trimLeft(leftWords,'cap1',2);assert.equal(r.ok,true);assert.equal(leftWords.clips[0].wordTimings.length,1);close(leftWords.clips[0].wordTimings[0].start,.5);close(leftWords.clips[0].wordTimings[0].end,1.8);close(leftWords.clips[1].start,2);close(leftWords.clips[1].wordTimings[0].start,2.2);close(leftWords.clips[1].wordTimings[0].end,2.8);

// Fades are clamped to the new clip duration on either edge.
const fades={duration:4,clips:[{id:'a',track:5,start:0,duration:4,fadeIn:3,fadeOut:'3'}]};
r=E.trimRight(fades,'a',1);assert.equal(r.ok,true);close(fades.clips[0].fadeIn,1);close(fades.clips[0].fadeOut,1);
const leftFades={duration:4,clips:[{id:'a',track:5,start:0,duration:4,fadeIn:3,fadeOut:'3'}]};
r=E.trimLeft(leftFades,'a',3);assert.equal(r.ok,true);close(leftFades.clips[0].fadeIn,1);close(leftFades.clips[0].fadeOut,1);

// Locked followers make the whole edit fail atomically.
const locked={duration:7,clips:[{id:'a',track:0,start:1,duration:4},{id:'b',track:0,start:5,duration:2,locked:true}]};
let before=JSON.stringify(locked);r=E.trimRight(locked,'a',3);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(locked),before);
const lockedLeft={duration:7,clips:[{id:'a',track:0,start:1,duration:4},{id:'b',track:0,start:5,duration:2,locked:true}]};
before=JSON.stringify(lockedLeft);r=E.trimLeft(lockedLeft,'a',3);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(lockedLeft),before);
const trackLocked={duration:7,trackState:{0:{locked:true}},clips:[{id:'a',track:0,start:1,duration:4},{id:'b',track:0,start:5,duration:2}]};
before=JSON.stringify(trackLocked);r=E.trimRight(trackLocked,'a',3);assert.equal(r.ok,false);assert.equal(r.reason,'locked');assert.equal(JSON.stringify(trackLocked),before);

// Truthy strings are not locks, and legacy numeric aliases remain compatible.
const aliases={duration:'7',trackState:{'00':{locked:'true'}},clips:[{id:7,track:'00',start:'1',duration:'4',locked:'true'},{id:8,track:0,start:'5',duration:'2'}]};
r=E.trimRight(aliases,'7','3');assert.equal(r.ok,true);close(aliases.clips[0].duration,2);close(aliases.clips[1].start,3);close(aliases.duration,5);
const leftAliases={duration:'7',clips:[{id:7,track:'00',start:'1',duration:'4',sourceOffset:'2',speed:'2'},{id:8,track:0,start:'5',duration:'2'}]};
r=E.trimLeft(leftAliases,'7','3');assert.equal(r.ok,true);close(leftAliases.clips[0].sourceOffset,6);close(leftAliases.clips[1].start,3);close(leftAliases.duration,5);

// Coercible IDs/numerics must never masquerade as valid editor values.
for(const badId of [true,[],[7],{},new Number(7),Symbol('7')]){
  const q={duration:5,clips:[{id:7,track:0,start:0,duration:5}]};before=JSON.stringify(q);r=E.trimRight(q,badId,3);assert.equal(r.ok,false);assert.equal(JSON.stringify(q),before);r=E.trimLeft(q,badId,2);assert.equal(r.ok,false);assert.equal(JSON.stringify(q),before);
}
for(const badAt of [true,[],[3],{},new Number(3),Symbol('3')]){
  const q={duration:5,clips:[{id:'a',track:0,start:0,duration:5}]};before=JSON.stringify(q);r=E.trimRight(q,'a',badAt);assert.equal(r.ok,false);assert.equal(JSON.stringify(q),before);r=E.trimLeft(q,'a',badAt);assert.equal(r.ok,false);assert.equal(JSON.stringify(q),before);
}

// Corrupt timings/duration/source metadata fail before any mutation.
const corruptClip={duration:7,clips:[{id:'a',track:0,start:1,duration:4},{id:'b',track:0,start:{valueOf(){return 5}},duration:2}]};
before=JSON.stringify(corruptClip);r=E.trimRight(corruptClip,'a',3);assert.equal(r.ok,false);assert.equal(r.reason,'invalid-clip-window');assert.equal(JSON.stringify(corruptClip),before);
const corruptProject={duration:{valueOf(){return 7}},clips:[{id:'a',track:0,start:1,duration:4}]};
r=E.trimRight(corruptProject,'a',3);assert.equal(r.ok,false);assert.equal(r.reason,'invalid');
const corruptWords={duration:6,clips:[{id:'a',track:3,start:0,duration:4,wordTimings:[{word:'bad',start:{valueOf(){return 1}},end:2}]},{id:'b',track:3,start:4,duration:2}]};
before=JSON.stringify(corruptWords);r=E.trimLeft(corruptWords,'a',2);assert.equal(r.ok,false);assert.equal(r.reason,'invalid-word-timing');assert.equal(JSON.stringify(corruptWords),before);
for(const [field,value,reason] of [['speed',true,'invalid-speed'],['speed',0,'invalid-speed'],['sourceOffset',false,'invalid-source-offset'],['sourceOffset',-1,'invalid-source-offset']]){
  const q={duration:5,clips:[{id:'a',track:0,start:0,duration:5,[field]:value}]};before=JSON.stringify(q);r=E.trimLeft(q,'a',2);assert.equal(r.ok,false);assert.equal(r.reason,reason);assert.equal(JSON.stringify(q),before);
}

// Duplicate canonical IDs are rejected instead of editing an arbitrary clip.
const dup={duration:5,clips:[{id:7,track:0,start:0,duration:4},{id:'07.0',track:1,start:0,duration:4}]};
r=E.trimRight(dup,'7',3);assert.equal(r.ok,false);assert.equal(r.reason,'ambiguous-id');r=E.trimLeft(dup,'7',2);assert.equal(r.ok,false);assert.equal(r.reason,'ambiguous-id');

console.log('bidirectional ripple trim tests passed');