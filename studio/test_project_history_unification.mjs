import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ProfitMenteProjectHistoryEngine=require('./project-history-engine.js');

function project(name){return {version:'1.3',name,mode:'Manual',duration:30,format:'9:16',fps:30,clips:[]}}

// Core invariant: reset is a hard boundary between projects.
{
  const engine=new ProfitMenteProjectHistoryEngine(project('A'),{limit:20});
  const edited=project('A editado');
  assert.equal(engine.commit(edited),true);
  assert.equal(engine.state().undo,1);
  engine.reset(project('B'));
  assert.deepEqual(engine.state(),{undo:0,redo:0,limit:20});
  assert.equal(engine.undo(),null);
  assert.equal(engine.redo(),null);
}

// Browser integration regression: prefer the storage-only originalPersist instead
// of the legacy history wrapper, and mirror legacy bundle seed into the canonical
// advanced engine.
{
  const source=fs.readFileSync(new URL('./project-history-integration.js',import.meta.url),'utf8');
  const listeners=new Map();
  const buttons={
    '#undoBtn':{disabled:false,onclick:null,title:''},
    '#redoBtn':{disabled:false,onclick:null,title:''},
    '#playhead':{value:'0'}
  };
  let baseWrites=0,legacyWrites=0,legacySeeds=0,lastStatus='';
  const context={
    console,
    ProfitMenteProjectHistoryEngine,
    project:project('A'),
    persist(){legacyWrites++},
    originalPersist(){baseWrites++},
    historyEngine:{seed(){legacySeeds++}},
    setStatus(value){lastStatus=value},
    syncForm(){},drawTimeline(){},renderAt(){},
    requestAnimationFrame(fn){fn();return 1},
    document:{
      body:{appendChild(){}},
      querySelector(selector){return buttons[selector]||null},
      createElement(){return {className:'',innerHTML:'',appendChild(){}}},
      addEventListener(type,fn){listeners.set('document:'+type,fn)}
    },
    addEventListener(type,fn){listeners.set('window:'+type,fn)}
  };
  context.window=context;
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'project-history-integration.js'});

  assert.ok(context.ProfitMenteProjectHistory,'advanced history API must initialize');
  context.project.name='A editado';
  context.persist();
  assert.equal(baseWrites,1,'canonical persist must reach storage base exactly once');
  assert.equal(legacyWrites,0,'legacy history wrapper must be bypassed');
  assert.equal(context.ProfitMenteProjectHistory.engine.state().undo,1);

  context.project=project('B');
  context.historyEngine.seed(context.project);
  assert.equal(legacySeeds,1,'legacy bundle seed remains compatible');
  assert.deepEqual(context.ProfitMenteProjectHistory.engine.state(),{undo:0,redo:0,limit:80});
  context.ProfitMenteProjectHistory.undo();
  assert.equal(context.project.name,'B','undo must not cross the bundle/project boundary');
  assert.equal(lastStatus,'No hay cambios para deshacer');

  context.project.name='B editado';
  context.persist();
  assert.equal(context.ProfitMenteProjectHistory.engine.state().undo,1);
  const opened=listeners.get('window:profitmente:project-opened');
  assert.equal(typeof opened,'function');
  context.project=project('C');
  opened({detail:{name:'C'}});
  assert.deepEqual(context.ProfitMenteProjectHistory.engine.state(),{undo:0,redo:0,limit:80});
  context.ProfitMenteProjectHistory.undo();
  assert.equal(context.project.name,'C','project-opened must establish a hard history boundary');
}

console.log('ProfitMente Studio project history unification regression: OK');