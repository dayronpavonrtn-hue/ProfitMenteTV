import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Guard=require('./generator-transaction-guard.js');

{
  const project={name:'Antes',duration:45,clips:[{id:'a',track:0,start:0,duration:5}],settings:{format:'9:16'}};
  const result=Guard.run(project,()=>{
    project.name='Generado';
    project.duration=60;
    project.clips.push({id:'b',track:0,start:5,duration:5});
    project.settings.format='16:9';
    project.transient='no debe quedar';
    throw new Error('fallo de asignación de medios');
  });
  assert.equal(result.ok,false);
  assert.equal(result.error.message,'fallo de asignación de medios');
  assert.deepEqual(project,{name:'Antes',duration:45,clips:[{id:'a',track:0,start:0,duration:5}],settings:{format:'9:16'}});
}

{
  const project={name:'Antes',clips:[]};
  const value={assigned:3};
  const result=Guard.run(project,()=>{project.name='Después';project.clips.push({id:'x'});return value});
  assert.equal(result.ok,true);
  assert.equal(result.value,value);
  assert.deepEqual(project,{name:'Después',clips:[{id:'x'}]});
}

{
  const project={keep:true,removeMe:true,nested:{value:1}};
  const result=Guard.run(project,()=>{delete project.removeMe;project.nested.value=9;throw new Error('rollback')});
  assert.equal(result.ok,false);
  assert.deepEqual(project,{keep:true,removeMe:true,nested:{value:1}});
}

assert.throws(()=>Guard.run(null,()=>{}),/Proyecto inválido/);
assert.throws(()=>Guard.run({},null),/Operación de generación inválida/);
console.log('generator transaction guard: ok');
