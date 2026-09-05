import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ProfitMenteGeneratorAutoFill=require('./generator-autofill.js');
const helper=new ProfitMenteGeneratorAutoFill({});

assert.equal(helper.mediaKey(7),helper.mediaKey('007'));
assert.equal(helper.mediaKey('7.0'),helper.mediaKey('+07.000'));
assert.equal(helper.mediaKey(-0),helper.mediaKey('0'));
assert.equal(helper.mediaKey('  asset-A  '),'s:asset-A');
assert.notEqual(helper.mediaKey('asset-A'),helper.mediaKey('Asset-A'));
assert.equal(helper.mediaKey(true),null,'boolean values are not valid media identities');

const assets=[
  {id:'007',type:'video'},
  {id:'+08.0',type:'image'},
  {id:0,type:'audio'},
  {id:'asset-A',type:'audio'}
];
const imported=helper.assetsFromIds(assets,[7,'8', '-0']);
assert.deepEqual(imported.map(asset=>asset.id),['007','+08.0',0],
  'generator media-import events must resolve legacy numeric aliases exactly like preview/QA');

const assignedAlias={mode:'Automático',clips:[{track:0,asset:'0007.0'}]};
assert.equal(helper.missing(assignedAlias),0,'canonical numeric media aliases must count as assigned');

console.log('generator media identity tests passed');
