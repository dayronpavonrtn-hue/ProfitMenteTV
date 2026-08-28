import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectResetEngine}=require('./project-reset-engine.js');

const engine=new ProfitMenteProjectResetEngine();
const oldProject={version:'1.3',name:'Trabajo importante',mode:'Automático',duration:61,format:'16:9',clips:[{id:'c1',track:0,start:0,duration:10}]};
const calls=[];
const recovery={capture(project,reason){calls.push({project:structuredClone(project),reason});return {id:'snap-1'}}};
const result=engine.reset(recovery,oldProject);

assert.equal(calls.length,1);
assert.equal(calls[0].reason,'antes de proyecto nuevo');
assert.deepEqual(calls[0].project,oldProject);
assert.equal(result.snapshot.id,'snap-1');
assert.deepEqual(result.project,{version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',clips:[]});
assert.deepEqual(oldProject.clips,[{id:'c1',track:0,start:0,duration:10}], 'reset must not mutate the current project');

const custom=engine.createBlank({name:'Prueba',mode:'Automático',duration:30,format:'1:1'});
assert.equal(custom.name,'Prueba');
assert.equal(custom.mode,'Automático');
assert.equal(custom.duration,30);
assert.equal(custom.format,'1:1');
assert.deepEqual(custom.clips,[]);

const withoutRecovery=engine.reset(null,oldProject);
assert.equal(withoutRecovery.snapshot,null);
assert.equal(withoutRecovery.project.name,'Nuevo video');
console.log('Safe project reset tests passed');
