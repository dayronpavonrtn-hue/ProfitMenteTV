import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const History=require('./project-history-engine.js');

const base={version:'1.3',name:'A',duration:30,clips:[{id:'v1',track:0,start:0,duration:5}]};
const h=new History(base,{limit:5});
assert.equal(h.canUndo(),false);
assert.equal(h.canRedo(),false);

const p1=structuredClone(base);p1.clips[0].start=2;
assert.equal(h.commit(p1),true);
assert.equal(h.state().undo,1);
assert.equal(h.commit(structuredClone(p1)),false,'identical snapshots must not create history');

const p2=structuredClone(p1);p2.clips.push({id:'a1',track:6,start:0,duration:8});
h.commit(p2);
assert.equal(h.undo().clips.length,1);
assert.equal(h.canRedo(),true);
assert.equal(h.redo().clips.length,2);

h.undo();
const branch=structuredClone(p1);branch.name='Branch';
h.commit(branch);
assert.equal(h.canRedo(),false,'a new edit after undo must invalidate redo');

for(let i=0;i<7;i++){const p=structuredClone(branch);p.duration=31+i;h.commit(p)}
assert.equal(h.state().undo,5,'history must enforce its memory limit');

const detached=h.undo();detached.name='mutated outside';
assert.notEqual(h.current.name,'mutated outside','returned snapshots must be defensive clones');

const transactionState=h.exportState();
const beforeTransaction=structuredClone(transactionState);
const partial=structuredClone(h.current);partial.name='partial automation';
h.commit(partial);
assert.notDeepEqual(h.exportState(),beforeTransaction,'partial automation should change history before rollback');
assert.equal(h.importState(transactionState),true,'valid transaction snapshot must restore history');
assert.deepEqual(h.exportState(),beforeTransaction,'restored history must exactly match the pre-automation state');
transactionState.current.name='mutated snapshot';
assert.notEqual(h.current.name,'mutated snapshot','exported state must be a defensive clone');
assert.equal(h.importState({undoStack:[],redoStack:[],current:null}),false,'malformed transaction snapshots must be rejected');
assert.deepEqual(h.exportState(),beforeTransaction,'rejected history import must not mutate current history');

h.reset(base);
assert.deepEqual(h.state(),{undo:0,redo:0,limit:5});
console.log('project history regression: ok');
