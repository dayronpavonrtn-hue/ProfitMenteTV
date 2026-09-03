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
assert.equal(h.commit(null),false,'null snapshots must not corrupt live project history');
assert.equal(h.commit([]),false,'array snapshots must not be accepted as projects');

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

const stable=h.exportState();
assert.equal(h.importState({undoStack:[],redoStack:[],current:null}),false,'malformed transaction snapshots must be rejected');
assert.deepEqual(h.exportState(),stable,'rejected history import must not mutate current history');
assert.equal(h.importState({undoStack:[null],redoStack:[],current:base}),false,'corrupt undo entries must be rejected atomically');
assert.deepEqual(h.exportState(),stable,'corrupt undo entries must leave live history untouched');
assert.equal(h.importState({undoStack:[],redoStack:[[]],current:base}),false,'corrupt redo entries must be rejected atomically');
assert.deepEqual(h.exportState(),stable,'corrupt redo entries must leave live history untouched');
assert.equal(h.importState({undoStack:[],redoStack:[],current:[]}),false,'array current snapshots must be rejected');
assert.deepEqual(h.exportState(),stable,'invalid current snapshot must leave live history untouched');

const huge=new History(base,{limit:Infinity});
assert.equal(huge.state().limit,80,'non-finite constructor limits must fall back safely');
assert.equal(huge.importState({limit:1e9,undoStack:Array.from({length:510},(_,i)=>({...base,name:`P${i}`})),redoStack:[],current:base}),true);
assert.equal(huge.state().limit,500,'imported history limits must be bounded to avoid unbounded memory growth');
assert.equal(huge.state().undo,500,'import must trim oversized undo stacks to the bounded limit');

h.reset(base);
assert.deepEqual(h.state(),{undo:0,redo:0,limit:5});
console.log('project history regression: ok');
