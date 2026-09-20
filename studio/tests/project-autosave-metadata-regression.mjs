import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ProfitMenteProjectAutosaveEngine: Engine}=require('../project-autosave.js');

assert.equal(Engine.fields({name:'  Demo  '}).name,'Demo','project names should be normalized');
assert.equal(Engine.fields({name:{bad:true}}).name,'Nuevo video','non-string project names must not leak into UI/persistence');
assert.equal(Engine.fields({name:['bad']}).name,'Nuevo video','array project names must not leak into UI/persistence');
assert.equal(Engine.merge({name:'Actual'},{name:{bad:true}}).name,'Actual','invalid edited names must preserve the current canonical name');
assert.equal(Engine.merge({name:'Actual'},{name:'   '}).name,'Actual','blank edited names must preserve the current canonical name');
console.log('project autosave metadata regression: PASS');
