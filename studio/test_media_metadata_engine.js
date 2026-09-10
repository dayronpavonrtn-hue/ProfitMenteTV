const assert=require('assert');
const Engine=require('./media-metadata-engine.js');

assert.strictEqual(Engine.kind({type:'video'}),'video');
assert.strictEqual(Engine.kind({mime:'audio/mpeg'}),'audio');
assert.strictEqual(Engine.kind({type:'document',mime:'application/pdf'}),null);

assert.deepStrictEqual(
  Engine.metadataFromElement('video',{duration:12.3456789,videoWidth:1920,videoHeight:1080}),
  {duration:12.345679,width:1920,height:1080}
);
assert.deepStrictEqual(Engine.metadataFromElement('audio',{duration:61.2}),{duration:61.2});
assert.deepStrictEqual(Engine.metadataFromElement('image',{naturalWidth:1080,naturalHeight:1920}),{width:1080,height:1920});

const merged=Engine.merge({id:'a',type:'video'},{duration:7.25,width:1080,height:1920});
assert.strictEqual(merged.changed,true);
assert.strictEqual(merged.asset.duration,7.25);
assert.strictEqual(merged.asset.width,1080);
assert.strictEqual(merged.asset.height,1920);
assert.strictEqual(merged.asset.metadataVersion,1);

assert.strictEqual(Engine.timelineDuration({type:'video',duration:17.5},45),17.5);
assert.strictEqual(Engine.timelineDuration({type:'audio',duration:17.5},6),6);
assert.strictEqual(Engine.timelineDuration({type:'image'},45),5);
assert.strictEqual(Engine.timelineDuration({type:'video'},45),8);
assert.strictEqual(Engine.timelineDuration({type:'video',duration:true},45),8);
assert.strictEqual(Engine.timelineDuration({type:'video',duration:10},0),0);
assert.strictEqual(Engine.describe({type:'video',duration:65.8,width:1080,height:1920}),'01:05 · 1080×1920');
assert.strictEqual(Engine.describe({type:'image',width:1200,height:628}),'1200×628');

console.log('Media metadata engine regression: OK');
