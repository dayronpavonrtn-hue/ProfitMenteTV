import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Metadata=require('./media-metadata-engine.js');
const {ProfitMenteSlipEditEngine}=require('./slip-edit-engine.js');

assert.equal(Metadata.finitePositive(true),null);
assert.equal(Metadata.finitePositive([]),null);
assert.equal(Metadata.finitePositive({}),null);
assert.equal(Metadata.finitePositive('12.5'),12.5);
assert.equal(Metadata.kind({mime:'video/mp4'}),'video');
assert.equal(Metadata.kind({type:'audio'}),'audio');

assert.deepEqual(
  Metadata.metadataFromElement('video',{duration:12.3456789,videoWidth:1920,videoHeight:1080}),
  {duration:12.345679,width:1920,height:1080}
);
assert.deepEqual(
  Metadata.metadataFromElement('image',{naturalWidth:1080,naturalHeight:1920}),
  {width:1080,height:1920}
);
assert.equal(Metadata.needsProbe({type:'video',duration:10,width:1920,height:1080}),false);
assert.equal(Metadata.needsProbe({type:'video',duration:10,width:1920}),true);
assert.equal(Metadata.needsProbe({type:'audio',duration:9}),false);
assert.equal(Metadata.needsProbe({type:'image',width:1200,height:628}),false);

const original={id:'asset-1',type:'video',name:'clip.mp4'};
const merged=Metadata.merge(original,{duration:20.25,width:1920,height:1080});
assert.equal(merged.changed,true);
assert.equal(original.duration,undefined,'merge must not mutate the source asset');
assert.equal(merged.asset.duration,20.25);
assert.equal(merged.asset.width,1920);
assert.equal(merged.asset.height,1080);
assert.equal(merged.asset.metadataVersion,1);
assert.ok(Number.isFinite(Date.parse(merged.asset.metadataProbedAt)));

const invalid=Metadata.merge(original,{duration:false,width:[],height:{}});
assert.equal(invalid.changed,false);
assert.equal(invalid.asset.duration,undefined);

// Regression: source-window tools were present but imported assets had no duration,
// causing Slip Edit to report unknown-duration. Persisted metadata must unlock safe bounds.
const slip=new ProfitMenteSlipEditEngine();
const clip={asset:'asset-1',duration:5,speed:1,sourceOffset:0};
assert.equal(slip.canSlip(clip,original).reason,'unknown-duration');
const readyAsset=merged.asset;
const canSlip=slip.canSlip(clip,readyAsset);
assert.equal(canSlip.ok,true);
assert.equal(canSlip.maxOffset,15.25);
const shifted=slip.shiftSource(clip,readyAsset,99);
assert.equal(shifted.ok,true);
assert.equal(shifted.clamped,true);
assert.equal(clip.sourceOffset,15.25);

console.log('ProfitMente Studio media metadata regression: OK');
